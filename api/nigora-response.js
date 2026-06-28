export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { score = 0, phrase = '', heard = '', level = 'a1', conversationMode = false, subject = 'english', systemOverride } = req.body
    const scoreLabel = score >= 85 ? 'excellent' : score >= 70 ? 'good' : score >= 50 ? 'needs work' : 'poor'

    let systemContent
    if (conversationMode && systemOverride) {
      systemContent = systemOverride
    } else {
      const targetLang = subject === 'russian' ? 'Russian' : subject === 'math' ? 'Uzbek' : 'English'
      systemContent = `You are Nigora, a warm encouraging Uzbek language teacher.
Student (level: ${level}) practiced saying in ${targetLang}: "${phrase}".
They said: "${heard || '...'}". Score: ${score}/100 (${scoreLabel}).

Write 2 SHORT sentences IN UZBEK ONLY:
- Score ≥ 85: celebrate warmly + 1 tip to improve further
- Score 70–84: praise + point out ONE specific issue
- Score 50–69: encourage + name exactly what to fix
- Score < 50: be very gentle, give ONE concrete phonetic tip, say they can do it

Never use English. End with encouragement. Max 2 emojis.`
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 100,
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: conversationMode ? 'Continue the conversation.' : 'Generate Nigora response in Uzbek.' },
        ],
      }),
      signal: AbortSignal.timeout(12000),
    })

    const raw = await response.json()
    const responseText = raw.choices?.[0]?.message?.content?.trim() || ''
    res.json({ response_uz: responseText, response: responseText })
  } catch (err) {
    console.error('nigora-response error:', err.message)
    const score = req.body?.score || 0
    const fallback = score >= 70
      ? "Zo'r! Talaffuzingiz yaxshi bo'lyapti, davom eting! 🌸"
      : score >= 50
      ? "Yaxshi harakat! Yana bir marta urinib ko'ring, siz uddalaysiz! 💪"
      : "Hech qo'rqmang, bu normal! Sekin-asta qaytaring, hammasi yaxshi bo'ladi! 🌟"
    res.json({ response_uz: fallback, response: fallback })
  }
}
