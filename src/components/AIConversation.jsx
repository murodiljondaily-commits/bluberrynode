import { useState, useRef, useEffect, useCallback } from 'react'
import { useLang } from '../context/LanguageContext'
import { speak, stopSpeaking } from '../lib/voiceSystem'
import { playCelebration } from '../lib/soundEffects'

const CONV_SECONDS = 10 * 60 // 10-minute conversation

const L = {
  title:     { uz: '🎙️ AI bilan jonli suhbat', ru: '🎙️ Живой разговор с AI' },
  intro:     { uz: "10 daqiqa AI murabbiy bilan gaplashing. U sizni gapirishga undaydi va xatolaringizni tushuntiradi.", ru: 'Поговорите с AI-репетитором 10 минут. Он будет вовлекать вас и объяснять ошибки.' },
  start:     { uz: '▶️ Suhbatni boshlash', ru: '▶️ Начать разговор' },
  speak:     { uz: '🎤 Bosib gapiring', ru: '🎤 Нажмите и говорите' },
  stop:      { uz: '⏹️ To‘xtatish', ru: '⏹️ Остановить' },
  thinking:  { uz: 'AI o‘ylayapti...', ru: 'AI думает...' },
  speaking:  { uz: 'AI gapiryapti...', ru: 'AI говорит...' },
  listening: { uz: 'Sizning navbatingiz — gapiring!', ru: 'Ваша очередь — говорите!' },
  transcribing: { uz: 'Eshityapman...', ru: 'Слушаю...' },
  correction:{ uz: 'Tuzatish', ru: 'Исправление' },
  finish:    { uz: 'Suhbatni tugatish', ru: 'Завершить разговор' },
  done:      { uz: '🎉 Ajoyib suhbat!', ru: '🎉 Отличный разговор!' },
  continue:  { uz: 'Davom etish →', ru: 'Продолжить →' },
  micDenied: { uz: 'Mikrofonga ruxsat bering!', ru: 'Разрешите доступ к микрофону!' },
}

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export default function AIConversation({ subject = 'english', level = 'A1', topic = '', studentName = 'Student', onComplete }) {
  const { lang } = useLang()
  const t = (k) => L[k][lang] || L[k].uz
  const targetLanguage = subject === 'russian' ? 'russian' : 'english'
  const explainLanguage = subject === 'russian' ? 'uzbek' : (lang === 'ru' ? 'russian' : 'uzbek')

  const [status, setStatus] = useState('idle') // idle|thinking|speaking|listening|recording|transcribing|done
  const [messages, setMessages] = useState([]) // {role:'ai'|'user'|'correction', text}
  const [secondsLeft, setSecondsLeft] = useState(CONV_SECONDS)
  const [started, setStarted] = useState(false)
  const [turns, setTurns] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')

  const historyRef = useRef([])     // OpenAI-format [{role,content}]
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const endedRef = useRef(false)
  const mountedRef = useRef(true)
  const bottomRef = useRef(null)

  useEffect(() => () => { mountedRef.current = false; endedRef.current = true; stopSpeaking(); clearInterval(timerRef.current) }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, status])

  function finish() {
    if (endedRef.current) return
    endedRef.current = true
    clearInterval(timerRef.current)
    stopSpeaking()
    try { recorderRef.current?.stream?.getTracks().forEach((tr) => tr.stop()) } catch {}
    playCelebration()
    setStatus('done')
  }

  // Countdown
  useEffect(() => {
    if (!started) return
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { finish(); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [started]) // eslint-disable-line

  const callAI = useCallback(async (userMessage) => {
    if (endedRef.current) return
    setStatus('thinking')
    try {
      const res = await fetch('/api/conversation', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, level, topic, uiLang: lang, studentName, history: historyRef.current, userMessage }),
      })
      const d = await res.json()
      const reply = d.reply || ''
      const correction = d.correction || ''
      if (userMessage) historyRef.current.push({ role: 'user', content: userMessage })
      historyRef.current.push({ role: 'assistant', content: reply })

      if (!mountedRef.current) return
      setMessages((m) => [...m, ...(correction ? [{ role: 'correction', text: correction }] : []), { role: 'ai', text: reply }])

      // Speak the reply in the target language, then the correction in the explain language.
      setStatus('speaking')
      if (reply) await speak(reply, targetLanguage, 1.0)
      if (correction && !endedRef.current) await speak(correction, explainLanguage, 1.0)
      if (!endedRef.current && mountedRef.current) setStatus('listening')
    } catch {
      if (!endedRef.current && mountedRef.current) setStatus('listening')
    }
  }, [subject, level, topic, lang, studentName, targetLanguage, explainLanguage])

  function start() {
    setStarted(true)
    setMessages([])
    historyRef.current = []
    callAI('') // greeting
  }

  async function startRecording() {
    setErrorMsg('')
    stopSpeaking()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []
      const mr = new MediaRecorder(stream)
      recorderRef.current = mr
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.start()
      setStatus('recording')
    } catch {
      setErrorMsg(t('micDenied'))
    }
  }

  function stopRecording() {
    const mr = recorderRef.current
    if (!mr || mr.state === 'inactive') return
    mr.onstop = async () => {
      setStatus('transcribing')
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      try {
        const fd = new FormData()
        fd.append('audio', blob, 'rec.webm')
        fd.append('language', subject === 'russian' ? 'ru' : 'en')
        fd.append('expected', '')
        const r = await fetch('/api/transcribe', { method: 'POST', body: fd })
        const d = await r.json()
        const transcript = (d.transcript || '').trim()
        mr.stream.getTracks().forEach((tr) => tr.stop())
        if (!transcript) { if (mountedRef.current) setStatus('listening'); return }
        setMessages((m) => [...m, { role: 'user', text: transcript }])
        setTurns((n) => n + 1)
        callAI(transcript)
      } catch {
        mr.stream.getTracks().forEach((tr) => tr.stop())
        if (mountedRef.current) setStatus('listening')
      }
    }
    mr.stop()
  }

  function micClick() {
    if (status === 'listening') startRecording()
    else if (status === 'recording') stopRecording()
  }

  const statusText = {
    thinking: t('thinking'), speaking: t('speaking'), listening: t('listening'),
    recording: t('stop'), transcribing: t('transcribing'),
  }[status] || ''

  // ── Intro ──────────────────────────────────────────────────────
  if (!started) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-5 max-w-md mx-auto">
        <div className="text-5xl">🎙️</div>
        <h2 className="text-2xl font-black text-berry-deep">{t('title')}</h2>
        <p className="text-gray-500 font-semibold">{t('intro')}</p>
        <button onClick={start}
          className="bg-berry-deep text-white font-black text-lg px-10 py-4 rounded-full shadow-lg hover:bg-berry-dark hover:scale-[1.02] transition-all">
          {t('start')}
        </button>
        <button onClick={() => onComplete?.(0)} className="text-sm text-gray-400 hover:text-berry-mid">
          {lang === 'ru' ? 'Пропустить →' : "O'tkazib yuborish →"}
        </button>
      </div>
    )
  }

  // ── Done ───────────────────────────────────────────────────────
  if (status === 'done') {
    const xp = Math.min(150, turns * 15)
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-5">
        <div className="text-6xl">🎉</div>
        <h2 className="text-2xl font-black text-berry-deep">{t('done')}</h2>
        <p className="text-gray-500 font-semibold">{turns} {lang === 'ru' ? 'реплик' : 'marta gapirdingiz'} · +{xp} 🫐</p>
        <button onClick={() => onComplete?.(xp)}
          className="bg-berry-deep text-white font-black text-lg px-10 py-4 rounded-full shadow-lg hover:bg-berry-dark transition-all">
          {t('continue')}
        </button>
      </div>
    )
  }

  // ── Active conversation ────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col px-4 py-3 max-w-2xl mx-auto w-full">
      {/* Timer */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-gray-400 uppercase">{t('title')}</span>
        <span className={`font-black tabular-nums ${secondsLeft < 60 ? 'text-red-500' : 'text-berry-deep'}`}>⏱️ {fmt(secondsLeft)}</span>
      </div>

      {/* Transcript */}
      <div className="flex-1 overflow-y-auto space-y-2.5 mb-3 min-h-[200px] max-h-[46vh] bg-gray-50 rounded-2xl p-3">
        {messages.map((m, i) => {
          if (m.role === 'correction') {
            return (
              <div key={i} className="bg-purple-50 border border-purple-200 rounded-2xl px-4 py-2.5">
                <p className="text-[10px] font-black text-purple-400 uppercase tracking-wide">🔧 {t('correction')}</p>
                <p className="text-sm font-semibold text-purple-800">{m.text}</p>
              </div>
            )
          }
          const isUser = m.role === 'user'
          return (
            <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm font-semibold ${
                isUser ? 'bg-berry-deep text-white rounded-br-none' : 'bg-white shadow text-gray-700 rounded-bl-none'}`}>
                {!isUser && <span className="mr-1">🤖</span>}{m.text}
              </div>
            </div>
          )
        })}
        {(status === 'thinking' || status === 'transcribing' || status === 'speaking') && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-bl-none px-4 py-3 shadow">
              <div className="flex gap-1">{[0, 1, 2].map((i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-berry-mid animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}</div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {errorMsg && <p className="text-center text-sm text-orange-600 font-semibold mb-2">{errorMsg}</p>}
      {statusText && <p className="text-center text-xs font-bold text-berry-mid mb-2">{statusText}</p>}

      {/* Mic + finish */}
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={micClick}
          disabled={!['listening', 'recording'].includes(status)}
          className={`w-20 h-20 rounded-full text-white text-3xl shadow-xl flex items-center justify-center transition-all ${
            status === 'recording' ? 'bg-red-500 scale-110 animate-pulse' :
            status === 'listening' ? 'bg-berry-deep hover:scale-105' : 'bg-gray-300 cursor-not-allowed'}`}
        >
          🎤
        </button>
        <p className="text-xs text-gray-400 font-semibold">
          {status === 'recording' ? t('stop') : status === 'listening' ? t('speak') : ''}
        </p>
        <button onClick={finish} className="text-xs text-gray-400 hover:text-berry-mid transition-colors mt-1">
          {t('finish')}
        </button>
      </div>
    </div>
  )
}
