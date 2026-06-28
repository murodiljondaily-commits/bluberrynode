import express from 'express'
import multer from 'multer'

const app = express()
const upload = multer({ storage: multer.memoryStorage() })

app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  console.log('Transcribe hit. File:', req.file ? `${req.file.size} bytes` : 'none')

  try {
    if (!req.file) return res.status(400).json({ transcript: '', error: 'No audio file' })

    const file = new File([req.file.buffer], 'audio.webm', { type: 'audio/webm' })
    const formData = new FormData()
    formData.append('file', file)
    formData.append('model', 'whisper-1')
    formData.append('language', req.body.language || 'en')

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: formData,
      signal: AbortSignal.timeout(30000),
    })

    const whisperData = await whisperRes.json()
    if (whisperData.error) {
      console.error('Whisper error:', whisperData.error)
      return res.status(500).json({ transcript: '', error: whisperData.error.message })
    }

    const transcript = whisperData.text || ''
    console.log('Transcript:', transcript)

    const analysisRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 300,
        messages: [{
          role: 'system',
          content: `You are a strict pronunciation coach. Compare what the student SAID vs what they SHOULD have said.
Score STRICTLY. Common Uzbek speaker errors: v/w confusion, th→z/s, dropping final consonants, rolling R too hard.

Scoring: 90-100=native-like, 75-89=very good, 60-74=good, 45-59=several errors, <45=major errors.

Return ONLY valid JSON:
{
  "overall": 0-100,
  "accuracy": 0-100,
  "fluency": 0-100,
  "pronunciation": 0-100,
  "wordScores": [{"word": "...", "score": 0-100, "issue": null}],
  "feedback_uz": "Full feedback in Uzbek: what was wrong, how to fix it",
  "correct_pronunciation": "Pronunciation tips for problem words in Uzbek",
  "passed": true
}
"passed" = true only if overall >= 70`,
        }, {
          role: 'user',
          content: `Expected: "${req.body.expected || ''}"
Student said: "${transcript}"
Native language: Uzbek
Target language: ${req.body.language === 'ru' ? 'Russian' : 'English'}`,
        }],
      }),
      signal: AbortSignal.timeout(20000),
    })

    const analysisData = await analysisRes.json()
    const content = analysisData.choices?.[0]?.message?.content || ''

    let pronunciation = null
    try {
      pronunciation = JSON.parse(content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
      console.log('✅ Pronunciation score:', pronunciation.overall)
    } catch {
      pronunciation = null
    }

    res.json({ transcript, pronunciation })
  } catch (err) {
    console.error('Transcribe error:', err.message)
    res.status(500).json({ transcript: '', error: err.message })
  }
})

export default app
