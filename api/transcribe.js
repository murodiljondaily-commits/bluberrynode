import express from 'express'
import multer from 'multer'

const app = express()
const upload = multer({ storage: multer.memoryStorage() })

// Whisper can't really handle Uzbek and is forced to a single language, so for uz/ru we
// use Yandex SpeechKit STT (native uz-UZ / ru-RU) first, then fall back to Whisper.
async function yandexSTT(buffer, lang, format, sampleRate) {
  const KEY = process.env.YANDEX_TTS_API_KEY || process.env.VITE_YANDEX_API_KEY
  if (!KEY) return null
  try {
    const FOLDER = process.env.YANDEX_FOLDER_ID || process.env.VITE_YANDEX_FOLDER_ID
    const fmt = format ? `&format=${format}${format === 'lpcm' ? `&sampleRateHertz=${sampleRate || 16000}` : ''}` : ''
    const url = `https://stt.api.cloud.yandex.net/speech/v1/stt:recognize?topic=general&lang=${lang}${fmt}${FOLDER ? `&folderId=${FOLDER}` : ''}`
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

// ── Deterministic pronunciation scoring ────────────────────────────
// Whisper recognizes the right WORDS even through a heavy accent, so asking an LLM
// "does this match?" almost always says yes (→ fake 100). Instead we score on how much
// of the EXPECTED sentence the student actually reproduced (order-aware LCS of words).
function normWords(s) {
  return (s || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean)
}
function lcsLen(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])
  return dp[a.length][b.length]
}
function scorePronunciation(expected, said) {
  const e = normWords(expected), s = normWords(said)
  if (!e.length) return null
  const matched = lcsLen(e, s)
  const acc = Math.max(0, Math.min(100, Math.round((matched / e.length) * 100)))
  // length penalty if they said far too little/much
  const lenRatio = s.length / e.length
  const fluency = Math.max(0, Math.min(100, Math.round(acc - Math.abs(1 - lenRatio) * 25)))
  const said1 = new Set(s)
  const missing = e.filter(w => !said1.has(w))
  const wordScores = e.map(w => ({ word: w, score: said1.has(w) ? 95 : 25, issue: said1.has(w) ? null : 'aytilmadi' }))
  const overall = Math.round((acc * 0.7) + (fluency * 0.3))
  let feedback_uz
  if (overall >= 85) feedback_uz = "Zo'r! Deyarli barcha so'zlarni to'g'ri aytdingiz."
  else if (overall >= 60) feedback_uz = `Yaxshi! Quyidagi so'zlarni aniqroq ayting: ${missing.slice(0, 4).join(', ') || '—'}.`
  else feedback_uz = `Qaytadan, sekinroq urinib ko'ring. Eshitilmagan so'zlar: ${missing.slice(0, 5).join(', ') || '—'}.`
  return {
    overall, accuracy: acc, fluency, pronunciation: acc,
    wordScores, missing,
    feedback_uz,
    correct_pronunciation: missing.length ? `Mashq qiling: ${missing.slice(0, 5).join(', ')}` : '',
    passed: overall >= 70,
  }
}

app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  console.log('Transcribe hit. File:', req.file ? `${req.file.size} bytes` : 'none', '| lang:', req.body.language)

  try {
    if (!req.file) return res.status(400).json({ transcript: '', error: 'No audio file' })

    const language = req.body.language || 'en'
    const audioFormat = req.body.format // 'lpcm' if the browser converted to raw PCM
    const sampleRate = parseInt(req.body.sampleRate || '16000', 10)
    let transcript = ''

    // Uzbek / Russian → Yandex STT first (Whisper can't do Uzbek); English → Whisper.
    // The browser sends raw LPCM for uz/ru (a format Yandex accepts); webm → Whisper.
    if ((language === 'uz' || language === 'ru') && audioFormat === 'lpcm') {
      transcript = (await yandexSTT(req.file.buffer, language === 'ru' ? 'ru-RU' : 'uz-UZ', 'lpcm', sampleRate)) || ''
    }
    if (!transcript) {
      transcript = (await whisperSTT(req.file.buffer, language)) || ''
    }
    console.log('Transcript:', transcript)

    // No pronunciation scoring needed for free conversation (no "expected" text).
    if (!req.body.expected) {
      return res.json({ transcript, pronunciation: null })
    }

    const pronunciation = scorePronunciation(req.body.expected, transcript)
    console.log('✅ Pronunciation score:', pronunciation?.overall, '| said:', transcript)
    res.json({ transcript, pronunciation })
  } catch (err) {
    console.error('Transcribe error:', err.message)
    res.status(500).json({ transcript: '', error: err.message })
  }
})

export default app
