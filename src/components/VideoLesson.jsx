import { useState, useEffect } from 'react'

export default function VideoLesson({ videoId, topic, preWatchText, questions = [], onComplete }) {
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [showQ, setShowQ] = useState(false)
  const [answers, setAnswers] = useState({})
  const [checked, setChecked] = useState(false)
  const [videoError, setVideoError] = useState(false)

  useEffect(() => {
    if (!videoId) return
    const t = setTimeout(() => {
      if (!videoLoaded) setVideoError(true)
    }, 5000)
    return () => clearTimeout(t)
  }, [videoLoaded, videoId])

  if (!videoId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
        <div className="text-5xl">📺</div>
        <p className="font-bold text-berry-deep text-center">Bu mavzu uchun video topilmadi</p>
        <button onClick={() => onComplete?.(5)}
          className="bg-berry-deep text-white font-black px-8 py-3 rounded-full shadow-md hover:bg-berry-dark transition-all">
          Davom etish →
        </button>
      </div>
    )
  }

  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&controls=1&iv_load_policy=3`

  const allAnswered = questions.length === 0 || questions.every((_, i) => answers[i] !== undefined)

  return (
    <div className="flex-1 flex flex-col gap-4 px-4 py-4 max-w-2xl mx-auto w-full">
      {/* Pre-watch instruction */}
      {preWatchText && (
        <div className="bg-berry-glow border border-berry-light rounded-2xl p-4">
          <p className="text-xs font-black text-berry-mid uppercase tracking-wide mb-1">📺 Videoni ko'rishdan oldin:</p>
          <p className="text-sm font-semibold text-berry-deep">{preWatchText}</p>
        </div>
      )}

      {/* Video player */}
      {videoError ? (
        <div className="bg-berry-glow rounded-2xl p-8 text-center">
          <p className="text-4xl mb-3">📺</p>
          <p className="font-bold text-berry-deep mb-2">Video yuklanmadi</p>
          <p className="text-sm text-gray-500 mb-4">Internet aloqasini tekshiring yoki o'tkazib yuboring</p>
          <button
            onClick={() => onComplete?.(5)}
            className="bg-berry-deep text-white rounded-full px-8 py-3 font-bold hover:bg-berry-dark transition-all"
          >
            Davom etish →
          </button>
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden shadow-xl bg-black" style={{ paddingTop: '56.25%' }}>
          <iframe
            className="absolute inset-0 w-full h-full"
            src={embedUrl}
            title={topic || 'Dars videosi'}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onLoad={() => setVideoLoaded(true)}
            onError={() => setVideoError(true)}
          />
        </div>
      )}

      {!videoError && !showQ && (
        <div className="flex flex-col gap-3">
          <button onClick={() => setShowQ(true)}
            className="bg-berry-deep text-white font-black py-3 rounded-full shadow-md hover:bg-berry-dark hover:scale-[1.02] transition-all">
            Ko'rdim! Savollarga o'tish ✓
          </button>
          <button onClick={() => onComplete?.(5)}
            className="text-center text-sm text-gray-400 hover:text-berry-mid font-semibold py-1">
            Videoni o'tkazib yuborish →
          </button>
          <button onClick={() => setVideoError(true)}
            className="text-center text-xs text-gray-300 hover:text-gray-400 font-medium py-1">
            📺 Video yuklanmayaptimi? O'tkazib yuborish
          </button>
        </div>
      )}
      {!videoError && showQ && (
        <div className="flex flex-col gap-4">
          {questions.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <p className="font-black text-berry-deep mb-4">Video haqida savollar:</p>
              {questions.map((q, qi) => (
                <div key={qi} className="mb-4">
                  <p className="font-semibold text-gray-700 mb-2 text-sm">{q.question}</p>
                  <div className="flex flex-col gap-1.5">
                    {q.options.map((opt, oi) => {
                      const isSelected = answers[qi] === oi
                      const isCorrect = checked && oi === q.correct
                      const isWrong = checked && isSelected && oi !== q.correct
                      return (
                        <button key={oi} onClick={() => !checked && setAnswers(a => ({ ...a, [qi]: oi }))}
                          className={`text-left px-4 py-2.5 rounded-xl font-semibold text-sm transition-all border ${
                            isCorrect ? 'bg-green-100 border-green-400 text-green-700' :
                            isWrong   ? 'bg-red-50 border-red-300 text-red-600' :
                            isSelected ? 'bg-berry-glow border-berry-mid text-berry-deep' :
                            'bg-gray-50 border-gray-200 text-gray-600 hover:border-berry-mid'
                          }`}>
                          {opt}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
              {!checked && allAnswered && (
                <button onClick={() => setChecked(true)}
                  className="w-full bg-berry-mid text-white font-black py-3 rounded-full mt-2">
                  Tekshirish
                </button>
              )}
            </div>
          )}
          <button onClick={() => onComplete?.(10)}
            className="bg-berry-deep text-white font-black py-3 rounded-full shadow-md hover:bg-berry-dark transition-all">
            Davom etish →
          </button>
        </div>
      )}
    </div>
  )
}
