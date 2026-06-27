import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import multer from 'multer'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local', override: true })

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message)
  console.error(err.stack)
})
process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason)
})

const OPENAI_KEY = (process.env.OPENAI_API_KEY || '').trim()
console.log('🔑 Key prefix:', OPENAI_KEY.slice(0, 20))
console.log('🔑 Key length:', OPENAI_KEY.length)

const upload = multer({ storage: multer.memoryStorage() })

let _supabaseAdmin = null
const getAdmin = () => {
  if (!_supabaseAdmin && process.env.SUPABASE_SERVICE_KEY) {
    _supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_KEY
    )
  }
  return _supabaseAdmin
}

// ─── Timeout-safe fetch wrapper ────────────────────────────────────
const fetchWithTimeout = async (url, options, timeoutMs = 25000) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(timeout)
    return response
  } catch (err) {
    clearTimeout(timeout)
    if (err.name === 'AbortError') {
      throw new Error('Request timed out after ' + timeoutMs + 'ms')
    }
    throw err
  }
}

const app = express()
app.use(cors())
app.use(express.json())

app.post('/api/realtime-token', async (req, res) => {
  console.log('Realtime token requested...')
  try {
    const response = await fetchWithTimeout('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview',
        voice: 'alloy',
      }),
    }, 25000)
    const data = await response.json()
    res.json({ client_secret: data.client_secret })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/explain', async (req, res) => {
  try {
    const { topic, level, language } = req.body
    const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 500,
        messages: [
          {
            role: 'system',
            content: `You are a friendly language tutor for Uzbek-speaking students. Explain concepts simply using emoji. Always give 3 examples. UI language: ${language ?? 'uz'}. Keep explanations SHORT. Respond ONLY with valid JSON, no markdown. Format: { "explanation": "...", "examples": ["...","...","..."], "tip": "..." }`,
          },
          {
            role: 'user',
            content: `Explain this topic for ${level} level: ${topic}`,
          },
        ],
      }),
    }, 25000)
    const data = await response.json()
    res.json(data.choices[0].message.content)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Topic curriculum banks (fallback when AI fails)
const TOPIC_BANK = {
  english: ['Present Simple','Past Simple','Future Simple','Present Continuous','Modal Verbs (can/must)','Adjectives','Prepositions','Questions & Negatives','Comparatives & Superlatives','Articles (a/an/the)','Countable & Uncountable','Present Perfect','Past Continuous','Conjunctions','Passive Voice'],
  russian: ['Настоящее время','Прошедшее время','Будущее время','Падежи (именительный)','Падежи (родительный)','Глаголы движения','Прилагательные','Предлоги','Вопросительные слова','Отрицание','Числительные','Виды глаголов','Притяжательные местоимения','Множественное число','Императив'],
  math: ['Сложение','Вычитание','Умножение','Деление','Дроби','Проценты','Десятичные числа','Геометрия: периметр','Геометрия: площадь','Уравнения','Неравенства','Задачи на движение','Степени','Корни','Координаты'],
}

app.post('/api/plan-lesson', async (req, res) => {
  const { context } = req.body
  const userId = context?.userId
  const name = context?.studentName?.split(' ')[0] || "o'quvchi"
  const subj = context?.subject || 'english'
  const level = context?.level || 'elementary'
  const currentLesson = context?.currentLesson || context?.totalLessons || 0
  const streak = context?.streak || 0
  const dailyMinutes = context?.dailyMinutes || 30

  console.log('Plan lesson:', name, subj, level, 'lesson#', currentLesson, '| userId:', userId)

  // Fetch real session history from Supabase using service key
  let recentTopics = []
  let avgAccuracy = context?.recentAccuracy ?? 50
  let avgEngagement = 50
  let topMistakes = []
  let weakWords = context?.weakWords || []

  const admin = getAdmin()
  if (admin && userId) {
    try {
      const { data: sessions } = await admin
        .from('session_logs')
        .select('ai_notes, accuracy_percent, engagement_score, words_wrong')
        .eq('user_id', userId)
        .eq('subject', subj)
        .order('created_at', { ascending: false })
        .limit(5)

      if (sessions?.length) {
        recentTopics = sessions
          .map(s => s.ai_notes?.match(/\[TOPIC: ([^\]]+)\]/)?.[1])
          .filter(Boolean)

        const accuracies = sessions.filter(s => s.accuracy_percent > 0).map(s => s.accuracy_percent)
        if (accuracies.length) avgAccuracy = Math.round(accuracies.reduce((a, b) => a + b, 0) / accuracies.length)

        const engagements = sessions.filter(s => s.engagement_score > 0).map(s => s.engagement_score)
        if (engagements.length) avgEngagement = Math.round(engagements.reduce((a, b) => a + b, 0) / engagements.length)

        const mistakeCounts = sessions
          .flatMap(s => s.words_wrong || [])
          .reduce((acc, w) => { acc[w] = (acc[w] || 0) + 1; return acc }, {})
        topMistakes = Object.entries(mistakeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([w]) => w)
      }

      const { data: vocab } = await admin
        .from('vocabulary_bank')
        .select('word')
        .eq('user_id', userId)
        .eq('subject', subj)
        .eq('mastered', false)
        .order('times_correct', { ascending: true })
        .limit(5)

      if (vocab?.length) weakWords = vocab.map(v => v.word)

      console.log('✅ Supabase fetch: topics:', recentTopics, '| accuracy:', avgAccuracy + '%', '| weakWords:', weakWords)
    } catch (e) {
      console.warn('⚠️ Admin Supabase fetch failed:', e.message)
    }
  }

  const avoidList = recentTopics.length ? `Topics already covered (DO NOT repeat): ${recentTopics.join(', ')}.` : ''
  const progressNote = avgAccuracy < 50
    ? 'Student struggling — choose a review topic or simpler content.'
    : avgAccuracy > 85
    ? 'Student excelling — introduce a new or more advanced topic.'
    : 'Student progressing normally — continue the natural curriculum sequence.'
  const weakNote = weakWords.length ? `Weak vocabulary to reinforce: ${weakWords.join(', ')}.` : ''
  const mistakeNote = topMistakes.length ? `Repeated mistake words: ${topMistakes.join(', ')}.` : ''
  const streakNote = streak >= 3 ? `Student has a ${streak}-day streak — give an especially warm Uzbek message!` : ''

  const bank = TOPIC_BANK[subj] || TOPIC_BANK.english

  try {
    const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 500,
        messages: [{
          role: 'system',
          content: `You are a world-class ${subj} teacher with 20 years of experience teaching Uzbek students. You have the student's full learning history. Design the perfect personalized next lesson.

Student: ${name} | Subject: ${subj} | Level: ${level} | Lesson #${currentLesson + 1}
Streak: ${streak} days | Session goal: ${dailyMinutes} min/day
Accuracy last 5 sessions: ${avgAccuracy}% | Engagement: ${avgEngagement}%
${avoidList}
${progressNote}
${weakNote}
${mistakeNote}
${streakNote}

The aiMessage MUST be in Uzbek. Return ONLY valid JSON, no markdown.`,
        }, {
          role: 'user',
          content: `Design lesson #${currentLesson + 1} for ${name}. Return exactly:
{"topic":"...","topicUzbek":"...","difficulty":"${level}","method":"mixed","focusWords":["...","...","..."],"weakPointsToAddress":${JSON.stringify(topMistakes.slice(0, 3))},"newGrammar":"...","estimatedMinutes":${dailyMinutes},"aiMessage":"Salom, ${name}! ...","adjustmentReason":"...","speakingFocus":"...","reviewWords":${JSON.stringify(weakWords.slice(0, 3))}}`,
        }],
      }),
    }, 20000)

    const raw = await response.json()
    if (!raw.choices?.[0]) throw new Error('No choices')
    let content = raw.choices[0].message.content.trim()
    content = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    const plan = JSON.parse(content)
    console.log('✅ AI plan:', plan.topic, '| accuracy ctx:', avgAccuracy + '%', '| reason:', plan.adjustmentReason)
    res.json(plan)
  } catch (err) {
    console.error('❌ Plan error:', err.message, '— using curriculum fallback')
    const startIdx = currentLesson % bank.length
    let topic = bank[startIdx]
    for (let i = 0; i < bank.length; i++) {
      const candidate = bank[(startIdx + i) % bank.length]
      if (!recentTopics.includes(candidate)) { topic = candidate; break }
    }
    res.json({
      topic,
      topicUzbek: topic,
      difficulty: level,
      method: 'mixed',
      focusWords: weakWords.slice(0, 3),
      weakPointsToAddress: topMistakes.slice(0, 3),
      newGrammar: topic,
      estimatedMinutes: dailyMinutes,
      aiMessage: `Salom, ${name}! Bugun: ${topic}! 💪`,
      adjustmentReason: 'curriculum fallback',
      speakingFocus: topic,
      reviewWords: weakWords.slice(0, 3),
    })
  }
})

app.post('/api/generate-notes', async (req, res) => {
  const { sessionData } = req.body
  const topic = sessionData?.topic || ''
  const topicTag = topic ? `[TOPIC: ${topic}]\n` : ''
  try {
    const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 200,
        messages: [{
          role: 'system',
          content: 'You are a tutor writing brief notes about a student session. Write 2-3 sentences in English about what the student struggled with and what worked well. Be specific and actionable for the next session.',
        }, {
          role: 'user',
          content: `Session data: ${JSON.stringify(sessionData)}`,
        }],
      }),
    }, 25000)
    const data = await response.json()
    res.json({ notes: topicTag + data.choices[0].message.content })
  } catch (err) {
    res.status(500).json({ notes: topicTag + 'Session completed.' })
  }
})

// ─── Generate lesson (with retry on failure) ───────────────────────
app.post('/api/generate-lesson', async (req, res) => {
  const { plan, subject, level, lessonNumber, weakWords = [] } = req.body
  console.log('Generate lesson for:', subject, level, 'lesson', lessonNumber)

  const subjectName = subject === 'english' ? 'English' : subject === 'russian' ? 'Russian' : 'Math'
  const weakWordsList = weakWords.length ? `Weak words to reinforce: ${weakWords.join(', ')}.` : ''

  const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
  const HEADERS = { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_KEY}` }

  // EXAMPLE_JSON shows ONLY the required JSON structure — AI must generate entirely new content for the actual topic
  const EXAMPLE_JSON = `{"vocabulary":[{"word":"red","translation":"qizil","example":"The apple is red.","example_uz":"Olma qizil.","pronunciation":"/rɛd/"},{"word":"big","translation":"katta","example":"This is a big house.","example_uz":"Bu katta uy.","pronunciation":"/bɪɡ/"},{"word":"happy","translation":"baxtli","example":"She is happy today.","example_uz":"U bugun baxtli.","pronunciation":"/ˈhæpi/"},{"word":"fast","translation":"tez","example":"The car is fast.","example_uz":"Mashina tez.","pronunciation":"/fæst/"},{"word":"small","translation":"kichik","example":"I have a small cat.","example_uz":"Mening kichik mushugim bor.","pronunciation":"/smɔːl/"}],"grammar_explanation":{"title":"Adjectives (Sifatlar)","explanation":"Sifatlar narsa yoki shaxsning xususiyatini ifodalaydi.","rule":"Sifat + ot: a big dog, a red car","examples":[{"target":"The dog is big.","uzbek":"It katta."},{"target":"She has a red bag.","uzbek":"Uning qizil sumkasi bor."}],"tip":"Ingliz tilida sifat har doim otdan oldin keladi!"},"exercises":[{"type":"fillBlank","question":"The apple is ___.","options":["red","reads","reds","redding"],"correct":0,"explanation_uz":"Sifat o'zgarmaydi, red to'g'ri."},{"type":"translate","question":"Bu katta uy.","options":["This is a house big.","This is a big house.","This big is house.","A house is big this."],"correct":1,"explanation_uz":"Sifat otdan oldin: big house."},{"type":"fillBlank","question":"She is ___ today.","options":["happily","happy","happier","happiness"],"correct":1,"explanation_uz":"To'ldiruvchi sifat: happy."},{"type":"translate","question":"Mashina tez.","options":["The car fast is.","Fast is the car.","The car is fast.","The fast car is."],"correct":2,"explanation_uz":"To'g'ri tartib: The car is fast."},{"type":"fillBlank","question":"I have a ___ cat.","options":["small","smaller","smalls","smalled"],"correct":0,"explanation_uz":"Oddiy sifat: small."},{"type":"translate","question":"U baxtli qiz.","options":["She is a girl happy.","She is a happy girl.","Happy she is a girl.","She happy is girl."],"correct":1,"explanation_uz":"Sifat otdan oldin: happy girl."},{"type":"fillBlank","question":"I have a ___ bag.","options":["red","reds","redly","redded"],"correct":0,"explanation_uz":"Sifat o'zgarmaydi."},{"type":"translate","question":"Kichik mushuk.","options":["A cat small.","Small a cat.","A small cat.","The cat smalls."],"correct":2,"explanation_uz":"A small cat — sifat otdan oldin."}],"story":{"title":"My Pet","text":"I have a small cat. Her name is Luna. Luna is white and very happy. She runs fast every morning.","text_uz":"Mening kichik mushugim bor. Uning ismi Luna. Luna oq va juda baxtli. U har kuni ertalab tez yuguradi.","questions":[{"question":"What color is Luna?","options":["Red","Black","White","Brown"],"correct":2},{"question":"How does Luna run?","options":["Slowly","Fast","Loudly","Quietly"],"correct":1},{"question":"How does the cat feel?","options":["Sad","Angry","Happy","Tired"],"correct":2}]},"speaking_sentences":["The apple is red.","This is a big house.","She is a happy girl.","The car is fast.","I have a small cat."],"youtube_video":{"video_id":"oR8gZKiE3jE","title":"English Adjectives for Beginners","summary_uz":"Bu videoda ingliz tilida sifatlar qanday ishlatilishi va narsa-buyumlarni tasvirlash uchun qanday qo'llanilishi ko'rsatiladi.","video_questions":[{"question":"Sifat gapda qayerda turadi?","options":["Fe'ldan keyin","Otdan oldin","Gapning oxirida","Har qayerda"],"correct":1},{"question":"Qaysi so'z sifat?","options":["Run","Happy","Quickly","The"],"correct":1}]}}`

  const parseLesson = (raw) => {
    if (!raw.choices?.[0]) throw new Error('No choices returned')
    let content = raw.choices[0].message.content.trim()
    content = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    return JSON.parse(content)
  }

  // ── First attempt ─────────────────────────────────────────────────
  try {
    const response = await fetchWithTimeout(OPENAI_URL, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 3000,
        messages: [{
          role: 'system',
          content: `You are a master ${subjectName} teacher creating an adaptive lesson for Uzbek-speaking students.
Level: ${level} | Lesson #${lessonNumber} | Topic: "${plan?.topic || 'General'}"
${weakWordsList}
${plan?.weakPointsToAddress?.length ? `Focus on fixing these known mistakes: ${plan.weakPointsToAddress.join(', ')}.` : ''}

SUBJECT-SPECIFIC RULES:
${subjectName === 'English'
  ? `- Grammar must address what Uzbek speakers find hardest about this point (word order, articles, tenses).
- Add a "common_mistake" field to grammar_explanation: the #1 mistake Uzbek students make with this topic.
- Vocabulary: high-frequency words useful in daily conversation.
- Exercises must directly test the exact grammar rule being taught.`
  : subjectName === 'Russian'
  ? `- For cases: explicitly explain WHICH case and WHY (Uzbek has no cases — this needs extra clarity).
- Add a "common_mistake" field to grammar_explanation for Uzbek speakers specifically.
- Vocabulary should mix formal and informal registers.
- Exercises must practice the exact grammatical form in context.`
  : `- Word problems must use Uzbek everyday contexts (bozor, uy, maktab).
- Each exercise must show clear logical steps.
- Add a "common_mistake" field to grammar_explanation explaining common conceptual errors.
- Focus on building number sense, not just procedures.`}

STRICT CONTENT REQUIREMENTS — NO EXCEPTIONS:
- vocabulary: EXACTLY 10 items (no more, no fewer)
- exercises: EXACTLY 20 items (mix of fillBlank and translate types)
- speaking_sentences: EXACTLY 10 items
- story.questions: EXACTLY 3 items
If you return fewer items the lesson will be too short and the student will not learn enough.

CRITICAL: Generate completely NEW content for "${plan?.topic || 'General'}".
Do NOT copy from the example JSON — use its structure only.
All Uzbek text must be natural, fluent Uzbek (not literal translation).
For youtube_video: use a REAL educational video (BBC Learning English / Khan Academy / English with Lucy / similar).
Return ONLY valid JSON, no markdown.`
        }, {
          role: 'user',
          content: `Generate a complete ${subjectName} lesson about "${plan?.topic || 'General'}" for level ${level}. ALL vocabulary, exercises, and story MUST be about "${plan?.topic || 'General'}" — do not copy from the example. Return ONLY this JSON structure filled with new topic-specific content:\n${EXAMPLE_JSON}`
        }]
      }),
    }, 25000)

    const raw = await response.json()
    console.log('Generate lesson status:', response.status, 'tokens:', raw.usage?.total_tokens)
    const lesson = parseLesson(raw)
    console.log('✅ Lesson generated:', lesson.vocabulary?.length, 'words,', lesson.exercises?.length, 'exercises')
    return res.json(lesson)

  } catch (firstErr) {
    console.warn('⚠️ First attempt failed:', firstErr.message, '— retrying with simpler prompt')
  }

  // ── Retry with stripped-down prompt ──────────────────────────────
  try {
    const response = await fetchWithTimeout(OPENAI_URL, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 2500,
        messages: [{
          role: 'system',
          content: `Create a ${subjectName} lesson JSON for Uzbek students. Level: ${level}. Topic: ${plan?.topic || 'General'}. MUST include: 10 vocabulary items, 20 exercises, 10 speaking_sentences, 1 story with 3 questions. Return ONLY valid JSON, no markdown.`
        }, {
          role: 'user',
          content: `Return ONLY this JSON (fill in real content for topic "${plan?.topic || 'General'}"):\n${EXAMPLE_JSON}`
        }]
      }),
    }, 25000)

    const raw = await response.json()
    console.log('Retry status:', response.status, 'tokens:', raw.usage?.total_tokens)
    const lesson = parseLesson(raw)
    console.log('✅ Retry lesson generated:', lesson.vocabulary?.length, 'words')
    return res.json(lesson)

  } catch (retryErr) {
    console.error('❌ Both attempts failed:', retryErr.message)
    return res.status(500).json({ error: retryErr.message })
  }
})

app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  console.log('Transcribe endpoint hit')
  console.log('File received:', req.file ? `${req.file.size} bytes` : 'NO FILE')

  try {
    if (!req.file) {
      return res.status(400).json({ transcript: '', error: 'No audio file received' })
    }

    const file = new File([req.file.buffer], 'audio.webm', { type: 'audio/webm' })
    const formData = new FormData()
    formData.append('file', file)
    formData.append('model', 'whisper-1')
    formData.append('language', req.body.language || 'en')

    console.log('Sending to Whisper API...')

    const response = await fetchWithTimeout('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_KEY}`,
        // No Content-Type — let fetch set it with the correct multipart boundary
      },
      body: formData,
    }, 25000)

    const data = await response.json()
    console.log('Whisper response:', data)

    if (data.error) {
      console.error('Whisper API error:', data.error)
      return res.status(500).json({ transcript: '', error: data.error.message })
    }

    const transcript = data.text || ''
    console.log('Transcript:', transcript)

    console.log('Calling GPT for pronunciation analysis...')
    const analysisResponse = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 250,
        messages: [{
          role: 'system',
          content: `You are a strict professional pronunciation coach and IELTS examiner.

Your job: Compare what the student SAID vs what they SHOULD have said.
Be STRICT — catch every error including:
- Wrong word stress (e.g. "MOR-ning" vs "mor-NING")
- Missing sounds (e.g. dropping the 't' in "water")
- Wrong vowel sounds (e.g. "breed" instead of "bread")
- Added or missing words
- Unclear/mumbled words
- Wrong rhythm or intonation pattern
- Non-native sound substitutions common for Uzbek speakers
  (e.g. confusing v/w, adding vowels between consonants,
   rolling r too hard, confusion with th sound)

Scoring (be STRICT, not generous):
- 90-100: Native-like, perfect
- 75-89: Very good, minor accent only
- 60-74: Good but noticeable errors
- 45-59: Several clear errors
- Below 45: Major errors, needs practice

Respond ONLY with valid JSON, no markdown:
{
  "overall": 0-100,
  "accuracy": 0-100,
  "fluency": 0-100,
  "pronunciation": 0-100,
  "wordScores": [
    {"word": "I", "score": 95, "issue": null},
    {"word": "eat", "score": 60, "issue": "sounded like 'it'"}
  ],
  "feedback_uz": "TO'LIQ O'ZBEK TILIDA: 1) Nima noto'g'ri aytildi, 2) Qanday tuzatish kerak, 3) Fonetik maslahat.",
  "correct_pronunciation": "TO'G'RI TALAFFUZ (o'zbek tilida): Muammoli so'zlar uchun fonetik ko'rsatmalar.",
  "passed": true
}

"passed" = true only if overall >= 70

CRITICAL: Only evaluate EXACTLY what the student said.
Be STRICT about these common Uzbek speaker errors:
- W sound: 'vater'→'water', 'vork'→'work'
- TH sound: 'ze'→'the', 'sink'→'think'
- Short vs long vowels: 'ship'→'sheep', 'bit'→'beat'
- Final consonants: dropping 's','d','t' at end
- R sound: rolling R too hard`,
        }, {
          role: 'user',
          content: `Expected sentence: "${req.body.expected || ''}"
Student said: "${transcript}"
Student's native language: Uzbek
Target language: ${req.body.language === 'ru' ? 'Russian' : 'English'}

Analyze pronunciation strictly.`,
        }],
      }),
    }, 25000)

    const analysisRaw = await analysisResponse.json()
    console.log('Pronunciation GPT raw:', JSON.stringify(analysisRaw))

    if (!analysisRaw.choices || !analysisRaw.choices[0]) {
      console.error('Pronunciation GPT failed:', analysisRaw)
      return res.json({ transcript, pronunciation: null, error: 'GPT analysis failed' })
    }

    const analysisContent = analysisRaw.choices[0].message.content
    console.log('Pronunciation content:', analysisContent)

    const cleanAnalysis = analysisContent
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    let pronunciation
    try {
      pronunciation = JSON.parse(cleanAnalysis)
      console.log('✅ Pronunciation score:', pronunciation.overall)
    } catch (e) {
      console.error('Pronunciation parse error:', e.message)
      pronunciation = null
    }

    res.json({ transcript, pronunciation })
  } catch (err) {
    console.error('Transcribe error:', err.message)
    res.status(500).json({ transcript: '', error: err.message })
  }
})

// ─── Tutor phrase generator ────────────────────────────────────────
const LEVEL_GROUP_MAP = {
  a0: 'beginner', a1: 'beginner', beginner: 'beginner', elementary: 'beginner',
  a2: 'intermediate', b1: 'intermediate', preintermediate: 'intermediate', intermediate: 'intermediate',
  b2: 'advanced', advanced: 'advanced',
}

const PHRASE_SCHEMA = {
  beginner: `{"levelGroup":"beginner","phrase":"I eat bread every morning.","slowVersion":"I... eat... bread... every... morning.","uzbekMeaning":"Bu — men har kuni ertalab non yeyman — degani","repeatPrompt":"Endi men bilan qaytaring: I - EAT - BREAD - EVERY - MORNING","phonetics":"/aɪ iːt brɛd/"}`,
  intermediate: `{"levelGroup":"intermediate","phrase":"What did you do yesterday?","uzbekContext":"Bu — o'tgan kun haqida do'stona so'rash","usageExample":"Masalan: 'Hey Tom, what did you do yesterday?'","grammarNote":"Past Simple: did + V1"}`,
  advanced: `{"levelGroup":"advanced","variants":["What did you get up to?","What've you been up to?","How'd it go?"],"nuanceUz":"Britaniyaliklar 'get up to' deydi, amerikachilar esa 'What did you do?' ishlatadi","formalInformal":"Rasmiy: 'How was your day?' | Norasmiy: 'What've you been up to?'","conversationPrompt":"Bu iboralardan birini ishlatib, kecha nima qilganingizni aytib bering"}`,
}

app.post('/api/tutor-phrase', async (req, res) => {
  const { level = 'a1', topic = 'greetings', subject = 'english' } = req.body
  const levelGroup = LEVEL_GROUP_MAP[level.toLowerCase().replace(/[\s-]/g, '')] || 'beginner'

  const systemPrompts = {
    beginner: `You are Nigora, a warm Uzbek English teacher for BEGINNER (${level}) students.
Topic: "${topic}". Create ONE teaching sentence for this level.
RULES: max 7 words, present simple only, everyday vocabulary.
uzbekMeaning must start with "Bu —". repeatPrompt must UPPERCASE the English phrase with dashes between words.
Return ONLY valid JSON matching this exact structure (fill with new content for topic "${topic}"):
${PHRASE_SCHEMA.beginner}`,

    intermediate: `You are Nigora, a warm Uzbek English teacher for INTERMEDIATE (${level}) students.
Topic: "${topic}". Create ONE natural conversational English sentence.
RULES: natural spoken English, related to topic. uzbekContext is brief (NOT a full translation — just function/situation in Uzbek). usageExample starts with "Masalan:".
Return ONLY valid JSON matching this exact structure (fill with new content for topic "${topic}"):
${PHRASE_SCHEMA.intermediate}`,

    advanced: `You are Nigora, a warm Uzbek English teacher for ADVANCED (${level}) students.
Topic: "${topic}". Create 2-3 colloquial/natural English variants (include British/American differences when relevant).
RULES: real native speech, not textbook English. nuanceUz explains cultural/regional differences in Uzbek. formalInformal shows formal vs casual options. conversationPrompt (in Uzbek) tells student how to use these.
Return ONLY valid JSON matching this exact structure (fill with new content for topic "${topic}"):
${PHRASE_SCHEMA.advanced}`,
  }

  try {
    const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 250,
        messages: [
          { role: 'system', content: systemPrompts[levelGroup] },
          { role: 'user', content: `Generate teaching phrase for topic: "${topic}"` },
        ],
      }),
    }, 20000)

    const raw = await response.json()
    let content = raw.choices[0].message.content.trim()
    content = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    const data = JSON.parse(content)
    console.log('✅ Tutor phrase:', data.phrase || data.variants?.[0], '| levelGroup:', levelGroup)
    res.json(data)
  } catch (err) {
    console.error('Tutor phrase error:', err.message, '— using fallback')
    const fallbacks = {
      beginner: { levelGroup: 'beginner', phrase: 'Hello, how are you?', slowVersion: 'Hello... how... are... you?', uzbekMeaning: "Bu — salom, qandaysiz — degani", repeatPrompt: 'Endi men bilan qaytaring: HELLO - HOW - ARE - YOU', phonetics: '/həˈloʊ haʊ ɑːr juː/' },
      intermediate: { levelGroup: 'intermediate', phrase: "What did you do yesterday?", uzbekContext: "Bu — o'tgan kun haqida so'rash", usageExample: "Masalan: 'Hey, what did you do yesterday?'", grammarNote: 'Past Simple' },
      advanced: { levelGroup: 'advanced', variants: ["What've you been up to?", "How's it going?", "You alright? (British)"], nuanceUz: "Britaniyaliklar 'You alright?' deydi, bu 'How are you?' ma'nosida", formalInformal: "Rasmiy: 'How are you?' | Norasmiy: 'What've you been up to?'", conversationPrompt: "Bu iboralardan birini ishlatib, o'zingiz haqida gapiring" },
    }
    res.json(fallbacks[levelGroup])
  }
})

// ─── Nigora's response after student speaks ────────────────────────
app.post('/api/nigora-response', async (req, res) => {
  const { score = 0, phrase = '', heard = '', level = 'a1' } = req.body
  const scoreLabel = score >= 85 ? 'excellent' : score >= 70 ? 'good' : score >= 50 ? 'needs work' : 'poor'

  try {
    const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 80,
        messages: [{
          role: 'system',
          content: `You are Nigora, a warm encouraging Uzbek English teacher. Student (level: ${level}) practiced saying: "${phrase}". They said: "${heard || '...'}". Score: ${score}/100 (${scoreLabel}).

Write 2 SHORT sentences IN UZBEK ONLY:
- Score ≥ 85: celebrate warmly + 1 tip to improve further
- Score 70–84: praise + point out ONE specific issue
- Score 50–69: encourage + name exactly what to fix
- Score < 50: be very gentle, give ONE concrete phonetic tip, say they can do it

Never use English. End with encouragement. Max 2 emojis.`,
        }, { role: 'user', content: 'Generate Nigora response in Uzbek.' }],
      }),
    }, 12000)

    const raw = await response.json()
    res.json({ response_uz: raw.choices[0].message.content.trim() })
  } catch {
    const fallback = score >= 70
      ? "Zo'r! Talaffuzingiz yaxshi bo'lyapti, davom eting! 🌸"
      : score >= 50
      ? "Yaxshi harakat! Yana bir marta urinib ko'ring, siz uddalaysiz! 💪"
      : "Hech qo'rqmang, bu normal! Sekin-asta qaytaring, hammasi yaxshi bo'ladi! 🌟"
    res.json({ response_uz: fallback })
  }
})

// ─── Session analysis (called after lesson completes) ─────────────
app.post('/api/analyze-session', async (req, res) => {
  const { sessionData } = req.body
  const topic = sessionData?.topic || ''
  const accuracy = sessionData?.accuracy_percent || 0
  const wrongWords = sessionData?.words_wrong || []
  const speakingScore = sessionData?.speaking_avg_score || 0
  const topicTag = topic ? `[TOPIC: ${topic}]\n` : ''

  try {
    const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 200,
        messages: [{
          role: 'system',
          content: `You are an experienced language tutor writing brief notes after a student's lesson session.
Write 2-3 sentences IN ENGLISH that are:
1. Specific — name the exact words/concepts the student missed
2. Actionable — give one clear recommendation for next session
3. Encouraging — acknowledge what went well

Reference the actual session numbers provided. Be precise and brief.`,
        }, {
          role: 'user',
          content: `Session summary: topic="${topic}", accuracy=${accuracy}%, speaking_avg=${speakingScore}/100, wrong_words=[${wrongWords.join(', ')}], subject=${sessionData?.subject || 'english'}. Full data: ${JSON.stringify(sessionData)}`,
        }],
      }),
    }, 25000)
    const data = await response.json()
    const notes = data.choices?.[0]?.message?.content?.trim() || 'Session completed.'
    res.json({ notes: topicTag + notes })
  } catch {
    res.json({ notes: topicTag + 'Session completed.' })
  }
})

// ─── Video database (verified embeddable IDs) ──────────────────────
const videoDatabase = {
  english: {
    'Present Simple':      'MuAPsd73yn4',
    'Past Simple':         'R3psCH_Ydgk',
    'Future Tense':        'FhxR5hOV-dA',
    'Future Simple':       'FhxR5hOV-dA',
    'Present Continuous':  'oTAqNkS2SoA',
    'Modal Verbs':         'oTAqNkS2SoA',
    'Daily Routines':      'nHRvXkp4Pqk',
    'Daily activities':    'nHRvXkp4Pqk',
    'Greetings':           'p7WzHvBCF1c',
    'Numbers':             'DR-ogZMxMnI',
    'Colors':              'eTo4mFMGiSQ',
    'Family':              'p7WzHvBCF1c',
    'Food':                'iDvTBc0THNA',
    'Animals':             'oTAqNkS2SoA',
    'Body parts':          'oTAqNkS2SoA',
    'default':             'MuAPsd73yn4',
  },
  russian: {
    'Алфавит':             'uNBRjVfWUpQ',
    'Приветствия':         'aQxTmA3dDYk',
    'Числа':               'VlBWVd8RJPA',
    'default':             'uNBRjVfWUpQ',
  },
  math: {
    "Ko'paytirish":        'mvOkMYCygps',
    'Kasrlar':             'jFd-6EPfnec',
    'Foizlar':             'UYTBLlvGmCo',
    'default':             'mvOkMYCygps',
  },
}

function findVideo(topic, subject) {
  const db = videoDatabase[subject] || videoDatabase.english
  if (db[topic]) return db[topic]
  const topicLower = topic.toLowerCase()
  for (const [key, id] of Object.entries(db)) {
    if (key === 'default') continue
    if (key.toLowerCase().includes(topicLower) || topicLower.includes(key.toLowerCase())) {
      return id
    }
  }
  return db['default']
}

app.post('/api/find-video', (req, res) => {
  const { topic = '', subject = 'english' } = req.body
  const id = findVideo(topic, subject)
  res.json({ id, title: topic })
})

// ─── TTS ──────────────────────────────────────────────────────────
const YANDEX_KEY = process.env.YANDEX_TTS_API_KEY

async function yandexTTS({ text, voice = 'nigora', lang = 'uz-UZ', speed = 1.0 }) {
  const params = new URLSearchParams({ text, voice, lang, speed: String(speed), format: 'mp3' })
  const r = await fetch('https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize', {
    method: 'POST',
    headers: {
      Authorization: `Api-Key ${YANDEX_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })
  if (!r.ok) throw new Error(`Yandex TTS ${r.status}: ${await r.text()}`)
  return Buffer.from(await r.arrayBuffer())
}

app.post('/api/tts-uzbek', async (req, res) => {
  const { text = '', slow = false } = req.body
  if (!text.trim()) return res.status(400).json({ error: 'text required' })
  try {
    const buf = await yandexTTS({ text, voice: 'nigora', lang: 'uz-UZ', speed: slow ? 0.75 : 1.0 })
    res.set('Content-Type', 'audio/mpeg').send(buf)
  } catch (e) {
    console.error('TTS uz error:', e.message)
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/tts', async (req, res) => {
  const { text = '', voice = 'shimmer', speed = 1.0 } = req.body
  if (!text.trim()) return res.status(400).json({ error: 'text required' })
  console.log('🔊 TTS request:', text?.slice(0, 30))
  try {
    const r = await fetchWithTimeout('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({ model: 'tts-1', input: text, voice, speed }),
    }, 15000)
    if (!r.ok) {
      const err = await r.json().catch(() => ({}))
      console.error('TTS error:', err)
      return res.status(500).json({ error: 'TTS failed' })
    }
    const buf = Buffer.from(await r.arrayBuffer())
    res.set('Content-Type', 'audio/mpeg').send(buf)
    console.log('✅ TTS sent:', text?.slice(0, 30))
  } catch (e) {
    console.error('TTS exception:', e.message)
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/tts-russian', async (req, res) => {
  const { text = '', speed = 1.0 } = req.body
  if (!text.trim()) return res.status(400).json({ error: 'text required' })
  try {
    const buf = await yandexTTS({ text, voice: 'alena', lang: 'ru-RU', speed })
    res.set('Content-Type', 'audio/mpeg').send(buf)
  } catch (e) {
    console.error('TTS ru error:', e.message)
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/tts-english', async (req, res) => {
  const { text = '', speed = 1.0, voice = 'shimmer' } = req.body
  if (!text.trim()) return res.status(400).json({ error: 'text required' })
  try {
    const r = await fetchWithTimeout('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({ model: 'tts-1', input: text, voice, speed }),
    }, 15000)
    if (!r.ok) throw new Error(`OpenAI TTS ${r.status}: ${await r.text()}`)
    const buf = Buffer.from(await r.arrayBuffer())
    res.set('Content-Type', 'audio/mpeg').send(buf)
  } catch (e) {
    console.error('TTS en error:', e.message)
    res.status(500).json({ error: e.message })
  }
})

if (!process.env.VERCEL) {
  app.listen(3001, () => console.log('API server running on http://localhost:3001'))
}

export default app
