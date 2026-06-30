import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import SubtleOrbs from '../components/SubtleOrbs'
import { useLang } from '../context/LanguageContext'
import { CURRICULUM, getCurriculumNode } from '../data/curriculum'

const SUBJECT_META = {
  english: { label: 'Ingliz tili', flag: '🇬🇧', color: 'bg-blue-500', light: 'bg-blue-50 border-blue-200 text-blue-700' },
  russian: { label: 'Rus tili',    flag: '🇷🇺', color: 'bg-red-500',  light: 'bg-red-50  border-red-200  text-red-700'  },
  math:    { label: 'Matematika',  flag: '🔢', color: 'bg-emerald-500', light: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
}

const WEEKS_PER_LESSON = 5

// Single source of truth: the same curriculum the roadmap + lesson content use,
// so the list never disagrees with what's actually taught.
function getLessonTitle(subject, num, lang) {
  const node = getCurriculumNode(subject, num)
  if (!node) return `Dars ${num}`
  return (lang === 'ru' ? node.ru : node.uz) || node.topic
}
function getLevelBadge(subject, num) {
  return getCurriculumNode(subject, num)?.level || ''
}

export default function Lessons() {
  const navigate = useNavigate()
  const { lang } = useLang()
  const { subject: subjectParam } = useParams()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeSubject, setActiveSubject] = useState(subjectParam || 'english')

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { navigate('/login'); return }
      const { data } = await supabase.from('profiles')
        .select('full_name, subjects, current_lesson, completed_lessons')
        .eq('id', session.user.id).single()
      setProfile(data)
      if (data?.subjects?.length && !data.subjects.includes(activeSubject)) {
        setActiveSubject(data.subjects[0])
      }
      setLoading(false)
    }
    load()
  }, [navigate])

  if (loading) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-berry-deep border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const subjects = profile?.subjects || ['english']
  const completed = profile?.completed_lessons?.[activeSubject] || []
  const currentLesson = profile?.current_lesson?.[activeSubject] || 1
  const meta = SUBJECT_META[activeSubject] || SUBJECT_META.english

  const totalLessons = (CURRICULUM[activeSubject] || CURRICULUM.english).length
  const weeks = Array.from({ length: Math.ceil(totalLessons / WEEKS_PER_LESSON) }, (_, w) => ({
    week: w + 1,
    lessons: Array.from({ length: WEEKS_PER_LESSON }, (_, i) => w * WEEKS_PER_LESSON + i + 1).filter(n => n <= totalLessons),
  }))

  return (
    <div className="min-h-screen bg-cream relative overflow-hidden">
      <SubtleOrbs />
      <div className="relative z-[1] max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/dashboard')} className="text-berry-mid font-bold text-sm hover:text-berry-deep">← Orqaga</button>
          <h1 className="text-2xl font-black text-berry-deep">Darslar 📚</h1>
        </div>

        {/* Subject tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {subjects.map(subj => {
            const m = SUBJECT_META[subj] || SUBJECT_META.english
            return (
              <button key={subj} onClick={() => setActiveSubject(subj)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm shrink-0 transition-all ${
                  activeSubject === subj ? `${m.color} text-white shadow-md` : 'bg-white text-gray-500 border border-gray-200'
                }`}>
                {m.flag} {m.label}
              </button>
            )
          })}
        </div>

        {/* Progress bar */}
        <div className="bg-white rounded-2xl p-4 mb-5 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-berry-deep text-sm">{meta.flag} Umumiy taraqqiyot</span>
            <span className="font-black text-berry-deep">{completed.length}/{totalLessons}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div className={`${meta.color} h-3 rounded-full transition-all duration-500`}
              style={{ width: `${Math.max(2, (completed.length / totalLessons) * 100)}%` }} />
          </div>
          <p className="text-xs text-gray-400 font-semibold mt-1.5">{Math.round((completed.length / totalLessons) * 100)}% bajarildi</p>
        </div>

        {/* Weeks */}
        {weeks.map(({ week, lessons }) => (
          <div key={week} className="mb-6">
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-wide mb-3">Hafta {week}</h2>
            <div className="flex flex-col gap-2">
              {lessons.map(num => {
                const isDone = completed.includes(num)
                const isCurrent = num === currentLesson
                const isLocked = num > currentLesson && !isDone

                return (
                  <button
                    key={num}
                    onClick={() => !isLocked && navigate(`/lesson/${activeSubject}/${num}`)}
                    disabled={isLocked}
                    className={`flex items-center gap-4 px-5 py-4 rounded-2xl font-semibold text-left transition-all ${
                      isCurrent
                        ? 'bg-berry-deep text-white shadow-lg scale-[1.01]'
                        : isDone
                        ? 'bg-green-50 border border-green-200 text-green-800 hover:bg-green-100'
                        : isLocked
                        ? 'bg-gray-50 border border-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-white border border-gray-200 text-gray-700 hover:border-berry-mid hover:shadow-sm'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 ${
                      isCurrent ? 'bg-white/20' : isDone ? 'bg-green-100' : isLocked ? 'bg-gray-100' : 'bg-berry-glow'
                    }`}>
                      {isDone ? '✅' : isCurrent ? '▶️' : isLocked ? '🔒' : `${num}`}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-black text-sm ${isCurrent ? 'text-white' : ''}`}>
                        {num}-dars: {getLessonTitle(activeSubject, num, lang)}
                        <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded ${isCurrent ? 'bg-white/20 text-white' : 'bg-berry-glow text-berry-mid'}`}>
                          {getLevelBadge(activeSubject, num)}
                        </span>
                      </div>
                      <div className={`text-xs mt-0.5 ${isCurrent ? 'text-white/70' : 'text-gray-400'}`}>
                        {isDone ? 'Bajarildi ✓' : isCurrent ? 'Hozirgi dars' : isLocked ? 'Qulflangan' : 'Boshlash mumkin'}
                      </div>
                    </div>
                    {!isLocked && (
                      <span className={`text-lg ${isCurrent ? 'text-white' : 'text-berry-mid'}`}>→</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
