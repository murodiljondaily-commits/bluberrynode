export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).end()
    return
  }

  const { topic, level } = req.body

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 500,
      messages: [
        {
          role: 'system',
          content: `You are a friendly language tutor for Uzbek-speaking students.
Explain concepts simply using emoji. Always give exactly 3 short examples.
Keep explanations SHORT and beginner-friendly. Respond ONLY with valid JSON, no markdown.
Format: { "explanation": "...", "examples": ["...","...","..."], "tip": "..." }`,
        },
        {
          role: 'user',
          content: `Explain this topic in Uzbek for ${level} level: ${topic}`,
        },
      ],
    }),
  })

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content ?? '{}'

  res.setHeader('Content-Type', 'application/json')
  res.status(200).end(content)
}
