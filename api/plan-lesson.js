import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { userId, subject = 'english', lessonNumber = 1, profile } = req.body
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

    const level = progress?.current_level || profile?.current_level?.[subject] || 'beginner'
    const lessonNum = progress?.current_lesson || lessonNumber || 1
    const curriculum = curriculumMap[subject]?.[level] || curriculumMap.english.beginner
    const topicIndex = (lessonNum - 1) % curriculum.length
    const currentTopic = curriculum[topicIndex]
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
      difficulty: 'medium',
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

    if (!geminiData.candidates?.[0]) {
      console.error('Gemini failed:', JSON.stringify(geminiData).slice(0, 200))
      return res.json(fallbackPlan)
    }

    const planText = geminiData.candidates[0].content.parts[0].text
      .replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    try {
      const plan = JSON.parse(planText)
      console.log('✅ Gemini plan:', plan.topic, '|', plan.method, '|', plan.difficulty)
      res.json(plan)
    } catch (e) {
      console.error('Parse error:', e.message)
      res.json(fallbackPlan)
    }
  } catch (err) {
    console.error('plan-lesson error:', err)
    res.status(500).json({ error: err.message })
  }
}
