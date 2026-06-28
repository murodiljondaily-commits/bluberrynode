import { useState, useRef, useEffect } from 'react'
import { sessionLogger } from '../lib/sessionLogger'

const API = ''

const MAX_TURNS = 8

export default function AIConversation({ topic, level, subject = 'english', onComplete }) {
  const [messages, setMessages] = useState([])
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [turnCount, setTurnCount] = useState(0)
  const [xpEarned, setXpEarned] = useState(0)
  const [done, setDone] = useState(false)
  const [intro, setIntro] = useState(false)

  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const bottomRef = useRef(null)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    startIntro()
    return () => { isMounted.current = false }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function startIntro() {
    const introText = `Endi AI murabbiy bilan gaplashing! Tayyor bo'lsangiz, mikrofon tugmasini bosing. Mavzu: ${topic}`
    addMsg('nigora', introText)
    // Start the conversation with an AI greeting
    await sendToGPT([], true)
    setIntro(true)
  }

  function addMsg(role, text) {
    setMessages(prev => [...prev, { role, text, timestamp: Date.now() }])
  }

  async function sendToGPT(history, isFirst = false) {
    if (!isMounted.current) return
    setIsProcessing(true)
    const systemPrompt = `You are a warm, encouraging language tutor named Blueberry having a conversation with an Uzbek-speaking student.

Topic: ${topic}
Student level: ${level}
Subject: ${subject}

Rules:
- Keep responses SHORT (1-2 sentences max)
- If student makes a grammar mistake: correct GENTLY then continue the conversation
- Ask follow-up questions to keep talking
- Use simple vocabulary matching their level
- Respond in: ${subject === 'english' ? 'English' : subject === 'russian' ? 'Russian' : 'Uzbek'}
- After any correction, always add encouragement
${isFirst ? `- Start the conversation by introducing the topic naturally and asking the student a simple question about "${topic}"` : ''}`

    try {
      const res = await fetch(`${API}/api/nigora-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: 100,
          phrase: `[CONVERSATION] Topic: ${topic}. History: ${history.map(m => `${m.role}: ${m.text}`).join(' | ')}`,
          heard: isFirst ? '[START]' : history[history.length - 1]?.text || '',
          level,
          conversationMode: true,
          subject,
          systemOverride: systemPrompt,
        }),
      })
      const data = await res.json()
      const aiText = data.response_uz || data.response || "Let's talk!"
      if (isMounted.current) {
        addMsg('ai', aiText)
      }
    } catch {
      const fallback = subject === 'english' ? `Great! Tell me more about ${topic}.` : `Расскажи мне о ${topic}.`
      if (isMounted.current) addMsg('ai', fallback)
    } finally {
      if (isMounted.current) setIsProcessing(false)
    }
  }

  async function startRecording() {
    if (isListening || isProcessing) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []
      const mr = new MediaRecorder(stream)
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        handleRecordingDone()
      }
      mr.start()
      recorderRef.current = mr
      setIsListening(true)
    } catch {
      alert('Mikrofonga ruxsat bering!')
    }
  }

  function stopRecording() {
    recorderRef.current?.stop()
    setIsListening(false)
  }

  async function handleRecordingDone() {
    if (!isMounted.current) return
    setIsProcessing(true)
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
    try {
      const fd = new FormData()
      fd.append('audio', blob, 'speech.webm')
      fd.append('language', subject === 'russian' ? 'ru' : 'en')
      const res = await fetch(`${API}/api/transcribe`, { method: 'POST', body: fd })
      const data = await res.json()
      const transcript = data.transcript || ''
      if (!transcript.trim()) { setIsProcessing(false); return }

      const newMsg = { role: 'user', text: transcript }
      if (isMounted.current) addMsg('user', transcript)

      const newTurn = turnCount + 1
      setTurnCount(newTurn)
      setXpEarned(e => e + 5)
      sessionLogger.addXP?.(5)

      const updatedHistory = [...messages, newMsg]
      if (newTurn >= MAX_TURNS) {
        setDone(true)
        setIsProcessing(false)
        return
      }
      await sendToGPT(updatedHistory)
    } catch {
      if (isMounted.current) setIsProcessing(false)
    }
  }

  if (done) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-5 px-4 py-8">
        <div className="text-5xl">🎉</div>
        <h2 className="text-2xl font-black text-berry-deep text-center">Ajoyib suhbat!</h2>
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl px-10 py-4 text-center">
          <div className="text-4xl font-black text-yellow-600">+{xpEarned}</div>
          <div className="text-sm font-bold text-yellow-500">🫐 topildi</div>
        </div>
        <div className="bg-white rounded-2xl p-4 max-w-xs text-sm text-gray-600 shadow-sm w-full">
          <p className="font-bold text-berry-deep mb-2">Suhbat xulosasi:</p>
          <p>{turnCount} ta jumla aytdingiz 💪</p>
        </div>
        <button onClick={() => onComplete?.(xpEarned)}
          className="bg-berry-deep text-white font-black px-10 py-4 rounded-full shadow-lg hover:bg-berry-dark hover:scale-[1.02] transition-all">
          Davom etish →
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-berry-deep flex items-center justify-center text-white text-sm font-black">🤖</div>
          <div>
            <p className="font-black text-berry-deep text-sm">AI Murabbiy</p>
            <p className="text-xs text-gray-400">{topic}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-400">{turnCount}/{MAX_TURNS}</span>
          <button onClick={() => setDone(true)}
            className="text-xs font-bold text-berry-mid border border-berry-light rounded-full px-3 py-1 hover:bg-berry-glow">
            Tugatish
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm font-semibold shadow-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-berry-deep text-white rounded-br-sm'
                : msg.role === 'nigora'
                ? 'bg-purple-50 text-purple-700 border border-purple-100 rounded-bl-sm text-xs'
                : 'bg-white text-gray-700 border border-gray-100 rounded-bl-sm'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}

        {/* Thinking indicator */}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-berry-mid animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Mic button */}
      <div className="px-4 py-5 bg-white/90 backdrop-blur-sm border-t border-gray-100 flex flex-col items-center gap-2">
        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          disabled={isProcessing}
          className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl shadow-xl transition-all duration-150 ${
            isListening
              ? 'bg-red-500 text-white scale-110 shadow-red-200'
              : isProcessing
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-berry-deep text-white hover:bg-berry-dark hover:scale-105 active:scale-95'
          }`}
        >
          {isListening ? '⏹' : isProcessing ? '⚙️' : '🎤'}
        </button>
        <p className="text-xs font-semibold text-gray-400">
          {isListening ? 'Gaplaning... (qo\'yib yuboring)' : isProcessing ? 'Qayta ishlanmoqda...' : 'Bosib turing va gaplaning'}
        </p>
      </div>
    </div>
  )
}
