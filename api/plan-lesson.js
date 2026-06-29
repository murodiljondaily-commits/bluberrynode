import { createClient } from '@supabase/supabase-js'

// CEFR ladder used for adaptive progression. Legacy values are normalized in.
const LADDER = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1']
const LEGACY_LEVEL = {
  beginner: 'A0', elementary: 'A1', a0: 'A0', a1: 'A1', a2: 'A2',
  intermediate: 'B1', b1: 'B1', b2: 'B2', advanced: 'C1', c1: 'C1', mastery: 'C1',
}
function normLevel(v) {
  if (!v) return 'A0'
  const s = String(v).trim()
  if (LADDER.includes(s)) return s
  return LEGACY_LEVEL[s.toLowerCase()] || 'A0'
}
function levelToDifficulty(level) {
  const i = LADDER.indexOf(level)
  if (i <= 1) return 'easy'        // A0, A1
  if (i <= 3) return 'medium'      // A2, B1
  return 'hard'                    // B2, C1
}

// The adaptive brain: look at the most recent sessions and decide whether the
// student should move up a level, stay, or drop back — "a 20-year tutor reading the room".
function decideLevel(currentLevel, sessions) {
  const idx = LADDER.indexOf(currentLevel)
  const recent = (sessions || []).slice(0, 3).map(s => s.accuracy_percent ?? 0)
  if (recent.length < 2) return { level: currentLevel, changed: false, reason: 'Not enough history yet' }
  const avg = recent.reduce((a, b) => a + b, 0) / recent.length
  const allStrong = recent.length >= 3 && recent.every(a => a >= 80)
  // Promote: 3 recent sessions all >= 80%. Demote: recent avg < 35%.
  if (allStrong && idx < LADDER.length - 1) {
    return { level: LADDER[idx + 1], changed: true, reason: `3 strong sessions (avg ${Math.round(avg)}%) — leveled up` }
  }
  if (avg < 35 && idx > 0) {
    return { level: LADDER[idx - 1], changed: true, reason: `Struggling (avg ${Math.round(avg)}%) — stepped back to consolidate` }
  }
  return { level: currentLevel, changed: false, reason: `Holding at ${currentLevel} (recent avg ${Math.round(avg)}%)` }
}

// OpenAI fallback for the planning brain when Gemini is unavailable (e.g. quota 429).
async function planWithOpenAI(prompt) {
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 700,
        temperature: 0.6,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You are an expert adaptive tutor. Return ONLY valid JSON for the lesson plan requested.' },
          { role: 'user', content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    })
    const d = await r.json()
    if (!r.ok || !d.choices?.[0]) { console.error('OpenAI plan error', r.status, JSON.stringify(d).slice(0, 150)); return null }
    return JSON.parse(d.choices[0].message.content)
  } catch (e) {
    console.error('OpenAI plan exception', e.message)
    return null
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { userId, subject = 'english', lessonNumber = 1, profile, topic: requestedTopic, level: requestedLevel } = req.body
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

    // Fetch per-subject progress + sessions + weak words in parallel
    const [progressRes, sessionsRes, weakWordsRes] = await Promise.allSettled([
      supabase.from('student_progress').select('*').eq('user_id', userId).eq('subject', subject).single(),
      supabase.from('session_logs').select('*').eq('user_id', userId).eq('subject', subject).order('created_at', { ascending: false }).limit(5),
      supabase.from('vocabulary_bank').select('word, translation, wrong_count, times_correct').eq('user_id', userId).eq('subject', subject).eq('mastered', false).order('wrong_count', { ascending: false }).limit(20),
    ])

    const progress = progressRes.status === 'fulfilled' ? progressRes.value.data : null
    const sessions = sessionsRes.status === 'fulfilled' ? sessionsRes.value.data : []
    const weakWords = weakWordsRes.status === 'fulfilled' ? weakWordsRes.value.data : []

    const avgAccuracy = sessions?.length > 0
      ? Math.round(sessions.reduce((s, x) => s + (x.accuracy_percent || 0), 0) / sessions.length)
      : 0

    const topMistakes = [...new Set(
      sessions?.flatMap(s => s.weak_points?.map(wp => wp.correctAnswer).filter(Boolean) || []) || []
    )].slice(0, 10)

    const previousNotes = sessions?.filter(s => s.ai_notes)?.map(s => s.ai_notes)?.join(' | ') || 'First session'

    const curriculumMap = {
      english: {
        beginner: ['Greetings', 'Numbers 1-20', 'Colors', 'Family members', 'Body parts', 'Daily routines', 'Food and drinks', 'Animals', 'House and furniture', 'Clothes'],
        elementary: ['Present Simple', 'Present Continuous', 'Past Simple', 'Future with will', 'Adjectives', 'Comparatives', 'Question words', 'Prepositions', 'Modal verbs can/must', 'Plural nouns'],
        intermediate: ['Present Perfect', 'Past Continuous', 'Future tenses', 'Conditionals 1&2', 'Passive voice', 'Relative clauses', 'Reported speech', 'Modal verbs', 'Phrasal verbs', 'Collocations'],
        advanced: ['Conditional 3', 'Mixed conditionals', 'Inversion', 'Subjunctive', 'Advanced idioms', 'Academic vocabulary', 'British vs American', 'Discourse markers', 'Complex sentences', 'Nuanced vocabulary'],
      },
      russian: {
        beginner: ['Кириллица', 'Приветствия', 'Числа 1-20', 'Цвета', 'Семья', 'Еда и напитки', 'Дни недели', 'Месяцы', 'Погода', 'Профессии'],
        elementary: ['Настоящее время', 'Прошедшее время', 'Будущее время', 'Падежи (именительный)', 'Падежи (родительный)', 'Глаголы движения', 'Прилагательные', 'Местоимения', 'Числительные', 'Предлоги'],
        intermediate: ['Все падежи', 'Виды глагола', 'Причастия', 'Деепричастия', 'Сложные предложения', 'Условные предложения', 'Страдательный залог', 'Фразеологизмы', 'Разговорная речь', 'Сленг'],
        advanced: ['Сложные конструкции', 'Официальный стиль', 'Литературный язык', 'Диалекты', 'Идиомы', 'Профессиональная лексика', 'СМИ язык', 'Поэзия', 'Публицистика', 'Академический стиль'],
      },
      math: {
        beginner: ["Sonlar 1-100", "Qo'shish", "Ayirish", "Ko'paytirish jadvali", "Bo'lish", "Tartib sonlar", "Juft va toq sonlar", "Soatlar", "Shakllar", "O'lchov birliklari"],
        elementary: ["Kasrlar", "O'nli kasrlar", "Foizlar", "Nisbatlar", "Proporsiyalar", "Salbiy sonlar", "Koordinatalar", "Oddiy tenglamalar", "Perimetr", "Yuza"],
        intermediate: ["Algebra asoslari", "Tenglamalar sistemasi", "Kvadrat tenglamalar", "Funksiyalar", "Grafiklar", "Uchburchaklar", "To'rtburchaklar", "Aylana", "Statistika", "Ehtimollik"],
        advanced: ["Trigonometriya", "Logarifmlar", "Ko'rsatkichli funksiyalar", "Integral", "Differentsial", "Vektorlar", "Matritsalar", "Kompleks sonlar", "Kombinatorika", "Limit"],
      },
    }

    const subjectContext = {
      english: `Teaching ENGLISH to Uzbek speaker. Target language: English. Explanations: Uzbek. Show English first, then Uzbek translation.`,
      russian: `Teaching RUSSIAN to Uzbek speaker. Target language: Russian (Cyrillic script). Explanations: Uzbek language. Show Russian in Cyrillic first, then Uzbek. Never use Latin for Russian words.`,
      math: `Teaching MATH to Uzbek speaker. ALL content in UZBEK language. Use Uzbek names: Ali, Malika, Kamol. Use so'm currency. Use km, kg, litr. Use Tashkent, Samarqand in examples.`,
    }

    // ── Adaptive level decision (the analytics "tutor brain") ──────────
    const baseLevel = normLevel(progress?.current_level || profile?.current_level?.[subject] || requestedLevel)
    const decision = decideLevel(baseLevel, sessions)
    const level = decision.level
    const difficulty = levelToDifficulty(level)

    // Persist a level change back to both stores (best-effort, non-blocking on failure).
    if (decision.changed) {
      const mergedLevels = { ...(profile?.current_level || {}), [subject]: level }
      await Promise.allSettled([
        supabase.from('profiles').update({ current_level: mergedLevels }).eq('id', userId),
        supabase.from('student_progress').upsert(
          { user_id: userId, subject, current_level: level },
          { onConflict: 'user_id,subject' }
        ),
      ])
      console.log(`📈 Level ${baseLevel} → ${level} for ${subject}: ${decision.reason}`)
    }

    const lessonNum = progress?.current_lesson || lessonNumber || 1
    // Map CEFR level to the internal curriculum bucket (only used when the frontend
    // didn't pass a specific topic).
    const bucket = ['A0', 'A1'].includes(level) ? 'beginner'
      : ['A2'].includes(level) ? 'elementary'
      : ['B1', 'B2'].includes(level) ? 'intermediate' : 'advanced'
    const curriculum = curriculumMap[subject]?.[bucket] || curriculumMap.english.beginner
    const topicIndex = (lessonNum - 1) % curriculum.length
    // Prefer the topic the frontend (curriculum.js spider-web) selected.
    const currentTopic = requestedTopic || curriculum[topicIndex]
    const nextTopic = curriculum[(topicIndex + 1) % curriculum.length]

    const geminiPrompt = `You are an expert educational AI creating a personalized lesson plan.

STUDENT PROFILE:
Name: ${profile?.full_name || 'Student'}
Age: ${profile?.age || 'unknown'}
Native language: Uzbek
Subject: ${subject.toUpperCase()}
Current level: ${level}
Current lesson: ${lessonNum}
Current topic: ${currentTopic}

PERFORMANCE DATA:
Sessions completed: ${sessions?.length || 0}
Average accuracy: ${avgAccuracy}%
Average engagement: ${progress?.avg_engagement || 50}%
Speaking score: ${progress?.avg_speaking_score || 0}/100
Learning style: ${progress?.learning_style || 'unknown'}
Streak: ${progress?.streak || 0} days

WEAK POINTS:
Top mistakes: ${topMistakes.join(', ') || 'none yet'}
Weak words: ${weakWords?.map(w => w.word).join(', ') || 'none yet'}
Previous tutor notes: ${previousNotes}

SUBJECT CONTEXT:
${subjectContext[subject]}

TEACHING RULES:
${avgAccuracy < 40 ? '⚠️ VERY LOW accuracy: Massively simplify! Go back to basics.' : ''}
${avgAccuracy >= 40 && avgAccuracy < 60 ? '⚠️ LOW accuracy: Simplify content. Focus on weak points.' : ''}
${avgAccuracy >= 60 && avgAccuracy < 80 ? '✅ GOOD accuracy: Maintain level. Address specific weak points.' : ''}
${avgAccuracy >= 80 ? '🚀 HIGH accuracy: Increase difficulty! Introduce advanced content.' : ''}
${sessions?.length === 0 ? 'FIRST SESSION: Be extra warm and encouraging! Start very simple.' : ''}

Based on all this data, create a detailed lesson plan.
Return ONLY valid JSON, no markdown:

{
  "topic": "${currentTopic}",
  "topicUzbek": "Mavzu nomi O'zbek tilida",
  "level": "${level}",
  "difficulty": "easy|medium|hard",
  "method": "game|story|conversation|mixed|drill",
  "focusWords": ["5 specific words to teach"],
  "reviewWords": ${JSON.stringify(weakWords?.map(w => w.word).slice(0, 5) || [])},
  "grammarPoint": "Specific grammar point",
  "weakPointsToAddress": ${JSON.stringify(topMistakes.slice(0, 3))},
  "speakingFocus": ${avgAccuracy > 60},
  "estimatedMinutes": ${profile?.daily_minutes || 30},
  "nextTopic": "${nextTopic}",
  "aiMessage": "Warm personalized welcome in Uzbek mentioning their progress",
  "encouragement": "Specific encouragement in Uzbek based on their data",
  "adjustmentReason": "Why you chose this plan",
  "contentInstructions": "Detailed instructions for content generator about what to create and how"
}`

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: geminiPrompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1000 },
        }),
      }
    )

    const geminiData = await geminiResponse.json()
    console.log('Gemini plan status:', geminiResponse.status)

    const fallbackPlan = {
      topic: currentTopic,
      topicUzbek: currentTopic,
      level,
      levelChanged: decision.changed,
      previousLevel: baseLevel,
      levelReason: decision.reason,
      difficulty,
      method: 'mixed',
      focusWords: [],
      reviewWords: weakWords?.map(w => w.word).slice(0, 5) || [],
      grammarPoint: currentTopic,
      weakPointsToAddress: topMistakes.slice(0, 3),
      speakingFocus: true,
      estimatedMinutes: profile?.daily_minutes || 30,
      nextTopic,
      aiMessage: `Salom ${profile?.full_name || ''}! Bugun ${currentTopic} mavzusini o'rganamiz!`,
      encouragement: 'Ajoyib! Davom eting!',
      adjustmentReason: 'Curriculum fallback',
      contentInstructions: `Generate ${subject} lesson about ${currentTopic} at ${level} level in Uzbek explanations.`,
    }

    // Parse Gemini → else OpenAI fallback → else static plan.
    let plan = null
    if (geminiData.candidates?.[0]) {
      try {
        plan = JSON.parse(geminiData.candidates[0].content.parts[0].text
          .replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
      } catch (e) { console.error('Gemini plan parse error:', e.message) }
    } else {
      console.error('Gemini plan failed:', JSON.stringify(geminiData).slice(0, 160))
    }

    if (!plan) {
      console.log('↩️ Gemini plan unavailable — OpenAI fallback')
      plan = await planWithOpenAI(geminiPrompt)
    }

    if (!plan) return res.json(fallbackPlan)

    // Force the adaptive fields + chosen topic so the content cache key is stable
    // and the level the brain decided is authoritative (not whatever the model echoed).
    plan.topic = currentTopic
    plan.level = level
    plan.difficulty = difficulty
    plan.levelChanged = decision.changed
    plan.previousLevel = baseLevel
    plan.levelReason = decision.reason
    console.log('✅ Plan:', plan.topic, '|', plan.method, '|', level, '|', difficulty)
    res.json(plan)
  } catch (err) {
    console.error('plan-lesson error:', err)
    res.status(500).json({ error: err.message })
  }
}
