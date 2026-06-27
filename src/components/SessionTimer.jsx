import { useState, useEffect, useRef } from 'react'

const EXTENSION_MSGS = [
  { emoji: '💪', text: "Zo'r! 15 daqiqa yana o'rganamiz!" },
  { emoji: '🔥', text: "Jamoatdan o'tib ketdingiz! 30 daqiqa kengaytirildi!" },
  { emoji: '🚀', text: "Ajoyib! Siz o'qishga jiddiy qarayapsiz!" },
  { emoji: '🏆', text: "Rekordchi! Bugun haqiqiy izlanuvchi siz!" },
  { emoji: '🌟', text: "So'nggi davr! Bugun kuchli bo'ldingiz!" },
]

export default function SessionTimer({ goalMinutes = 30, xpEarned = 0, streakDays = 0, onProceed, onFinish }) {
  const [elapsed, setElapsed] = useState(0)
  const [showPopup, setShowPopup] = useState(false)
  const [extensionCount, setExtensionCount] = useState(0)
  const nextPopupRef = useRef(goalMinutes * 60)
  const intervalRef = useRef(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setElapsed(s => {
        const next = s + 1
        if (next >= nextPopupRef.current && next < 150 * 60) {
          setShowPopup(true)
        }
        return next
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [])

  function fmt(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0')
    const s = (sec % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  function handleProceed() {
    const idx = Math.min(extensionCount, EXTENSION_MSGS.length - 1)
    setExtensionCount(c => c + 1)
    nextPopupRef.current = elapsed + 15 * 60
    setShowPopup(false)
    onProceed?.()
  }

  function handleFinish() {
    setShowPopup(false)
    clearInterval(intervalRef.current)
    onFinish?.()
  }

  const popupIdx = Math.min(extensionCount, EXTENSION_MSGS.length - 1)
  const isMax = elapsed >= 150 * 60

  return (
    <>
      {/* Floating timer chip */}
      <div className="fixed top-4 right-4 z-30 pointer-events-none">
        <div className="bg-white/90 backdrop-blur-sm shadow-md border border-berry-light rounded-full px-3 py-1.5 flex items-center gap-1.5">
          <span className="text-xs text-berry-mid">⏱</span>
          <span className="text-xs font-black text-berry-deep tabular-nums">{fmt(elapsed)}</span>
          <span className="text-xs text-gray-300">|</span>
          <span className="text-xs font-bold text-yellow-600">+{xpEarned} 🫐</span>
        </div>
      </div>

      {/* Goal reached popup */}
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div
            className="bg-white rounded-3xl shadow-2xl p-7 max-w-xs w-full text-center"
            style={{ animation: 'fadeInUp 0.35s ease-out' }}
          >
            {/* Confetti dots */}
            <div className="relative h-10 mb-2 overflow-hidden">
              {[...Array(12)].map((_, i) => {
                const lefts  = [5,15,25,35,45,55,65,75,85,10,30,70]
                const tops   = [10,25,5,20,15,8,22,12,18,28,6,20]
                const colors = ['#7B5EA7','#5A8A5A','#F59E0B','#EF4444']
                return (
                  <div key={i} className="absolute w-3 h-3 rounded-full animate-bounce"
                    style={{
                      background: colors[i % 4],
                      left: `${lefts[i]}%`,
                      top: `${tops[i]}%`,
                      animationDelay: `${(i * 0.1) % 0.8}s`,
                    }} />
                )
              })}
            </div>

            <div className="text-4xl mb-2">{EXTENSION_MSGS[popupIdx].emoji}</div>
            <h3 className="text-xl font-black text-berry-deep mb-1">
              {isMax ? 'Bugungi maksimal vaqt!' : `${fmt(elapsed)} o'tdi!`}
            </h3>
            <p className="text-sm text-gray-600 font-semibold mb-4">{EXTENSION_MSGS[popupIdx].text}</p>

            <div className="flex gap-3 mb-4 justify-center">
              <div className="bg-yellow-50 rounded-2xl px-4 py-2 text-center">
                <div className="text-lg font-black text-yellow-600">+{xpEarned}</div>
                <div className="text-xs text-yellow-500 font-bold">🫐</div>
              </div>
              <div className="bg-berry-glow rounded-2xl px-4 py-2 text-center">
                <div className="text-lg font-black text-berry-deep">{streakDays}</div>
                <div className="text-xs text-berry-mid font-bold">streak</div>
              </div>
            </div>

            {!isMax && (
              <button
                onClick={handleProceed}
                className="w-full bg-berry-deep text-white font-black py-3 rounded-full hover:bg-berry-dark hover:scale-[1.02] transition-all mb-2"
              >
                15 daqiqa davom etish →
              </button>
            )}
            <button
              onClick={handleFinish}
              className="w-full border-2 border-gray-200 text-gray-500 font-bold py-2.5 rounded-full hover:border-berry-light hover:text-berry-mid transition-all"
            >
              {isMax ? 'Tugallash →' : 'Hozircha tugatish'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
