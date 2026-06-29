export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { sessionData } = req.body
    const studentName = req.body.studentName
    const subject = req.body.subject || sessionData?.subject || 'english'
    const level = req.body.level
    const topic = sessionData?.topic || ''
    const accuracy = sessionData?.accuracy_percent || 0
    const wrongWords = sessionData?.words_wrong || []
    const speakingScore = sessionData?.speaking_avg_score || 0
    const topicTag = topic ? `[TOPIC: ${topic}]\n` : ''

    const geminiPrompt = `You are an expert language tutor writing session notes after a student's lesson.

Student: ${studentName || 'Student'}, ${level || 'beginner'} ${subject || 'english'}
Topic: ${topic}
Accuracy: ${accuracy}%
Exercises score: ${sessionData?.exercises_correct || 0}/${sessionData?.exercises_total || 0}
Speaking score: ${speakingScore}/100
Wrong words: ${wrongWords.join(', ') || 'none'}
Duration: ${Math.round((sessionData?.duration_seconds || 0) / 60)} minutes
Engagement: ${sessionData?.engagement_score || 50}/100

Write 2-3 specific actionable sentences in English about:
1. What student struggled with (name EXACT words/concepts)
2. What worked well
3. What to focus on next session

Be specific and brief. Reference actual words from the session.`

    // Claude Haiku primary (replaces Gemini)
    try {
      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 300,
          temperature: 0.4,
          messages: [{ role: 'user', content: geminiPrompt }],
        }),
        signal: AbortSignal.timeout(15000),
      })
      const claudeData = await claudeRes.json()
      if (claudeRes.ok && claudeData.content?.[0]?.text) {
        console.log('✅ Claude session analysis done')
        return res.json({ notes: topicTag + claudeData.content[0].text.trim() })
      }
      console.error('Claude analyze error', claudeRes.status, JSON.stringify(claudeData).slice(0, 140))
    } catch (e) {
      console.error('Claude analyze exception', e.message)
    }

    // Fallback to OpenAI
    const oaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 200,
        messages: [
          { role: 'system', content: 'You are a tutor writing brief session notes. Be specific and mention exact words/concepts the student missed. Write 2-3 sentences in English.' },
          { role: 'user', content: `Session: topic="${topic}", accuracy=${accuracy}%, speaking=${speakingScore}/100, wrong_words=[${wrongWords.join(', ')}], subject=${subject}` },
        ],
      }),
    })
    const oaiData = await oaiResponse.json()
    const notes = oaiData.choices?.[0]?.message?.content?.trim() || 'Session completed.'
    res.json({ notes: topicTag + notes })
  } catch (err) {
    console.error('analyze-session error:', err)
    const topicTag = req.body?.sessionData?.topic ? `[TOPIC: ${req.body.sessionData.topic}]\n` : ''
    res.json({ notes: topicTag + 'Session completed.' })
  }
}
