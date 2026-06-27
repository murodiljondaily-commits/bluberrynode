import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import SubtleOrbs from '../components/SubtleOrbs'

function StatCard({ emoji, label, value, sub, bg = 'bg-white' }) {
  return (
    <div className={`${bg} rounded-2xl p-4 shadow-sm border border-gray-100`}>
      <div className="text-2xl mb-1">{emoji}</div>
      <div className="text-2xl font-black text-berry-deep">{value}</div>
      <div className="text-xs font-bold text-gray-400 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-300 font-semibold">{sub}</div>}
    </div>
  )
}

function MiniBar({ label, value, max = 100, color = 'bg-berry-mid' }) {
  const pct = Math.min(100, Math.round((value / Math.max(max, 1)) * 100))
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-semibold text-gray-600">{label}</span>
        <span className="text-sm font-black text-berry-deep">{value}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

const DAYS_UZ = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan']

export default function Statistics() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { navigate('/login'); return }
      const userId = session.user.id

      const [{ data: prof }, { data: sess }] = await Promise.all([
        supabase.from('profiles')
          .select('xp, total_berries_earned, streak, total_lessons_completed, subjects')
          .eq('id', userId).single(),
        supabase.from('session_logs')
          .select('date, xp_earned, exercises_total, exercises_correct, words_seen, speaking_avg_score, subject, duration_seconds, ai_notes')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(30),
      ])
      setProfile(prof)
      setSessions(sess || [])
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
  const streak = profile?.streak || 0
  const totalLessons = profile?.total_lessons_completed || 0
  const totalWords = sessions.reduce((a, s) => a + (s.words_seen?.length || 0), 0)
  const avgSpeaking = sessions.length
    ? Math.round(sessions.reduce((a, s) => a + (s.speaking_avg_score || 0), 0) / sessions.length)
    : 0
  const avgAccuracy = sessions.length
    ? Math.round(sessions.reduce((a, s) => {
        const total = s.exercises_total || 0
        const correct = s.exercises_correct || 0
        return a + (total > 0 ? (correct / total) * 100 : 0)
      }, 0) / sessions.length)
    : 0
  const totalMinutes = Math.round(sessions.reduce((a, s) => a + (s.duration_seconds || 0), 0) / 60)

  // Last 7 days XP chart
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toISOString().split('T')[0]
    const dayXP = sessions.filter(s => s.date === dateStr).reduce((a, s) => a + (s.xp_earned || 0), 0)
    return { day: DAYS_UZ[d.getDay()], xp: dayXP, date: dateStr }
  })
  const maxDayXp = Math.max(...last7.map(d => d.xp), 1)

  // Per-subject accuracy
  const subjectStats = (profile?.subjects || ['english']).map(subj => {
    const subSessions = sessions.filter(s => s.subject === subj)
    const acc = subSessions.length
      ? Math.round(subSessions.reduce((a, s) => {
          const t = s.exercises_total || 0; const c = s.exercises_correct || 0
          return a + (t > 0 ? (c / t) * 100 : 0)
        }, 0) / subSessions.length)
      : 0
    return { subject: subj, accuracy: acc, sessions: subSessions.length }
  })

  // Weak topics from ai_notes
  const weakTopics = sessions
    .slice(0, 10)
    .map(s => s.ai_notes?.replace(/\[TOPIC:[^\]]+\]\n?/, '').trim())
    .filter(Boolean)
    .slice(0, 3)

  return (
    <div className="min-h-screen bg-cream relative overflow-hidden">
      <SubtleOrbs />
      <div className="relative z-[1] max-w-2xl mx-auto px-4 py-6 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/dashboard')} className="text-berry-mid font-bold text-sm hover:text-berry-deep">← Orqaga</button>
          <h1 className="text-2xl font-black text-berry-deep">Statistika 📊</h1>
        </div>

        {/* Main stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <StatCard emoji="🫐" label="Jami rezavorlar" value={totalXp.toLocaleString()} bg="bg-berry-glow" />
          <StatCard emoji="🔥" label="Streak" value={`${streak} kun`} />
          <StatCard emoji="📚" label="Bajarilgan darslar" value={totalLessons} />
          <StatCard emoji="📖" label="O'rganilgan so'zlar" value={totalWords} />
          <StatCard emoji="🎤" label="Gapirish o'rtacha" value={avgSpeaking > 0 ? `${avgSpeaking}/100` : '—'} />
          <StatCard emoji="⏱️" label="Umumiy vaqt" value={`${totalMinutes} daq`} />
        </div>

        {/* 7-day XP chart */}
        <div className="bg-white rounded-3xl p-5 shadow-sm mb-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">So'nggi 7 kun 🫐</p>
          <div className="flex items-end gap-2 h-28">
            {last7.map(({ day, xp }) => (
              <div key={day} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-xs font-bold text-berry-deep">{xp > 0 ? xp : ''}</div>
                <div className="w-full rounded-t-lg bg-berry-glow relative" style={{ height: '100%' }}>
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-berry-deep rounded-t-lg transition-all duration-700"
                    style={{ height: `${Math.max(4, (xp / maxDayXp) * 100)}%` }}
                  />
                </div>
                <div className="text-[10px] font-bold text-gray-400">{day}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Per-subject accuracy */}
        <div className="bg-white rounded-3xl p-5 shadow-sm mb-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">Fan bo'yicha aniqlik</p>
          {subjectStats.map(({ subject, accuracy, sessions: cnt }) => (
            <MiniBar
              key={subject}
              label={`${subject === 'english' ? '🇬🇧 Ingliz' : subject === 'russian' ? '🇷🇺 Rus' : '🔢 Math'} (${cnt} dars)`}
              value={`${accuracy}%`}
              max={100}
              color={subject === 'english' ? 'bg-blue-400' : subject === 'russian' ? 'bg-red-400' : 'bg-emerald-400'}
            />
          ))}
          <MiniBar label="🎤 Gapirish o'rtacha" value={`${avgSpeaking}%`} max={100} color="bg-berry-mid" />
        </div>

        {/* Tutor notes (recent sessions) */}
        {weakTopics.length > 0 && (
          <div className="bg-white rounded-3xl p-5 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Murabbiy eslatmalari 🧠</p>
            {weakTopics.map((note, i) => (
              <div key={i} className="bg-cream rounded-2xl px-4 py-3 mb-2 text-sm text-gray-600 leading-relaxed">
                {note}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
