import { useState, useEffect, useRef } from 'react'
import { useLang } from '../context/LanguageContext'
import { playWrong } from '../lib/soundEffects'

// Embeds are widely blocked by channels, so we REDIRECT to YouTube and run a
// return-timer (video length + 5 min). If the student doesn't come back in time,
// a full-screen "aggressive" alarm pulls them back to the lesson.
const L = {
  preWatch:   { uz: "Videoni ko'rishdan oldin:", ru: 'Перед просмотром видео:' },
  watchBtn:   { uz: "YouTube'da ko'rish ▶", ru: 'Смотреть на YouTube ▶' },
  watching:   { uz: 'Video ko\'rilmoqda... qaytishingizni kutyapmiz', ru: 'Идёт просмотр... ждём вашего возвращения' },
  iWatched:   { uz: "Ko'rdim! Davom etish ✓", ru: 'Посмотрел! Продолжить ✓' },
  watchAgain: { uz: 'Qayta ochish', ru: 'Открыть снова' },
  skip:       { uz: "O'tkazib yuborish →", ru: 'Пропустить →' },
  timeLeft:   { uz: 'Qolgan vaqt', ru: 'Осталось' },
  alarmTitle: { uz: '⏰ VAQT TUGADI!', ru: '⏰ ВРЕМЯ ВЫШЛО!' },
  alarmBody:  { uz: 'Darsga hoziroq qayting! Davom etamiz!', ru: 'Вернитесь к уроку сейчас же! Продолжаем!' },
  alarmBtn:   { uz: 'Darsni davom ettirish →', ru: 'Продолжить урок →' },
  qTitle:     { uz: 'Video haqida savollar:', ru: 'Вопросы по видео:' },
  check:      { uz: 'Tekshirish', ru: 'Проверить' },
  continue:   { uz: 'Davom etish →', ru: 'Продолжить →' },
  loading:    { uz: 'Eng mos video tanlanmoqda...', ru: 'Подбираем лучшее видео...' },
}
const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export default function VideoLesson({ videoId, topic, subject = 'english', level = '', kind = 'lesson', session, preWatchText, questions = [], onComplete }) {
  const { lang } = useLang()
  const isPodcast = kind === 'podcast'
  const isCartoon = kind === 'cartoon'
  const sessionIdRef = useRef(null)
  const t = (k) => {
    if (isPodcast && k === 'watchBtn') return lang === 'ru' ? 'Слушать на YouTube 🎧' : "YouTube'da tinglash 🎧"
    if (isPodcast && k === 'iWatched') return lang === 'ru' ? 'Прослушал! Продолжить ✓' : "Tingladim! Davom etish ✓"
    if (isCartoon && k === 'watchBtn') return lang === 'ru' ? 'Смотреть мультфильм 🎬' : "Multfilmni ko'rish 🎬"
    return L[k][lang] || L[k].uz
  }

  const [video, setVideo] = useState(null) // {videoId,title,channel,durationSec,url}
  const [phase, setPhase] = useState('intro') // intro | watching | questions | alarm
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [answers, setAnswers] = useState({})
  const [checked, setChecked] = useState(false)
  const tickRef = useRef(null)
  const alarmRef = useRef(null)

  // Find the best topic/level-matched video (external).
  useEffect(() => {
    let alive = true
    fetch('/api/youtube-search', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, topic, level, kind, uiLang: lang }),
    })
      .then(r => r.json())
      .then(d => { if (alive && d?.videoId) setVideo(d) })
      .catch(() => {})
      .finally(() => {
        if (alive) setVideo(v => v || { videoId, title: topic, channel: 'YouTube', durationSec: 360, url: `https://www.youtube.com/watch?v=${videoId}` })
      })
    return () => { alive = false }
  }, [subject, topic, level, videoId, kind])

  // Countdown while watching.
  useEffect(() => {
    if (phase !== 'watching') return
    tickRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { clearInterval(tickRef.current); setPhase('alarm'); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(tickRef.current)
  }, [phase])

  // Repeating alarm sound while the alarm overlay is up.
  useEffect(() => {
    if (phase !== 'alarm') return
    playWrong()
    alarmRef.current = setInterval(() => playWrong(), 1500)
    return () => clearInterval(alarmRef.current)
  }, [phase])

  function startWatching() {
    const url = video?.url || `https://www.youtube.com/watch?v=${videoId}`
    window.open(url, '_blank', 'noopener')
    setSecondsLeft(video?.durationSec || 360) // timer = the video's actual length
    setPhase('watching')
    // Register a server-side session so the bot can "call back" if the student
    // never returns (escalating Telegram reminders). Best-effort, non-blocking.
    if (session?.userId && session?.telegramId) {
      fetch('/api/video-session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start', userId: session.userId, telegramId: session.telegramId,
          uiLang: session.uiLang || 'uz', topic, kind, durationSec: video?.durationSec || 360,
        }),
      }).then(r => r.json()).then(d => { sessionIdRef.current = d?.id || null }).catch(() => {})
    }
  }

  // Tell the server the student came back so reminders stop.
  function clearSession() {
    if (sessionIdRef.current) {
      fetch('/api/video-session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete', sessionId: sessionIdRef.current }),
      }).catch(() => {})
      sessionIdRef.current = null
    }
  }

  function done() {
    clearSession()
    if (questions.length > 0) setPhase('questions')
    else onComplete?.(10)
  }

  const allAnswered = questions.length === 0 || questions.every((_, i) => answers[i] !== undefined)
  const thumb = video ? `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg` : null

  // ── Full-screen aggressive alarm ───────────────────────────────
  if (phase === 'alarm') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center text-center px-6"
        style={{ background: 'rgba(220,38,38,0.97)', animation: 'pulse 1s infinite' }}>
        <div className="text-7xl mb-4" style={{ animation: 'shake 0.4s infinite' }}>⏰</div>
        <h1 className="text-3xl font-black text-white mb-2">{t('alarmTitle')}</h1>
        <p className="text-lg font-bold text-white/90 mb-8">{t('alarmBody')}</p>
        <button onClick={() => { clearInterval(alarmRef.current); done() }}
          className="bg-white text-red-600 font-black text-lg px-10 py-4 rounded-full shadow-2xl hover:scale-105 transition-all">
          {t('alarmBtn')}
        </button>
      </div>
    )
  }

  // ── Questions ──────────────────────────────────────────────────
  if (phase === 'questions') {
    return (
      <div className="flex-1 flex flex-col gap-4 px-4 py-4 max-w-2xl mx-auto w-full">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="font-black text-berry-deep mb-4">{t('qTitle')}</p>
          {questions.map((q, qi) => (
            <div key={qi} className="mb-4">
              <p className="font-semibold text-gray-700 mb-2 text-sm">{q.question}</p>
              <div className="flex flex-col gap-1.5">
                {q.options.map((opt, oi) => {
                  const isSel = answers[qi] === oi
                  const isCorrect = checked && oi === q.correct
                  const isWrong = checked && isSel && oi !== q.correct
                  return (
                    <button key={oi} onClick={() => !checked && setAnswers(a => ({ ...a, [qi]: oi }))}
                      className={`text-left px-4 py-2.5 rounded-xl font-semibold text-sm transition-all border ${
                        isCorrect ? 'bg-green-100 border-green-400 text-green-700' :
                        isWrong ? 'bg-red-50 border-red-300 text-red-600' :
                        isSel ? 'bg-berry-glow border-berry-mid text-berry-deep' :
                        'bg-gray-50 border-gray-200 text-gray-600 hover:border-berry-mid'}`}>
                      {opt}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          {!checked && allAnswered && questions.length > 0 && (
            <button onClick={() => setChecked(true)} className="w-full bg-berry-mid text-white font-black py-3 rounded-full mt-2">
              {t('check')}
            </button>
          )}
        </div>
        <button onClick={() => onComplete?.(10)}
          className="bg-berry-deep text-white font-black py-3 rounded-full shadow-md hover:bg-berry-dark transition-all">
          {t('continue')}
        </button>
      </div>
    )
  }

  // ── Intro / watching ───────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col gap-4 px-4 py-4 max-w-2xl mx-auto w-full">
      {preWatchText && (
        <div className="bg-berry-glow border border-berry-light rounded-2xl p-4">
          <p className="text-xs font-black text-berry-mid uppercase tracking-wide mb-1">📺 {t('preWatch')}</p>
          <p className="text-sm font-semibold text-berry-deep">{preWatchText}</p>
        </div>
      )}

      {!video ? (
        <div className="bg-berry-glow rounded-2xl p-10 text-center">
          <div className="w-10 h-10 border-4 border-berry-deep border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-berry-mid">{t('loading')}</p>
        </div>
      ) : (
        <div
          onClick={phase === 'intro' ? startWatching : undefined}
          className={`rounded-2xl overflow-hidden shadow-xl bg-white ${phase === 'intro' ? 'cursor-pointer hover:shadow-2xl transition-shadow' : ''}`}
        >
          <div className="relative">
            <img src={thumb} alt={video.title} className="w-full aspect-video object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center text-white text-3xl shadow-lg">{isPodcast ? '🎧' : '▶'}</div>
            </div>
            {video.durationSec > 0 && (
              <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-bold px-2 py-0.5 rounded">
                {fmt(video.durationSec)}
              </span>
            )}
          </div>
          <div className="p-4">
            <p className="font-black text-berry-deep text-sm leading-tight line-clamp-2">{video.title}</p>
            <p className="text-xs text-gray-400 font-semibold mt-1">{video.channel}</p>
          </div>
        </div>
      )}

      {phase === 'intro' && video && (
        <div className="flex flex-col gap-3">
          <button onClick={startWatching}
            className="bg-red-600 text-white font-black py-4 rounded-full shadow-md hover:bg-red-700 hover:scale-[1.02] transition-all">
            {t('watchBtn')}
          </button>
          <button onClick={() => onComplete?.(5)} className="text-center text-sm text-gray-400 hover:text-berry-mid font-semibold py-1">
            {t('skip')}
          </button>
        </div>
      )}

      {phase === 'watching' && (
        <div className="flex flex-col gap-3">
          <div className="bg-berry-glow rounded-2xl p-4 text-center">
            <p className="text-xs font-bold text-berry-mid uppercase">{t('timeLeft')}</p>
            <p className="text-3xl font-black text-berry-deep tabular-nums">{fmt(secondsLeft)}</p>
            <p className="text-xs text-gray-500 mt-1">{t('watching')}</p>
          </div>
          <button onClick={done}
            className="bg-berry-deep text-white font-black py-4 rounded-full shadow-md hover:bg-berry-dark hover:scale-[1.02] transition-all">
            {t('iWatched')}
          </button>
          <button onClick={startWatching} className="text-center text-sm text-berry-mid hover:text-berry-deep font-semibold py-1">
            {t('watchAgain')}
          </button>
        </div>
      )}
    </div>
  )
}
