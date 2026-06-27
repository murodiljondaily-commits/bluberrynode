import { supabase } from './supabaseClient'

export async function planLesson(userId, subject, profile) {
  const { data: recentSessions } = await supabase
    .from('session_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('subject', subject)
    .order('created_at', { ascending: false })
    .limit(10)

  const { data: weakWords } = await supabase
    .from('vocabulary_bank')
    .select('word, translation, times_seen, times_correct')
    .eq('user_id', userId)
    .eq('subject', subject)
    .eq('mastered', false)
    .order('times_correct', { ascending: true })
    .limit(10)

  // Extract topics from stored [TOPIC: ...] tags in ai_notes
  const recentTopics = (recentSessions || [])
    .map(s => { const m = s.ai_notes?.match(/\[TOPIC:\s*(.+?)\]/); return m ? m[1].trim() : null })
    .filter(Boolean)

  // Accuracy trend across last 5 sessions
  const recentAccuracy = recentSessions?.length
    ? Math.round(
        recentSessions.slice(0, 5).reduce((sum, s) => {
          const acc = s.exercises_total > 0 ? (s.exercises_correct / s.exercises_total) * 100 : 50
          return sum + acc
        }, 0) / Math.min(recentSessions.length, 5)
      )
    : 50

  // Average response time trend (fast = engaged, slow = struggling)
  const avgResponseMs = recentSessions?.length
    ? Math.round(recentSessions.slice(0, 3).reduce((s, r) => s + (r.avg_response_time_ms || 3000), 0) / Math.min(recentSessions.length, 3))
    : 3000

  const context = {
    studentName: profile.full_name,
    subject,
    level: profile.current_level?.[subject] || 'beginner',
    streak: profile.streak || 0,
    totalLessons: profile.total_lessons_completed || 0,
    dailyMinutes: profile.daily_minutes || 30,
    recentEngagement: recentSessions?.[0]?.engagement_score || 50,
    recentAccuracy,
    avgResponseMs,
    aiNotes: recentSessions?.[0]?.ai_notes || '',
    weakWords: weakWords?.map(w => w.word) || [],
    recentTopics,
    sessionsThisWeek: recentSessions?.filter(s => {
      const d = new Date(s.created_at)
      return (Date.now() - d.getTime()) < 7 * 86400000
    }).length || 0,
  }

  const isDev = import.meta.env.DEV
  const apiBase = isDev ? 'http://localhost:3001' : ''

  const response = await fetch(`${apiBase}/api/plan-lesson`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context }),
  })

  const plan = await response.json()
  console.log('✅ Lesson plan:', plan.topic, '| reason:', plan.adjustmentReason)
  return plan
}
