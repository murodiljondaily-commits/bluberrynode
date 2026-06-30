import { useState, useRef, useEffect } from 'react'
import { playCorrect, playWrong, playCelebration } from '../lib/soundEffects'

const SUBJECT_META = {
  english: { label: 'Ingliz tili', flag: '🇬🇧' },
  russian: { label: 'Rus tili', flag: '🇷🇺' },
  math:    { label: 'Matematika', flag: '🔢' },
}

const LEVEL_INFO = {
  beginner:     { emoji: '🌱', label: "Boshlang'ich",         barColor: 'bg-orange-400' },
  elementary:   { emoji: '📖', label: 'Elementary (A1)',       barColor: 'bg-blue-400' },
  intermediate: { emoji: '💬', label: 'Intermediate (A2-B1)',  barColor: 'bg-berry-mid' },
  advanced:     { emoji: '🚀', label: 'Advanced (B2+)',        barColor: 'bg-green-500' },
}

function scoreToLevel(score) {
  if (score <= 5)  return 'beginner'
  if (score <= 10) return 'elementary'
  if (score <= 15) return 'intermediate'
  return 'advanced'
}

// Deterministic confetti — avoids Math.random() on every render
const CONFETTI_COLORS = ['#7B5EA7','#C9B8E8','#3D1F6E','#5A8A5A','#FFD700','#FF6B6B','#87CEEB','#E8F5E8']
const CONFETTI_PIECES = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  left: `${((i * 2.6 + 1) % 100).toFixed(1)}%`,
  delay: `${((i * 0.08) % 1.8).toFixed(2)}s`,
  duration: `${(2.2 + (i % 5) * 0.4).toFixed(1)}s`,
  width: `${6 + (i % 5) * 2}px`,
  height: `${8 + (i % 4) * 2}px`,
  isCircle: i % 3 !== 0,
}))

function Confetti() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {CONFETTI_PIECES.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: p.left,
            top: '-20px',
            width: p.width,
            height: p.height,
            backgroundColor: p.color,
            borderRadius: p.isCircle ? '50%' : '2px',
            animation: `confettiFall ${p.duration} ${p.delay} ease-in forwards`,
            opacity: 0.85,
          }}
        />
      ))}
    </div>
  )
}

const DIFF_LABEL = ["Boshlang'ich", 'Elementary', 'Intermediate', 'Advanced']
const LETTER = ['A', 'B', 'C', 'D']

export default function AssessmentTest({ subject, questions, onComplete }) {
  const meta    = SUBJECT_META[subject]
  const totalQ  = questions.length
  const scoreRef = useRef(0)

  const [currentQ,      setCurrentQ]      = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [finished,      setFinished]      = useState(false)
  const [finalScore,    setFinalScore]    = useState(0)

  const q           = questions[currentQ]
  const progressPct = (currentQ / totalQ) * 100
  const diffLabel   = DIFF_LABEL[Math.floor(currentQ / 5)]

  function handleAnswer(idx) {
    if (selectedAnswer !== null) return
    setSelectedAnswer(idx)
    if (idx === q.correct) { scoreRef.current++; playCorrect() }
    else playWrong()

    setTimeout(() => {
      if (currentQ < totalQ - 1) {
        setCurrentQ(prev => prev + 1)
        setSelectedAnswer(null)
      } else {
        const s = scoreRef.current
        setFinalScore(s)
        setFinished(true)
      }
    }, 800)
  }

  // Celebrate when the test finishes.
  useEffect(() => { if (finished) playCelebration() }, [finished])

  // ── Results screen ──────────────────────────────────────────────
  if (finished) {
    const level = scoreToLevel(finalScore)
    const info  = LEVEL_INFO[level]
    const pct   = Math.round((finalScore / totalQ) * 100)

    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
        <Confetti />
        <div
          className="relative z-10 bg-white rounded-3xl shadow-xl p-8 w-full max-w-md text-center"
          style={{ animation: 'fadeInUp 0.4s ease-out' }}
        >
          <div className="text-6xl mb-4">{info.emoji}</div>
          <h2 className="text-3xl font-black text-berry-deep mb-2">
            Siz {info.label} darajadasiz!
          </h2>
          <p className="text-gray-500 font-semibold mb-6">
            {totalQ} dan{' '}
            <span className="font-black text-berry-deep">{finalScore}</span> ta
            to&#x2018;g&#x2018;ri javob
          </p>

          {/* Score progress bar */}
          <div className="w-full bg-gray-100 rounded-full h-4 mb-1">
            <div
              className={`${info.barColor} h-4 rounded-full transition-all duration-1000`}
              style={{ width: `${Math.max(pct, 3)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs font-bold text-gray-400 mb-6">
            <span>0</span>
            <span>{totalQ}</span>
          </div>

          {/* Correct / Incorrect breakdown */}
          <div className="flex gap-4 justify-center mb-8">
            <div className="bg-green-50 border border-green-200 rounded-2xl px-6 py-4 text-center">
              <div className="text-2xl font-black text-green-700">{finalScore}</div>
              <div className="text-xs font-bold text-green-600 mt-0.5">To&#x2018;g&#x2018;ri ✓</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-2xl px-6 py-4 text-center">
              <div className="text-2xl font-black text-red-600">{totalQ - finalScore}</div>
              <div className="text-xs font-bold text-red-500 mt-0.5">Noto&#x2018;g&#x2018;ri ✗</div>
            </div>
          </div>

          <button
            onClick={() => onComplete(finalScore, level)}
            className="w-full bg-berry-deep text-white font-black text-lg py-4 rounded-full shadow-lg hover:bg-berry-dark hover:scale-[1.02] transition-all duration-200"
          >
            Davom etish →
          </button>
        </div>
      </div>
    )
  }

  // ── Question screen ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Sticky top bar */}
      <div className="sticky top-0 bg-cream px-4 pt-6 pb-3 z-10">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="bg-berry-deep text-white rounded-full px-4 py-1.5 text-sm font-bold flex items-center gap-2">
              <span>{meta.flag}</span>
              <span>{meta.label} testi</span>
            </span>
            <span className="text-sm font-bold text-gray-500">
              {currentQ + 1} / {totalQ}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-berry-deep h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question + options */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
        <div
          key={currentQ}
          className="w-full max-w-lg"
          style={{ animation: 'fadeInUp 0.25s ease-out' }}
        >
          {/* Difficulty tag + question text */}
          <div className="text-center mb-8 px-2">
            <span className="text-xs font-bold text-berry-mid bg-berry-glow rounded-full px-3 py-1">
              {diffLabel}
            </span>
            <p className="text-xl md:text-2xl font-black text-berry-dark leading-tight mt-4">
              {q.question}
            </p>
          </div>

          {/* Answer buttons */}
          <div className="flex flex-col gap-3">
            {q.options.map((opt, idx) => {
              let cls = 'bg-white border-2 border-berry-light text-gray-700 hover:border-berry-mid hover:bg-berry-glow/30'
              let icon = null

              if (selectedAnswer !== null) {
                if (idx === q.correct) {
                  cls = 'bg-green-50 border-2 border-green-500 text-green-800'
                  icon = <span className="ml-auto text-green-600 font-black text-xl shrink-0">✓</span>
                } else if (idx === selectedAnswer) {
                  cls = 'bg-red-50 border-2 border-red-400 text-red-700'
                  icon = <span className="ml-auto text-red-500 font-black text-xl shrink-0">✗</span>
                } else {
                  cls = 'bg-white border-2 border-gray-200 text-gray-400 opacity-50'
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  disabled={selectedAnswer !== null}
                  className={`flex items-center gap-3 px-5 py-4 rounded-2xl font-semibold text-left transition-all duration-200 ${cls} disabled:cursor-default`}
                >
                  <span className="w-7 h-7 rounded-full border-2 border-current flex items-center justify-center text-xs font-black shrink-0">
                    {LETTER[idx]}
                  </span>
                  <span className="flex-1 leading-tight">{opt}</span>
                  {icon}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
