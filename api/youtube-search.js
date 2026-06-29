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

// Below B1, a learner can't follow an all-English explanation, so for English/Russian
// lessons we bias the query toward videos EXPLAINED in the student's UI language.
const isLowLevel = (level) => !['B1', 'B2', 'C1', 'C2'].includes(String(level || '').toUpperCase())

function buildQuery(subject, topic, level, kind, uiLang) {
  const explainIn = uiLang === 'ru' ? 'на русском' : "o'zbek tilida"
  const low = isLowLevel(level)

  if (kind === 'podcast') {
    if (subject === 'russian') return `${topic} подкаст русский язык для изучающих`
    if (subject === 'math') return `${topic} matematika podkast tushuntirish`
    return low ? `${topic} ingliz tili podkast ${explainIn}` : `${topic} English learning podcast`
  }
  if (kind === 'cartoon') {
    if (subject === 'russian') return `${topic} мультфильм для детей русский`
    if (subject === 'math') return `${topic} matematika multfilm bolalar uchun`
    return `${topic} cartoon for kids learn English`
  }
  if (subject === 'russian') {
    // For Uzbek speakers below B1, prefer Russian-grammar-explained-in-Uzbek.
    return low && uiLang !== 'ru' ? `${topic} rus tili grammatika ${explainIn}` : `${topic} русский язык урок`
  }
  if (subject === 'math') return `${topic} matematika dars ${explainIn}`
  // English lessons: explained in UI language for low levels, English-only for B1+.
  return low ? `${topic} ingliz tili grammatika ${explainIn}` : `${topic} English ${level || ''} grammar lesson`
}

// Allowed video length per kind (seconds). Podcasts can run much longer.
function durationWindow(kind) {
  if (kind === 'podcast') return [600, 3600]   // 10–60 min: favor real podcast episodes, not short clips
  if (kind === 'cartoon') return [60, 1500]    // 1–25 min
  return [60, 1500]                            // lessons 1–25 min
}

// ISO8601 PT#M#S → seconds
function parseDuration(iso) {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso || '')
  if (!m) return 0
  return (+(m[1] || 0)) * 3600 + (+(m[2] || 0)) * 60 + (+(m[3] || 0))
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { subject = 'english', topic = '', level = '', kind = 'lesson', uiLang = 'uz' } = req.body || {}
  const key = process.env.YOUTUBE_API_KEY || process.env.VITE_YOUTUBE_API_KEY
  const fb = FALLBACK[subject] || FALLBACK.english
  const fbResult = { videoId: fb.id, title: fb.title, channel: fb.channel, durationSec: fb.duration, url: `https://www.youtube.com/watch?v=${fb.id}` }

  if (!key) return res.json({ ...fbResult, source: 'fallback-nokey' })

  try {
    const q = buildQuery(subject, topic, level, kind, uiLang)
    const [minDur, maxDur] = durationWindow(kind)
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=8&order=relevance&safeSearch=strict&q=${encodeURIComponent(q)}&key=${key}`
    const sRes = await fetch(searchUrl, { signal: AbortSignal.timeout(10000) })
    const sData = await sRes.json()
    if (!sRes.ok || !sData.items?.length) {
      console.error('YT search error', sRes.status, JSON.stringify(sData).slice(0, 160))
      return res.json({ ...fbResult, source: 'fallback-search' })
    }

    const ids = sData.items.map(i => i.id?.videoId).filter(Boolean)
    // Fetch durations + status + stats to pick a sensible-length, popular, public video.
    const vRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet,status,statistics&id=${ids.join(',')}&key=${key}`,
      { signal: AbortSignal.timeout(10000) }
    )
    const vData = await vRes.json()
    const vids = (vData.items || []).map(v => ({
      videoId: v.id,
      title: v.snippet?.title,
      channel: v.snippet?.channelTitle,
      durationSec: parseDuration(v.contentDetails?.duration),
      views: parseInt(v.statistics?.viewCount || '0', 10),
      public: v.status?.privacyStatus === 'public' && v.status?.embeddable !== false,
    })).filter(v => v.public && v.durationSec >= minDur && v.durationSec <= maxDur)

    if (!vids.length) return res.json({ ...fbResult, source: 'fallback-nomatch' })

    // Quality signal: prefer a trusted channel; otherwise the most-watched candidate
    // (high view counts correlate with clearer, better-produced lessons).
    const trusted = vids.filter(v => PREFERRED.some(p => (v.channel || '').toLowerCase().includes(p.toLowerCase())))
    const pool = trusted.length ? trusted : vids
    const pick = pool.reduce((best, v) => (v.views > (best?.views || 0) ? v : best), pool[0])
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
