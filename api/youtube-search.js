// Finds the best real YouTube video for a topic+level and returns it for an
// EXTERNAL redirect (no embedding — embeds are widely blocked). Uses the
// YouTube Data API v3. Falls back to a curated id if search is unavailable.

const FALLBACK = {
  english: { id: 'nHRvXkp4Pqk', title: 'English lesson', channel: 'YouTube', duration: 360 },
  russian: { id: 'YRz7OHbZi78', title: 'Русский урок', channel: 'YouTube', duration: 360 },
  math: { id: 'mvOkMYCygps', title: 'Matematika', channel: 'YouTube', duration: 360 },
}

// Trusted, high-quality educational channels (soft preference, not a hard filter).
const PREFERRED = [
  'BBC Learning English', 'English with Lucy', "Learn English with EnglishClass101.com",
  'mmmEnglish', 'Speak English With Vanessa', 'RussianPod101', 'Real Russian Club',
  'Easy Russian', 'Khan Academy', 'Math Antics', 'TED-Ed',
]

function buildQuery(subject, topic, level) {
  if (subject === 'russian') return `${topic} русский язык урок для начинающих`
  if (subject === 'math') return `${topic} matematika dars tushuntirish`
  return `${topic} English ${level || ''} grammar lesson for learners`
}

// ISO8601 PT#M#S → seconds
function parseDuration(iso) {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso || '')
  if (!m) return 0
  return (+(m[1] || 0)) * 3600 + (+(m[2] || 0)) * 60 + (+(m[3] || 0))
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { subject = 'english', topic = '', level = '' } = req.body || {}
  const key = process.env.YOUTUBE_API_KEY || process.env.VITE_YOUTUBE_API_KEY
  const fb = FALLBACK[subject] || FALLBACK.english
  const fbResult = { videoId: fb.id, title: fb.title, channel: fb.channel, durationSec: fb.duration, url: `https://www.youtube.com/watch?v=${fb.id}` }

  if (!key) return res.json({ ...fbResult, source: 'fallback-nokey' })

  try {
    const q = buildQuery(subject, topic, level)
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=8&order=relevance&safeSearch=strict&q=${encodeURIComponent(q)}&key=${key}`
    const sRes = await fetch(searchUrl, { signal: AbortSignal.timeout(10000) })
    const sData = await sRes.json()
    if (!sRes.ok || !sData.items?.length) {
      console.error('YT search error', sRes.status, JSON.stringify(sData).slice(0, 160))
      return res.json({ ...fbResult, source: 'fallback-search' })
    }

    const ids = sData.items.map(i => i.id?.videoId).filter(Boolean)
    // Fetch durations + status to pick a sensible-length, public video.
    const vRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet,status&id=${ids.join(',')}&key=${key}`,
      { signal: AbortSignal.timeout(10000) }
    )
    const vData = await vRes.json()
    const vids = (vData.items || []).map(v => ({
      videoId: v.id,
      title: v.snippet?.title,
      channel: v.snippet?.channelTitle,
      durationSec: parseDuration(v.contentDetails?.duration),
      public: v.status?.privacyStatus === 'public',
    })).filter(v => v.public && v.durationSec >= 60 && v.durationSec <= 1500) // 1–25 min

    if (!vids.length) return res.json({ ...fbResult, source: 'fallback-nomatch' })

    // Prefer a trusted channel, else first relevant result.
    const pick = vids.find(v => PREFERRED.some(p => (v.channel || '').toLowerCase().includes(p.toLowerCase()))) || vids[0]
    return res.json({
      videoId: pick.videoId,
      title: pick.title,
      channel: pick.channel,
      durationSec: pick.durationSec,
      url: `https://www.youtube.com/watch?v=${pick.videoId}`,
      source: 'youtube',
    })
  } catch (e) {
    console.error('youtube-search exception', e.message)
    return res.json({ ...fbResult, source: 'fallback-exception' })
  }
}
