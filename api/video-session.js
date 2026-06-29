import { createClient } from '@supabase/supabase-js'

// Tracks a student who left to watch a YouTube video/podcast/cartoon and pulls
// them back with escalating Telegram messages if they don't return in time.
//
// Actions (POST body):
//   { action:'start', userId, telegramId, uiLang, topic, kind, durationSec } -> { id }
//   { action:'complete', sessionId }                                          -> { ok }
//   { action:'process', secret }   (called by a cron pinger every few minutes) -> { sent }

function db() {
  return createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
}

async function sendTelegram(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token || !chatId) return false
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
      signal: AbortSignal.timeout(8000),
    })
    return r.ok
  } catch {
    return false
  }
}

// Escalating message per stage + language.
const MSG = {
  1: { uz: (t) => `📺 "${t}" videosi tugadimi? Darsga qayting va davom eting! 🫐`,
       ru: (t) => `📺 Видео "${t}" закончилось? Вернитесь к уроку и продолжайте! 🫐` },
  2: { uz: (t) => `⏰ Hali ham darsga qaytmadingiz! "${t}" mavzusini tugatish vaqti keldi. Hoziroq qayting!`,
       ru: (t) => `⏰ Вы всё ещё не вернулись! Пора закончить тему "${t}". Возвращайтесь сейчас же!` },
  3: { uz: (t) => `🚨 OXIRGI OGOHLANTIRISH! "${t}" darsi sizni kutmoqda. Hoziroq qayting — bilim kutmaydi! 🔥`,
       ru: (t) => `🚨 ПОСЛЕДНЕЕ ПРЕДУПРЕЖДЕНИЕ! Урок "${t}" ждёт вас. Вернитесь немедленно — знания не ждут! 🔥` },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { action } = req.body || {}
  const supabase = db()

  try {
    if (action === 'start') {
      const { userId, telegramId, uiLang = 'uz', topic = '', kind = 'lesson', durationSec = 360 } = req.body
      const { data, error } = await supabase.from('video_sessions').insert({
        user_id: userId, telegram_id: String(telegramId), ui_lang: uiLang,
        topic, kind, duration_sec: durationSec, started_at: new Date().toISOString(),
        stage: 0, status: 'watching',
      }).select('id').single()
      if (error) { console.error('video-session start error', error.message); return res.json({ id: null }) }
      return res.json({ id: data.id })
    }

    if (action === 'complete') {
      const { sessionId } = req.body
      if (sessionId) await supabase.from('video_sessions').update({ status: 'done' }).eq('id', sessionId)
      return res.json({ ok: true })
    }

    if (action === 'process') {
      // Optional shared-secret guard (only enforced if CRON_SECRET is configured).
      if (process.env.CRON_SECRET && req.body.secret !== process.env.CRON_SECRET) {
        return res.status(401).json({ error: 'unauthorized' })
      }
      const { data: sessions } = await supabase
        .from('video_sessions').select('*').eq('status', 'watching').limit(200)

      let sent = 0
      const now = Date.now()
      for (const s of sessions || []) {
        const elapsed = (now - new Date(s.started_at).getTime()) / 1000
        const D = s.duration_sec || 360
        // Stage thresholds: +5 / +10 / +15 minutes AFTER the video would have ended.
        const target = elapsed >= D + 900 ? 3 : elapsed >= D + 600 ? 2 : elapsed >= D + 300 ? 1 : 0
        if (target > (s.stage || 0)) {
          const lang = s.ui_lang === 'ru' ? 'ru' : 'uz'
          // Send each newly-reached stage (usually one).
          for (let stage = (s.stage || 0) + 1; stage <= target; stage++) {
            if (await sendTelegram(s.telegram_id, MSG[stage][lang](s.topic))) sent++
          }
          await supabase.from('video_sessions')
            .update({ stage: target, status: target >= 3 ? 'expired' : 'watching' })
            .eq('id', s.id)
        }
      }
      return res.json({ processed: sessions?.length || 0, sent })
    }

    return res.status(400).json({ error: 'unknown action' })
  } catch (err) {
    console.error('video-session error', err.message)
    return res.status(500).json({ error: err.message })
  }
}
