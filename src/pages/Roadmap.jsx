import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import SubtleOrbs from '../components/SubtleOrbs'

const CEFR_LEVELS = [
  { id: 'a0',           label: 'A0',           name: "Boshlang'ich",        color: 'bg-gray-400',    xpRequired: 0    },
  { id: 'elementary',   label: 'A1',           name: 'Elementary',          color: 'bg-blue-400',    xpRequired: 200  },
  { id: 'a2',           label: 'A2',           name: 'Pre-Intermediate',    color: 'bg-cyan-500',    xpRequired: 600  },
  { id: 'intermediate', label: 'B1',           name: 'Intermediate',        color: 'bg-green-500',   xpRequired: 1200 },
  { id: 'b2',           label: 'B2',           name: 'Upper-Intermediate',  color: 'bg-yellow-500',  xpRequired: 2500 },
  { id: 'advanced',     label: 'C1',           name: 'Advanced',            color: 'bg-orange-500',  xpRequired: 5000 },
  { id: 'mastery',      label: 'C2',           name: 'Mastery',             color: 'bg-berry-deep',  xpRequired: 10000 },
]

const MILESTONES = {
  english: [
    { level: 'a0',           text: "Alifbo va asosiy so'zlar" },
    { level: 'elementary',   text: 'Present Simple + kundalik gaplar' },
    { level: 'a2',           text: "Past & Future + 500 so'z" },
    { level: 'intermediate', text: "Barcha zamonlar + 1000 so'z" },
    { level: 'b2',           text: "Murakkab grammatika + 2000 so'z" },
    { level: 'advanced',     text: "Ona tilidek gaplashish" },
    { level: 'mastery',      text: '🏆 To\'liq egallash' },
  ],
  russian: [
    { level: 'a0',           text: 'Kirillcha alifbo + asosiy' },
    { level: 'elementary',   text: "Salomlashish va o'zingni tanishtirish" },
    { level: 'a2',           text: "Hozirgi zamon + 400 so'z" },
    { level: 'intermediate', text: "Kelishiklar + 800 so'z" },
    { level: 'b2',           text: "Fe'l turlari + 1500 so'z" },
    { level: 'advanced',     text: "Ona tilidek gaplashish" },
    { level: 'mastery',      text: '🏆 To\'liq egallash' },
  ],
  math: [
    { level: 'a0',           text: "Sonlar va asosiy amallar" },
    { level: 'elementary',   text: 'Ko\'paytirish jadvali + kasrlar' },
    { level: 'a2',           text: 'Foizlar + nisbatlar' },
    { level: 'intermediate', text: 'Algebra asoslari' },
    { level: 'b2',           text: 'Geometriya + statistika' },
    { level: 'advanced',     text: 'Oliy matematika kirish' },
    { level: 'mastery',      text: '🏆 To\'liq egallash' },
  ],
}

const SUBJECT_META = {
  english: { label: 'Ingliz tili', flag: '🇬🇧' },
  russian: { label: 'Rus tili',    flag: '🇷🇺' },
  math:    { label: 'Matematika',  flag: '🔢' },
}

export default function Roadmap() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeSubject, setActiveSubject] = useState('english')

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { navigate('/login'); return }
      const { data } = await supabase.from('profiles')
        .select('subjects, current_level, xp, total_berries_earned, total_lessons_completed')
        .eq('id', session.user.id).single()
      setProfile(data)
      if (data?.subjects?.[0]) setActiveSubject(data.subjects[0])
      setLoading(false)
    }
    load()
  }, [navigate])

  if (loading) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-berry-deep border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const totalXp = profile?.total_berries_earned || profile?.xp || 0
  const subjects = profile?.subjects || ['english']
  const currentLevelId = profile?.current_level?.[activeSubject] || 'a0'
  const currentLevelIdx = CEFR_LEVELS.findIndex(l => l.id === currentLevelId)
  const nextLevel = CEFR_LEVELS[currentLevelIdx + 1]
  const milestones = MILESTONES[activeSubject] || MILESTONES.english

  const xpToNext = nextLevel ? Math.max(0, nextLevel.xpRequired - totalXp) : 0
  const progressToNext = nextLevel
    ? Math.min(100, ((totalXp - (CEFR_LEVELS[currentLevelIdx]?.xpRequired || 0)) /
        (nextLevel.xpRequired - (CEFR_LEVELS[currentLevelIdx]?.xpRequired || 0))) * 100)
    : 100

  return (
    <div className="min-h-screen bg-cream relative overflow-hidden">
      <SubtleOrbs />
      <div className="relative z-[1] max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/dashboard')} className="text-berry-mid font-bold text-sm hover:text-berry-deep">← Orqaga</button>
          <h1 className="text-2xl font-black text-berry-deep">Yo'l xarita 🗺️</h1>
        </div>

        {/* Subject tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {subjects.map(subj => {
            const m = SUBJECT_META[subj]
            return (
              <button key={subj} onClick={() => setActiveSubject(subj)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm shrink-0 transition-all ${
                  activeSubject === subj ? 'bg-berry-deep text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200'
                }`}>
                {m?.flag} {m?.label}
              </button>
            )
          })}
        </div>

        {/* Current level card */}
        <div className="bg-berry-deep text-white rounded-3xl p-5 mb-6 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-bold text-white/60 uppercase tracking-wide">Hozirgi daraja</p>
              <p className="text-3xl font-black">{CEFR_LEVELS[currentLevelIdx]?.label}</p>
              <p className="text-sm font-semibold text-white/80">{CEFR_LEVELS[currentLevelIdx]?.name}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-white/60">Jami 🫐</p>
              <p className="text-2xl font-black">{totalXp.toLocaleString()}</p>
            </div>
          </div>
          {nextLevel && (
            <>
              <div className="w-full bg-white/20 rounded-full h-2.5 mb-1.5">
                <div className="bg-white h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${progressToNext}%` }} />
              </div>
              <p className="text-xs font-semibold text-white/70">
                {nextLevel.label} darajasiga: {xpToNext.toLocaleString()} 🫐 qoldi
              </p>
            </>
          )}
        </div>

        {/* CEFR Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-5 top-6 bottom-6 w-0.5 bg-gray-200 z-0" />

          {CEFR_LEVELS.map((level, idx) => {
            const isPast = idx < currentLevelIdx
            const isCurrent = idx === currentLevelIdx
            const isFuture = idx > currentLevelIdx
            const milestone = milestones[idx]

            return (
              <div key={level.id} className="relative flex items-start gap-4 mb-6 z-[1]">
                {/* Circle */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black shrink-0 shadow-md transition-all ${
                  isCurrent ? `${level.color} text-white scale-125 shadow-lg` :
                  isPast ? 'bg-green-400 text-white' :
                  'bg-white border-2 border-gray-200 text-gray-400'
                }`}>
                  {isPast ? '✓' : level.label}
                </div>

                {/* Content */}
                <div className={`flex-1 bg-white rounded-2xl p-4 shadow-sm border transition-all ${
                  isCurrent ? 'border-berry-mid shadow-md' : 'border-gray-100'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-black text-sm ${isCurrent ? 'text-berry-deep' : isPast ? 'text-green-600' : 'text-gray-400'}`}>
                      {level.label} — {level.name}
                    </span>
                    {isCurrent && <span className="text-xs bg-berry-glow text-berry-deep font-bold px-2 py-0.5 rounded-full">Hozir shu yerda</span>}
                    {isPast && <span className="text-xs bg-green-50 text-green-600 font-bold px-2 py-0.5 rounded-full">Bajarildi ✓</span>}
                  </div>
                  <p className={`text-sm ${isFuture ? 'text-gray-400' : 'text-gray-600'}`}>
                    {milestone?.text}
                  </p>
                  {!isPast && (
                    <p className="text-xs text-gray-300 font-semibold mt-1">
                      {level.xpRequired.toLocaleString()} 🫐 kerak
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
