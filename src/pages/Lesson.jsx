import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import MiniTree from '../components/MiniTree'
import TutorSession from '../components/TutorSession'
import SessionTimer from '../components/SessionTimer'
import SubtleOrbs from '../components/SubtleOrbs'
import VideoLesson from '../components/VideoLesson'
import RealtimeConversation from '../components/RealtimeConversation'
import { sessionLogger } from '../lib/sessionLogger'
import { AdaptiveEngine } from '../lib/exerciseEngine'
import { vocabularyManager } from '../lib/vocabularyManager'
import { speak, speakUzbek, speakEnglish } from '../lib/voiceSystem'
import { playCorrect, playWrong, playCelebration, playFlip } from '../lib/soundEffects'

// ── Fisher-Yates shuffle for exercise options (Fix 4: randomize correct position)
function shuffleOptions(exercise) {
  const options = [...(exercise.options || [])]
  if (options.length === 0) return exercise
  const correctAnswer = options[exercise.correct]
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]]
  }
  return { ...exercise, options, correct: options.indexOf(correctAnswer) }
}

const clientFetch = (url, opts, ms = 30000) => {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(t))
}

// ─── Confetti ─────────────────────────────────────────────────────
const CONFETTI_COLORS = ['#7B5EA7','#C9B8E8','#3D1F6E','#5A8A5A','#FFD700','#FF6B6B','#87CEEB']
const CONFETTI_PIECES = Array.from({ length: 45 }, (_, i) => ({
  id: i,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  left: `${((i * 2.3 + 1.5) % 100).toFixed(1)}%`,
  delay: `${((i * 0.07) % 1.8).toFixed(2)}s`,
  duration: `${(2.0 + (i % 5) * 0.4).toFixed(1)}s`,
  size: `${6 + (i % 6) * 2}px`,
  isCircle: i % 3 !== 0,
}))

function Confetti() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {CONFETTI_PIECES.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: p.left,
          top: '-20px',
          width: p.size,
          height: p.size,
          backgroundColor: p.color,
          borderRadius: p.isCircle ? '50%' : '2px',
          animation: `confettiFall ${p.duration} ${p.delay} ease-in forwards`,
          opacity: 0.85,
        }} />
      ))}
    </div>
  )
}

// ─── Loading tips ──────────────────────────────────────────────────
const LOADING_TIPS = [
  "Bugun yangi so'zlar o'rganasiz! 📚",
  "AI sizga shaxsiy dars tayyorlamoqda 🧠",
  "Talaffuzingiz baholanadi 🎤",
  "Grammatika qoidalari o'zbek tilida 📖",
  "Real hayot misollar bilan o'rganasiz 💡",
]

const SUBJECT_META = {
  english: { flag: '🇬🇧', label: 'English' },
  russian: { flag: '🇷🇺', label: 'Русский' },
  math:    { flag: '🔢', label: 'Matematika' },
}

// ─── BLOCK 1 — Vocabulary Flip Cards ──────────────────────────────
function VocabBlock({ words, subject = 'english', onComplete }) {
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [seenBack, setSeenBack] = useState(false)

  const w = words[idx] || {}
  const isLast = idx >= words.length - 1

  function handleFlip() {
    const next = !flipped
    setFlipped(next)
    playFlip()
    if (next) {
      setSeenBack(true)
      speak(w.audio_text || w.word, subject).catch(() => {})
    }
  }

  function handleNext() {
    if (isLast) {
      onComplete(10)
    } else {
      setIdx(i => i + 1)
      setFlipped(false)
      setSeenBack(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 py-8">
      <div className="text-center">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Yangi so'zlar</p>
        <h2 className="text-xl font-black text-berry-deep">Kartani bosib tering! 👆</h2>
      </div>

      {/* Flip card */}
      <div className="w-80 h-52 cursor-pointer select-none" style={{ perspective: '1000px' }} onClick={handleFlip} key={idx}>
        <div
          className="w-full h-full relative transition-transform duration-500"
          style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 bg-white rounded-3xl shadow-2xl flex flex-col items-center justify-center px-8"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <p className="text-5xl font-black text-berry-deep mb-2">{w.word}</p>
            {w.pronunciation && (
              <p className="text-sm text-berry-mid font-mono bg-berry-glow rounded-full px-3 py-1">{w.pronunciation}</p>
            )}
            <p className="text-xs text-gray-400 font-semibold mt-3">Bosing →</p>
            <button
              onClick={e => { e.stopPropagation(); speak(w.audio_text || w.word, subject).catch(() => {}) }}
              className="text-berry-mid text-xl hover:text-berry-deep transition-colors mt-1"
              title="Tinglash"
            >🔊</button>
          </div>
          {/* Back */}
          <div
            className="absolute inset-0 bg-berry-glow rounded-3xl shadow-2xl flex flex-col items-center justify-center px-8 text-center"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <p className="text-3xl font-black text-berry-deep mb-2">{w.translation}</p>
            {w.example && (
              <p className="text-sm text-berry-mid font-semibold italic mb-1">"{w.example}"</p>
            )}
            {w.example_uz && (
              <p className="text-xs text-gray-500">{w.example_uz}</p>
            )}
          </div>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex gap-2">
        {words.map((_, i) => (
          <div key={i} className={`h-2.5 rounded-full transition-all duration-300 ${
            i < idx ? 'bg-berry-deep w-6' : i === idx ? 'bg-berry-mid w-6' : 'bg-berry-light w-2.5'
          }`} />
        ))}
      </div>

      {seenBack && (
        <button
          onClick={handleNext}
          className="bg-berry-deep text-white font-black px-10 py-3 rounded-full shadow-lg hover:bg-berry-dark hover:scale-[1.02] transition-all"
          style={{ animation: 'fadeInUp 0.3s ease-out' }}
        >
          {isLast ? 'Davom etish →' : 'Keyingisi →'}
        </button>
      )}

      <p className="text-xs text-gray-400">{idx + 1}/{words.length} so'z</p>
    </div>
  )
}

// ─── BLOCK 2 — Grammar Explanation ────────────────────────────────
function GrammarBlock({ grammar, subject = 'english', onComplete }) {

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-lg mx-auto" style={{ animation: 'fadeInUp 0.4s ease-out' }}>
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-4">
          <h2 className="text-2xl font-black text-berry-deep mb-3">{grammar.title}</h2>
          <p className="text-base text-gray-700 leading-relaxed mb-4">{grammar.explanation}</p>

          {grammar.rule && (
            <div className="bg-cream rounded-2xl px-4 py-3 mb-4 border-l-4 border-berry-mid">
              <p className="text-sm font-bold text-berry-deep">📌 {grammar.rule}</p>
            </div>
          )}

          {grammar.examples?.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Misollar</p>
              <div className="flex flex-col gap-2">
                {grammar.examples.map((ex, i) => (
                  <div key={i} className="bg-berry-glow rounded-2xl px-4 py-3">
                    <p className="font-black text-berry-deep text-sm">{ex.target}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{ex.uzbek}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {grammar.tip && (
            <div className="border-2 border-green-200 bg-green-50 rounded-2xl px-4 py-3">
              <p className="text-sm font-semibold text-green-700">💡 {grammar.tip}</p>
            </div>
          )}
        </div>

        <button
          onClick={() => onComplete(20)}
          className="w-full bg-berry-deep text-white font-black text-lg py-4 rounded-full shadow-lg hover:bg-berry-dark hover:scale-[1.02] transition-all"
        >
          Tushundim! →
        </button>
      </div>
    </div>
  )
}

// ─── BLOCK 4 — Exercises ──────────────────────────────────────────
const LETTER = ['A', 'B', 'C', 'D']

function ExercisesBlock({ exercises, subject = 'english', onComplete, onExerciseLog }) {
  const [exIdx, setExIdx] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [isCorrect, setIsCorrect] = useState(null)
  const [selected, setSelected] = useState(null)
  const [shaking, setShaking] = useState(false)
  const [score, setScore] = useState(0)
  const [xpEarned, setXpEarned] = useState(0)
  const startRef = useRef(Date.now())

  const ex = exercises[exIdx]
  const total = exercises.length
  const isFill = ex?.type === 'fillBlank' || ex?.type === 'fill'

  // Fix 7: Auto-read question with Nigora when exercise changes
  useEffect(() => {
    if (!ex) return
    const prompt = isFill
      ? "Bo'shliqni to'ldiring"
      : `${ex.question} — tarjimasi nima?`
    speakUzbek(prompt).catch(() => {})
  }, [exIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  function checkChoice(optIdx) {
    if (answered) return
    setSelected(optIdx)
    const timeMs = Date.now() - startRef.current
    const isCorr = optIdx === ex.correct
    onExerciseLog?.({
      question: ex.question,
      userAnswer: ex.options?.[optIdx] || '',
      correctAnswer: ex.options?.[ex.correct] || '',
      isCorrect: isCorr,
      timeMs,
    })
    if (isCorr) {
      setScore(s => s + 1)
      setXpEarned(x => x + 10)
      setIsCorrect(true)
      playCorrect()
      speakUzbek("To'g'ri! Zo'r!").catch(() => {})
    } else {
      setIsCorrect(false)
      setShaking(true)
      setTimeout(() => setShaking(false), 450)
      playWrong()
      const correctText = ex.options?.[ex.correct] || ''
      speakUzbek(`Xato. To'g'ri javob: ${correctText}`).catch(() => {})
    }
    setAnswered(true)
  }

  function next() {
    if (exIdx < total - 1) {
      startRef.current = Date.now()
      setExIdx(i => i + 1)
      setAnswered(false)
      setIsCorrect(null)
      setSelected(null)
    } else {
      // Include the final answer's correctness in score
      const finalScore = score + (isCorrect ? 1 : 0)
      onComplete(xpEarned, finalScore, total)
    }
  }

  if (!ex) return null

  return (
    <div className="flex-1 flex flex-col items-center px-4 py-6">
      {/* Step dots */}
      <div className="flex gap-1.5 mb-6 flex-wrap justify-center">
        {exercises.map((_, i) => (
          <div key={i} className={`h-2 w-2 rounded-full transition-all duration-300 ${
            i < exIdx ? 'bg-berry-deep' : i === exIdx ? 'bg-berry-mid scale-125' : 'bg-berry-light'
          }`} />
        ))}
      </div>

      <div className={`w-full max-w-lg ${shaking ? '[animation:shake_0.4s_ease-in-out]' : ''}`}>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide text-center mb-3">
          {isFill ? "Bo'sh joyni to'ldiring" : 'Tarjimani toping'}
        </p>

        <div className="bg-white rounded-2xl shadow-sm px-6 py-5 mb-4 text-center">
          <p className="text-xl font-black text-berry-deep">{ex.question}</p>
        </div>

        <div className="flex flex-col gap-2">
          {ex.options?.map((opt, i) => {
            let cls = 'bg-white border-2 border-berry-light text-gray-700 hover:border-berry-mid hover:bg-berry-glow/30'
            let icon = null
            if (answered) {
              if (i === ex.correct) {
                cls = 'bg-green-50 border-2 border-green-500 text-green-800'
                icon = <span className="ml-auto font-black text-green-600 shrink-0">✓</span>
              } else if (i === selected) {
                cls = 'bg-red-50 border-2 border-red-400 text-red-700'
                icon = <span className="ml-auto font-black text-red-500 shrink-0">✗</span>
              } else {
                cls = 'bg-white border-2 border-gray-100 text-gray-400 opacity-50'
              }
            }
            return (
              <button
                key={i}
                onClick={() => checkChoice(i)}
                disabled={answered}
                className={`flex items-center gap-3 px-5 py-4 rounded-2xl font-semibold text-left transition-all duration-150 ${cls} disabled:cursor-default`}
              >
                <span className="font-black text-xs text-berry-mid shrink-0 w-4">{LETTER[i]}</span>
                <span className="flex-1">{opt}</span>
                {icon}
              </button>
            )
          })}
        </div>

        {answered && ex.explanation_uz && (
          <div
            className={`mt-4 rounded-2xl p-4 ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}
            style={{ animation: 'fadeInUp 0.3s ease-out' }}
          >
            <p className="text-sm font-semibold text-gray-700">{ex.explanation_uz}</p>
          </div>
        )}

        {answered && (
          <div className="mt-4 text-center" style={{ animation: 'fadeInUp 0.3s ease-out' }}>
            <p className={`font-black text-lg mb-3 ${isCorrect ? 'text-green-600' : 'text-red-500'}`}>
              {isCorrect ? "To'g'ri! ✅ +10 🫐" : 'Xato! ❌'}
            </p>
            <button
              onClick={next}
              className="bg-berry-deep text-white font-black px-10 py-3 rounded-full shadow-lg hover:bg-berry-dark hover:scale-[1.02] transition-all"
            >
              {exIdx < total - 1 ? 'Keyingisi →' : "Natijani ko'rish →"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── BLOCK 5 — Story Mode ─────────────────────────────────────────
function StoryBlock({ story, subject = 'english', onComplete }) {
  const [phase, setPhase] = useState('read')
  const [showUzbek, setShowUzbek] = useState(false)
  const [qIdx, setQIdx] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [selected, setSelected] = useState(null)
  const [xp, setXp] = useState(0)

  const questions = story?.questions || []
  const q = questions[qIdx]

  function checkAnswer(idx) {
    if (answered) return
    setSelected(idx)
    setAnswered(true)
    if (idx === q.correct) {
      setXp(v => v + 10)
      playCorrect()
      speakUzbek("To'g'ri!").catch(() => {})
    } else {
      playWrong()
    }
  }

  function nextQuestion() {
    if (qIdx < questions.length - 1) {
      setQIdx(i => i + 1)
      setAnswered(false)
      setSelected(null)
    } else {
      onComplete(xp)
    }
  }

  if (phase === 'read') {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-lg mx-auto" style={{ animation: 'fadeInUp 0.4s ease-out' }}>
          <div className="bg-white rounded-3xl shadow-xl p-6 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📖</span>
              <h3 className="text-xl font-black text-berry-deep">{story?.title}</h3>
            </div>
            <p className="text-gray-700 leading-relaxed text-base">{story?.text}</p>
            {showUzbek && story?.text_uz && (
              <div
                className="mt-4 bg-cream rounded-2xl p-4 border-l-4 border-berry-light"
                style={{ animation: 'fadeInUp 0.3s ease-out' }}
              >
                <p className="text-sm text-gray-600 italic leading-relaxed">{story.text_uz}</p>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowUzbek(v => !v)}
            className="w-full border-2 border-berry-light text-berry-mid font-bold py-3 rounded-full hover:bg-berry-glow transition-all mb-3"
          >
            {showUzbek ? "O'zbek tarjimasini yashirish" : "O'zbek tarjimasini ko'rish 🇺🇿"}
          </button>

          {questions.length > 0 ? (
            <button
              onClick={() => setPhase('questions')}
              className="w-full bg-berry-deep text-white font-black py-4 rounded-full shadow-lg hover:bg-berry-dark hover:scale-[1.02] transition-all"
            >
              Savollar →
            </button>
          ) : (
            <button
              onClick={() => onComplete(10)}
              className="w-full bg-berry-deep text-white font-black py-4 rounded-full shadow-lg hover:bg-berry-dark hover:scale-[1.02] transition-all"
            >
              Davom etish →
            </button>
          )}
        </div>
      </div>
    )
  }

  // Questions phase
  return (
    <div className="flex-1 flex flex-col items-center px-4 py-6">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-5">
        Savol {qIdx + 1}/{questions.length}
      </p>
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-sm px-6 py-5 mb-4 text-center">
          <p className="text-lg font-black text-berry-deep">{q?.question}</p>
        </div>
        <div className="flex flex-col gap-2 mb-4">
          {q?.options?.map((opt, i) => {
            let cls = 'bg-white border-2 border-berry-light text-gray-700 hover:border-berry-mid hover:bg-berry-glow/30'
            if (answered) {
              if (i === q.correct) cls = 'bg-green-50 border-2 border-green-500 text-green-800'
              else if (i === selected) cls = 'bg-red-50 border-2 border-red-400 text-red-700'
              else cls = 'bg-white border-2 border-gray-100 text-gray-400 opacity-50'
            }
            return (
              <button
                key={i}
                onClick={() => checkAnswer(i)}
                disabled={answered}
                className={`px-5 py-3 rounded-2xl font-semibold text-left transition-all ${cls} disabled:cursor-default`}
              >
                {LETTER[i]}. {opt}
              </button>
            )
          })}
        </div>
        {answered && (
          <div className="text-center" style={{ animation: 'fadeInUp 0.3s ease-out' }}>
            <p className={`font-black mb-3 ${selected === q.correct ? 'text-green-600' : 'text-red-500'}`}>
              {selected === q.correct ? "To'g'ri! ✅ +10 🫐" : 'Xato! ❌'}
            </p>
            <button
              onClick={nextQuestion}
              className="bg-berry-deep text-white font-black px-10 py-3 rounded-full shadow-lg hover:bg-berry-dark transition-all"
            >
              {qIdx < questions.length - 1 ? 'Keyingisi →' : 'Tugatish →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── BLOCK 7 — Complete ───────────────────────────────────────────
function CompleteBlock({
  sessionXP, score, total, wordsCount, speakingXP,
  profile, userId, lessonWords, subject, lessonNum, lessonTopic,
  onDashboard, onNextLesson,
}) {
  const [displayXP, setDisplayXP] = useState(0)
  const savedRef = useRef(false)

  useEffect(() => { playCelebration() }, [])

  // XP count-up animation
  useEffect(() => {
    if (sessionXP === 0) return
    const step = sessionXP / (1400 / 16)
    let cur = 0
    const t = setInterval(() => {
      cur += step
      if (cur >= sessionXP) { setDisplayXP(sessionXP); clearInterval(t) }
      else setDisplayXP(Math.floor(cur))
    }, 16)
    return () => clearInterval(t)
  }, [sessionXP])

  useEffect(() => {
    if (!userId || savedRef.current) return
    savedRef.current = true

    async function save() {
      // 1. Add AI vocab words to bank
      if (lessonWords?.length) {
        await vocabularyManager.addWords(userId, lessonWords, subject).catch(() => {})
      }

      // 2. Analyze session with AI — builds tutor notes for the next lesson planner
      let aiNotes = lessonTopic ? `[TOPIC: ${lessonTopic}]\nSession completed.` : 'Session completed.'
      try {
        const nr = await fetch('/api/analyze-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionData: {
              subject,
              topic: lessonTopic,
              xp_earned: sessionXP,
              accuracy_percent: Math.round(sessionXP > 0 ? (score / Math.max(total, 1)) * 100 : 0),
              words_wrong: sessionLogger.wordsWrong || [],
              speaking_avg_score: sessionLogger.speakingScores?.length
                ? Math.round(sessionLogger.speakingScores.reduce((a, b) => a + b, 0) / sessionLogger.speakingScores.length)
                : 0,
            },
          }),
        })
        const nj = await nr.json()
        aiNotes = nj.notes || aiNotes
      } catch { /* use default */ }

      // 3. Save session log with subject
      await sessionLogger.saveSession(userId, subject, aiNotes).catch(() => {})

      // 4. Fetch fresh profile to avoid stale XP race
      const { data: fresh } = await supabase
        .from('profiles')
        .select('xp, total_berries_earned, streak, total_lessons_completed, last_study_date, current_lesson, completed_lessons')
        .eq('id', userId)
        .single()
      if (!fresh) return

      const today     = new Date().toISOString().split('T')[0]
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
      const last      = fresh.last_study_date
      let newStreak   = fresh.streak || 0
      if (last === today) {
        // already counted today, keep streak
      } else if (last === yesterday) {
        newStreak += 1
      } else {
        newStreak = 1
      }

      const completedList = [
        ...new Set([...(fresh.completed_lessons?.[subject] || []), lessonNum]),
      ]

      await supabase.from('profiles').update({
        xp:                      (fresh.xp || 0) + sessionXP,
        total_berries_earned:    (fresh.total_berries_earned || 0) + sessionXP,
        streak:                  newStreak,
        last_study_date:         today,
        total_lessons_completed: (fresh.total_lessons_completed || 0) + 1,
        current_lesson: {
          ...(fresh.current_lesson || {}),
          [subject]: lessonNum + 1,
        },
        completed_lessons: {
          ...(fresh.completed_lessons || {}),
          [subject]: completedList,
        },
      }).eq('id', userId)

      console.log('✅ Saved XP, streak, lesson', lessonNum, '→', lessonNum + 1)
    }

    save()
  }, [userId])

  const sentencesSpoken = Math.max(1, Math.round((speakingXP || 0) / 15))

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden">
      <Confetti />
      <div
        className="relative z-10 flex flex-col items-center gap-5 text-center"
        style={{ animation: 'fadeInUp 0.5s ease-out' }}
      >
        <div className="text-6xl">🎉</div>
        <h2 className="text-4xl font-black text-berry-deep">Dars tugadi!</h2>

        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-3xl px-12 py-4">
          <div className="text-5xl font-black text-yellow-600 leading-none">+{displayXP}</div>
          <div className="text-sm font-bold text-yellow-500 mt-1">🫐 topildi</div>
        </div>

        <div className="flex gap-3 flex-wrap justify-center">
          <div className="bg-white rounded-2xl px-4 py-3 shadow-sm text-center">
            <div className="text-xl font-black text-berry-deep">{score}/{total}</div>
            <div className="text-xs font-bold text-gray-400">to'g'ri</div>
          </div>
          <div className="bg-white rounded-2xl px-4 py-3 shadow-sm text-center">
            <div className="text-xl font-black text-berry-deep">{wordsCount}</div>
            <div className="text-xs font-bold text-gray-400">so'z</div>
          </div>
          <div className="bg-white rounded-2xl px-4 py-3 shadow-sm text-center">
            <div className="text-xl font-black text-berry-deep">{sentencesSpoken}</div>
            <div className="text-xs font-bold text-gray-400">gap</div>
          </div>
        </div>

        <div>
          <MiniTree streak={(profile?.streak || 0) + 1} />
          <p className="text-green-600 font-bold mt-2">Ko'chatchangiz o'sdi! 🫐</p>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={onNextLesson}
            className="bg-berry-deep text-white font-black py-4 rounded-full shadow-lg hover:bg-berry-dark hover:scale-[1.02] transition-all"
          >
            Keyingi dars →
          </button>
          <button
            onClick={onDashboard}
            className="border-2 border-berry-mid text-berry-mid font-bold py-3 rounded-full hover:bg-berry-glow transition-all"
          >
            Bosh sahifaga →
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Fallback content (Daily Routines) ───────────────────────────
function getFallbackPlan() {
  return {
    topic: 'Daily Routines',
    topicUzbek: 'Kundalik Odatlar',
    difficulty: 'elementary',
    method: 'mixed',
    focusWords: ['wake up', 'have breakfast', 'go to work', 'have lunch', 'go to bed'],
    grammarPoint: 'Present Simple — Daily Habits',
    weakPointsToAddress: [],
    speakingFocus: true,
    estimatedMinutes: 30,
    lessonNumber: 1,
    aiMessage: "Salom! Bugun kundalik odatlarni o'rganamiz! Tayyor bo'lsangiz, boshlaymiz! 💪",
    encouragement: "Har bir qadam muhim! Birga o'rganamiz!",
    adjustmentReason: 'Standard lesson plan',
  }
}
function getFallbackContent() {
  return {
    vocabulary: [
      { word: 'wake up', translation: "uyg'onmoq", pronunciation: '/weɪk ʌp/', example: 'I wake up at 7 AM.', example_uz: "Men soat 7 da uyg'onaman." },
      { word: 'have breakfast', translation: 'nonushta qilmoq', pronunciation: '/hæv ˈbrekfəst/', example: 'She has breakfast at 8.', example_uz: 'U soat 8 da nonushta qiladi.' },
      { word: 'go to work', translation: 'ishga bormoq', pronunciation: '/goʊ tə wɜːrk/', example: 'He goes to work by bus.', example_uz: 'U avtobus bilan ishga boradi.' },
      { word: 'have lunch', translation: 'tushlik qilmoq', pronunciation: '/hæv lʌntʃ/', example: 'We have lunch at noon.', example_uz: 'Biz tushda tushlik qilamiz.' },
      { word: 'go to bed', translation: 'yotmoq', pronunciation: '/goʊ tə bed/', example: 'I go to bed at 10 PM.', example_uz: "Men kechki 10 da yotaman." },
      { word: 'get dressed', translation: 'kiyinmoq', pronunciation: '/ɡet drest/', example: 'She gets dressed quickly.', example_uz: 'U tez kiyinadi.' },
      { word: 'brush teeth', translation: 'tish yuvmoq', pronunciation: '/brʌʃ tiːθ/', example: 'I brush my teeth every morning.', example_uz: 'Men har kuni ertalab tish yuvaman.' },
      { word: 'take a shower', translation: 'dush qabul qilmoq', pronunciation: '/teɪk ə ˈʃaʊər/', example: 'He takes a shower at night.', example_uz: 'U kechasi dush qabul qiladi.' },
      { word: 'cook dinner', translation: 'kechki ovqat pishirmoq', pronunciation: '/kʊk ˈdɪnər/', example: 'She cooks dinner every evening.', example_uz: 'U har kechasi ovqat pishiradi.' },
      { word: 'watch TV', translation: "televizor ko'rmoq", pronunciation: '/wɒtʃ tiːˈviː/', example: 'They watch TV after dinner.', example_uz: "Ular kechki ovqatdan keyin televizor ko'rishadi." },
    ],
    grammar_explanation: {
      title: "Kundalik odatlar — Present Simple",
      explanation: "Har kuni sodir bo'ladigan harakatlarni ifodalash uchun Present Simple zamonini ishlatamiz. Bu zamon odatlar, qoidalar va doimiy holatlarni bildiradi.",
      rule: "Men/Sen/Biz/Ular + fe'l | U/U(erkak)/U(ayol) + fe'l + s/es",
      examples: [
        { target: 'I wake up at 7 every day.', uzbek: "Men har kuni soat 7 da uyg'onaman.", note: "I bilan fe'l o'zgarmaydi" },
        { target: 'She wakes up at 8.', uzbek: "U soat 8 da uyg'onadi.", note: 'She/He/It bilan -s qo\'shiladi' },
        { target: 'They go to school by bus.', uzbek: 'Ular avtobus bilan maktabga borishadi.', note: "They bilan fe'l o'zgarmaydi" },
      ],
      common_mistake: "'She wake up' XATO! To'g'risi: 'She wakes up' — She/He/It bilan doim -s qo'shiladi!",
      tip: "Eslab qolish uchun: She/He/It = doim -S! Masalan: She eats, He drinks, It works",
    },
    exercises: [
      { type: 'fillBlank', question: 'I ___ up at 7 AM every day.', options: ['wake', 'wakes', 'waking', 'waked'], correct: 0, explanation_uz: "Men (I) uchun fe'l o'zgarmaydi — 'wake' to'g'ri" },
      { type: 'fillBlank', question: 'She ___ breakfast at 8.', options: ['have', 'has', 'having', 'had'], correct: 1, explanation_uz: "She uchun 'have' → 'has' bo'ladi" },
      { type: 'translate', question: 'ishga bormoq', options: ['go to school', 'go to work', 'go to sleep', 'go home'], correct: 1, explanation_uz: "'Work' = ish, shuning uchun 'go to work' = ishga bormoq" },
      { type: 'fillBlank', question: 'He ___ to work by bus.', options: ['go', 'goes', 'going', 'gone'], correct: 1, explanation_uz: "He uchun 'go' → 'goes' bo'ladi" },
      { type: 'translate', question: 'nonushta qilmoq', options: ['have dinner', 'have lunch', 'have breakfast', 'have tea'], correct: 2, explanation_uz: "'Breakfast' = nonushta, 'lunch' = tushlik, 'dinner' = kechki ovqat" },
      { type: 'fillBlank', question: 'They ___ lunch at noon.', options: ['has', 'have', 'having', 'had'], correct: 1, explanation_uz: "They uchun 'have' o'zgarmaydi" },
      { type: 'translate', question: 'tish yuvmoq', options: ['wash face', 'brush teeth', 'comb hair', 'take shower'], correct: 1, explanation_uz: "'Brush teeth' = tish yuvmoq" },
      { type: 'fillBlank', question: 'She ___ dinner every evening.', options: ['cook', 'cooks', 'cooking', 'cooked'], correct: 1, explanation_uz: "She uchun 'cook' → 'cooks'" },
      { type: 'translate', question: "televizor ko'rmoq", options: ['listen to music', 'read book', 'watch TV', 'play games'], correct: 2, explanation_uz: "'Watch' = ko'rmoq, 'TV' = televizor" },
      { type: 'fillBlank', question: 'I ___ a shower every morning.', options: ['take', 'takes', 'taking', 'took'], correct: 0, explanation_uz: "Men (I) uchun 'take' o'zgarmaydi" },
      { type: 'fillBlank', question: 'He ___ to bed at 10 PM.', options: ['go', 'goes', 'going', 'went'], correct: 1, explanation_uz: "He uchun 'go' → 'goes'" },
      { type: 'translate', question: 'kechki ovqat pishirmoq', options: ['cook lunch', 'cook breakfast', 'cook dinner', 'order food'], correct: 2, explanation_uz: "'Dinner' = kechki ovqat, 'cook' = pishirmoq" },
      { type: 'fillBlank', question: 'We ___ TV after dinner.', options: ['watch', 'watches', 'watching', 'watched'], correct: 0, explanation_uz: "We uchun 'watch' o'zgarmaydi" },
      { type: 'fillBlank', question: 'She ___ dressed quickly.', options: ['get', 'gets', 'getting', 'got'], correct: 1, explanation_uz: "She uchun 'get' → 'gets'" },
      { type: 'translate', question: 'dush qabul qilmoq', options: ['take a bath', 'take a shower', 'wash hands', 'brush teeth'], correct: 1, explanation_uz: "'Take a shower' = dush qabul qilmoq" },
      { type: 'fillBlank', question: 'They ___ to bed late.', options: ['goes', 'go', 'going', 'went'], correct: 1, explanation_uz: "They uchun 'go' o'zgarmaydi" },
      { type: 'translate', question: "uyg'onmoq", options: ['wake up', 'stand up', 'get up', 'sit up'], correct: 0, explanation_uz: "'Wake up' = uyg'onmoq, 'get up' = o'rindan turmoq" },
      { type: 'fillBlank', question: 'I ___ my teeth every morning.', options: ['brush', 'brushes', 'brushing', 'brushed'], correct: 0, explanation_uz: "Men (I) uchun 'brush' o'zgarmaydi" },
      { type: 'translate', question: 'yotmoq', options: ['go to sleep', 'go to bed', 'lie down', 'rest'], correct: 1, explanation_uz: "'Go to bed' = yotmoq (rasmiy ibora)" },
      { type: 'fillBlank', question: 'She ___ lunch at the office.', options: ['have', 'has', 'having', 'had'], correct: 1, explanation_uz: "She uchun 'have' → 'has'" },
    ],
    story: {
      title: "Ali's Perfect Day",
      title_uz: 'Alining Mukammal Kuni',
      text: "Ali wakes up at 6 AM every day. He brushes his teeth and takes a shower. Then he has breakfast with his family. Ali goes to work by bus. He has lunch at the office at noon. In the evening, Ali cooks dinner and watches TV. He goes to bed at 10 PM.",
      text_uz: "Ali har kuni soat 6 da uyg'onadi. U tish yuvadi va dush qabul qiladi. Keyin oilasi bilan nonushta qiladi. Ali avtobus bilan ishga boradi. U tushda ofisda tushlik qiladi. Kechqurun Ali ovqat pishiradi va televizor ko'radi. U soat 10 da yotadi.",
      questions: [
        { question: 'What time does Ali wake up?', question_uz: "Ali soat nechada uyg'onadi?", options: ['5 AM', '6 AM', '7 AM', '8 AM'], correct: 1, explanation_uz: "Hikoyada 'Ali wakes up at 6 AM' deyilgan" },
        { question: 'How does Ali go to work?', question_uz: 'Ali ishga qanday boradi?', options: ['By car', 'By train', 'By bus', 'On foot'], correct: 2, explanation_uz: "Hikoyada 'goes to work by bus' deyilgan" },
        { question: 'What does Ali do in the evening?', question_uz: 'Ali kechqurun nima qiladi?', options: ['Goes shopping', 'Cooks and watches TV', 'Plays games', 'Reads books'], correct: 1, explanation_uz: "Hikoyada 'cooks dinner and watches TV' deyilgan" },
      ],
    },
    youtube_video: {
      video_id: 'nHRvXkp4Pqk',
      title: 'Daily Routines in English',
      why_uz: "Bu video kundalik odatlarni ingliz tilida qanday aytishni ko'rsatadi",
      pre_watch_uz: "Videoda qaysi kundalik harakatlar tilga olinayotganiga e'tibor bering",
    },
  }
}

// ─── Main Lesson Page ──────────────────────────────────────────────
export default function Lesson() {
  const { subject = 'english', week = '1' } = useParams()
  const navigate = useNavigate()
  const lessonNum = parseInt(week) || 1

  // 0=welcome,1=vocab,2=grammar,3=video,4=exercises,5=story,6=speaking,7=complete
  const [block, setBlock] = useState(0)
  const [sessionXP, setSessionXP] = useState(0)
  const [practiceScore, setPracticeScore] = useState({ correct: 0, total: 8 })
  const [speakingXP, setSpeakingXP] = useState(0)
  const [profile, setProfile] = useState(null)
  const [userId, setUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingTip, setLoadingTip] = useState(0)
  const [lessonPlan, setLessonPlan] = useState(null)
  const [lessonContent, setLessonContent] = useState(null)

  const engineRef = useRef(null)
  const apiLockRef = useRef(false)
  const meta = SUBJECT_META[subject] ?? { flag: '📚', label: subject }

  // Rotate loading tips
  useEffect(() => {
    if (!loading) return
    const t = setInterval(() => setLoadingTip(i => (i + 1) % LOADING_TIPS.length), 2500)
    return () => clearInterval(t)
  }, [loading])

  // Main load — 25s hard timeout (plan ~8s + generate ~15s), always falls through to content
  useEffect(() => {
    if (apiLockRef.current) return
    apiLockRef.current = true

    let done = false
    function finish(content, plan) {
      if (done) return
      done = true
      // Fix 4: shuffle exercise answer positions once on load so they're stable
      if (content?.exercises) {
        content.exercises = content.exercises.map(shuffleOptions)
      }
      setLessonContent(content)
      if (plan) setLessonPlan(p => p || plan)
      setLoading(false)
    }

    const timeoutId = setTimeout(() => {
      console.log('⚠️ Load timeout — using fallback')
      finish(getFallbackContent(), getFallbackPlan())
    }, 25000)

    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { clearTimeout(timeoutId); navigate('/login'); return }
        setUserId(session.user.id)

        const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
        setProfile(data)

        sessionLogger.startSession(subject)
        sessionLogger.setLessonNumber(lessonNum)
        engineRef.current = new AdaptiveEngine(data?.current_level?.[subject] || 'elementary')

        const apiBase = ''
        const firstName = data?.full_name?.split(' ')[0] || "o'quvchi"

        const localFallbackPlan = {
          topic: subject === 'english' ? "Asosiy fe'llar" : subject === 'russian' ? 'Основные глаголы' : 'Asosiy amallar',
          difficulty: data?.current_level?.[subject] || 'elementary',
          method: 'mixed',
          focusWords: [],
          newGrammar: 'Present Simple',
          estimatedMinutes: data?.daily_minutes || 30,
          aiMessage: `Salom, ${firstName}! Bugun ham o'rganamiz! 💪`,
        }

        let plan = localFallbackPlan
        try {
          const planRes = await clientFetch('/api/plan-lesson', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: session.user.id,
              subject,
              lessonNumber: lessonNum,
              profile: data,
            }),
          }, 8000)
          if (planRes.ok) {
            const aiPlan = await planRes.json()
            if (aiPlan?.topic) plan = aiPlan
          }
        } catch { /* use local fallback plan */ }
        setLessonPlan(plan)

        try {
          const genRes = await clientFetch('/api/generate-lesson', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              plan,
              subject,
              profile: data,
            }),
          }, 9000)

          if (genRes.ok) {
            const content = await genRes.json()
            if (!content.error) {
              console.log('✅ Lesson:', content.vocabulary?.length, 'words,', content.exercises?.length, 'exercises')
              clearTimeout(timeoutId)
              finish(content)
              return
            }
          }
        } catch { /* fall through to fallback */ }

        clearTimeout(timeoutId)
        finish(getFallbackContent())
      } catch (err) {
        console.error('Load error:', err)
        clearTimeout(timeoutId)
        finish(getFallbackContent(), getFallbackPlan())
      }
    }
    load()
  }, [navigate, subject, lessonNum])

  function addXP(amount) {
    setSessionXP(x => x + amount)
    sessionLogger.addXP?.(amount)
  }

  function handleExerciseLog(data) {
    sessionLogger.logExercise?.(data)
    if (!data.isCorrect && data.correctAnswer) {
      sessionLogger.logWrongWord?.(data.correctAnswer)
    }
    engineRef.current?.recordAnswer(data.isCorrect)
  }

  const TOTAL_BLOCKS = 8
  const progressPct  = (block / TOTAL_BLOCKS) * 100

  const vocab     = lessonContent?.vocabulary || []
  const grammar   = lessonContent?.grammar_explanation || lessonContent?.grammar
  const exercises = lessonContent?.exercises || []
  const story     = lessonContent?.story
  const video     = lessonContent?.youtube_video

  // ── Loading ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center relative overflow-hidden">
        <SubtleOrbs />
        <div className="relative z-[1] text-center px-4">
          <div className="w-20 h-20 rounded-full bg-berry-deep flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
          </div>
          <h2 className="text-xl font-black text-berry-deep mb-3">AI murabbiy darsni tayyorlamoqda... 🧠</h2>
          <p
            className="text-berry-mid font-semibold text-base"
            style={{ animation: 'fadeInUp 0.3s ease-out' }}
            key={loadingTip}
          >
            {LOADING_TIPS[loadingTip]}
          </p>
        </div>
      </div>
    )
  }


  // ── Block 0: Welcome ──────────────────────────────────────────────
  if (block === 0) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4 relative overflow-hidden">
        <SubtleOrbs />
        <div
          className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center relative z-[1]"
          style={{ animation: 'fadeInUp 0.4s ease-out' }}
        >
          <div className="w-16 h-16 rounded-full bg-berry-deep flex items-center justify-center mx-auto mb-4 text-3xl shadow-xl">
            🤖
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">AI Murabbiy</p>
          <div className="bg-berry-glow rounded-2xl px-4 py-2 mb-4 inline-block">
            <span className="text-sm font-bold text-berry-mid">{meta.flag} {lessonPlan?.topic}</span>
          </div>
          <p className="text-berry-dark font-semibold text-base leading-relaxed mb-6">
            {lessonPlan?.aiMessage}
          </p>
          <button
            onClick={() => setBlock(1)}
            className="w-full bg-berry-deep text-white font-black py-4 rounded-full shadow-lg hover:bg-berry-dark hover:scale-[1.02] transition-all"
          >
            Darsni boshlash →
          </button>
        </div>
      </div>
    )
  }

  // ── Blocks 1-7 ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-cream flex flex-col relative overflow-hidden">
      <SubtleOrbs />

      {/* SessionTimer (only during active blocks) */}
      {block >= 1 && block < 8 && profile && (
        <SessionTimer
          goalMinutes={profile.daily_minutes || 30}
          xpEarned={sessionXP}
          streakDays={profile.streak || 0}
          onProceed={() => {}}
          onFinish={() => navigate('/dashboard')}
        />
      )}

      {/* Progress header (blocks 1-7) */}
      {block >= 1 && block < 8 && (
        <div className="fixed top-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-sm shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-berry-mid font-bold text-sm hover:text-berry-deep transition-colors"
            >
              ← Orqaga
            </button>
            <div className="flex flex-col items-center min-w-0 px-2">
              <span className="font-black text-berry-deep text-sm leading-tight truncate max-w-[150px]">
                {lessonPlan?.topic}
              </span>
              <span className="text-xs font-semibold text-gray-400">
                {meta.flag} {meta.label} · {lessonNum}-dars
              </span>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-full px-3 py-1 flex items-center gap-1 shrink-0">
              <span className="text-sm">🫐</span>
              <span className="font-black text-yellow-600 text-sm">+{sessionXP}</span>
            </div>
          </div>
          <div className="w-full bg-gray-100 h-1.5">
            <div
              className="bg-berry-deep h-1.5 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className={`flex-1 flex flex-col relative z-[1] ${block >= 1 && block < 8 ? 'pt-[4.5rem]' : ''}`}>

        {block === 1 && (
          vocab.length > 0
            ? <VocabBlock words={vocab} subject={subject} onComplete={xp => { addXP(xp); setBlock(2) }} />
            : <div className="flex-1 flex items-center justify-center">
                <button onClick={() => { addXP(10); setBlock(2) }}
                  className="bg-berry-deep text-white font-black px-8 py-4 rounded-full">
                  Davom etish →
                </button>
              </div>
        )}

        {block === 2 && (
          grammar
            ? <GrammarBlock grammar={grammar} subject={subject} onComplete={xp => { addXP(xp); setBlock(3) }} />
            : <div className="flex-1 flex items-center justify-center">
                <button onClick={() => { addXP(20); setBlock(3) }}
                  className="bg-berry-deep text-white font-black px-8 py-4 rounded-full">
                  Davom etish →
                </button>
              </div>
        )}

        {block === 3 && (
          <VideoLesson
            videoId={video?.video_id}
            topic={lessonPlan?.topic}
            preWatchText={`"${lessonPlan?.topic}" mavzusiga oid videoni tomosha qiling`}
            questions={video?.video_questions || []}
            onComplete={xp => { addXP(xp); setBlock(4) }}
          />
        )}

        {block === 4 && (
          exercises.length > 0
            ? <ExercisesBlock
                exercises={exercises}
                subject={subject}
                onExerciseLog={handleExerciseLog}
                onComplete={(xp, correct, total) => {
                  addXP(xp)
                  setPracticeScore({ correct, total })
                  setBlock(5)
                }}
              />
            : <div className="flex-1 flex items-center justify-center">
                <button onClick={() => setBlock(5)}
                  className="bg-berry-deep text-white font-black px-8 py-4 rounded-full">
                  Davom etish →
                </button>
              </div>
        )}

        {block === 5 && (
          story
            ? <StoryBlock story={story} subject={subject} onComplete={xp => { addXP(xp); setBlock(6) }} />
            : <div className="flex-1 flex items-center justify-center">
                <button onClick={() => setBlock(6)}
                  className="bg-berry-deep text-white font-black px-8 py-4 rounded-full">
                  Davom etish →
                </button>
              </div>
        )}

        {block === 6 && (
          <TutorSession
            level={profile?.current_level?.[subject] || 'elementary'}
            subject={subject}
            topic={lessonPlan?.topic || 'greetings'}
            onComplete={xp => {
              addXP(xp)
              setSpeakingXP(xp)
              setBlock(7)
            }}
          />
        )}

        {block === 7 && (
          <RealtimeConversation
            topic={lessonPlan?.topic || 'Daily Routines'}
            subject={subject}
            level={profile?.current_level?.[subject] || 'elementary'}
            studentName={profile?.full_name || 'Student'}
            onComplete={xp => { addXP(xp); setBlock(8) }}
          />
        )}

        {block === 8 && (
          <CompleteBlock
            sessionXP={sessionXP}
            score={practiceScore.correct}
            total={practiceScore.total}
            wordsCount={vocab.length}
            speakingXP={speakingXP}
            profile={profile}
            userId={userId}
            lessonWords={vocab}
            subject={subject}
            lessonNum={lessonNum}
            lessonTopic={lessonPlan?.topic}
            onDashboard={() => navigate('/dashboard')}
            onNextLesson={() => navigate(`/lesson/${subject}/${lessonNum + 1}`)}
          />
        )}
      </div>
    </div>
  )
}
