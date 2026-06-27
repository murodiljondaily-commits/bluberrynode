import { supabase } from './supabaseClient'

class SessionLogger {
  constructor() {
    this.reset()
  }

  reset() {
    this.sessionStart = Date.now()
    this.subject = ''
    this.lessonNumber = 1
    this.exercises = []
    this.wordsSeen = []
    this.wordsCorrect = []
    this.wordsWrong = []
    this.speakingAttempts = 0
    this.speakingCorrect = 0
    this.speakingScores = []
    this.xpEarned = 0
    this.responseTimes = []
  }

  startSession(subject) {
    this.reset()
    this.subject = subject
    console.log('▶️ Session started:', subject)
  }

  setLessonNumber(num) {
    this.lessonNumber = num
  }

  logExercise({ question, userAnswer, correctAnswer, isCorrect, timeMs, word }) {
    this.exercises.push({ question, userAnswer, correctAnswer, isCorrect, timeMs, word, timestamp: Date.now() })
    if (timeMs) this.responseTimes.push(timeMs)
    if (word) {
      this.wordsSeen.push(word)
      if (isCorrect) this.wordsCorrect.push(word)
    }
  }

  logWrongWord(word) {
    if (word) this.wordsWrong.push(word)
  }

  logSpeakingScore(score) {
    this.speakingScores.push(score)
    if (score >= 70) this.speakingCorrect++
    this.speakingAttempts++
  }

  addXP(amount) {
    this.xpEarned += amount
  }

  calculateEngagement() {
    if (this.responseTimes.length === 0) return 50
    const avgTime = this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
    const accuracy = this.exercises.length > 0
      ? (this.exercises.filter(e => e.isCorrect).length / this.exercises.length) * 100
      : 50
    const speedScore = avgTime < 3000 ? 100 : avgTime < 6000 ? 70 : 40
    return Math.round((speedScore + accuracy) / 2)
  }

  async saveSession(userId, subject, aiNotes = '') {
    const subjectToSave = subject || this.subject
    console.log('💾 Saving session for:', userId, subjectToSave)

    const duration = Math.round((Date.now() - this.sessionStart) / 1000)
    const correct = this.exercises.filter(e => e.isCorrect).length
    const total = this.exercises.length
    const avgTime = this.responseTimes.length > 0
      ? Math.round(this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length)
      : 0

    const weakPoints = this.exercises
      .filter(e => !e.isCorrect)
      .map(e => ({
        question: e.question,
        userAnswer: e.userAnswer,
        correctAnswer: e.correctAnswer,
        word: e.word,
      }))

    const accuracy = total > 0 ? (correct / total) * 100 : 0

    const sessionData = {
      user_id: userId,
      subject: subjectToSave,
      date: new Date().toISOString().split('T')[0],
      duration_seconds: duration,
      xp_earned: this.xpEarned,
      exercises_total: total,
      exercises_correct: correct,
      accuracy_percent: Math.round(accuracy),
      words_seen: this.wordsSeen,
      words_correct: this.wordsCorrect,
      words_wrong: this.wordsWrong,
      speaking_attempts: this.speakingAttempts,
      speaking_correct: this.speakingCorrect,
      speaking_avg_score: this.speakingScores.length > 0
        ? Math.round(this.speakingScores.reduce((a, b) => a + b, 0) / this.speakingScores.length)
        : 0,
      avg_response_time_ms: avgTime,
      engagement_score: this.calculateEngagement(),
      weak_points: weakPoints,
      ai_notes: aiNotes,
      lesson_number: this.lessonNumber,
    }

    console.log('💾 Session data to save:', JSON.stringify(sessionData, null, 2))

    const { data, error } = await supabase
      .from('session_logs')
      .insert(sessionData)
      .select()

    if (error) {
      console.error('❌ Session save FAILED:', error)
      return null
    }

    console.log('✅ Session saved successfully:', data[0]?.id)
    return data[0]
  }
}

export const sessionLogger = new SessionLogger()
