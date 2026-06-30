import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { vocabularyManager } from '../lib/vocabularyManager'
import { speak } from '../lib/voiceSystem'
import SubtleOrbs from '../components/SubtleOrbs'

const SUBJECT_FLAGS = { english: '🇬🇧', russian: '🇷🇺', math: '🔢' }
// Correct voice per subject: English→OpenAI, Russian→Yandex Alena, Math→Yandex Uzbek.
const langFor = (s) => (s === 'russian' ? 'russian' : s === 'math' ? 'uzbek' : 'english')

function SrsDots({ level }) {
  return (
    <div className="flex gap-0.5">
      {[0,1,2,3,4].map(i => (
        <div key={i} className={`w-2 h-2 rounded-full ${i <= level ? 'bg-berry-mid' : 'bg-gray-200'}`} />
      ))}
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex-1 flex items-center justify-center py-16">
      <svg className="animate-spin w-10 h-10 text-berry-mid" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
    </div>
  )
}

export default function Vocabulary() {
  const navigate = useNavigate()
  const [profile,    setProfile]    = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [dueWords,   setDueWords]   = useState([])
  const [allWords,   setAllWords]   = useState([])
  const [stats,      setStats]      = useState({ total: 0, mastered: 0, learning: 0 })
  const [cardIdx,    setCardIdx]    = useState(0)
  const [flipped,    setFlipped]    = useState(false)
  const [reviewDone, setReviewDone] = useState(false)
  const [search,     setSearch]     = useState('')
  const [filter,     setFilter]     = useState('all')

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { navigate('/login'); return }

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(prof)

      // Load vocab data — graceful if tables don't exist yet
      const [due, vocabStats] = await Promise.all([
        vocabularyManager.getWordsForReview(session.user.id).catch(() => []),
        vocabularyManager.getUserStats(session.user.id).catch(() => ({ total: 0, mastered: 0, learning: 0 })),
      ])
      setDueWords(due)
      setStats(vocabStats)

      const { data: all } = await supabase
        .from('vocabulary_bank')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .catch(() => ({ data: [] }))
      setAllWords(all || [])

      setLoading(false)
    }
    load().catch(() => setLoading(false))
  }, [navigate])

  async function handleReview(wordId, isCorrect) {
    await vocabularyManager.recordReview(wordId, isCorrect).catch(() => {})
    setFlipped(false)
    setTimeout(() => {
      if (cardIdx < dueWords.length - 1) {
        setCardIdx(i => i + 1)
      } else {
        setReviewDone(true)
      }
    }, 300)
  }

  const xp       = profile?.xp ?? 0
  const initials = (profile?.full_name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  const filteredWords = allWords.filter(w => {
    const matchSearch = !search ||
      w.word.toLowerCase().includes(search.toLowerCase()) ||
      w.translation.toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === 'all' ||
      (filter === 'mastered' && w.mastered) ||
      (filter === 'learning' && !w.mastered)
    return matchSearch && matchFilter
  })

  const currentCard = dueWords[cardIdx]

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="bg-cream min-h-screen relative overflow-hidden">
      <SubtleOrbs />
      {/* Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-60 bg-white rounded-r-3xl shadow-xl flex-col z-20">
        <div className="px-6 py-6 border-b border-gray-100">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="relative w-8 h-8">
              <div className="absolute w-4 h-4 rounded-full bg-berry-deep top-0 left-1" />
              <div className="absolute w-3 h-3 rounded-full bg-berry-mid bottom-0 left-0" />
              <div className="absolute w-3 h-3 rounded-full bg-berry-mid bottom-0 right-0" />
            </div>
            <span className="font-black text-berry-deep text-base">Blueberry Node</span>
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {[
            { id: 'home',       emoji: '🏠', label: 'Bosh sahifa',  path: '/dashboard',  active: false },
            { id: 'vocabulary', emoji: '📖', label: "So'zlar",      path: '/vocabulary', active: true  },
          ].map(item => (
            <button key={item.id} onClick={() => navigate(item.path)}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-left w-full transition-all duration-200 ${
                item.active ? 'bg-berry-deep text-white shadow-md' : 'text-gray-600 hover:bg-berry-glow hover:text-berry-deep'
              }`}>
              <span className="text-xl">{item.emoji}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="px-4 py-5 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-berry-deep text-white font-black flex items-center justify-center text-sm shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-berry-deep text-sm truncate">{profile?.full_name || 'Foydalanuvchi'}</div>
              <div className="text-xs text-gray-400 font-semibold">🫐 {xp}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Bottom nav (mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-xl z-20">
        <div className="flex items-center justify-around py-2 px-1">
          {[
            { emoji: '🏠', label: 'Bosh sahifa', path: '/dashboard',  active: false },
            { emoji: '📖', label: "So'zlar",     path: '/vocabulary', active: true  },
          ].map((item, i) => (
            <button key={i} onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-2xl transition-all ${
                item.active ? 'text-berry-deep' : 'text-gray-400'
              }`}>
              <span className="text-xl">{item.emoji}</span>
              <span className="text-[9px] font-bold leading-tight">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <main className="md:ml-60 min-h-screen pb-24 md:pb-8 px-4 md:px-8 py-6 relative z-[1]">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-berry-deep">So'z boyligi 📚</h1>
          <p className="text-gray-400 font-semibold text-sm mt-1">Barcha o'rganilgan so'zlar</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Jami so'zlar",    value: stats.total,     emoji: '📖', bg: 'bg-berry-glow', text: 'text-berry-deep', border: 'border-berry-light' },
            { label: "O'zlashtirilgan", value: stats.mastered,  emoji: '✅', bg: 'bg-green-50',   text: 'text-green-700',  border: 'border-green-200'   },
            { label: "O'rganilmoqda",   value: stats.learning,  emoji: '📝', bg: 'bg-blue-50',    text: 'text-blue-700',   border: 'border-blue-200'    },
            { label: 'Bugun takrorlash',value: dueWords.length, emoji: '🔔', bg: 'bg-orange-50',  text: 'text-orange-700', border: 'border-orange-200'  },
          ].map((c, i) => (
            <div key={i} className={`${c.bg} border ${c.border} rounded-2xl p-4`}>
              <div className="text-2xl mb-1">{c.emoji}</div>
              <div className={`text-2xl font-black ${c.text}`}>{c.value}</div>
              <div className="text-xs font-semibold text-gray-400 mt-0.5">{c.label}</div>
            </div>
          ))}
        </div>

        {/* Due for review — flashcard section */}
        {dueWords.length > 0 && (
          <div className="bg-white rounded-3xl shadow-sm p-6 mb-5">
            <div className="flex items-center justify-between mb-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Bugun takrorlash kerak 🔔</p>
              <span className="bg-orange-100 text-orange-700 text-xs font-black px-2.5 py-1 rounded-full">
                {dueWords.length} ta
              </span>
            </div>

            {reviewDone ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-3">🎉</div>
                <p className="font-black text-berry-deep text-lg">Bugungi takrorlash tugadi!</p>
                <p className="text-gray-400 font-semibold text-sm mt-1">Ajoyib ish!</p>
              </div>
            ) : currentCard ? (
              <div className="max-w-sm mx-auto">
                {/* 3D flip card */}
                <div className="w-full h-48 cursor-pointer mb-5" style={{ perspective: '1000px' }}
                  onClick={() => setFlipped(f => !f)}>
                  <div className={`flip-card-inner w-full h-full relative ${flipped ? 'flipped' : ''}`}>
                    <div className="flip-card-face absolute inset-0 bg-berry-glow rounded-3xl shadow-md flex flex-col items-center justify-center px-6 text-center">
                      <div className="flex items-center gap-2 mb-2">
                        <span>{SUBJECT_FLAGS[currentCard.subject] || '📖'}</span>
                        <span className="text-xs font-bold text-berry-mid uppercase tracking-wide">{currentCard.subject}</span>
                      </div>
                      <p className="text-4xl font-black text-berry-deep mb-2 break-words">{currentCard.word}</p>
                      <button
                        onClick={e => { e.stopPropagation(); speak(currentCard.word, langFor(currentCard.subject)).catch(() => {}) }}
                        className="mb-2 flex items-center gap-2 bg-berry-deep text-white font-bold text-sm px-4 py-2 rounded-full shadow-md hover:bg-berry-dark transition-all"
                      >🔊 Eshitish</button>
                      <p className="text-xs text-gray-400 font-semibold">Ko'rish uchun bosing →</p>
                      <p className="text-xs text-gray-300 mt-1">{currentCard.times_seen}x ko'rildi</p>
                    </div>
                    <div className="flip-card-back-face absolute inset-0 bg-white rounded-3xl shadow-md flex flex-col items-center justify-center px-6 text-center">
                      <p className="text-3xl font-black text-berry-deep mb-2">{currentCard.translation}</p>
                      {currentCard.example && (
                        <p className="text-sm text-berry-mid font-semibold italic mb-3">"{currentCard.example}"</p>
                      )}
                      <SrsDots level={currentCard.srs_level} />
                      <p className="text-xs text-gray-400 mt-1">Daraja: {currentCard.srs_level + 1}/5</p>
                    </div>
                  </div>
                </div>

                {/* Progress dots */}
                <div className="flex gap-1.5 justify-center mb-5">
                  {dueWords.map((_, i) => (
                    <div key={i} className={`h-2 rounded-full transition-all duration-300 ${
                      i < cardIdx ? 'bg-berry-deep w-5' : i === cardIdx ? 'bg-berry-mid w-5' : 'bg-berry-light w-2'
                    }`} />
                  ))}
                </div>

                {/* Review buttons — show only after flip */}
                {flipped && (
                  <div className="flex gap-3" style={{ animation: 'fadeInUp 0.25s ease-out' }}>
                    <button onClick={() => handleReview(currentCard.id, false)}
                      className="flex-1 bg-red-50 border-2 border-red-300 text-red-600 font-black py-3 rounded-full hover:bg-red-100 transition-all">
                      ❌ Bilmayman
                    </button>
                    <button onClick={() => handleReview(currentCard.id, true)}
                      className="flex-1 bg-green-50 border-2 border-green-400 text-green-700 font-black py-3 rounded-full hover:bg-green-100 transition-all">
                      ✅ Bilaman
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* All words list */}
        <div className="bg-white rounded-3xl shadow-sm p-6">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">Barcha so'zlar</p>

          <input type="text" placeholder="So'z qidiring..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full border-2 border-berry-light rounded-2xl px-4 py-3 font-semibold text-berry-dark placeholder-gray-300 focus:outline-none focus:border-berry-mid mb-3 bg-cream" />

          <div className="flex gap-2 mb-5">
            {[
              { id: 'all',      label: 'Barchasi'          },
              { id: 'learning', label: "O'rganilmoqda"     },
              { id: 'mastered', label: "O'zlashtrilgan"    },
            ].map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  filter === f.id ? 'bg-berry-deep text-white' : 'bg-berry-glow text-berry-mid hover:bg-berry-light'
                }`}>
                {f.label}
              </button>
            ))}
          </div>

          {allWords.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <p className="text-4xl mb-2">📭</p>
              <p className="font-semibold">Hali so'z yo'q</p>
              <p className="text-sm mt-1">Darsni tugatgandan so'ng so'zlar bu yerda paydo bo'ladi</p>
            </div>
          ) : filteredWords.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="font-semibold">Hech narsa topilmadi</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredWords.map(w => (
                <div key={w.id} className={`flex items-center justify-between rounded-2xl px-4 py-3 ${w.mastered ? 'bg-gray-50' : 'bg-cream'}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg shrink-0">{SUBJECT_FLAGS[w.subject] || '📖'}</span>
                    <div className="min-w-0">
                      <div className={`font-black truncate ${w.mastered ? 'text-gray-400' : 'text-berry-deep'}`}>
                        {w.word} {w.mastered && '✅'}
                      </div>
                      <div className="text-sm text-gray-500 font-semibold">{w.translation}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <button
                      onClick={() => speak(w.word, langFor(w.subject)).catch(() => {})}
                      className="w-9 h-9 rounded-full bg-berry-glow text-berry-deep flex items-center justify-center text-base hover:bg-berry-light transition-all shrink-0"
                      title="Eshitish"
                    >🔊</button>
                    <div className="flex flex-col items-end gap-1">
                      <SrsDots level={w.srs_level} />
                      <span className="text-[10px] text-gray-400 font-semibold">{w.next_review}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
