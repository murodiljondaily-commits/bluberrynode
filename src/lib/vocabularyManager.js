import { supabase } from './supabaseClient'

export const vocabularyManager = {

  async addWords(userId, words, subject) {
    for (const w of words) {
      const { data: existing } = await supabase
        .from('vocabulary_bank')
        .select('id, times_seen')
        .eq('user_id', userId)
        .eq('word', w.word)
        .single()

      if (existing) {
        await supabase.from('vocabulary_bank')
          .update({ times_seen: existing.times_seen + 1, last_seen: new Date().toISOString().split('T')[0] })
          .eq('id', existing.id)
      } else {
        await supabase.from('vocabulary_bank').insert({
          user_id: userId,
          word: w.word,
          translation: w.translation,
          example: w.example || '',
          subject,
        })
      }
    }
    console.log(`✅ ${words.length} words added to vocabulary bank`)
  },

  async getWordsForReview(userId) {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('vocabulary_bank')
      .select('*')
      .eq('user_id', userId)
      .eq('mastered', false)
      .lte('next_review', today)
      .order('next_review', { ascending: true })
      .limit(20)
    return data || []
  },

  async recordReview(wordId, isCorrect) {
    const { data: word } = await supabase
      .from('vocabulary_bank')
      .select('srs_level, times_correct')
      .eq('id', wordId)
      .single()

    if (!word) return

    // SRS intervals: 1, 3, 7, 14, 30 days
    const intervals = [1, 3, 7, 14, 30]
    const newLevel = isCorrect ? Math.min(word.srs_level + 1, 4) : 0
    const nextReview = new Date()
    nextReview.setDate(nextReview.getDate() + intervals[newLevel])

    await supabase.from('vocabulary_bank').update({
      srs_level: newLevel,
      times_correct: isCorrect ? word.times_correct + 1 : word.times_correct,
      last_seen: new Date().toISOString().split('T')[0],
      next_review: nextReview.toISOString().split('T')[0],
      mastered: newLevel === 4,
    }).eq('id', wordId)
  },

  async getUserStats(userId) {
    const { data } = await supabase
      .from('vocabulary_bank')
      .select('mastered, srs_level')
      .eq('user_id', userId)

    if (!data) return { total: 0, mastered: 0, learning: 0 }
    return {
      total: data.length,
      mastered: data.filter(w => w.mastered).length,
      learning: data.filter(w => !w.mastered).length,
    }
  },
}
