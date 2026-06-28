export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { text = '', slow = false, speed } = req.body
    if (!text.trim()) return res.status(400).json({ error: 'text required' })

    const YANDEX_KEY = process.env.YANDEX_TTS_API_KEY
    if (!YANDEX_KEY) return res.status(500).json({ error: 'Yandex key not configured' })

    // Support both `slow: true` (TutorSession) and `speed: 0.75` (voiceSystem)
    const effectiveSpeed = speed != null ? String(Math.min(Math.max(speed, 0.1), 3.0)) : slow ? '0.75' : '1.0'

    const params = new URLSearchParams({
      text,
      voice: 'nigora',
      lang: 'uz-UZ',
      speed: effectiveSpeed,
      format: 'mp3',
    })

    const r = await fetch('https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize', {
      method: 'POST',
      headers: {
        Authorization: `Api-Key ${YANDEX_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
      signal: AbortSignal.timeout(15000),
    })

    if (!r.ok) {
      const errText = await r.text()
      console.error('Yandex TTS uz error:', r.status, errText)
      return res.status(500).json({ error: `Yandex TTS ${r.status}` })
    }

    const buf = Buffer.from(await r.arrayBuffer())
    res.setHeader('Content-Type', 'audio/mpeg')
    res.send(buf)
  } catch (err) {
    console.error('tts-uzbek error:', err.message)
    res.status(500).json({ error: err.message })
  }
}
