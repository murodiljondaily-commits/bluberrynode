export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview',
        voice: 'alloy',
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      console.error('Realtime session error:', err)
      return res.status(response.status).json({ error: err.error?.message || 'Session creation failed' })
    }

    const data = await response.json()
    console.log('✅ Realtime token created')
    res.json({ client_secret: data.client_secret })
  } catch (err) {
    console.error('Realtime token error:', err.message)
    res.status(500).json({ error: err.message })
  }
}
