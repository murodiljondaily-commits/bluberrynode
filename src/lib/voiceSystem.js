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

// Fetch a TTS clip into the cache WITHOUT playing it. Used to pre-generate
// all of a lesson's audio up front so playback later is instant.
async function fetchToCache(text, endpoint, speed = 1.0) {
  const cacheKey = `${endpoint}::${text}::${speed}`
  let blob = audioCache.get(cacheKey)
  if (blob) return blob
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, speed }),
    })
    if (!response.ok) {
      const ct = response.headers.get('content-type') || ''
      if (ct.includes('json')) console.warn('TTS server error:', await response.json())
      else console.warn('TTS server error:', response.status)
      return null
    }
    blob = await response.blob()
    audioCache.set(cacheKey, blob)
    return blob
  } catch (err) {
    console.warn('TTS fetch failed:', err.message)
    return null
  }
}

function endpointFor(language) {
  if (language === 'russian') return '/api/tts-russian'
  if (language === 'english') return '/api/tts'
  return '/api/tts-uzbek'
}

// Resolve 'auto' the same way speak() does, then warm the cache.
export async function prefetch(text, language = 'auto', speed = 1.0) {
  if (!text?.trim()) return
  let lang = language
  if (language === 'auto') {
    if (isRussian(text)) lang = 'russian'
    else if (isUzbek(text)) lang = 'uzbek'
    else lang = 'english'
  }
  await fetchToCache(text, endpointFor(lang), speed)
}

// Pre-generate many clips in parallel batches. Accepts [{ text, language, speed }].
export async function prefetchMany(items, batchSize = 5) {
  const list = items.filter((i) => i?.text?.trim())
  let done = 0
  for (let i = 0; i < list.length; i += batchSize) {
    const batch = list.slice(i, i + batchSize)
    await Promise.all(batch.map((i) => prefetch(i.text, i.language || 'auto', i.speed || 1.0).then(() => { done++ })))
  }
  console.log(`✅ Pre-generated ${done}/${list.length} audio clips`)
  return done
}

async function speakServer(text, endpoint, speed = 1.0) {
  const blob = await fetchToCache(text, endpoint, speed)
  if (!blob) return

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

// Kept for backwards-compat. Intentionally a no-op now: we do NOT auto-play or
// pre-generate UI phrases — voice is reserved for speaking/pronunciation only.
export function preloadPhrases() {}
