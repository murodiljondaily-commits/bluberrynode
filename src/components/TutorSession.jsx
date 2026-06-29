import { useState, useRef, useEffect, useCallback } from 'react'
import { sessionLogger } from '../lib/sessionLogger'
import { playCorrect, playWrong } from '../lib/soundEffects'
import { speak as ttsSpeak, stopSpeaking } from '../lib/voiceSystem'

const LEVEL_GROUP_MAP = {
  a0: 'beginner', a1: 'beginner', beginner: 'beginner', elementary: 'beginner',
  a2: 'intermediate', b1: 'intermediate', preintermediate: 'intermediate', intermediate: 'intermediate',
  b2: 'advanced', advanced: 'advanced',
}

// Target-language TTS via the SERVER voices (OpenAI shimmer for English, Yandex Alena
// for Russian) — NOT the browser's robotic/Uzbek-accented speechSynthesis.
function speakTarget(text, slow = false, lang = 'en-US') {
  const language = lang.startsWith('ru') ? 'russian' : 'english'
  return ttsSpeak(text, language, slow ? 0.7 : 1.0).catch(() => {})
}

const STEP_INFO = {
  loading:            { label: '⏳ Yuklanmoqda',          color: 'text-gray-400' },
  slow_target:        { label: '🔊 Asta-sekin tinglang',  color: 'text-berry-deep' },
  uzbek_meaning:      { label: "🇺🇿 Ma'no",               color: 'text-green-600' },
  repeat_prompt:      { label: '🔄 Men bilan qaytaring',  color: 'text-purple-600' },
  natural_target:     { label: '🔊 Tinglang',             color: 'text-berry-deep' },
  uzbek_context:      { label: '🇺🇿 Ishlatish holati',    color: 'text-green-600' },
  usage_example:      { label: '💬 Misol',                color: 'text-blue-600' },
  colloquial_english: { label: '🗣️ Jonli iboralar',       color: 'text-berry-deep' },
  nuance_uzbek:       { label: '🎯 Farqlar',              color: 'text-orange-600' },
  formal_informal:    { label: '📚 Rasmiy / Norasmiy',    color: 'text-teal-600' },
  student_speaks:     { label: '🎤 Siz gapirasiz',        color: 'text-berry-mid' },
  recording:          { label: '🔴 Yozilmoqda...',        color: 'text-red-500' },
  scoring:            { label: '⚙️ Baholanmoqda',         color: 'text-gray-400' },
  nigora_response:    { label: '🌸 Nigora',               color: 'text-purple-600' },
}

function ScoreBar({ label, score, color }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-20">{label}</span>
      <div className="flex-1 bg-gray-200 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all duration-700`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-bold text-gray-600 w-8">{score}</span>
    </div>
  )
}

export default function TutorSession({ level = 'a1', subject = 'english', topic = 'greetings', onComplete }) {
  const [step, setStep] = useState('loading')
  const [phraseData, setPhraseData] = useState(null)
  const [nigoraText, setNigoraText] = useState('')
  const [heard, setHeard] = useState('')
  const [pronunciationResult, setPronunciationResult] = useState(null)
  const [xpEarned, setXpEarned] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [audioPlaying, setAudioPlaying] = useState(false)

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const isMounted = useRef(true)
  const audioEl = useRef(null)
  const flowCancel = useRef(false)

  const levelGroup = LEVEL_GROUP_MAP[level.toLowerCase().replace(/[\s-]/g, '')] || 'beginner'
  const apiBase = ''

  const safeSet = useCallback((fn) => { if (isMounted.current) fn() }, [])

  useEffect(() => {
    return () => {
      isMounted.current = false
      flowCancel.current = true
      window.speechSynthesis.cancel()
      audioEl.current?.pause()
    }
  }, [])

  // Nigora TTS: Yandex SpeechKit for Uzbek, browser fallback
  const playUzbek = useCallback(async (text) => {
    if (!text) return
    try {
      const res = await fetch(`${apiBase}/api/tts-uzbek`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) throw new Error('TTS ' + res.status)
      const ct = res.headers.get('content-type') || ''
      if (ct.includes('json')) throw new Error('no Yandex key')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      return new Promise((resolve) => {
        const audio = new Audio(url)
        audioEl.current = audio
        audio.onended = () => { URL.revokeObjectURL(url); resolve() }
        audio.onerror = () => { URL.revokeObjectURL(url); resolve() }
        audio.play().catch(resolve)
      })
    } catch (e) {
      console.warn('Yandex TTS unavailable, using browser fallback:', e.message)
      return new Promise((resolve) => {
        window.speechSynthesis.cancel()
        const u = new SpeechSynthesisUtterance(text)
        u.lang = 'uz'
        u.rate = 0.9
        u.onend = resolve
        u.onerror = resolve
        window.speechSynthesis.speak(u)
      })
    }
  }, [apiBase])

  // Locked teaching flow — auto-plays when phraseData arrives
  useEffect(() => {
    if (!phraseData) return
    flowCancel.current = false
    const c = flowCancel
    const lang = subject === 'russian' ? 'ru-RU' : 'en-US'

    const run = async () => {
      safeSet(() => setAudioPlaying(true))

      if (levelGroup === 'beginner') {
        // 1. Target language FIRST (slow)
        safeSet(() => setStep('slow_target'))
        if (!c.current) await speakTarget(phraseData.phrase, true, lang)
        await new Promise(r => setTimeout(r, 500))

        // 2. Uzbek meaning (Nigora)
        if (!c.current) safeSet(() => setStep('uzbek_meaning'))
        if (!c.current) await playUzbek(phraseData.uzbekMeaning)
        await new Promise(r => setTimeout(r, 400))

        // 3. Repeat prompt — Nigora says it, then phrase plays slow again
        if (!c.current) safeSet(() => setStep('repeat_prompt'))
        if (!c.current) await playUzbek(phraseData.repeatPrompt)
        if (!c.current) await speakTarget(phraseData.phrase, true, lang)

      } else if (levelGroup === 'intermediate') {
        // 1. Natural speed
        safeSet(() => setStep('natural_target'))
        if (!c.current) await speakTarget(phraseData.phrase, false, lang)
        await new Promise(r => setTimeout(r, 500))

        // 2. Brief Uzbek context
        if (!c.current) safeSet(() => setStep('uzbek_context'))
        if (!c.current) await playUzbek(phraseData.uzbekContext)
        await new Promise(r => setTimeout(r, 400))

        // 3. Usage example (Nigora reads it)
        if (!c.current) safeSet(() => setStep('usage_example'))
        if (!c.current) await playUzbek(phraseData.usageExample)

      } else {
        // ADVANCED
        // 1. Colloquial variants — each spoken naturally
        safeSet(() => setStep('colloquial_english'))
        for (const v of (phraseData.variants || [])) {
          if (c.current) break
          await speakTarget(v, false, lang)
          await new Promise(r => setTimeout(r, 700))
        }

        // 2. Nuance in Uzbek
        if (!c.current) safeSet(() => setStep('nuance_uzbek'))
        if (!c.current) await playUzbek(phraseData.nuanceUz)
        await new Promise(r => setTimeout(r, 400))

        // 3. Formal vs informal
        if (!c.current) safeSet(() => setStep('formal_informal'))
        if (!c.current) await playUzbek(phraseData.formalInformal)
      }

      safeSet(() => setAudioPlaying(false))
      if (!c.current) safeSet(() => setStep('student_speaks'))
    }

    run()
  }, [phraseData, levelGroup, subject, playUzbek, safeSet])

  // Load phrase on mount
  useEffect(() => {
    fetch(`${apiBase}/api/tutor-phrase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, topic, subject }),
    })
      .then(r => r.json())
      .then(data => { if (isMounted.current) setPhraseData(data) })
      .catch(() => safeSet(() => setErrorMsg("Tutor yuklanmadi. Qayta urinib ko'ring.")))
  }, []) // eslint-disable-line

  // Recording
  const startRecording = async () => {
    setErrorMsg('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []
      const mr = new MediaRecorder(stream)
      mediaRecorderRef.current = mr
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.start()
      safeSet(() => setStep('recording'))
    } catch {
      safeSet(() => setErrorMsg('Mikrofonga ruxsat bering! Brauzer sozlamalarini tekshiring.'))
    }
  }

  const stopRecording = () => {
    const mr = mediaRecorderRef.current
    if (!mr || mr.state === 'inactive') return

    mr.onstop = async () => {
      safeSet(() => setStep('scoring'))
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      const expected = levelGroup === 'advanced'
        ? (phraseData?.variants?.[0] || '')
        : (phraseData?.phrase || '')

      const fd = new FormData()
      fd.append('audio', blob, 'recording.webm')
      fd.append('language', subject === 'russian' ? 'ru' : 'en')
      fd.append('expected', expected)

      try {
        const res = await fetch(`${apiBase}/api/transcribe`, { method: 'POST', body: fd })
        const data = await res.json()
        const transcript = data.transcript || ''
        const pr = data.pronunciation

        safeSet(() => setHeard(transcript))
        safeSet(() => setPronunciationResult(pr))

        const sc = pr?.overall ?? 0
        sessionLogger.logSpeakingScore?.(sc)
        if (pr?.passed) {
          const earned = Math.round((sc / 100) * 25)
          safeSet(() => setXpEarned(earned))
          playCorrect()
        } else {
          playWrong()
        }

        // Nigora's response
        const nigoraRes = await fetch(`${apiBase}/api/nigora-response`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ score: sc, phrase: expected, heard: transcript, level }),
        })
        const nigoraData = await nigoraRes.json()
        safeSet(() => setNigoraText(nigoraData.response_uz || ''))
        safeSet(() => setStep('nigora_response'))

        // Nigora speaks her response
        if (nigoraData.response_uz && isMounted.current) {
          await playUzbek(nigoraData.response_uz)
        }
      } catch (err) {
        console.error('Scoring error:', err)
        safeSet(() => setErrorMsg("Baholashda xatolik. Qayta urinib ko'ring."))
        safeSet(() => setStep('student_speaks'))
      }

      mr.stream.getTracks().forEach(t => t.stop())
    }

    mr.stop()
  }

  const handleMic = () => {
    if (step === 'student_speaks') startRecording()
    else if (step === 'recording') stopRecording()
  }

  const skipFlow = () => {
    flowCancel.current = true
    window.speechSynthesis.cancel()
    stopSpeaking()
    audioEl.current?.pause()
    safeSet(() => { setAudioPlaying(false); setStep('student_speaks') })
  }

  const retry = () => {
    setStep('student_speaks')
    setHeard('')
    setPronunciationResult(null)
    setNigoraText('')
    setXpEarned(0)
    setErrorMsg('')
  }

  const replayPhrase = () => {
    if (!phraseData) return
    window.speechSynthesis.cancel()
    audioEl.current?.pause()
    const lang = subject === 'russian' ? 'ru-RU' : 'en-US'
    if (levelGroup === 'advanced') {
      phraseData.variants?.forEach((v, i) => setTimeout(() => speakTarget(v, false, lang), i * 1000))
    } else {
      speakTarget(phraseData.phrase, levelGroup === 'beginner', lang)
    }
  }

  const pr = pronunciationResult
  const stepInfo = STEP_INFO[step] || { label: step, color: 'text-gray-400' }

  return (
    <div className="flex flex-col items-center gap-5 p-6 max-w-lg mx-auto min-h-[60vh] justify-center">

      {/* Step label */}
      <div className={`text-xs font-bold uppercase tracking-widest ${stepInfo.color}`}>
        {stepInfo.label}
      </div>

      {/* ── Loading ─────────────────────────────────────────────── */}
      {step === 'loading' && (
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full border-4 border-berry-deep border-t-transparent animate-spin" />
          <p className="text-sm text-gray-400">AI murabbiy tayyorlamoqda...</p>
        </div>
      )}

      {/* Error */}
      {errorMsg && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 text-sm text-orange-700 font-semibold text-center max-w-sm">
          {errorMsg}
        </div>
      )}

      {/* ── Teaching step content ────────────────────────────────── */}
      {phraseData && !['loading', 'scoring', 'nigora_response'].includes(step) && (
        <div className="w-full text-center">

          {/* Phrase / variants */}
          {levelGroup !== 'advanced' ? (
            <div className="bg-berry-glow rounded-2xl px-6 py-4 mb-3">
              <p className="text-2xl font-black text-berry-deep">
                {step === 'slow_target' ? phraseData.slowVersion : phraseData.phrase}
              </p>
              {phraseData.phonetics && (
                <p className="text-xs text-gray-400 font-mono mt-1">{phraseData.phonetics}</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2 mb-3">
              {(phraseData.variants || []).map((v, i) => (
                <div key={i} className="bg-berry-glow rounded-xl px-4 py-3">
                  <p className="text-lg font-bold text-berry-deep">{v}</p>
                </div>
              ))}
            </div>
          )}

          {/* Step annotations — shown when flow pauses on that step */}
          {step === 'uzbek_meaning' && phraseData.uzbekMeaning && (
            <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 text-sm font-semibold text-green-700">
              🇺🇿 {phraseData.uzbekMeaning}
            </div>
          )}
          {step === 'repeat_prompt' && phraseData.repeatPrompt && (
            <div className="bg-purple-50 border border-purple-200 rounded-2xl px-4 py-3 text-sm font-bold text-purple-700">
              🔄 {phraseData.repeatPrompt}
            </div>
          )}
          {step === 'uzbek_context' && phraseData.uzbekContext && (
            <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 text-sm font-semibold text-green-700">
              🇺🇿 {phraseData.uzbekContext}
            </div>
          )}
          {step === 'usage_example' && phraseData.usageExample && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 text-sm font-semibold text-blue-700">
              💬 {phraseData.usageExample}
            </div>
          )}
          {step === 'nuance_uzbek' && phraseData.nuanceUz && (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 text-sm font-semibold text-orange-700">
              🎯 {phraseData.nuanceUz}
            </div>
          )}
          {step === 'formal_informal' && phraseData.formalInformal && (
            <div className="bg-teal-50 border border-teal-200 rounded-2xl px-4 py-3 text-sm font-semibold text-teal-700">
              📚 {phraseData.formalInformal}
            </div>
          )}

          {/* Audio playing indicator */}
          {audioPlaying && (
            <div className="flex items-center justify-center gap-1.5 mt-3">
              {[0, 150, 300].map(d => (
                <div key={d} className="w-2 h-2 rounded-full bg-berry-mid animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          )}

          {/* Replay button once flow is done */}
          {step === 'student_speaks' && (
            <button onClick={replayPhrase} className="mt-2 text-xs text-gray-400 hover:text-berry-mid transition-colors underline underline-offset-2">
              ↻ Yana tinglash
            </button>
          )}
        </div>
      )}

      {/* ── Mic button ───────────────────────────────────────────── */}
      {(step === 'student_speaks' || step === 'recording') && (
        <div className="flex flex-col items-center gap-3">
          {levelGroup === 'beginner' && (
            <p className="text-xs text-gray-400 text-center">Yuqoridagi gapni aytib ko'ring</p>
          )}
          {levelGroup === 'advanced' && phraseData?.conversationPrompt && (
            <p className="text-sm text-gray-500 italic text-center">{phraseData.conversationPrompt}</p>
          )}

          <div className="relative flex items-center justify-center">
            {step === 'recording' && (
              <>
                <div className="absolute w-36 h-36 rounded-full bg-red-400 opacity-20 animate-ping" />
                <div className="absolute w-28 h-28 rounded-full bg-red-400 opacity-30 animate-ping" style={{ animationDelay: '0.3s' }} />
              </>
            )}
            <button
              onClick={handleMic}
              className={`w-24 h-24 rounded-full text-white text-4xl shadow-xl hover:scale-110 transition-all flex items-center justify-center z-10 ${step === 'recording' ? 'bg-red-500' : 'bg-berry-deep'}`}
            >
              🎤
            </button>
          </div>
          <p className="text-sm text-gray-400">
            {step === 'student_speaks'
              ? 'Tugmani bosib gapiring'
              : "🔴 Gapiryapsiz... To'xtatish uchun qayta bosing"}
          </p>
        </div>
      )}

      {/* ── Scoring spinner ──────────────────────────────────────── */}
      {step === 'scoring' && (
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full bg-berry-light flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-berry-deep border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm text-gray-400">Nigora baholayapti...</p>
        </div>
      )}

      {/* ── Nigora's response ────────────────────────────────────── */}
      {step === 'nigora_response' && pr && (
        <div className="w-full" style={{ animation: 'fadeInUp 0.3s ease-out' }}>
          <div className={`rounded-2xl border-2 p-5 mb-4 ${pr.passed ? 'bg-green-50 border-green-400' : 'bg-orange-50 border-orange-400'}`}>
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-16 h-16 rounded-full flex flex-col items-center justify-center text-white shrink-0 ${pr.passed ? 'bg-berry-deep' : 'bg-orange-500'}`}>
                <span className="text-xl font-black">{pr.overall}</span>
                <span className="text-xs">/100</span>
              </div>
              <div>
                <p className={`font-black text-lg ${pr.passed ? 'text-green-600' : 'text-orange-600'}`}>
                  {pr.passed ? "Zo'r! ✅" : "Yaxshiroq bo'ladi! 💪"}
                </p>
                {heard && <p className="text-xs text-gray-400 italic mt-0.5">"{heard}"</p>}
                {pr.passed && xpEarned > 0 && <p className="text-xs text-green-500 font-bold">+{xpEarned} 🫐</p>}
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <ScoreBar label="Aniqlik"  score={pr.accuracy}      color="bg-blue-400" />
              <ScoreBar label="Ravonlik" score={pr.fluency}       color="bg-purple-400" />
              <ScoreBar label="Talaffuz" score={pr.pronunciation} color="bg-berry-mid" />
            </div>

            {pr.wordScores?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {pr.wordScores.map((w, i) => (
                  <span key={i} className={`rounded-full px-2.5 py-1 text-xs font-bold ${w.score >= 80 ? 'bg-green-100 text-green-700' : w.score >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                    {w.word} {w.score >= 80 ? '✓' : '⚠️'}
                  </span>
                ))}
              </div>
            )}

            {/* Nigora's text message */}
            {nigoraText && (
              <div className="bg-white rounded-xl p-3 border border-purple-100">
                <div className="flex items-start gap-2">
                  <span className="text-lg shrink-0">🌸</span>
                  <p className="text-sm text-berry-deep font-medium leading-relaxed">{nigoraText}</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {pr.passed && (
              <button
                onClick={() => onComplete?.(xpEarned)}
                className="w-full bg-berry-deep text-white rounded-full py-3.5 font-black hover:scale-105 transition-all shadow-lg"
              >
                Davom etish → {xpEarned > 0 && `(+${xpEarned} 🫐)`}
              </button>
            )}
            <button
              onClick={retry}
              className={`w-full rounded-full py-3 font-bold hover:scale-105 transition-all ${pr.passed ? 'text-sm text-gray-400 hover:text-berry-mid' : 'bg-orange-500 text-white shadow-lg'}`}
            >
              Qayta urinish 🔄
            </button>
            {!pr.passed && pr.overall >= 50 && (
              <button onClick={() => onComplete?.(xpEarned)} className="text-sm text-gray-400 hover:text-berry-mid py-2 text-center transition-colors">
                O'tkazib yuborish →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Skip auto-play */}
      {audioPlaying && (
        <button onClick={skipFlow} className="text-xs text-gray-400 hover:text-berry-mid transition-colors">
          O'tkazib yuborish →
        </button>
      )}
    </div>
  )
}
