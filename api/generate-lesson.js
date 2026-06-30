import { createClient } from '@supabase/supabase-js'

// Bump this to invalidate all cached lessons after a prompt/schema change.
const CACHE_VERSION = 'v1'

function supabaseAdmin() {
  try {
    return createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  } catch {
    return null
  }
}

// Lesson content for a given (subject, topic, level, difficulty) is reusable across
// all students — only the PLAN (which topic/level a student gets) is personalized.
// Caching it turns a ~30s cold generation into a <0.5s lookup for everyone after the first.
async function readCache(db, cacheKey) {
  if (!db) return null
  try {
    const { data } = await db.from('lesson_cache').select('content').eq('cache_key', cacheKey).single()
    return data?.content || null
  } catch {
    return null
  }
}

async function writeCache(db, cacheKey, parts, content) {
  if (!db) return
  try {
    await db.from('lesson_cache').upsert({
      cache_key: cacheKey,
      subject: parts.subject,
      topic: parts.topic,
      level: parts.level,
      difficulty: parts.difficulty,
      content,
    }, { onConflict: 'cache_key' })
  } catch { /* table may not exist yet — non-fatal */ }
}

// Video database (verified embeddable IDs)
const VIDEO_DB = {
  english: {
    'Present Simple': 'MuAPsd73yn4',
    'Past Simple': 'R3psCH_Ydgk',
    'Future Tense': 'FhxR5hOV-dA',
    'Future Simple': 'FhxR5hOV-dA',
    'Present Continuous': 'oTAqNkS2SoA',
    'Present Perfect': 'oTAqNkS2SoA',
    'Modal Verbs': 'oTAqNkS2SoA',
    'Daily Routines': 'nHRvXkp4Pqk',
    'Daily activities': 'nHRvXkp4Pqk',
    'Greetings': 'p7WzHvBCF1c',
    'Numbers': 'DR-ogZMxMnI',
    'Numbers 1-20': 'DR-ogZMxMnI',
    'Colors': 'eTo4mFMGiSQ',
    'Family': 'p7WzHvBCF1c',
    'Family members': 'p7WzHvBCF1c',
    'Adjectives': 'oR8gZKiE3jE',
    'Food': '6l5UTk3DTSI',
    'Food and drinks': '6l5UTk3DTSI',
    'Animals': 'HBJ8-12JGL4',
    'Clothes': 'eTo4mFMGiSQ',
    'Body parts': 'HBJ8-12JGL4',
    default: 'nHRvXkp4Pqk',
  },
  russian: {
    'Приветствия': 'YRz7OHbZi78',
    'Кириллица': 'YRz7OHbZi78',
    'Числа 1-20': 'mvOkMYCygps',
    'Настоящее время': 'YRz7OHbZi78',
    'Прошедшее время': 'YRz7OHbZi78',
    default: 'YRz7OHbZi78',
  },
  math: {
    "Qo'shish": 'mvOkMYCygps',
    "Ko'paytirish jadvali": 'mvOkMYCygps',
    "Ko'paytirish": 'mvOkMYCygps',
    'Kasrlar': 'jFd-6EPfnec',
    'Foizlar': 'UYTBLlvGmCo',
    default: 'mvOkMYCygps',
  },
}

function lookupVideo(topic, subject) {
  const db = VIDEO_DB[subject] || VIDEO_DB.english
  if (db[topic]) return db[topic]
  const topicLower = topic.toLowerCase()
  for (const [key, id] of Object.entries(db)) {
    if (key === 'default') continue
    if (key.toLowerCase().includes(topicLower) || topicLower.includes(key.toLowerCase())) return id
  }
  return db.default
}

function parseJson(text) {
  return JSON.parse(
    text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  )
}

// Remove duplicate answer options (the AI sometimes repeats one), and keep the
// correct index pointing at the right text. Drops exercises that collapse to <2 options.
function sanitizeExercises(exercises) {
  return (exercises || [])
    .map((ex) => {
      const opts = Array.isArray(ex.options) ? ex.options.map((o) => String(o)) : []
      if (!opts.length) return null
      const correctText = opts[ex.correct]
      const seen = new Set()
      const uniq = []
      for (const o of opts) {
        const k = o.trim().toLowerCase()
        if (!seen.has(k)) { seen.add(k); uniq.push(o) }
      }
      let correct = uniq.findIndex((o) => o === correctText)
      if (correct < 0) correct = 0
      return { ...ex, options: uniq, correct }
    })
    .filter((ex) => ex && ex.options.length >= 2)
}

// Generate lesson JSON via OpenAI (reliable primary for English, fallback for all).
async function callOpenAI(system, prompt) {
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 3200,
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(18000),
    })
    const d = await r.json()
    if (!r.ok || !d.choices?.[0]) {
      console.error('OpenAI gen error', r.status, JSON.stringify(d).slice(0, 160))
      return null
    }
    return parseJson(d.choices[0].message.content)
  } catch (e) {
    console.error('OpenAI gen exception', e.message)
    return null
  }
}

// Generate lesson JSON via Claude Haiku (fast primary, no Gemini quota issues).
async function callClaude(system, prompt) {
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 8000,
        temperature: 0.7,
        system,
        messages: [{ role: 'user', content: prompt + '\n\nReturn ONLY the JSON object, no prose, no markdown fences.' }],
      }),
      signal: AbortSignal.timeout(40000),
    })
    const d = await r.json()
    if (!r.ok || !d.content?.[0]?.text) {
      console.error('Claude gen error', r.status, JSON.stringify(d).slice(0, 160))
      return null
    }
    return parseJson(d.content[0].text)
  } catch (e) {
    console.error('Claude gen exception', e.message)
    return null
  }
}

// Generate lesson JSON via Gemini (fast/cheap primary for ru/math when quota allows).
async function callGemini(prompt) {
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2600, responseMimeType: 'application/json' },
        }),
        signal: AbortSignal.timeout(28000),
      }
    )
    const d = await r.json()
    if (!r.ok || !d.candidates?.[0]) {
      console.error('Gemini gen error', r.status, JSON.stringify(d).slice(0, 160))
      return null
    }
    return parseJson(d.candidates[0].content.parts[0].text)
  } catch (e) {
    console.error('Gemini gen exception', e.message)
    return null
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { plan, subject = 'english', profile, uiLanguage } = req.body
    const topic = plan?.topic || 'Lesson'
    const level = plan?.level || 'A1'
    const difficulty = plan?.difficulty || 'medium'
    // The student reads explanations in their UI language (uz or ru), not always Uzbek.
    // Pin the SCRIPT so we never mix Cyrillic + Latin in Uzbek explanations.
    const uiLang = uiLanguage || profile?.preferred_language || profile?.ui_language || 'uz'
    const explainLang = uiLang === 'ru'
      ? 'Russian (Cyrillic script)'
      : 'Uzbek in LATIN script (lotin alifbosi: oʻ, gʻ, sh, ch — NEVER Cyrillic letters)'
    console.log('Generate lesson:', subject, topic, level, difficulty, '| explain:', explainLang)

    // Fully personalized per user: every lesson is generated fresh (no shared cache).
    // NOTE: the JSON keys stay *_uz for frontend compatibility, but their CONTENT is
    // written in ${explainLang} (the student's UI language).
    const systemInstructions = {
      english: `You are generating English lesson content. The student's explanation language is ${explainLang}.
CRITICAL RULES:
- vocabulary.word = English word/phrase (NEVER ${explainLang})
- vocabulary.translation = ${explainLang}
- ALL explanatory text (grammar_explanation.title/explanation/rule/tip/common_mistake, every explanation_uz, example_uz, text_uz, question_uz) MUST be written in ${explainLang}
- The ONLY English text allowed is: the vocabulary words, the target example sentences, the exercise question stems, and the story 'text'. Everything that TEACHES or EXPLAINS must be in ${explainLang} so a beginner can understand.
- NEVER put ${explainLang} in the 'word' field`,

      russian: `You are generating Russian lesson content. The student's explanation language is ${explainLang}.
CRITICAL RULES:
- vocabulary.word = Russian word in CYRILLIC only (привет, спасибо)
- vocabulary.translation = ${explainLang}
- ALL explanatory text (grammar_explanation.*, explanation_uz, example_uz, text_uz, question_uz) MUST be in ${explainLang}
- examples: Russian (Cyrillic) target + ${explainLang} translation
- NEVER use Latin letters for Russian words
- If ${explainLang} is Russian, still keep target vocabulary in Cyrillic but make explanations clear and simple`,

      math: `You are generating Math lesson content. ALL content AND explanations in ${explainLang}.
CRITICAL RULES:
- vocabulary.word = math term in ${explainLang}
- vocabulary.translation = definition in ${explainLang}
- exercises: math word problems in ${explainLang}, use so'm currency and local names (Ali, Malika, Kamol), cities (Toshkent, Samarqand)
- story: ${explainLang} word-problem story
- numbers and math notation are universal`,
    }

    const sys = systemInstructions[subject] || systemInstructions.english

    const scriptRule = subject === 'russian'
      ? `🔤 RUSSIAN SCRIPT RULE: EVERY Russian word — in vocabulary, in EXERCISE questions AND options, and in speaking sentences — MUST be written in Russian CYRILLIC. NEVER use Latin transliteration (write "любит", NOT "lyubit"). A fill-blank question must be a COMPLETE Russian sentence containing ___ (e.g. "Мы ___ музыку"), never mixed with Uzbek/English words. The 4 options must all be Cyrillic Russian.`
      : subject === 'english'
      ? `🔤 A fill-blank question must be a COMPLETE English sentence containing ___ , and all 4 options are English words — never mixed with the explanation language.`
      : `🔤 Math content (questions, options) is written in the instruction language; numbers and math symbols are universal.`

    const header = `${sys}

${scriptRule}

🌐 LANGUAGE OF INSTRUCTION = ${explainLang}. EVERY translation, explanation, grammar note,
tip, and all *_uz fields MUST be written in ${explainLang}. (The target-language words and
example sentences stay in the target language; everything that EXPLAINS is ${explainLang}.)
For example, a vocabulary translation must be ${explainLang}, NOT any other language.
DO NOT MIX SCRIPTS: explanations are 100% in ${explainLang}. The ONLY place another script
appears is inside the target-language vocabulary word / example sentence itself.

⚠️ THIS LESSON IS STRICTLY ABOUT THE TOPIC: "${topic}".
EVERY item you produce MUST be about "${topic}". Do NOT default to greetings, introductions,
or any unrelated theme unless the topic itself is greetings.

LESSON PLAN:
Topic: ${plan?.topic}
Level: ${plan?.level}
Difficulty: ${plan?.difficulty}
Method: ${plan?.method}
Grammar focus: ${plan?.grammarPoint}
Words to teach: ${plan?.focusWords?.join(', ') || ''}
Words to review: ${plan?.reviewWords?.join(', ') || ''}
Weak points to reinforce: ${plan?.weakPointsToAddress?.join(', ') || ''}
Instructions: ${plan?.contentInstructions || ''}`

    // Split generation into two smaller halves run IN PARALLEL — roughly halves
    // latency vs one big call, and avoids truncation. No cache: fully per-user.
    const promptA = `${header}

Generate the VOCABULARY + a DEEP, STRUCTURED GRAMMAR lesson (like a real 1-on-1 tutor:
explain WHAT it is, WHEN and WHY to use it with several distinct use-cases, the exact
form/structure, and how it DIFFERS from confusable concepts). Return ONLY valid JSON:
{
  "vocabulary": [8 items: word, translation, pronunciation, example, example_uz, audio_text],
  "grammar_explanation": {
    "title": "Grammar topic",
    "explanation": "4-6 sentences explaining what it is and the core idea",
    "when_to_use": [3-4 items, each: {"case":"a specific situation it's used for (e.g. habits, facts, schedules)","example":"target-language sentence","example_uz":"its translation"}],
    "rule": "the exact form/structure rule (e.g. subject + verb(+s) ...)",
    "examples": [4 items: {"target":"sentence","uzbek":"translation","note":"short note"}],
    "differences": "1-3 sentences contrasting it with the most-confusable related concept (e.g. Present Simple vs Present Continuous), with a tiny example of each",
    "common_mistake": "the most common mistake learners make",
    "tip": "a memory tip"
  }
}
(All explanatory prose in the instruction language; target sentences stay in the target language.)`

    const promptB = `${header}

⚠️ ACCURACY IS CRITICAL — wrong translations confuse the student. Double-check every
translation is correct. For each exercise the 4 options must be FOUR DIFFERENT choices
(never repeat the same word twice), with EXACTLY ONE truly-correct option; the other 3
must be plausible but clearly wrong. "correct" is the 0-based index of the right option.

Generate the EXERCISES. Return ONLY valid JSON, no markdown:
{
  "exercises": [EXACTLY 10 items: type (fillBlank or translate), question, options (4 DISTINCT), correct (0-3 — VARY the position across items), explanation_uz, word]
}`

    const promptC = `${header}

Generate the SPEAKING + STORY. Return ONLY valid JSON, no markdown:
{
  "speaking_sentences": [EXACTLY 8 items: text (target-language sentence to pronounce), uzbek (its meaning in the student's UI language), pronunciation_tip, audio_intro],
  "story": {
    "title": "Story title", "title_uz": "Story title in Uzbek",
    "text": "5-6 sentence story using today's vocabulary",
    "text_uz": "Complete Uzbek translation",
    "questions": [3 items: question, question_uz, options (4), correct (0-3), explanation_uz]
  }
}`

    const genPart = async (prompt) => {
      let r = await callClaude(sys, prompt)
      if (!r) r = await callOpenAI(sys, prompt)
      return r
    }

    // 3 parallel calls → total latency ≈ the slowest single half (~15s) not the sum.
    const [partA, partB, partC] = await Promise.all([genPart(promptA), genPart(promptB), genPart(promptC)])
    console.log('lesson parts', subject, topic, '| A:', !!partA, '| B:', !!partB, '| C:', !!partC)

    // Merge; fill any failed part from the static fallback so the lesson is always complete.
    const fb = getSubjectFallback(subject, plan)
    const lessonContent = {
      vocabulary: partA?.vocabulary?.length ? partA.vocabulary : fb.vocabulary,
      grammar_explanation: partA?.grammar_explanation || fb.grammar_explanation,
      exercises: sanitizeExercises(partB?.exercises?.length ? partB.exercises : fb.exercises),
      speaking_sentences: partC?.speaking_sentences?.length ? partC.speaking_sentences : fb.speaking_sentences,
      story: partC?.story || fb.story,
    }

    lessonContent.youtube_video = {
      video_id: lookupVideo(topic, subject),
      title: topic,
      summary_uz: `Bu video "${topic}" mavzusida qo'shimcha ma'lumot beradi`,
      video_questions: [],
    }

    res.json(lessonContent)
  } catch (err) {
    console.error('generate-lesson error:', err)
    res.status(500).json({ error: err.message })
  }
}

function getSubjectFallback(subject, plan) {
  const fallbacks = {
    english: {
      vocabulary: [
        { word: 'wake up', translation: "uyg'onmoq", pronunciation: '/weɪk ʌp/', example: 'I wake up at 7 AM.', example_uz: "Men soat 7 da uyg'onaman.", audio_text: 'wake up' },
        { word: 'have breakfast', translation: 'nonushta qilmoq', pronunciation: '/hæv ˈbrekfəst/', example: 'She has breakfast at 8.', example_uz: 'U soat 8 da nonushta qiladi.', audio_text: 'have breakfast' },
        { word: 'go to work', translation: 'ishga bormoq', pronunciation: '/goʊ tə wɜːrk/', example: 'He goes to work by bus.', example_uz: 'U avtobus bilan ishga boradi.', audio_text: 'go to work' },
        { word: 'have lunch', translation: 'tushlik qilmoq', pronunciation: '/hæv lʌntʃ/', example: 'We have lunch at noon.', example_uz: 'Biz tushda tushlik qilamiz.', audio_text: 'have lunch' },
        { word: 'go to bed', translation: 'yotmoq', pronunciation: '/goʊ tə bed/', example: 'I go to bed at 10 PM.', example_uz: "Men kechki 10 da yotaman.", audio_text: 'go to bed' },
        { word: 'get dressed', translation: 'kiyinmoq', pronunciation: '/ɡet drest/', example: 'She gets dressed quickly.', example_uz: 'U tez kiyinadi.', audio_text: 'get dressed' },
        { word: 'brush teeth', translation: 'tish yuvmoq', pronunciation: '/brʌʃ tiːθ/', example: 'I brush my teeth every morning.', example_uz: 'Men har kuni ertalab tish yuvaman.', audio_text: 'brush teeth' },
        { word: 'take a shower', translation: 'dush qabul qilmoq', pronunciation: '/teɪk ə ˈʃaʊər/', example: 'He takes a shower at night.', example_uz: 'U kechasi dush qabul qiladi.', audio_text: 'take a shower' },
        { word: 'cook dinner', translation: 'kechki ovqat pishirmoq', pronunciation: '/kʊk ˈdɪnər/', example: 'She cooks dinner at 6.', example_uz: 'U soat 6 da ovqat pishiradi.', audio_text: 'cook dinner' },
        { word: 'watch TV', translation: "televizor ko'rmoq", pronunciation: '/wɒtʃ tiːˈviː/', example: 'They watch TV after dinner.', example_uz: "Ular kechki ovqatdan keyin televizor ko'rishadi.", audio_text: 'watch TV' },
      ],
      grammar_explanation: {
        title: "Present Simple — Kundalik odatlar",
        explanation: "Har kuni sodir bo'ladigan harakatlarni ifodalash uchun Present Simple zamonini ishlatamiz. Bu zamon odatlar va doimiy holatlarni bildiradi.",
        rule: "Men/Sen/Biz/Ular + fe'l asosi | U(she/he/it) + fe'l + s/es",
        examples: [
          { target: 'I wake up at 7 every day.', uzbek: "Men har kuni soat 7 da uyg'onaman.", note: "I bilan fe'l o'zgarmaydi" },
          { target: 'She wakes up at 8.', uzbek: "U soat 8 da uyg'onadi.", note: "She/He/It bilan -s qo'shiladi" },
          { target: 'They go to school by bus.', uzbek: 'Ular avtobus bilan maktabga borishadi.', note: "They bilan fe'l o'zgarmaydi" },
        ],
        common_mistake: "'She wake up' XATO! To'g'risi: 'She wakes up' — She/He/It bilan doim -s qo'shiladi!",
        tip: "Eslab qolish uchun: She/He/It = doim -S! Masalan: She eats, He drinks, It works",
      },
      exercises: [
        { type: 'fillBlank', question: 'I ___ up at 7 AM every day.', options: ['wake', 'wakes', 'waking', 'waked'], correct: 0, explanation_uz: "Men (I) uchun fe'l o'zgarmaydi", word: 'wake up' },
        { type: 'fillBlank', question: 'She ___ breakfast at 8.', options: ['have', 'has', 'having', 'had'], correct: 1, explanation_uz: "She uchun 'have' → 'has'", word: 'have breakfast' },
        { type: 'translate', question: 'ishga bormoq', options: ['go to school', 'go to work', 'go to sleep', 'go home'], correct: 1, explanation_uz: "'Work' = ish", word: 'go to work' },
        { type: 'fillBlank', question: 'He ___ to work by bus.', options: ['go', 'goes', 'going', 'gone'], correct: 1, explanation_uz: "He uchun 'go' → 'goes'", word: 'go to work' },
        { type: 'translate', question: 'nonushta qilmoq', options: ['have dinner', 'have lunch', 'have breakfast', 'have tea'], correct: 2, explanation_uz: "'Breakfast' = nonushta", word: 'have breakfast' },
        { type: 'fillBlank', question: 'They ___ lunch at noon.', options: ['has', 'have', 'having', 'had'], correct: 1, explanation_uz: "They uchun 'have' o'zgarmaydi", word: 'have lunch' },
        { type: 'translate', question: 'tish yuvmoq', options: ['wash face', 'brush teeth', 'comb hair', 'take shower'], correct: 1, explanation_uz: "'Brush teeth' = tish yuvmoq", word: 'brush teeth' },
        { type: 'fillBlank', question: 'She ___ dinner every evening.', options: ['cook', 'cooks', 'cooking', 'cooked'], correct: 1, explanation_uz: "She uchun 'cook' → 'cooks'", word: 'cook dinner' },
        { type: 'translate', question: "televizor ko'rmoq", options: ['listen to music', 'read book', 'watch TV', 'play games'], correct: 2, explanation_uz: "'Watch TV' = televizor ko'rmoq", word: 'watch TV' },
        { type: 'fillBlank', question: 'I ___ a shower every morning.', options: ['take', 'takes', 'taking', 'took'], correct: 0, explanation_uz: "Men (I) uchun 'take' o'zgarmaydi", word: 'take a shower' },
        { type: 'fillBlank', question: 'He ___ to bed at 10 PM.', options: ['go', 'goes', 'going', 'went'], correct: 1, explanation_uz: "He uchun 'go' → 'goes'", word: 'go to bed' },
        { type: 'translate', question: 'kiyinmoq', options: ['get up', 'get dressed', 'get ready', 'get out'], correct: 1, explanation_uz: "'Get dressed' = kiyinmoq", word: 'get dressed' },
        { type: 'fillBlank', question: 'We ___ TV after dinner.', options: ['watch', 'watches', 'watching', 'watched'], correct: 0, explanation_uz: "We uchun 'watch' o'zgarmaydi", word: 'watch TV' },
        { type: 'fillBlank', question: 'She ___ dressed quickly.', options: ['get', 'gets', 'getting', 'got'], correct: 1, explanation_uz: "She uchun 'get' → 'gets'", word: 'get dressed' },
        { type: 'translate', question: 'dush qabul qilmoq', options: ['take a bath', 'take a shower', 'wash hands', 'brush teeth'], correct: 1, explanation_uz: "'Take a shower' = dush qabul qilmoq", word: 'take a shower' },
        { type: 'fillBlank', question: 'They ___ to bed late.', options: ['goes', 'go', 'going', 'went'], correct: 1, explanation_uz: "They uchun 'go' o'zgarmaydi", word: 'go to bed' },
        { type: 'translate', question: "uyg'onmoq", options: ['wake up', 'stand up', 'get up', 'sit up'], correct: 0, explanation_uz: "'Wake up' = uyg'onmoq", word: 'wake up' },
        { type: 'fillBlank', question: 'I ___ my teeth every morning.', options: ['brush', 'brushes', 'brushing', 'brushed'], correct: 0, explanation_uz: "Men (I) uchun 'brush' o'zgarmaydi", word: 'brush teeth' },
        { type: 'translate', question: 'yotmoq', options: ['go to sleep', 'go to bed', 'lie down', 'rest'], correct: 1, explanation_uz: "'Go to bed' = yotmoq", word: 'go to bed' },
        { type: 'fillBlank', question: 'She ___ lunch at the office.', options: ['have', 'has', 'having', 'had'], correct: 1, explanation_uz: "She uchun 'have' → 'has'", word: 'have lunch' },
      ],
      speaking_sentences: [
        { text: 'I wake up at seven every morning.', uzbek: "Men har kuni ertalab soat yettida uyg'onaman.", pronunciation_tip: "'seven' = SE-ven", audio_intro: 'Quyidagi gapni aytib ko\'ring' },
        { text: 'She goes to work by bus.', uzbek: 'U avtobus bilan ishga boradi.', pronunciation_tip: "'goes' = GOUZ", audio_intro: 'Quyidagi gapni aytib ko\'ring' },
        { text: 'We have breakfast together.', uzbek: 'Biz birga nonushta qilamiz.', pronunciation_tip: "'breakfast' = BREK-fəst", audio_intro: 'Quyidagi gapni aytib ko\'ring' },
        { text: 'He brushes his teeth every morning.', uzbek: 'U har kuni ertalab tish yuvadi.', pronunciation_tip: "'brushes' = BRASHiz", audio_intro: 'Quyidagi gapni aytib ko\'ring' },
        { text: 'They watch TV after dinner.', uzbek: "Ular kechki ovqatdan keyin televizor ko'rishadi.", pronunciation_tip: "'watch' = WOCH", audio_intro: 'Quyidagi gapni aytib ko\'ring' },
        { text: 'I take a shower every evening.', uzbek: 'Men har kechasi dush qabul qilaman.', pronunciation_tip: "'shower' = SHAUər", audio_intro: 'Quyidagi gapni aytib ko\'ring' },
        { text: 'She cooks dinner at six PM.', uzbek: 'U kechki soat oltida ovqat pishiradi.', pronunciation_tip: "'cooks' = KUKS", audio_intro: 'Quyidagi gapni aytib ko\'ring' },
        { text: 'We go to bed at ten.', uzbek: "Biz soat o'nda yotamiz.", pronunciation_tip: "'bed' = BED", audio_intro: 'Quyidagi gapni aytib ko\'ring' },
        { text: 'He gets dressed quickly.', uzbek: 'U tez kiyinadi.', pronunciation_tip: "'dressed' = DREST", audio_intro: 'Quyidagi gapni aytib ko\'ring' },
        { text: 'I have lunch at the office.', uzbek: 'Men ofisda tushlik qilaman.', pronunciation_tip: "'lunch' = LANCH", audio_intro: 'Quyidagi gapni aytib ko\'ring' },
      ],
      story: {
        title: "Ali's Perfect Day",
        title_uz: 'Alining Mukammal Kuni',
        text: "Ali wakes up at 6 AM every day. He brushes his teeth and takes a shower. Then he has breakfast with his family. Ali goes to work by bus. He has lunch at the office at noon. In the evening, Ali cooks dinner and watches TV. He goes to bed at 10 PM.",
        text_uz: "Ali har kuni soat 6 da uyg'onadi. U tish yuvadi va dush qabul qiladi. Keyin oilasi bilan nonushta qiladi. Ali avtobus bilan ishga boradi. U tushda ofisda tushlik qiladi. Kechqurun Ali ovqat pishiradi va televizor ko'radi. U soat 10 da yotadi.",
        questions: [
          { question: 'What time does Ali wake up?', question_uz: "Ali soat nechada uyg'onadi?", options: ['5 AM', '6 AM', '7 AM', '8 AM'], correct: 1, explanation_uz: "'Ali wakes up at 6 AM' deyilgan" },
          { question: 'How does Ali go to work?', question_uz: 'Ali ishga qanday boradi?', options: ['By car', 'By train', 'By bus', 'On foot'], correct: 2, explanation_uz: "'goes to work by bus' deyilgan" },
          { question: 'What does Ali do in the evening?', question_uz: 'Ali kechqurun nima qiladi?', options: ['Goes shopping', 'Cooks and watches TV', 'Plays games', 'Reads books'], correct: 1, explanation_uz: "'cooks dinner and watches TV' deyilgan" },
        ],
      },
    },

    russian: {
      vocabulary: [
        { word: 'привет', translation: 'salom', pronunciation: "/prʲɪˈvʲet/", example: 'Привет! Как дела?', example_uz: 'Salom! Yaxshimisiz?', audio_text: 'привет' },
        { word: 'спасибо', translation: 'rahmat', pronunciation: "/spɐˈsʲibə/", example: 'Спасибо за помощь!', example_uz: 'Yordam uchun rahmat!', audio_text: 'спасибо' },
        { word: 'пожалуйста', translation: 'iltimos / marhamat', pronunciation: "/pəˈʐaɫʊjstə/", example: 'Пожалуйста, помогите мне.', example_uz: 'Iltimos, menga yordam bering.', audio_text: 'пожалуйста' },
        { word: 'да', translation: 'ha', pronunciation: '/da/', example: 'Да, я понимаю.', example_uz: 'Ha, men tushunaman.', audio_text: 'да' },
        { word: 'нет', translation: "yo'q", pronunciation: "/nʲet/", example: 'Нет, это не так.', example_uz: "Yo'q, bu bunday emas.", audio_text: 'нет' },
        { word: 'меня зовут', translation: 'mening ismim', pronunciation: "/mʲɪˈnʲa zɐˈvut/", example: 'Меня зовут Али.', example_uz: 'Mening ismim Ali.', audio_text: 'меня зовут' },
        { word: 'как дела', translation: 'qanday yashayapsiz', pronunciation: "/kak dʲɪˈla/", example: 'Как дела? — Хорошо!', example_uz: 'Qanday yashayapsiz? — Yaxshi!', audio_text: 'как дела' },
        { word: 'хорошо', translation: 'yaxshi', pronunciation: "/xərɐˈʂo/", example: 'Всё хорошо, спасибо.', example_uz: 'Hammasi yaxshi, rahmat.', audio_text: 'хорошо' },
        { word: 'до свидания', translation: 'xayr', pronunciation: "/də svʲɪˈdanʲɪjə/", example: 'До свидания! До завтра!', example_uz: "Xayr! Ertaga ko'rishguncha!", audio_text: 'до свидания' },
        { word: 'извините', translation: 'kechirasiz', pronunciation: "/ɪzvʲɪˈnʲitʲɪ/", example: 'Извините, вы не знаете...', example_uz: 'Kechirasiz, bilasizmi...', audio_text: 'извините' },
      ],
      grammar_explanation: {
        title: 'Rus tilida salomlashish',
        explanation: "Rus tilida salomlashishning bir necha usuli bor. Rasmiy vaziyatlarda 'Здравствуйте' ishlatiladi. Do'stlar orasida 'Привет' ishlatiladi.",
        rule: "Rasmiy: Здравствуйте | Norasmiy: Привет | Xayrlashish: До свидания / Пока",
        examples: [
          { target: 'Привет! Как дела?', uzbek: "Salom! Qanday yashayapsiz?", note: "Do'stona salomlashish" },
          { target: 'Здравствуйте! Рад вас видеть.', uzbek: "Assalomu alaykum! Sizni ko'rganim quvonchli.", note: 'Rasmiy salomlashish' },
          { target: 'До свидания! Удачи!', uzbek: 'Xayr! Omad!', note: 'Xayrlashish' },
        ],
        common_mistake: "'Привет' rasmiy vaziyatda ishlatmang! Katta yoshlilar bilan 'Здравствуйте' deyiladi.",
        tip: "Привет = do'stlarga | Здравствуйте = katta yoshlilarga va notanishlarga",
      },
      exercises: [
        { type: 'translate', question: 'salom', options: ['привет', 'спасибо', 'пожалуйста', 'до свидания'], correct: 0, explanation_uz: "'Привет' = salom (norasmiy)", word: 'привет' },
        { type: 'translate', question: 'rahmat', options: ['спасибо', 'привет', 'нет', 'хорошо'], correct: 0, explanation_uz: "'Спасибо' = rahmat", word: 'спасибо' },
        { type: 'translate', question: 'ha', options: ['да', 'нет', 'привет', 'спасибо'], correct: 0, explanation_uz: "'Да' = ha", word: 'да' },
        { type: 'translate', question: "yo'q", options: ['нет', 'да', 'хорошо', 'пожалуйста'], correct: 0, explanation_uz: "'Нет' = yo'q", word: 'нет' },
        { type: 'translate', question: 'yaxshi', options: ['хорошо', 'плохо', 'привет', 'спасибо'], correct: 0, explanation_uz: "'Хорошо' = yaxshi", word: 'хорошо' },
        { type: 'translate', question: 'xayr', options: ['до свидания', 'привет', 'спасибо', 'да'], correct: 0, explanation_uz: "'До свидания' = xayr (rasmiy)", word: 'до свидания' },
        { type: 'translate', question: 'kechirasiz', options: ['извините', 'спасибо', 'привет', 'хорошо'], correct: 0, explanation_uz: "'Извините' = kechirasiz", word: 'извините' },
        { type: 'translate', question: 'mening ismim', options: ['меня зовут', 'как дела', 'спасибо', 'привет'], correct: 0, explanation_uz: "'Меня зовут' = mening ismim", word: 'меня зовут' },
        { type: 'translate', question: 'iltimos', options: ['пожалуйста', 'спасибо', 'привет', 'хорошо'], correct: 0, explanation_uz: "'Пожалуйста' = iltimos/marhamat", word: 'пожалуйста' },
        { type: 'translate', question: 'qanday yashayapsiz', options: ['как дела', 'привет', 'спасибо', 'хорошо'], correct: 0, explanation_uz: "'Как дела' = qanday yashayapsiz", word: 'как дела' },
        { type: 'fillBlank', question: '— ___, как дела? — Хорошо!', options: ['Привет', 'Спасибо', 'Пожалуйста', 'Извините'], correct: 0, explanation_uz: "Salomlashishda 'Привет' ishlatiladi", word: 'привет' },
        { type: 'fillBlank', question: 'Меня ___ Али.', options: ['зовут', 'есть', 'идёт', 'знает'], correct: 0, explanation_uz: "'Меня зовут' = mening ismim", word: 'меня зовут' },
        { type: 'fillBlank', question: '— Как дела? — ___, спасибо!', options: ['Хорошо', 'Плохо', 'Привет', 'Нет'], correct: 0, explanation_uz: "'Хорошо' = yaxshi (oddiy javob)", word: 'хорошо' },
        { type: 'fillBlank', question: '— ___ за помощь! — Пожалуйста!', options: ['Спасибо', 'Привет', 'Нет', 'Да'], correct: 0, explanation_uz: "'Спасибо' = rahmat", word: 'спасибо' },
        { type: 'fillBlank', question: '___, вы не знаете, где остановка?', options: ['Извините', 'Привет', 'Хорошо', 'Да'], correct: 0, explanation_uz: "Notanish kishi bilan so'rashda 'Извините' ishlatiladi", word: 'извините' },
        { type: 'translate', question: "Salom, mening ismim Malika!", options: ['Привет, меня зовут Малика!', 'Пока, меня зовут Малика!', 'Спасибо, меня зовут Малика!', 'Нет, меня зовут Малика!'], correct: 0, explanation_uz: "'Привет' + 'меня зовут' = salom + mening ismim", word: 'меня зовут' },
        { type: 'translate', question: 'Xayr! Ertaga!', options: ['До свидания! До завтра!', 'Привет! До завтра!', 'Спасибо! До завтра!', 'Хорошо! До завтра!'], correct: 0, explanation_uz: "'До свидания' = xayr, 'до завтра' = ertaga", word: 'до свидания' },
        { type: 'fillBlank', question: '— Как тебя зовут? — ___ зовут Камол.', options: ['Меня', 'Тебя', 'Его', 'Её'], correct: 0, explanation_uz: "'Меня зовут' = mening ismim (1-shaxs)", word: 'меня зовут' },
        { type: 'translate', question: "Hammasi yaxshi, rahmat!", options: ['Всё хорошо, спасибо!', 'Всё плохо, спасибо!', 'Всё хорошо, привет!', 'Нет хорошо, спасибо!'], correct: 0, explanation_uz: "'Всё хорошо' = hammasi yaxshi, 'спасибо' = rahmat", word: 'хорошо' },
        { type: 'fillBlank', question: '— ___, вы говорите по-узбекски? — Да, немного.', options: ['Извините', 'Привет', 'Спасибо', 'Хорошо'], correct: 0, explanation_uz: "Notanish kishiga murojaat qilishda 'Извините' ishlatiladi", word: 'извините' },
      ],
      speaking_sentences: [
        { text: 'Привет! Меня зовут Али.', uzbek: 'Salom! Mening ismim Ali.', pronunciation_tip: "'зовут' = zah-VOOT", audio_intro: 'Quyidagi gapni rus tilida aytib ko\'ring' },
        { text: 'Как дела? — Хорошо, спасибо!', uzbek: 'Qanday yashayapsiz? — Yaxshi, rahmat!', pronunciation_tip: "'дела' = dye-LA", audio_intro: 'Quyidagi gapni rus tilida aytib ko\'ring' },
        { text: 'Спасибо за помощь!', uzbek: 'Yordam uchun rahmat!', pronunciation_tip: "'спасибо' = spa-SEE-ba", audio_intro: 'Quyidagi gapni rus tilida aytib ko\'ring' },
        { text: 'Извините, пожалуйста.', uzbek: 'Kechirasiz, iltimos.', pronunciation_tip: "'извините' = eez-vee-NEE-tye", audio_intro: 'Quyidagi gapni rus tilida aytib ko\'ring' },
        { text: 'До свидания! Удачи!', uzbek: 'Xayr! Omad!', pronunciation_tip: "'свидания' = svee-DA-nya", audio_intro: 'Quyidagi gapni rus tilida aytib ko\'ring' },
        { text: 'Да, я понимаю.', uzbek: 'Ha, men tushunaman.', pronunciation_tip: "'понимаю' = pa-nee-MA-yu", audio_intro: 'Quyidagi gapni rus tilida aytib ko\'ring' },
        { text: 'Нет, это не так.', uzbek: "Yo'q, bu bunday emas.", pronunciation_tip: "'это' = EH-ta", audio_intro: 'Quyidagi gapni rus tilida aytib ko\'ring' },
        { text: 'Пожалуйста, помогите мне.', uzbek: 'Iltimos, menga yordam bering.', pronunciation_tip: "'помогите' = pa-ma-GEE-tye", audio_intro: 'Quyidagi gapni rus tilida aytib ko\'ring' },
        { text: 'Очень приятно познакомиться.', uzbek: 'Tanishganimdan xursandman.', pronunciation_tip: "'приятно' = pree-YAT-na", audio_intro: 'Quyidagi gapni rus tilida aytib ko\'ring' },
        { text: 'До встречи! Пока!', uzbek: "Ko'rishguncha! Xayr!", pronunciation_tip: "'встречи' = FSTRYE-chee", audio_intro: 'Quyidagi gapni rus tilida aytib ko\'ring' },
      ],
      story: {
        title: 'Знакомство',
        title_uz: 'Tanishish',
        text: "Привет! Меня зовут Али. Я из Узбекистана. Как вас зовут? — Меня зовут Катя. Очень приятно! — Как дела, Катя? — Хорошо, спасибо! А у вас? — Тоже хорошо. До свидания! — Пока!",
        text_uz: "Salom! Mening ismim Ali. Men O'zbekistondan. Sizning ismingiz nima? — Mening ismim Katya. Tanishganimdan xursandman! — Qanday yashayapsiz, Katya? — Yaxshi, rahmat! Sizchi? — Ham yaxshi. Xayr! — Xayr!",
        questions: [
          { question: 'Как зовут главного героя?', question_uz: 'Bosh qahramonning ismi nima?', options: ['Катя', 'Али', 'Иван', 'Мария'], correct: 1, explanation_uz: "'Меня зовут Али' deyilgan" },
          { question: 'Откуда Али?', question_uz: 'Ali qayerdan?', options: ['Из России', 'Из Казахстана', 'Из Узбекистана', 'Из Китая'], correct: 2, explanation_uz: "'Я из Узбекистана' deyilgan" },
          { question: 'Как чувствует себя Катя?', question_uz: "Katya o'zini qanday his qilyapti?", options: ['Плохо', 'Нормально', 'Хорошо', 'Устала'], correct: 2, explanation_uz: "'Хорошо, спасибо' deyilgan" },
        ],
      },
    },

    math: {
      vocabulary: [
        { word: "qo'shish", translation: "Ikki sonni birlashtirish amali (+)", pronunciation: "qo'sh-ish", example: "5 + 3 = 8", example_uz: "Besh qo'shishlik uch — sakkiz", audio_text: "qo'shish" },
        { word: 'ayirish', translation: 'Kattadan kichikni olish amali (-)', pronunciation: 'ayir-ish', example: '10 - 4 = 6', example_uz: "O'n minus to'rt — olti", audio_text: 'ayirish' },
        { word: "ko'paytirish", translation: "Bir sonni bir necha marta qo'shish (×)", pronunciation: "ko'paytir-ish", example: '3 × 4 = 12', example_uz: "Uch marta to'rt — o'n ikki", audio_text: "ko'paytirish" },
        { word: "bo'lish", translation: "Sonni teng qismlarga ajratish (÷)", pronunciation: "bo'l-ish", example: '12 ÷ 3 = 4', example_uz: "O'n ikki bo'lishlik uch — to'rt", audio_text: "bo'lish" },
        { word: 'natija', translation: 'Amal bajarilgandan keyin hosil bo\'lgan son', pronunciation: 'na-ti-ja', example: '5 + 3 = 8', example_uz: "Bu yerda 8 — natija", audio_text: 'natija' },
        { word: 'juft son', translation: "2 ga qoldiqsiz bo'linadigan son", pronunciation: 'juft son', example: '2, 4, 6, 8, 10', example_uz: 'Juft sonlar misoli', audio_text: 'juft son' },
        { word: 'toq son', translation: "2 ga bo'linmaydigan son", pronunciation: 'toq son', example: '1, 3, 5, 7, 9', example_uz: 'Toq sonlar misoli', audio_text: 'toq son' },
        { word: 'kasr', translation: "Butun sonning bir qismi (1/2, 3/4)", pronunciation: 'kasr', example: '1/2 — yarim, 1/4 — chorak', example_uz: 'Pizza slice = kasrning misoli', audio_text: 'kasr' },
        { word: 'foiz', translation: "Yuzdan bir qism (%)", pronunciation: 'fo-iz', example: '50% = 100 dan 50 ta', example_uz: '% belgisi = foiz', audio_text: 'foiz' },
        { word: 'tenglik', translation: "Ikki ifodaning tengligini ko'rsatuvchi belgi (=)", pronunciation: 'teng-lik', example: '5 + 3 = 8', example_uz: '= belgisi = tenglik', audio_text: 'tenglik' },
      ],
      grammar_explanation: {
        title: 'Asosiy matematik amallar',
        explanation: "Matematikada 4 ta asosiy amal bor: qo'shish, ayirish, ko'paytirish va bo'lish. Har bir amalning o'z belgisi va qoidasi bor.",
        rule: "Qo'shish (+) → ko'paytiradi | Ayirish (-) → kamaytiradi | Ko'paytirish (×) → tezroq qo'shish | Bo'lish (÷) → teng qismlarga ajratish",
        examples: [
          { target: '15 + 27 = 42', uzbek: "O'n besh qo'shishlik yigirma yetti — qirq ikki", note: "Qo'shishda sonlar tartibining ahamiyati yo'q" },
          { target: '50 - 18 = 32', uzbek: "Ellik minus o'n sakkiz — o'ttiz ikki", note: 'Kattadan kichikni ayiramiz' },
          { target: '6 × 7 = 42', uzbek: "Olti marta yetti — qirq ikki", note: 'Ko\'paytirish jadvali' },
        ],
        common_mistake: "Ko'p o'quvchilar 6×7 ni bilishmaydi. Eslab qoling: 6×7=42, 7×8=56, 8×9=72",
        tip: "Ko'paytirish jadvalini yod oling — bu barcha matematik amallar uchun asos!",
      },
      exercises: [
        { type: 'fillBlank', question: '15 + 27 = ___', options: ['40', '41', '42', '43'], correct: 2, explanation_uz: '15 + 27 = 42', word: "qo'shish" },
        { type: 'fillBlank', question: '50 - 18 = ___', options: ['30', '31', '32', '33'], correct: 2, explanation_uz: '50 - 18 = 32', word: 'ayirish' },
        { type: 'fillBlank', question: '6 × 7 = ___', options: ['40', '41', '42', '43'], correct: 2, explanation_uz: "6 × 7 = 42. Ko'paytirish jadvali!", word: "ko'paytirish" },
        { type: 'fillBlank', question: '48 ÷ 6 = ___', options: ['6', '7', '8', '9'], correct: 2, explanation_uz: '48 ÷ 6 = 8. Chunki 6 × 8 = 48', word: "bo'lish" },
        { type: 'translate', question: 'juft son', options: ['1,3,5,7', '2,4,6,8', '1,2,3,4', '0,1,2,3'], correct: 1, explanation_uz: "Juft sonlar 2 ga qoldiqsiz bo'linadi: 2,4,6,8...", word: 'juft son' },
        { type: 'fillBlank', question: 'Ali 3500 so\'m non va 2000 so\'m sut oldi. Jami ___', options: ["5000 so'm", "5500 so'm", "6000 so'm", "4500 so'm"], correct: 1, explanation_uz: "3500 + 2000 = 5500 so'm", word: "qo'shish" },
        { type: 'translate', question: 'toq son', options: ['2,4,6,8', '1,3,5,7', '0,2,4,6', '3,6,9,12'], correct: 1, explanation_uz: "Toq sonlar 2 ga bo'linmaydi: 1,3,5,7,9...", word: 'toq son' },
        { type: 'fillBlank', question: 'Malika 24 ta olma berdi, 8 tasini oldi. Qancha qoldi?', options: ['14', '15', '16', '17'], correct: 2, explanation_uz: '24 - 8 = 16 ta olma qoldi', word: 'ayirish' },
        { type: 'fillBlank', question: '8 × 9 = ___', options: ['63', '70', '72', '81'], correct: 2, explanation_uz: "8 × 9 = 72. Ko'paytirish jadvali!", word: "ko'paytirish" },
        { type: 'fillBlank', question: '63 ÷ 7 = ___', options: ['7', '8', '9', '10'], correct: 2, explanation_uz: '63 ÷ 7 = 9. Chunki 7 × 9 = 63', word: "bo'lish" },
        { type: 'fillBlank', question: "100 ning 50% i = ___", options: ['25', '50', '75', '100'], correct: 1, explanation_uz: "50% = 100 ning yarmi = 50", word: 'foiz' },
        { type: 'translate', question: 'kasr', options: ['butun son', 'yuzdan bir', "butunning bir qismi", 'manfiy son'], correct: 2, explanation_uz: "Kasr = butun sonning bir qismi (1/2, 3/4, ...)", word: 'kasr' },
        { type: 'fillBlank', question: 'Sardor 5 ta daftarni 3000 so\'mdan oldi. Jami ___', options: ["8000 so'm", "12000 so'm", "15000 so'm", "18000 so'm"], correct: 2, explanation_uz: "5 × 3000 = 15000 so'm", word: "ko'paytirish" },
        { type: 'fillBlank', question: '36 ÷ 4 = ___', options: ['7', '8', '9', '10'], correct: 2, explanation_uz: '36 ÷ 4 = 9. Chunki 4 × 9 = 36', word: "bo'lish" },
        { type: 'fillBlank', question: '7 × 8 = ___', options: ['54', '56', '58', '60'], correct: 1, explanation_uz: "7 × 8 = 56. Ko'paytirish jadvali!", word: "ko'paytirish" },
        { type: 'translate', question: 'natija', options: ['savol', 'javob', 'amal', 'belgi'], correct: 1, explanation_uz: "Natija = amal bajarilgandan keyin hosil bo'lgan javob", word: 'natija' },
        { type: 'fillBlank', question: "200 so'mning 25% i = ___", options: ["25 so'm", "50 so'm", "75 so'm", "100 so'm"], correct: 1, explanation_uz: "25% = 1/4 qismi. 200 ÷ 4 = 50 so'm", word: 'foiz' },
        { type: 'fillBlank', question: 'Kamol 4 ta qutida 8 tadan olma bor. Jami ___', options: ['28', '30', '32', '34'], correct: 2, explanation_uz: '4 × 8 = 32 ta olma', word: "ko'paytirish" },
        { type: 'translate', question: 'tenglik', options: ['farq', "yig'indi", 'teng belgi', "ko'paytma"], correct: 2, explanation_uz: "Tenglik = = belgisi, ikki tomon teng ekanligini ko'rsatadi", word: 'tenglik' },
        { type: 'fillBlank', question: '9 × 9 = ___', options: ['72', '81', '90', '99'], correct: 1, explanation_uz: "9 × 9 = 81. Ko'paytirish jadvali!", word: "ko'paytirish" },
      ],
      speaking_sentences: [
        { text: "Besh qo'shishlik uch — sakkiz.", uzbek: '5 + 3 = 8', pronunciation_tip: "Raqamlarni o'zbek tilida aniq aytish", audio_intro: 'Quyidagi matematik gapni aytib ko\'ring' },
        { text: "O'n minus to'rt — olti.", uzbek: '10 - 4 = 6', pronunciation_tip: "'minus' so'zini aniq aytish", audio_intro: 'Quyidagi matematik gapni aytib ko\'ring' },
        { text: "Uch marta to'rt — o'n ikki.", uzbek: '3 × 4 = 12', pronunciation_tip: "'marta' = times", audio_intro: 'Quyidagi matematik gapni aytib ko\'ring' },
        { text: "O'n ikki bo'lishlik to'rt — uch.", uzbek: '12 ÷ 4 = 3', pronunciation_tip: "'bo'lishlik' = divided by", audio_intro: 'Quyidagi matematik gapni aytib ko\'ring' },
        { text: "Yigirma besh foiz — to'rtdan bir.", uzbek: '25% = 1/4', pronunciation_tip: "'foiz' = percent", audio_intro: 'Quyidagi matematik gapni aytib ko\'ring' },
        { text: "Ikki, to'rt, olti, sakkiz — juft sonlar.", uzbek: '2, 4, 6, 8 — even numbers', pronunciation_tip: 'Raqamlarni ketma-ket aytish', audio_intro: 'Quyidagi matematik gapni aytib ko\'ring' },
        { text: "Yetti marta sakkiz — ellik olti.", uzbek: '7 × 8 = 56', pronunciation_tip: "'ellik olti' aniq aytish", audio_intro: 'Quyidagi matematik gapni aytib ko\'ring' },
        { text: "To'qson bo'lishlik o'n — to'qqiz.", uzbek: '90 ÷ 10 = 9', pronunciation_tip: "'to'qson' = ninety", audio_intro: 'Quyidagi matematik gapni aytib ko\'ring' },
        { text: "Bir yarim — bu nol butun besh.", uzbek: '1.5 = 0.5 + 1', pronunciation_tip: "'yarim' = half", audio_intro: 'Quyidagi matematik gapni aytib ko\'ring' },
        { text: "Yuz so'mning yarmi — ellik so'm.", uzbek: "100 so'm ÷ 2 = 50 so'm", pronunciation_tip: "'yarmi' = half of", audio_intro: 'Quyidagi matematik gapni aytib ko\'ring' },
      ],
      story: {
        title: 'Bozorda hisob-kitob',
        title_uz: 'Bozorda hisob-kitob',
        text: "Ali bozorga bordi. U 3 kg olma 6000 so'mdan, 2 kg banan 8000 so'mdan oldi. Olmaga 18000 so'm, bananaga 16000 so'm to'ladi. Jami 34000 so'm sarfladi. Uning 50000 so'm bor edi. Qancha pul qoldi?",
        text_uz: "Ali bozorga bordi. 3 kg olma va 2 kg banan oldi. Jami 34000 so'm sarfladi. 50000 so'mdan 34000 so'mni ayirsak, 16000 so'm qoladi.",
        questions: [
          { question: "Olmaning 1 kg narxi?", question_uz: "1 kg olmaning narxi qancha?", options: ["5000 so'm", "6000 so'm", "7000 so'm", "8000 so'm"], correct: 1, explanation_uz: "Matnda '3 kg olma 6000 so'mdan' deyilgan — ya'ni 1 kg = 6000 so'm" },
          { question: "Jami qancha pul sarflandi?", question_uz: "Ali jami qancha pul sarfladi?", options: ["30000 so'm", "32000 so'm", "34000 so'm", "36000 so'm"], correct: 2, explanation_uz: "18000 + 16000 = 34000 so'm" },
          { question: "Qancha pul qoldi?", question_uz: "Alida qancha pul qoldi?", options: ["14000 so'm", "16000 so'm", "18000 so'm", "20000 so'm"], correct: 1, explanation_uz: "50000 - 34000 = 16000 so'm qoldi" },
        ],
      },
    },
  }

  return fallbacks[subject] || fallbacks.english
}
