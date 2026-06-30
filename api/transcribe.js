import express from 'express'
import multer from 'multer'

const app = express()
const upload = multer({ storage: multer.memoryStorage() })

// Whisper can't really handle Uzbek and is forced to a single language, so for uz/ru we
// use Yandex SpeechKit STT (native uz-UZ / ru-RU) first, then fall back to Whisper.
async function yandexSTT(buffer, lang) {
  const KEY = process.env.YANDEX_TTS_API_KEY || process.env.VITE_YANDEX_API_KEY
  if (!KEY) return null
  try {
    const FOLDER = process.env.YANDEX_FOLDER_ID || process.env.VITE_YANDEX_FOLDER_ID
    const url = `https://stt.api.cloud.yandex.net/speech/v1/stt:recognize?topic=general&lang=${lang}${FOLDER ? `&folderId=${FOLDER}` : ''}`
    const r = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Api-Key ${KEY}` },
      body: buffer,
      signal: AbortSignal.timeout(15000),
    })
    if (!r.ok) { console.warn('Yandex STT', r.status, (await r.text()).slice(0, 140)); return null }
    const d = await r.json()
    return (d.result || '').trim() || null
  } catch (e) {
    console.warn('Yandex STT exception:', e.message)
    return null
  }
}

async function whisperSTT(buffer, language) {
  const file = new File([buffer], 'audio.webm', { type: 'audio/webm' })
  const formData = new FormData()
  formData.append('file', file)
  formData.append('model', 'whisper-1')
  formData.append('language', language)
  const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: formData,
    signal: AbortSignal.timeout(30000),
  })
  const d = await r.json()
  if (d.error) { console.error('Whisper error:', d.error); return '' }
  return d.text || ''
}

app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  console.log('Transcribe hit. File:', req.file ? `${req.file.size} bytes` : 'none', '| lang:', req.body.language)

  try {
    if (!req.file) return res.status(400).json({ transcript: '', error: 'No audio file' })

    const language = req.body.language || 'en'
    let transcript = ''

    // Uzbek / Russian → Yandex STT first (Whisper can't do Uzbek); English → Whisper.
    if (language === 'uz' || language === 'ru') {
      transcript = (await yandexSTT(req.file.buffer, language === 'ru' ? 'ru-RU' : 'uz-UZ')) || ''
    }
    if (!transcript) {
      transcript = (await whisperSTT(req.file.buffer, language)) || ''
    }
    console.log('Transcript:', transcript)

    // No pronunciation scoring needed for free conversation (no "expected" text).
    if (!req.body.expected) {
      return res.json({ transcript, pronunciation: null })
    }

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
