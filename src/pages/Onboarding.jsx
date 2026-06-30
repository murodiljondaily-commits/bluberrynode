import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import AssessmentTest from '../components/AssessmentTest'
import BlueberryOrbs from '../components/BlueberryOrbs'
import { englishQuestions, russianQuestions, mathQuestions } from '../data/assessmentQuestions'
import { CURRICULUM } from '../data/curriculum'

const CEFR_ORDER = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1']
// Pick the first curriculum lesson at (or above) the student's level, so an
// "elementary" student starts at A1 content — not the A0 alphabet/colors basics.
function startingLessonForLevel(subject, cefr) {
  const nodes = CURRICULUM[subject] || []
  const targetIdx = Math.max(0, CEFR_ORDER.indexOf(cefr))
  const node = nodes.find((n) => CEFR_ORDER.indexOf(n.level) >= targetIdx)
  return node?.id || 1
}

const SUBJECTS = [
  { id: 'english', label: 'Ingliz tili', flag: '🇬🇧' },
  { id: 'russian', label: 'Rus tili',    flag: '🇷🇺' },
  { id: 'math',    label: 'Matematika',  flag: '🔢' },
]

const QUESTION_MAP = {
  english: englishQuestions,
  russian: russianQuestions,
  math:    mathQuestions,
}

const TIME_OPTIONS = [
  { minutes: 15, emoji: '⚡', label: '15 daqiqa', desc: "Tez o'rganish" },
  { minutes: 30, emoji: '📚', label: '30 daqiqa', desc: 'Tavsiya etiladi', badge: 'Eng mashhur' },
  { minutes: 60, emoji: '🔥', label: '60 daqiqa', desc: "Tezkor o'sish" },
  { minutes: 90, emoji: '💪', label: '90 daqiqa', desc: 'Intensiv rejim' },
]

const MILESTONES = {
  english: {
    beginner: [
      { week: 'Hafta 1-2', title: 'Alifbo va talaffuz' },
      { week: 'Hafta 3-4', title: 'Salomlashish va tanishish' },
      { week: 'Hafta 5-6', title: 'Raqamlar va ranglar' },
      { week: 'Hafta 7-8', title: 'Kundalik gaplar' },
      { week: 'Hafta 9-10', title: 'Oddiy gaplar qurish' },
    ],
    elementary: [
      { week: 'Hafta 1-2', title: 'Present Simple mashq' },
      { week: 'Hafta 3-4', title: "So'zlar boyitish" },
      { week: 'Hafta 5-6', title: 'Suhbat amaliyoti' },
      { week: 'Hafta 7-8', title: 'Past Simple' },
      { week: 'Hafta 9-10', title: "Matn o'qish va yozish" },
    ],
    intermediate: [
      { week: 'Hafta 1-2', title: 'Murakkab zamonlar (Perfect, Continuous)' },
      { week: 'Hafta 3-4', title: "Passiv nisbat (Passive Voice)" },
      { week: 'Hafta 5-6', title: "Bilvosita nutq (Reported Speech)" },
      { week: 'Hafta 7-8', title: "Idiomlar va iboralar" },
      { week: 'Hafta 9-10', title: "Akademik yozuv asoslari" },
    ],
    advanced: [
      { week: 'Hafta 1-2', title: "C1/C2 darajadagi lug'at" },
      { week: 'Hafta 3-4', title: "Murakkab grammatika (inversions, cleft sentences)" },
      { week: 'Hafta 5-6', title: "Adabiy tahlil va yozuv" },
      { week: 'Hafta 7-8', title: "Munozara va tanqidiy fikrlash" },
      { week: 'Hafta 9-10', title: "Ona tili darajasi" },
    ],
  },
  russian: {
    beginner: [
      { week: 'Hafta 1-2', title: 'Kirillcha alifbo' },
      { week: 'Hafta 3-4', title: 'Salomlashish' },
      { week: 'Hafta 5-6', title: 'Raqamlar' },
      { week: 'Hafta 7-8', title: 'Oddiy jumlalar' },
      { week: 'Hafta 9-10', title: 'Suhbat asoslari' },
    ],
    elementary: [
      { week: 'Hafta 1-2', title: 'Jins va kelishiklar' },
      { week: 'Hafta 3-4', title: "Fe'l zamonlari" },
      { week: 'Hafta 5-6', title: 'Savol gaplari' },
      { week: 'Hafta 7-8', title: "Hikoya so'z boyitish" },
      { week: 'Hafta 9-10', title: 'Nutq amaliyoti' },
    ],
    intermediate: [
      { week: 'Hafta 1-2', title: "Prefiks va suffiks tizimi" },
      { week: 'Hafta 3-4', title: "Murakkab qo'shma gaplar" },
      { week: 'Hafta 5-6', title: "Ish muloqoti (Деловой русский)" },
      { week: 'Hafta 7-8', title: "Adabiyot va madaniyat" },
      { week: 'Hafta 9-10', title: "Erkin suhbat amaliyoti" },
    ],
    advanced: [
      { week: 'Hafta 1-2', title: "Yuqori darajadagi lug'at" },
      { week: 'Hafta 3-4', title: "Uslubiyat (Stilistika)" },
      { week: 'Hafta 5-6', title: "Akademik va ilmiy yozuv" },
      { week: 'Hafta 7-8', title: "OAV va yangiliklar tahlili" },
      { week: 'Hafta 9-10', title: "Ona tili darajasi" },
    ],
  },
  math: {
    beginner: [
      { week: 'Hafta 1-2', title: "Qo'shish va ayirish" },
      { week: 'Hafta 3-4', title: "Ko'paytirish jadvali" },
      { week: 'Hafta 5-6', title: "Bo'lish asoslari" },
      { week: 'Hafta 7-8', title: 'Kasr sonlar' },
      { week: 'Hafta 9-10', title: 'Masalalar yechish' },
    ],
    elementary: [
      { week: 'Hafta 1-2', title: 'Murakkab arifmetika' },
      { week: 'Hafta 3-4', title: 'Foizlar va nisbatlar' },
      { week: 'Hafta 5-6', title: 'Geometriya asoslari' },
      { week: 'Hafta 7-8', title: 'Tengsizliklar' },
      { week: 'Hafta 9-10', title: 'Amaliy masalalar' },
    ],
    intermediate: [
      { week: 'Hafta 1-2', title: 'Ikkinchi darajali tenglamalar' },
      { week: 'Hafta 3-4', title: 'Trigonometriya asoslari' },
      { week: 'Hafta 5-6', title: 'Statistika va grafik tahlil' },
      { week: 'Hafta 7-8', title: "Ehtimollik nazariyasi" },
      { week: 'Hafta 9-10', title: 'Murakkab masalalar yechish' },
    ],
    advanced: [
      { week: 'Hafta 1-2', title: 'Matematik analiz (Kalkulus)' },
      { week: 'Hafta 3-4', title: 'Chiziqli algebra' },
      { week: 'Hafta 5-6', title: "Yuqori darajali statistika" },
      { week: 'Hafta 7-8', title: "Differentsial tenglamalar" },
      { week: 'Hafta 9-10', title: "Matematik modellashtirish" },
    ],
  },
}

const SUBJECT_META = {
  english: { flag: '🇬🇧', label: 'Ingliz tili' },
  russian: { flag: '🇷🇺', label: 'Rus tili' },
  math:    { flag: '🔢', label: 'Matematika' },
}

const LEVEL_LABEL = {
  beginner:     "Boshlang'ich",
  elementary:   'Elementary (A1)',
  intermediate: 'Intermediate (A2-B1)',
  advanced:     'Advanced (B2+)',
}

const LEVEL_BADGE = {
  beginner:     'bg-orange-100 text-orange-700',
  elementary:   'bg-blue-100 text-blue-700',
  intermediate: 'bg-berry-glow text-berry-deep',
  advanced:     'bg-green-100 text-green-700',
}

// CEFR level stored in student_progress, derived from the legacy assessment level.
const LEVEL_TO_CEFR = { beginner: 'A0', elementary: 'A1', intermediate: 'B1', advanced: 'C1' }

export default function Onboarding() {
  const navigate = useNavigate()
  const location = useLocation()
  const addSubjectId = location.state?.addSubject || null   // "add a subject" mode
  const addMode = !!addSubjectId

  const [step,             setStep]             = useState(0)
  const [selectedSubjects, setSelectedSubjects] = useState(addMode ? [addSubjectId] : [])
  const [quizIndex,        setQuizIndex]        = useState(0)
  const [levels,           setLevels]           = useState({})
  const [dailyMinutes,     setDailyMinutes]     = useState(30)
  const [saving,           setSaving]           = useState(false)
  const [error,            setError]            = useState('')

  useEffect(() => {
    async function checkOnboarded() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }
      // In add-subject mode we INTENTIONALLY allow an already-onboarded user through.
      if (addMode) return
      const { data } = await supabase
        .from('profiles')
        .select('onboarded')
        .eq('id', user.id)
        .single()
      if (data?.onboarded) navigate('/dashboard')
    }
    checkOnboarded()
  }, [navigate, addMode])

  function toggleSubject(id) {
    setSelectedSubjects(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  function handleTestComplete(score, level) {
    const subject = selectedSubjects[quizIndex]
    setLevels(prev => ({ ...prev, [subject]: level }))
    if (addMode) { finishAddSubject(level); return }
    if (quizIndex < selectedSubjects.length - 1) {
      setQuizIndex(prev => prev + 1)
    } else {
      setQuizIndex(0)
      setStep(3)
    }
  }

  function buildRoadmap(computedLevels) {
    const roadmap = {}
    selectedSubjects.forEach(subject => {
      const level = computedLevels[subject] || 'beginner'
      roadmap[subject] = (MILESTONES[subject][level] || []).map(m => ({ ...m, done: false }))
    })
    return roadmap
  }

  // Finish a brand-new onboarding.
  async function handleFinish() {
    setSaving(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const roadmap = buildRoadmap(levels)
      // Start each subject at the lesson matching the assessed level.
      const currentLesson = { english: 1, russian: 1, math: 1 }
      selectedSubjects.forEach((s) => {
        currentLesson[s] = startingLessonForLevel(s, LEVEL_TO_CEFR[levels[s] || 'beginner'] || 'A0')
      })
      const { error: err } = await supabase.from('profiles').update({
        subjects:      selectedSubjects,
        daily_minutes: dailyMinutes,
        current_level: levels,
        current_lesson: currentLesson,
        roadmap,
        onboarded:     true,
      }).eq('id', user.id)
      if (err) throw err
      await seedProgress(user.id, levels)
      navigate('/dashboard')
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  // Add-subject mode: MERGE the one new subject into the existing profile (after a
  // level check or an explicit "start from A0"). Never overwrites other subjects.
  async function finishAddSubject(assessedLevel) {
    setSaving(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: prof } = await supabase.from('profiles')
        .select('subjects, current_level, roadmap').eq('id', user.id).single()

      const level = assessedLevel || 'beginner'
      const cefr = LEVEL_TO_CEFR[level] || 'A0'
      const startLesson = startingLessonForLevel(addSubjectId, cefr)
      const newSubjects = [...new Set([...(prof?.subjects || []), addSubjectId])]
      const newLevels = { ...(prof?.current_level || {}), [addSubjectId]: level }
      const newLessons = { ...(prof?.current_lesson || {}), [addSubjectId]: startLesson }
      const newRoadmap = {
        ...(prof?.roadmap || {}),
        [addSubjectId]: (MILESTONES[addSubjectId][level] || []).map(m => ({ ...m, done: false })),
      }
      const { error: err } = await supabase.from('profiles').update({
        subjects: newSubjects, current_level: newLevels, current_lesson: newLessons, roadmap: newRoadmap,
      }).eq('id', user.id)
      if (err) throw err

      await supabase.from('student_progress').upsert({
        user_id: user.id, subject: addSubjectId,
        current_lesson: startLesson, current_level: cefr,
      }, { onConflict: 'user_id,subject' })

      navigate('/roadmap')
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  // Seed student_progress rows for a fresh multi-subject onboarding.
  async function seedProgress(userId, computedLevels) {
    for (const s of selectedSubjects) {
      const cefr = LEVEL_TO_CEFR[computedLevels[s] || 'beginner'] || 'A0'
      await supabase.from('student_progress').upsert({
        user_id: userId, subject: s,
        current_lesson: startingLessonForLevel(s, cefr), current_level: cefr,
      }, { onConflict: 'user_id,subject' }).then(() => {}, () => {})
    }
  }

  // ── Step 2: Full-screen assessment test (bypasses card wrapper) ──
  if (step === 2) {
    const subject = selectedSubjects[quizIndex]
    return (
      <AssessmentTest
        key={quizIndex}
        subject={subject}
        questions={QUESTION_MAP[subject]}
        onComplete={handleTestComplete}
      />
    )
  }

  // ── Steps 0, 1, 3, 4: Card-based wrapper ──────────────────────
  function renderCardContent() {
    // Step 0 (add-subject mode): strict choice — level test OR start from A0.
    if (step === 0 && addMode) {
      const meta = SUBJECT_META[addSubjectId]
      return (
        <div key="addchoice" style={{ animation: 'fadeInUp 0.35s ease-out' }}>
          <div className="text-5xl text-center mb-4">{meta?.flag}</div>
          <h1 className="text-2xl font-black text-berry-deep text-center mb-2">
            {meta?.label} qo&#x2018;shish
          </h1>
          <p className="text-gray-500 font-semibold text-center mb-7 leading-relaxed">
            Yangi fanni boshlash uchun darajangizni aniqlang yoki noldan (A0) boshlang.
          </p>
          {error && <p className="text-red-500 text-sm font-semibold text-center mb-3">{error}</p>}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => { setQuizIndex(0); setStep(2) }}
              className="w-full bg-berry-deep text-white font-black text-lg py-4 rounded-full shadow-lg hover:bg-berry-dark hover:scale-[1.02] transition-all"
            >
              📝 Darajamni aniqlash (test)
            </button>
            <button
              onClick={() => finishAddSubject('beginner')}
              disabled={saving}
              className="w-full border-2 border-berry-mid text-berry-deep font-bold py-4 rounded-full hover:bg-berry-glow transition-all disabled:opacity-60"
            >
              {saving ? 'Saqlanmoqda...' : '🌱 Noldan boshlash (A0)'}
            </button>
          </div>
        </div>
      )
    }

    // Step 0: Welcome
    if (step === 0) {
      return (
        <div key="welcome" style={{ animation: 'fadeInUp 0.35s ease-out' }}>
          <div className="text-6xl text-center mb-6">🫐</div>
          <h1 className="text-3xl font-black text-berry-deep text-center mb-3">
            Xush kelibsiz!
          </h1>
          <p className="text-gray-500 font-semibold text-center mb-8 leading-relaxed">
            Bir necha daqiqada shaxsiy o&#x2018;quv yo&#x2018;lingizni yarataymiz.
            Tayyor bo&#x2018;lsangiz, boshlaymiz!
          </p>
          <button
            onClick={() => setStep(1)}
            className="w-full bg-berry-deep text-white font-black text-lg py-4 rounded-full shadow-lg hover:bg-berry-dark hover:scale-[1.02] transition-all duration-200"
          >
            Boshlaylik →
          </button>
        </div>
      )
    }

    // Step 1: Subject selection
    if (step === 1) {
      return (
        <div key="subjects" style={{ animation: 'fadeInUp 0.35s ease-out' }}>
          <h2 className="text-2xl font-black text-berry-deep text-center mb-2">
            Nima o&#x2018;rganmoqchisiz?
          </h2>
          <p className="text-gray-400 font-semibold text-center mb-6">
            Bir yoki bir nechta tanlang
          </p>
          <div className="flex flex-col gap-3 mb-8">
            {SUBJECTS.map(s => {
              const selected = selectedSubjects.includes(s.id)
              return (
                <button
                  key={s.id}
                  onClick={() => toggleSubject(s.id)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 font-bold text-left transition-all duration-200 ${
                    selected
                      ? 'border-berry-deep bg-berry-glow text-berry-deep shadow-md scale-[1.01]'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-berry-light hover:bg-berry-glow/40'
                  }`}
                >
                  <span className="text-3xl">{s.flag}</span>
                  <span className="text-lg">{s.label}</span>
                  {selected && (
                    <span className="ml-auto text-berry-deep text-xl">✓</span>
                  )}
                </button>
              )
            })}
          </div>
          <button
            onClick={() => { setQuizIndex(0); setStep(2) }}
            disabled={selectedSubjects.length === 0}
            className="w-full bg-berry-deep text-white font-black text-lg py-4 rounded-full shadow-lg hover:bg-berry-dark hover:scale-[1.02] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            Davom etish →
          </button>
        </div>
      )
    }

    // Step 3: Daily time
    if (step === 3) {
      return (
        <div key="time" style={{ animation: 'fadeInUp 0.35s ease-out' }}>
          <h2 className="text-2xl font-black text-berry-deep text-center mb-2">
            Kunlik vaqt
          </h2>
          <p className="text-gray-400 font-semibold text-center mb-6">
            Har kuni qancha vaqt ajratasiz?
          </p>
          <div className="grid grid-cols-2 gap-3 mb-8">
            {TIME_OPTIONS.map(opt => {
              const selected = dailyMinutes === opt.minutes
              return (
                <button
                  key={opt.minutes}
                  onClick={() => setDailyMinutes(opt.minutes)}
                  className={`relative p-4 rounded-2xl border-2 font-bold text-left transition-all duration-200 ${
                    selected
                      ? 'border-berry-deep bg-berry-glow text-berry-deep shadow-md'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-berry-light'
                  }`}
                >
                  {opt.badge && (
                    <span className="absolute -top-2 -right-1 bg-berry-mid text-white text-xs font-black px-2 py-0.5 rounded-full">
                      {opt.badge}
                    </span>
                  )}
                  <div className="text-2xl mb-1">{opt.emoji}</div>
                  <div className="font-black text-base">{opt.label}</div>
                  <div className="text-xs font-semibold text-gray-400 mt-0.5">
                    {opt.desc}
                  </div>
                </button>
              )
            })}
          </div>
          <button
            onClick={() => setStep(4)}
            className="w-full bg-berry-deep text-white font-black text-lg py-4 rounded-full shadow-lg hover:bg-berry-dark hover:scale-[1.02] transition-all duration-200"
          >
            Davom etish →
          </button>
        </div>
      )
    }

    // Step 4: Roadmap preview + save
    if (step === 4) {
      const roadmap = buildRoadmap(levels)
      return (
        <div key="roadmap" style={{ animation: 'fadeInUp 0.35s ease-out' }}>
          <h2 className="text-2xl font-black text-berry-deep text-center mb-2">
            Yo&#x2018;l xaritangiz
          </h2>
          <p className="text-gray-400 font-semibold text-center mb-5">
            Sizga maxsus tayyorlangan o&#x2018;quv rejasi
          </p>

          <div className="flex flex-col gap-3 mb-5 max-h-64 overflow-y-auto pr-1">
            {selectedSubjects.map(subject => {
              const meta       = SUBJECT_META[subject]
              const milestones = roadmap[subject] || []
              const level      = levels[subject] || 'beginner'
              return (
                <div key={subject} className="bg-cream rounded-2xl p-4 border border-gray-100">
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="text-xl">{meta.flag}</span>
                    <span className="font-black text-berry-deep">{meta.label}</span>
                    <span className={`ml-auto text-xs font-bold rounded-full px-2 py-0.5 ${LEVEL_BADGE[level] || 'bg-gray-100 text-gray-600'}`}>
                      {LEVEL_LABEL[level] || level}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {milestones.map((m, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                          i === 0 ? 'bg-berry-deep text-white' : 'bg-gray-200 text-gray-400'
                        }`}>
                          {i + 1}
                        </div>
                        <span className={`font-semibold leading-tight ${
                          i === 0 ? 'text-berry-deep' : 'text-gray-400'
                        }`}>
                          {m.week}: {m.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {error && (
            <p className="text-red-500 text-sm font-semibold text-center mb-3">{error}</p>
          )}

          <button
            onClick={handleFinish}
            disabled={saving}
            className="w-full bg-berry-deep text-white font-black text-lg py-4 rounded-full shadow-lg hover:bg-berry-dark hover:scale-[1.02] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {saving ? 'Saqlanmoqda...' : 'Boshlash! 🚀'}
          </button>
        </div>
      )
    }
  }

  // Dot indices: 0=welcome, 1=subjects, 2=test(full-screen), 3=time, 4=roadmap
  // We show 5 dots; step maps directly to dot index
  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      <BlueberryOrbs />
      {/* Progress dots */}
      <div className="flex gap-2 mb-8 relative z-[1]">
        {[0, 1, 2, 3, 4].map(i => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i === step
                ? 'w-8 h-3 bg-berry-deep'
                : i < step
                ? 'w-3 h-3 bg-berry-mid'
                : 'w-3 h-3 bg-berry-light'
            }`}
          />
        ))}
      </div>

      {/* Card */}
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md relative z-[1]">
        {renderCardContent()}
      </div>

      {/* Back button — not on step 0 */}
      {step > 0 && step !== 2 && (
        <button
          onClick={() => setStep(prev => prev - 1)}
          className="mt-4 text-berry-mid font-semibold text-sm hover:text-berry-deep transition-colors"
        >
          ← Orqaga
        </button>
      )}
    </div>
  )
}
