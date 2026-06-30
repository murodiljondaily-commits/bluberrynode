import { useState, useRef, useEffect } from 'react'
import { playCorrect, playWrong } from '../lib/soundEffects'
import { speak, speakUzbek } from '../lib/voiceSystem'
import { blobToLpcm16k } from '../lib/audioPcm'

// Target language (the sentence the student pronounces) — NEVER Uzbek through OpenAI.
const langForSubject = (s) => (s === 'russian' ? 'russian' : s === 'math' ? 'uzbek' : 'english')

const FALLBACK_SENTENCES = {
  english: [
    "I wake up at seven every morning.",
    "She goes to school every day.",
    "They drink water after exercise.",
    "He reads a book before bed.",
    "We have breakfast together.",
    "I brush my teeth every morning.",
    "She cooks dinner at six.",
    "He goes to work by bus.",
  ],
  russian: [
    "Меня зовут Али.",
    "Я иду домой.",
    "Она читает книгу.",
    "Мы пьём воду.",
    "Как дела? Хорошо, спасибо.",
    "Я из Узбекистана.",
    "До свидания! Удачи!",
    "Спасибо за помощь.",
  ],
  math: [
    "Besh qo'shishlik uch — sakkiz.",
    "O'n minus to'rt — olti.",
    "Uch marta to'rt — o'n ikki.",
    "O'n ikki bo'lishlik to'rt — uch.",
    "Yigirma besh foiz — to'rtdan bir.",
    "Yetti marta sakkiz — ellik olti.",
    "To'qson bo'lishlik o'n — to'qqiz.",
    "Yuz so'mning yarmi — ellik so'm.",
  ],
}

const ScoreBar = ({ label, score, color }) => (
  <div className="flex items-center gap-2">
    <span className="text-xs text-gray-500 w-20">{label}</span>
    <div className="flex-1 bg-gray-200 rounded-full h-2">
      <div
        className={`${color} h-2 rounded-full transition-all duration-500`}
        style={{ width: `${score}%` }}
      />
    </div>
    <span className="text-xs font-bold text-gray-600 w-8">{score}</span>
  </div>
)

export default function SpeakingLesson({ subject = 'english', sentences: propSentences, onComplete }) {
  const [index, setIndex] = useState(0)
  const [status, setStatus] = useState('idle') // idle | recording | processing | correct | wrong
  const [heard, setHeard] = useState('')
  const [xp, setXp] = useState(0)
  const [xpEarned, setXpEarned] = useState(0)
  const [pronunciationResult, setPronunciationResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const processingTimeoutRef = useRef(null)

  const fallback = FALLBACK_SENTENCES[subject] || FALLBACK_SENTENCES.english
  const list = (propSentences?.length > 0 ? propSentences : fallback)
  const current = list[index]
  // Sentences may be plain strings (fallback) or objects { text, uzbek, pronunciation_tip }.
  const currentText = typeof current === 'string' ? current : (current?.text || '')
  const currentUz = typeof current === 'object' ? (current?.uzbek || '') : ''
  const currentTip = typeof current === 'object' ? (current?.pronunciation_tip || '') : ''
  const isLast = index >= list.length - 1

  // Safety: if processing gets stuck for >35s, reset to idle
  useEffect(() => {
    if (status === 'processing') {
      processingTimeoutRef.current = setTimeout(() => {
        setStatus('idle')
        setErrorMsg('So\'rov vaqti tugadi. Qayta urinib ko\'ring.')
      }, 35000)
    } else {
      clearTimeout(processingTimeoutRef.current)
      if (status !== 'idle') setErrorMsg('')
    }
    return () => clearTimeout(processingTimeoutRef.current)
  }, [status])

  const startRecording = async () => {
    setErrorMsg('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      mediaRecorder.start()
      setStatus('recording')
    } catch {
      setErrorMsg('Mikrofonga ruxsat bering! Brauzer sozlamalarini tekshiring.')
    }
  }

  const stopRecording = () => {
    const mediaRecorder = mediaRecorderRef.current
    if (!mediaRecorder || mediaRecorder.state === 'inactive') return

    mediaRecorder.onstop = async () => {
      setStatus('processing')
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })

      try {
        const sttLang = subject === 'russian' ? 'ru' : subject === 'math' ? 'uz' : 'en'
        const fd = new FormData()
        // Uzbek/Russian → LPCM for Yandex STT; English → webm/Whisper.
        if (sttLang === 'uz' || sttLang === 'ru') {
          try {
            const pcm = await blobToLpcm16k(blob)
            fd.append('audio', pcm, 'rec.pcm')
            fd.append('format', 'lpcm')
            fd.append('sampleRate', '16000')
          } catch { fd.append('audio', blob, 'recording.webm') }
        } else {
          fd.append('audio', blob, 'recording.webm')
        }
        fd.append('language', sttLang)
        fd.append('expected', currentText)

        const response = await fetch('/api/transcribe', {
          method: 'POST',
          body: fd,
        })

        const data = await response.json()
        const transcript = data.transcript || ''
        // Always have a result object so the scorecard (with its retry button) renders,
        // even if the server didn't return a full pronunciation breakdown.
        const pronunciation = data.pronunciation || {
          overall: 0, passed: false, accuracy: 0, fluency: 0, pronunciation: 0, wordScores: [],
          feedback_uz: transcript
            ? `Eshitildi: "${transcript}". Qayta urinib ko'ring.`
            : "Ovoz aniqlanmadi. Mikrofonni tekshirib, qayta urinib ko'ring.",
        }

        setHeard(transcript)
        setPronunciationResult(pronunciation)

        if (pronunciation && pronunciation.passed) {
          const earned = Math.round((pronunciation.overall / 100) * 20)
          setXpEarned(earned)
          setXp(prev => prev + earned)
          setStatus('correct')
          playCorrect()
        } else {
          setXpEarned(0)
          setStatus('wrong')
          playWrong()
        }
      } catch (err) {
        console.error('Transcription error:', err)
        setErrorMsg("Server bilan bog'lanib bo'lmadi. Qayta urinib ko'ring.")
        setStatus('idle')
      }

      mediaRecorder.stream.getTracks().forEach(t => t.stop())
    }

    mediaRecorder.stop()
  }

  const handleMicClick = () => {
    if (status === 'idle') startRecording()
    else if (status === 'recording') stopRecording()
  }

  const next = () => {
    if (isLast) {
      onComplete && onComplete(xp)
    } else {
      setIndex(i => i + 1)
      setStatus('idle')
      setHeard('')
      setPronunciationResult(null)
      setXpEarned(0)
      setErrorMsg('')
    }
  }

  const retry = () => {
    setStatus('idle')
    setHeard('')
    setPronunciationResult(null)
    setXpEarned(0)
    setErrorMsg('')
  }

  const prev = () => {
    if (index === 0) return
    setIndex(i => i - 1)
    setStatus('idle')
    setHeard('')
    setPronunciationResult(null)
    setXpEarned(0)
    setErrorMsg('')
  }

  const overall = pronunciationResult?.overall ?? 0

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-6">

      {/* Sentence */}
      <div className="text-center">
        <p className="text-sm text-gray-400 mb-2">Gap {index + 1}/{list.length} 🎤</p>
        <p className="text-sm text-berry-mid font-semibold mb-3">Quyidagi gapni aytib ko'ring:</p>
        <p className="text-2xl font-black text-berry-deep bg-berry-glow rounded-2xl px-6 py-4">{currentText}</p>
        {currentUz && (
          <p className="text-sm text-gray-500 mt-2">🇺🇿 {currentUz}</p>
        )}
        {/* Pronunciation aids: hear the TARGET sentence (English via OpenAI, Russian via
            Yandex), at normal + slow speed. Uzbek help uses the Uzbek Nigora voice. */}
        <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
          <button
            onClick={() => speak(currentText, langForSubject(subject), 1.0).catch(() => {})}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-berry-light text-berry-deep font-bold text-sm shadow-sm hover:bg-berry-glow transition-all"
          >
            🔊 Tinglash
          </button>
          <button
            onClick={() => speak(currentText, langForSubject(subject), 0.6).catch(() => {})}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-berry-light text-berry-mid font-bold text-sm shadow-sm hover:bg-berry-glow transition-all"
          >
            🐢 Sekin
          </button>
          {(currentTip || currentUz) && (
            <button
              onClick={() => speakUzbek(currentTip || currentUz).catch(() => {})}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-purple-50 border border-purple-200 text-purple-700 font-bold text-sm shadow-sm hover:bg-purple-100 transition-all"
              title="Nigora o'zbekcha tushuntiradi"
            >
              🌸 Tushunmadim
            </button>
          )}
        </div>
        {currentTip && (
          <p className="text-xs text-gray-400 italic mt-2">💡 {currentTip}</p>
        )}
      </div>

      {/* Error message (inline, not blocking alert) */}
      {errorMsg && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 text-sm text-orange-700 font-semibold max-w-sm text-center">
          {errorMsg}
        </div>
      )}

      {/* Mic */}
      {(status === 'idle' || status === 'recording') && (
        <div className="flex flex-col items-center gap-3">
          <div className="relative flex items-center justify-center">
            {status === 'recording' && (
              <>
                <div className="absolute w-36 h-36 rounded-full bg-red-400 opacity-20 animate-ping" />
                <div className="absolute w-28 h-28 rounded-full bg-red-400 opacity-30 animate-ping" style={{ animationDelay: '0.3s' }} />
              </>
            )}
            <button
              onClick={handleMicClick}
              className={`w-24 h-24 rounded-full text-white text-4xl shadow-xl hover:scale-110 transition-all flex items-center justify-center z-10 ${
                status === 'recording' ? 'bg-red-500' : 'bg-berry-deep'
              }`}
            >
              🎤
            </button>
          </div>
          <p className="text-sm text-gray-400">
            {status === 'idle' ? 'Mikrofon tugmasini bosing' : '🔴 Gapiryapsiz... Tugatish uchun qayta bosing'}
          </p>
        </div>
      )}

      {/* Processing */}
      {status === 'processing' && (
        <div className="flex flex-col items-center gap-3">
          <div className="w-24 h-24 rounded-full bg-berry-light flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-berry-deep border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm text-gray-400">AI talaffuzni baholayapti...</p>
        </div>
      )}

      {/* Correct scorecard */}
      {status === 'correct' && pronunciationResult && (
        <div className="bg-green-50 border-2 border-green-400 rounded-2xl p-6 w-full max-w-md" style={{ animation: 'fadeInUp 0.3s ease-out' }}>
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-20 h-20 rounded-full bg-berry-deep flex flex-col items-center justify-center text-white shrink-0">
              <span className="text-2xl font-black">{pronunciationResult.overall}</span>
              <span className="text-xs">/100</span>
            </div>
            <div>
              <p className="text-xl font-black text-green-600">Zo'r! ✅</p>
              <p className="text-sm text-gray-500">+{xpEarned} 🫐 qo'shildi</p>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <ScoreBar label="Aniqlik" score={pronunciationResult.accuracy} color="bg-blue-400" />
            <ScoreBar label="Ravonlik" score={pronunciationResult.fluency} color="bg-purple-400" />
            <ScoreBar label="Talaffuz" score={pronunciationResult.pronunciation} color="bg-berry-mid" />
          </div>

          {pronunciationResult.wordScores?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {pronunciationResult.wordScores.map((w, i) => (
                <div key={i} title={w.issue || ''}
                  className={`rounded-full px-3 py-1 text-sm font-bold cursor-default ${
                    w.score >= 80 ? 'bg-green-100 text-green-700' :
                    w.score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                  {w.word} {w.score >= 80 ? '✓' : '⚠️'}
                </div>
              ))}
            </div>
          )}

          <div className="bg-white rounded-xl p-3 mb-4">
            <p className="text-sm text-berry-deep">💬 {pronunciationResult.feedback_uz}</p>
            {pronunciationResult.correct_pronunciation && (
              <p className="text-xs text-gray-400 mt-1 font-mono">{pronunciationResult.correct_pronunciation}</p>
            )}
          </div>

          <button onClick={next} className="w-full bg-berry-deep text-white rounded-full py-3 font-bold hover:scale-105 transition-all">
            {isLast ? 'Tugatish →' : 'Keyingi gap →'}
          </button>
        </div>
      )}

      {/* Wrong scorecard */}
      {status === 'wrong' && pronunciationResult && (
        <div className={`border-2 rounded-2xl p-6 w-full max-w-md ${
          overall >= 50 ? 'bg-orange-50 border-orange-400' : 'bg-red-50 border-red-400'
        }`} style={{ animation: 'fadeInUp 0.3s ease-out' }}>
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className={`w-20 h-20 rounded-full flex flex-col items-center justify-center text-white shrink-0 ${
              overall >= 50 ? 'bg-orange-500' : 'bg-red-500'
            }`}>
              <span className="text-2xl font-black">{overall}</span>
              <span className="text-xs">/100</span>
            </div>
            <div>
              <p className={`text-lg font-black ${overall >= 50 ? 'text-orange-600' : 'text-red-600'}`}>
                {overall >= 50 ? "Yaxshiroq bo'ling! 💪" : 'Yana mashq qiling! 🔄'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 italic">"{heard}"</p>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <ScoreBar label="Aniqlik" score={pronunciationResult.accuracy} color="bg-blue-400" />
            <ScoreBar label="Ravonlik" score={pronunciationResult.fluency} color="bg-purple-400" />
            <ScoreBar label="Talaffuz" score={pronunciationResult.pronunciation} color="bg-berry-mid" />
          </div>

          {pronunciationResult.wordScores?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {pronunciationResult.wordScores.map((w, i) => (
                <div key={i} title={w.issue || ''}
                  className={`rounded-full px-3 py-1 text-sm font-bold cursor-default ${
                    w.score >= 80 ? 'bg-green-100 text-green-700' :
                    w.score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                  {w.word} {w.score >= 80 ? '✓' : '⚠️'}
                </div>
              ))}
            </div>
          )}

          {pronunciationResult.correct_pronunciation && (
            <div className="bg-white rounded-xl p-3 mb-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">🗣️ Qanday to'g'ri aytiladi:</p>
              <p className="text-sm font-mono text-berry-deep">{pronunciationResult.correct_pronunciation}</p>
            </div>
          )}

          <div className="bg-white rounded-xl p-3 mb-4">
            <p className="text-sm text-berry-deep">💬 {pronunciationResult.feedback_uz}</p>
          </div>

          <button onClick={retry} className={`w-full text-white rounded-full py-3 font-bold hover:scale-105 transition-all mb-2 ${
            overall >= 50 ? 'bg-orange-500' : 'bg-red-500'
          }`}>
            Qayta urinish 🔄
          </button>

          {overall >= 50 && (
            <button onClick={next} className="w-full text-sm text-gray-400 hover:text-berry-mid transition-colors py-2">
              {isLast ? 'Tugatish →' : "O'tkazib yuborish →"}
            </button>
          )}
        </div>
      )}

      {/* Persistent Prev / Next navigation — move between the 8 sentences freely */}
      <div className="flex items-center justify-between gap-3 w-full max-w-md">
        <button
          onClick={prev}
          disabled={index === 0}
          className="px-4 py-2.5 rounded-full font-bold text-sm border-2 border-berry-light text-berry-mid hover:bg-berry-glow transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ← Oldingi
        </button>
        <button
          onClick={next}
          className="flex-1 bg-berry-deep text-white font-black py-3 rounded-full shadow-lg hover:bg-berry-dark hover:scale-[1.02] transition-all"
        >
          {isLast ? 'Tugatish →' : 'Keyingisi →'}
        </button>
      </div>
    </div>
  )
}
