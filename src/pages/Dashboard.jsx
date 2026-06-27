import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import MiniTree from '../components/MiniTree'
import SubtleOrbs from '../components/SubtleOrbs'

const UZ_MONTHS = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr']
const UZ_DAYS_FULL = ['Yakshanba','Dushanba','Seshanba','Chorshanba','Payshanba','Juma','Shanba']
const UZ_DAYS_SHORT = ['Dush','Sesh','Chor','Pay','Jum','Shan','Yak']

const SUBJECT_META = {
  english: {
    label: 'Ingliz tili',
    flag: '🇬🇧',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    bar: 'bg-blue-400',
  },
  russian: {
    label: 'Rus tili',
    flag: '🇷🇺',
    badge: 'bg-red-50 text-red-700 border-red-200',
    bar: 'bg-red-400',
  },
  math: {
    label: 'Matematika',
    flag: '🔢',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    bar: 'bg-emerald-500',
  },
}

const MOCK_VOCAB = [
  { word: 'Beautiful', translation: 'Chiroyli', lang: '🇬🇧' },
  { word: 'Погода', translation: 'Ob-havo', lang: '🇷🇺' },
  { word: 'Difference', translation: 'Farq', lang: '🔢' },
]

const LEVEL_LABELS = {
  beginner:     "Boshlang'ich",
  elementary:   'Elementary (A1)',
  intermediate: 'Intermediate (A2-B1)',
  advanced:     'Advanced (B2+)',
}

const NAV_ITEMS = [
  { id: 'home',       emoji: '🏠',  label: 'Bosh sahifa',  path: '/dashboard'   },
  { id: 'lessons',    emoji: '📚',  label: 'Darslar',      path: '/lessons'     },
  { id: 'vocabulary', emoji: '📖',  label: "So'zlar",      path: '/vocabulary'  },
  { id: 'garden',     emoji: '🌿',  label: "Bog'im",       path: '/garden'      },
  { id: 'roadmap',    emoji: '🗺️', label: "Yo'l xarita",  path: '/roadmap'     },
  { id: 'stats',      emoji: '📊',  label: 'Statistika',   path: '/statistics'  },
  { id: 'settings',   emoji: '⚙️', label: 'Sozlamalar',   path: '/settings'    },
]

function uzDate(date) {
  return `${date.getDate()}-${UZ_MONTHS[date.getMonth()]}, ${date.getFullYear()}, ${UZ_DAYS_FULL[date.getDay()]}`
}

function getWeekDays() {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(today)
  monday.setDate(today.getDate() + mondayOffset)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeNav, setActiveNav] = useState('home')
  const [vocabStatus, setVocabStatus] = useState({})

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { navigate('/login'); return }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (!data?.onboarded) { navigate('/onboarding'); return }

      setProfile(data)
      setLoading(false)
    }
    load()
  }, [navigate])

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin w-12 h-12 text-berry-mid" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-berry-mid font-bold">Yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  const streak = profile?.streak ?? 0
  const xp = profile?.xp ?? 0
  const totalLessons = profile?.total_lessons_completed ?? 0
  const dailyMinutes = profile?.daily_minutes ?? 30
  const subjects = profile?.subjects ?? []
  const roadmap = profile?.roadmap ?? {}
  const currentLevel = profile?.current_level ?? {}

  const firstName = profile?.full_name?.split(' ')[0] || 'Foydalanuvchi'
  const initials = (profile?.full_name || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const todaySubject = subjects[0]
  const todayMeta = todaySubject ? SUBJECT_META[todaySubject] : null
  const todayLessonNum = todaySubject ? (profile?.current_lesson?.[todaySubject] || 1) : 1
  const todayCompletedCount = todaySubject ? (profile?.completed_lessons?.[todaySubject] || []).length : 0

  const today = new Date()
  const weekDays = getWeekDays()

  function isSameDay(a, b) {
    return a.getDate() === b.getDate() &&
      a.getMonth() === b.getMonth() &&
      a.getFullYear() === b.getFullYear()
  }

  function isDone(d) {
    const diffMs = today.setHours(0,0,0,0) - d.setHours(0,0,0,0)
    const diffDays = Math.round(diffMs / 86400000)
    return diffDays >= 0 && diffDays < streak
  }

  const todayReal = new Date()

  const STAT_CARDS = [
    { label: 'Streak', value: `${streak} kun`, emoji: '🔥', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    { label: 'Rezavorlarim 🫐', value: `${xp}`, emoji: '🫐', bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
    { label: 'Darslar', value: `${totalLessons} ta`, emoji: '📚', bg: 'bg-berry-glow', text: 'text-berry-deep', border: 'border-berry-light' },
    { label: 'Kunlik reja', value: `${dailyMinutes} daq.`, emoji: '⏱️', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  ]

  function Sidebar() {
    return (
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-60 bg-white rounded-r-3xl shadow-xl flex-col z-20">
        <div className="px-6 py-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="relative w-8 h-8">
              <div className="absolute w-4 h-4 rounded-full bg-berry-deep top-0 left-1" />
              <div className="absolute w-3 h-3 rounded-full bg-berry-mid bottom-0 left-0" />
              <div className="absolute w-3 h-3 rounded-full bg-berry-mid bottom-0 right-0" />
            </div>
            <span className="font-black text-berry-deep text-base leading-tight">Blueberry Node</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => navigate(item.path || '/dashboard')}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-left w-full transition-all duration-200 ${
                activeNav === item.id
                  ? 'bg-berry-deep text-white shadow-md'
                  : 'text-gray-600 hover:bg-berry-glow hover:text-berry-deep'
              }`}
            >
              <span className="text-xl">{item.emoji}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="px-4 py-5 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-berry-deep text-white font-black flex items-center justify-center text-sm shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-berry-deep text-sm truncate">{profile?.full_name || 'Foydalanuvchi'}</div>
              <div className="text-xs text-gray-400 font-semibold">🫐 {xp}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-center text-sm font-bold text-gray-400 hover:text-red-500 transition-colors py-1"
          >
            Chiqish
          </button>
        </div>
      </aside>
    )
  }

  function BottomNav() {
    return (
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-xl z-20">
        <div className="flex items-center justify-around py-2 px-1">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => navigate(item.path || '/dashboard')}
              className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-2xl transition-all ${
                activeNav === item.id ? 'text-berry-deep' : 'text-gray-400'
              }`}
            >
              <span className="text-xl">{item.emoji}</span>
              <span className="text-[9px] font-bold leading-tight">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    )
  }

  return (
    <div className="bg-cream min-h-screen relative overflow-hidden">
      <SubtleOrbs />
      <Sidebar />
      <BottomNav />

      <main className="md:ml-60 min-h-screen pb-24 md:pb-8 px-4 md:px-8 py-6 relative z-[1]">
        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <div>
            <p className="text-gray-400 font-semibold text-sm">{uzDate(todayReal)}</p>
            <h1 className="text-2xl font-black text-berry-deep mt-0.5">
              Salom, {firstName}! 👋
            </h1>
          </div>
          <div className="md:hidden w-10 h-10 rounded-full bg-berry-deep text-white font-black flex items-center justify-center text-sm shrink-0">
            {initials}
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {STAT_CARDS.map((c, i) => (
            <div key={i} className={`${c.bg} border ${c.border} rounded-2xl p-4`}>
              <div className="text-2xl mb-1">{c.emoji}</div>
              <div className={`text-xl font-black ${c.text}`}>{c.value}</div>
              <div className="text-xs font-semibold text-gray-400 mt-0.5">{c.label}</div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-5 mb-5">
          {/* Today's lesson */}
          <div className="bg-white rounded-3xl shadow-sm p-6">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">Bugungi dars</p>
            {todayMeta ? (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{todayMeta.flag}</span>
                  <span className="font-black text-berry-deep text-lg">{todayLessonNum}-dars</span>
                </div>
                <p className="text-gray-600 font-semibold mb-1">{SUBJECT_META[todaySubject]?.label}</p>
                <div className="w-full bg-gray-100 rounded-full h-1.5 mb-4">
                  <div className={`${todayMeta.bar} h-1.5 rounded-full`}
                    style={{ width: `${Math.max(2, (todayCompletedCount / 20) * 100)}%` }} />
                </div>
                <p className="text-xs text-gray-400 font-semibold mb-4">{todayCompletedCount}/20 dars bajarildi</p>
                <button
                  onClick={() => navigate(`/lesson/${todaySubject}/${todayLessonNum}`)}
                  className="w-full bg-berry-deep text-white font-black py-3 rounded-full hover:bg-berry-dark hover:scale-[1.01] transition-all duration-200 shadow-md"
                >
                  Darsni boshlash →
                </button>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="text-5xl mb-3">📚</div>
                <p className="font-black text-berry-deep text-lg">Fan tanlanmagan</p>
                <button onClick={() => navigate('/settings')} className="text-berry-mid font-bold text-sm mt-2 hover:text-berry-deep">Sozlamalar →</button>
              </div>
            )}
          </div>

          {/* Streak + MiniTree + week calendar */}
          <div className="bg-white rounded-3xl shadow-sm p-6">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">Ko'chatchangiz</p>
            <div className="flex items-center gap-5 mb-5">
              <MiniTree streak={streak} />
              <div>
                <div className="text-4xl font-black text-berry-deep leading-none">{streak}</div>
                <div className="text-sm font-bold text-gray-400">kunlik streak</div>
                <div className="mt-1.5 text-sm font-semibold text-berry-mid">
                  {streak === 0 && 'Bugun boshlang! 🌱'}
                  {streak > 0 && streak <= 2 && 'Ajoyib boshlanish! 💪'}
                  {streak > 2 && streak <= 6 && "Ko'chatchangiz o'smoqda! 🫐"}
                  {streak > 6 && "Ko'chatchangiz gullayapti! 🌟"}
                </div>
              </div>
            </div>

            {/* Week calendar */}
            <div className="grid grid-cols-7 gap-1">
              {UZ_DAYS_SHORT.map((label, i) => {
                const d = weekDays[i]
                const isT = isSameDay(new Date(d), new Date(todayReal))
                const done = !isT && isDone(new Date(d))
                return (
                  <div key={i} className="text-center">
                    <div className="text-[10px] font-bold text-gray-400 mb-1">{label}</div>
                    <div className={`w-full aspect-square rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isT
                        ? 'bg-berry-deep text-white shadow-md'
                        : done
                        ? 'bg-berry-glow text-berry-deep'
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      {d?.getDate()}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Subjects progress */}
        {subjects.length > 0 && (
          <div className="bg-white rounded-3xl shadow-sm p-6 mb-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-5">Fanlar bo'yicha taraqqiyot</p>
            <div className="flex flex-col gap-5">
              {subjects.map(subject => {
                const meta = SUBJECT_META[subject]
                if (!meta) return null
                const completedCount = (profile?.completed_lessons?.[subject] || []).length
                const currentLessonNum = profile?.current_lesson?.[subject] || 1
                const pct = Math.min(100, Math.round((completedCount / 20) * 100))
                const level = currentLevel[subject] || 'beginner'
                return (
                  <div key={subject}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xl">{meta.flag}</span>
                        <span className="font-bold text-berry-deep">{meta.label}</span>
                        <span className={`text-xs font-bold rounded-full px-2 py-0.5 border ${meta.badge}`}>
                          {LEVEL_LABELS[level] || level}
                        </span>
                      </div>
                      <span className="text-sm font-black text-berry-mid">{pct}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div
                        className={`${meta.bar} h-2.5 rounded-full transition-all duration-500`}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-400 font-semibold mt-1.5">
                      {completedCount}/20 dars bajarildi · Hozir: {currentLessonNum}-dars
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Vocabulary preview */}
        <div className="bg-white rounded-3xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">So'z boyligi</p>
            <button onClick={() => navigate('/vocabulary')} className="text-xs font-bold text-berry-mid hover:text-berry-deep transition-colors">
              Hammasini ko'rish →
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {MOCK_VOCAB.map((v, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-cream rounded-2xl px-4 py-3 gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl shrink-0">{v.lang}</span>
                  <div className="min-w-0">
                    <div className="font-black text-berry-deep truncate">{v.word}</div>
                    <div className="text-sm text-gray-500 font-semibold">{v.translation}</div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setVocabStatus(prev => ({ ...prev, [i]: 'know' }))}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all ${
                      vocabStatus[i] === 'know'
                        ? 'bg-green-500 text-white'
                        : 'bg-white border border-green-300 text-green-600 hover:bg-green-50'
                    }`}
                  >
                    Bilaman
                  </button>
                  <button
                    onClick={() => setVocabStatus(prev => ({ ...prev, [i]: 'dontknow' }))}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all ${
                      vocabStatus[i] === 'dontknow'
                        ? 'bg-red-400 text-white'
                        : 'bg-white border border-red-300 text-red-500 hover:bg-red-50'
                    }`}
                  >
                    Bilmayman
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
