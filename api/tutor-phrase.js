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

const RUSSIAN_PHRASE_SCHEMA = {
  beginner: `{"levelGroup":"beginner","phrase":"Меня зовут Али.","slowVersion":"Меня... зовут... Али.","uzbekMeaning":"Bu — mening ismim Ali — degani","repeatPrompt":"Endi men bilan qaytaring: МЕНЯ - ЗОВУТ - АЛИ","phonetics":"/mʲɪˈnʲa zɐˈvut/"}`,
  intermediate: `{"levelGroup":"intermediate","phrase":"Что ты делал вчера?","uzbekContext":"Bu — kecha nima qilganingizni so'rash","usageExample":"Masalan: 'Привет, что ты делал вчера?'","grammarNote":"Прошедшее время: делал (erkak) / делала (ayol)"}`,
  advanced: `{"levelGroup":"advanced","variants":["Как дела?","Как жизнь?","Что нового?"],"nuanceUz":"'Как дела?' — rasmiy, 'Как жизнь?' — do'stona, 'Что нового?' — yangiliklar haqida","formalInformal":"Rasmiy: 'Как поживаете?' | Norasmiy: 'Как жизнь?'","conversationPrompt":"Bu iboralardan birini ishlatib, o'zingiz haqida gapirib bering"}`,
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { level = 'a1', topic = 'greetings', subject = 'english' } = req.body
    const levelGroup = LEVEL_GROUP_MAP[level.toLowerCase().replace(/[\s-]/g, '')] || 'beginner'
    const isRussian = subject === 'russian'
    const schema = isRussian ? RUSSIAN_PHRASE_SCHEMA : PHRASE_SCHEMA
    const targetLang = isRussian ? 'Russian' : 'English'

    const systemPrompts = {
      beginner: `You are Nigora, a warm Uzbek language teacher for BEGINNER (${level}) students.
Topic: "${topic}". Create ONE teaching sentence in ${targetLang} for this level.
RULES: max 7 words, present simple, everyday vocabulary.
uzbekMeaning must start with "Bu —". repeatPrompt must UPPERCASE the ${targetLang} phrase with dashes between words.
Return ONLY valid JSON matching this exact structure:
${schema.beginner}`,

      intermediate: `You are Nigora, a warm Uzbek language teacher for INTERMEDIATE (${level}) students.
Topic: "${topic}". Create ONE natural conversational ${targetLang} sentence.
RULES: natural spoken language, related to topic. uzbekContext is brief (function/situation in Uzbek). usageExample starts with "Masalan:".
Return ONLY valid JSON matching this exact structure:
${schema.intermediate}`,

      advanced: `You are Nigora, a warm Uzbek language teacher for ADVANCED (${level}) students.
Topic: "${topic}". Create 2-3 colloquial/natural ${targetLang} variants.
RULES: real native speech. nuanceUz explains differences in Uzbek. formalInformal shows formal vs casual. conversationPrompt in Uzbek tells student how to use them.
Return ONLY valid JSON matching this exact structure:
${schema.advanced}`,
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 300,
        messages: [
          { role: 'system', content: systemPrompts[levelGroup] },
          { role: 'user', content: `Generate teaching phrase for topic: "${topic}" in ${targetLang}` },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    })

    const raw = await response.json()
    const content = raw.choices?.[0]?.message?.content?.trim() || ''
    const parsed = JSON.parse(content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
    console.log('✅ Tutor phrase:', parsed.phrase || parsed.variants?.[0], '| level:', levelGroup, '| subject:', subject)
    res.json(parsed)
  } catch (err) {
    console.error('tutor-phrase error:', err.message, '— using fallback')
    const levelGroup = LEVEL_GROUP_MAP[req.body?.level?.toLowerCase().replace(/[\s-]/g, '')] || 'beginner'
    const isRussian = req.body?.subject === 'russian'

    const fallbacks = {
      beginner: isRussian
        ? { levelGroup: 'beginner', phrase: 'Меня зовут Али.', slowVersion: 'Меня... зовут... Али.', uzbekMeaning: "Bu — mening ismim Ali — degani", repeatPrompt: 'Endi men bilan qaytaring: МЕНЯ - ЗОВУТ - АЛИ', phonetics: "/mʲɪˈnʲa zɐˈvut/" }
        : { levelGroup: 'beginner', phrase: 'Hello, how are you?', slowVersion: 'Hello... how... are... you?', uzbekMeaning: "Bu — salom, qandaysiz — degani", repeatPrompt: 'Endi men bilan qaytaring: HELLO - HOW - ARE - YOU', phonetics: '/həˈloʊ haʊ ɑːr juː/' },
      intermediate: isRussian
        ? { levelGroup: 'intermediate', phrase: 'Что ты делал вчера?', uzbekContext: "Bu — kecha nima qilganingizni so'rash", usageExample: "Masalan: 'Привет, что ты делал вчера?'", grammarNote: 'Прошедшее время' }
        : { levelGroup: 'intermediate', phrase: 'What did you do yesterday?', uzbekContext: "Bu — o'tgan kun haqida so'rash", usageExample: "Masalan: 'Hey, what did you do yesterday?'", grammarNote: 'Past Simple' },
      advanced: isRussian
        ? { levelGroup: 'advanced', variants: ['Как дела?', 'Как жизнь?', 'Что нового?'], nuanceUz: "Rus tilida salomlashishning bir necha usuli bor", formalInformal: "Rasmiy: 'Как поживаете?' | Norasmiy: 'Как жизнь?'", conversationPrompt: "Bu iboralardan birini ishlatib o'zingiz haqida gapirib bering" }
        : { levelGroup: 'advanced', variants: ["What've you been up to?", "How's it going?", 'You alright?'], nuanceUz: "Britaniyaliklar 'You alright?' deydi", formalInformal: "Rasmiy: 'How are you?' | Norasmiy: 'What've you been up to?'", conversationPrompt: "Bu iboralardan birini ishlatib o'zingiz haqida gapirib bering" },
    }
    res.json(fallbacks[levelGroup])
  }
}
