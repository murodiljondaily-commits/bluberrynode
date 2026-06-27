const audioCache = new Map()
let currentAudio = null

export function stopSpeaking() {
  if (currentAudio) {
    currentAudio.pause()
    try { currentAudio.currentTime = 0 } catch {}
    currentAudio = null
  }
}

async function speakYandex(text, language, speed = 1.0) {
  const apiKey = import.meta.env.VITE_YANDEX_API_KEY
  const folderId = import.meta.env.VITE_YANDEX_FOLDER_ID

  if (!apiKey || !folderId) {
    console.warn('Yandex TTS not configured — skipping')
    return
  }

  const cacheKey = `${text}-${language}-${speed}`
  let blob = audioCache.get(cacheKey)

  if (!blob) {
    try {
      const response = await fetch(
        'https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize',
        {
          method: 'POST',
          headers: {
            Authorization: `Api-Key ${apiKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            text,
            lang: language === 'russian' ? 'ru-RU' : 'uz-UZ',
            voice: language === 'russian' ? 'alena' : 'nigora',
            speed: speed.toString(),
            folderId,
            format: 'mp3',
          }),
        }
      )
      if (!response.ok) {
        console.warn('Yandex TTS error:', response.status)
        return
      }
      blob = await response.blob()
      audioCache.set(cacheKey, blob)
    } catch (err) {
      console.warn('Yandex TTS failed:', err.message)
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

async function speakOpenAI(text, speed = 1.0) {
  const isDev = import.meta.env.DEV
  const apiBase = isDev ? 'http://localhost:3001' : ''

  const cacheKey = `openai-${text}-${speed}`
  let blob = audioCache.get(cacheKey)

  if (!blob) {
    try {
      const response = await fetch(`${apiBase}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'shimmer', speed }),
      })
      if (!response.ok) {
        console.warn('OpenAI TTS error:', response.status)
        return
      }
      blob = await response.blob()
      audioCache.set(cacheKey, blob)
    } catch (err) {
      console.warn('OpenAI TTS failed:', err.message)
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

export async function speak(text, language = 'uzbek', speed = 1.0) {
  if (!text?.trim()) return
  stopSpeaking()
  if (language === 'english') return speakOpenAI(text, speed)
  return speakYandex(text, language, speed)
}

export const speakUzbek = (text, speed) => speak(text, 'uzbek', speed)
export const speakRussian = (text, speed) => speak(text, 'russian', speed)
export const speakEnglish = (text, speed) => speak(text, 'english', speed)
