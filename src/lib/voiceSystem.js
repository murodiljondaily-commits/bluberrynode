const audioCache = new Map()
let currentAudio = null

const COMMON_PHRASES = [
  "To'g'ri! Zo'r!",
  "Xato. Qayta urinib ko'ring.",
  "Quyidagi gapni aytib ko'ring",
  "Keyingisi",
  "Davom eting",
  "Ajoyib!",
  "Juda yaxshi!",
  "Tabriklayman!",
  "Bilaman",
  "Bilmayman",
]

export function stopSpeaking() {
  if (currentAudio) {
    currentAudio.pause()
    try { currentAudio.currentTime = 0 } catch {}
    currentAudio = null
  }
}

async function speakServer(text, endpoint, speed = 1.0) {
  const cacheKey = `${endpoint}::${text}::${speed}`
  let blob = audioCache.get(cacheKey)

  if (!blob) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, speed }),
      })
      if (!response.ok) {
        const ct = response.headers.get('content-type') || ''
        if (ct.includes('json')) {
          const err = await response.json()
          console.warn('TTS server error:', err)
        } else {
          console.warn('TTS server error:', response.status)
        }
        return
      }
      blob = await response.blob()
      audioCache.set(cacheKey, blob)
    } catch (err) {
      console.warn('TTS fetch failed:', err.message)
      return
    }
  }

  stopSpeaking()
  const url = URL.createObjectURL(blob)
  currentAudio = new Audio(url)

  return new Promise(resolve => {
    currentAudio.onended = resolve
    currentAudio.onerror = resolve
    currentAudio.play().catch(resolve)
  })
}

// Language detection
const isRussian = (text) => /[а-яА-ЯёЁ]/.test(text)

const isUzbek = (text) => {
  const uzbekWords = /\b(men|sen|biz|siz|ular|va|bu|shu|ham|emas|bor|yoq|dars|qiling|aytib|endi|davom|xato|yaxshi|ajoyib|salom|rahmat|kechirasiz|tugadi|boshlang|qaytaring|tushundim|bilaman|bilmayman|quyidagi|gapni|keyingisi|tabriklayman|togri|savol|natija|davom)\b/i
  const uzbekChars = /[oʻgʻ]/
  return uzbekChars.test(text) || uzbekWords.test(text)
}

async function speakOpenAI(text, speed = 1.0) {
  return speakServer(text, '/api/tts', speed)
}

async function speakYandex(text, language, speed = 1.0) {
  const endpoint = language === 'russian' ? '/api/tts-russian' : '/api/tts-uzbek'
  return speakServer(text, endpoint, speed)
}

export async function speak(text, language = 'auto', speed = 1.0) {
  if (!text?.trim()) return
  stopSpeaking()

  let detectedLang = language
  if (language === 'auto') {
    if (isRussian(text)) detectedLang = 'russian'
    else if (isUzbek(text)) detectedLang = 'uzbek'
    else detectedLang = 'english'
  }

  console.log(`🔊 [${detectedLang}]: "${text.slice(0, 40)}"`)

  if (detectedLang === 'english') return speakOpenAI(text, speed)
  return speakYandex(text, detectedLang, speed)
}

export const speakUzbek   = (text, speed) => speak(text, 'uzbek',   speed)
export const speakRussian = (text, speed) => speak(text, 'russian', speed)
export const speakEnglish = (text, speed) => speak(text, 'english', speed)

// Preload common Uzbek phrases silently on app start to fill cache
export function preloadPhrases() {
  for (const phrase of COMMON_PHRASES) {
    speakServer(phrase, '/api/tts-uzbek').catch(() => {})
  }
}
