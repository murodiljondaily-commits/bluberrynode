export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { text = '', voice = 'shimmer', speed = 1.0 } = req.body
    if (!text.trim()) return res.status(400).json({ error: 'text required' })

    console.log('🔊 TTS (OpenAI):', text.slice(0, 40))

    const r = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ model: 'tts-1', input: text, voice, speed }),
      signal: AbortSignal.timeout(15000),
    })

    if (!r.ok) {
      const err = await r.json().catch(() => ({}))
      console.error('TTS error:', err)
      return res.status(500).json({ error: 'TTS failed' })
    }

    const buf = Buffer.from(await r.arrayBuffer())
    res.setHeader('Content-Type', 'audio/mpeg')
    res.send(buf)
  } catch (err) {
    console.error('TTS exception:', err.message)
    res.status(500).json({ error: err.message })
  }
}
