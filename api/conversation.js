// Turn-based AI speaking tutor (a fast stand-in for realtime voice chat).
// The frontend records the student, transcribes via Whisper, then calls this with the
// running history. GPT-4o replies as a kind individual tutor in the TARGET language and,
// when the student makes a mistake, explains the fix in the student's EXPLAIN language.
//
// POST { subject, level, topic, uiLang, studentName, history:[{role,content}], userMessage }
//  -> { reply, correction }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const {
      subject = 'english', level = 'A1', topic = '', uiLang = 'uz',
      studentName = 'Student', history = [], userMessage = '',
    } = req.body || {}

    const targetLang = subject === 'russian' ? 'Russian' : 'English'
    // English subject: explain in the chosen UI language (uz or ru).
    // Russian subject: the learner is an Uzbek speaker (Russians don't study Russian),
    // so explanations are always in Uzbek.
    const explainLang = subject === 'russian'
      ? 'Uzbek (lotin alifbosida / Latin script)'
      : (uiLang === 'ru' ? 'Russian' : 'Uzbek (lotin alifbosida / Latin script)')

    const system = `You are a warm, patient, encouraging individual SPEAKING tutor having a live spoken
conversation with ${studentName}, an Uzbek speaker learning ${targetLang}.
Student level: ${level}. Topic to steer the chat toward: ${topic || 'everyday conversation'}.

YOUR JOB:
- "reply": speak ONLY in ${targetLang}. Keep it SHORT (1-2 sentences) and ALWAYS end with one
  simple question so the student keeps talking. Challenge them gently to speak more.
- Match the student's level (${level}). Use simple words and slow, clear phrasing for low levels.
- Be kind, curious and engaging — react to what they said, show interest, encourage them.
- Ask level-appropriate questions that push them to produce language.

⚠️ "correction": if the student's last message has a grammar/vocabulary/word-order mistake,
write a SHORT explanation (1-2 sentences) of what was wrong and the correct way.
THE ENTIRE "correction" TEXT MUST BE WRITTEN IN ${explainLang}. Do NOT write the correction in
${targetLang}. The student needs the explanation in their own language to understand.
You may quote the correct ${targetLang} phrase in quotes, but the EXPLANATION around it is ${explainLang}.
If there is no mistake (or this is the greeting), set "correction" to "".

Return ONLY a JSON object: {"reply":"...","correction":"..."}`

    const messages = [{ role: 'system', content: system }]
    // history items are already {role:'user'|'assistant', content}
    for (const h of history.slice(-12)) {
      if (h && (h.role === 'user' || h.role === 'assistant') && h.content) messages.push(h)
    }
    messages.push({
      role: 'user',
      content: userMessage && userMessage.trim()
        ? userMessage
        : '(Begin: greet me warmly by name, say what we will chat about, and ask your first simple question.)',
    })

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 300,
        temperature: 0.8,
        response_format: { type: 'json_object' },
        messages,
      }),
      signal: AbortSignal.timeout(20000),
    })
    const d = await r.json()
    if (!r.ok || !d.choices?.[0]) {
      console.error('conversation error', r.status, JSON.stringify(d).slice(0, 160))
      return res.json({ reply: targetLang === 'Russian' ? 'Извините, повторите, пожалуйста.' : 'Sorry, could you say that again?', correction: '' })
    }
    let parsed
    try { parsed = JSON.parse(d.choices[0].message.content) } catch { parsed = { reply: d.choices[0].message.content, correction: '' } }
    res.json({ reply: parsed.reply || '', correction: parsed.correction || '' })
  } catch (err) {
    console.error('conversation exception', err.message)
    res.json({ reply: 'Let us continue — tell me more!', correction: '' })
  }
}
