import { useEffect, useRef, useState } from 'react'
import { useLang } from '../context/LanguageContext'

const MAX_TURNS = 8

export default function RealtimeConversation({ topic, subject, level, studentName, onComplete }) {
  const { lang } = useLang()
  const explainLang = lang === 'ru' ? 'Russian' : 'Uzbek'
  const [status, setStatus] = useState('idle')
  // idle | connecting | connected | speaking | listening | error
  const [transcript, setTranscript] = useState([])
  const [turnCount, setTurnCount] = useState(0)
  const [xpEarned, setXpEarned] = useState(0)

  const pcRef = useRef(null)
  const dcRef = useRef(null)
  const audioRef = useRef(null)
  const bottomRef = useRef(null)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
      cleanup()
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  function cleanup() {
    try { pcRef.current?.close() } catch {}
    try { dcRef.current?.close() } catch {}
    if (audioRef.current) {
      audioRef.current.srcObject = null
      audioRef.current = null
    }
  }

  const targetLang = subject === 'russian' ? 'Russian' : subject === 'math' ? 'Uzbek' : 'English'

  const systemPrompt = `You are a warm, encouraging language tutor named Blueberry.
You are having a spoken conversation with ${studentName}, an Uzbek speaker learning ${targetLang}.
Topic today: ${topic}
Student level: ${level}

CRITICAL RULES:
- Keep responses SHORT (2-3 sentences max) so student can follow
- Speak mainly in ${targetLang} — this is what the student is learning
- WHEN THE STUDENT MAKES A MISTAKE: briefly switch to ${explainLang} (the student's
  native language) to explain WHAT was wrong and the correct form, then switch back to
  ${targetLang}. Example: say the correct version, then one short ${explainLang} sentence
  explaining why. Keep corrections kind and short.
- Ask ONE follow-up question per turn to keep conversation going
- Be warm and encouraging like a kind teacher
- Pace your speech for a ${level} level student
- After ${MAX_TURNS} exchanges: give a brief 2-sentence summary in ${explainLang} of what was discussed and what to practice`

  async function startSession() {
    if (!isMounted.current) return
    setStatus('connecting')
    try {
      const tokenRes = await fetch('/api/realtime-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, subject, level }),
      })
      if (!tokenRes.ok) throw new Error(`Token fetch failed: ${tokenRes.status}`)
      const { client_secret, error } = await tokenRes.json()
      if (error || !client_secret?.value) throw new Error(error || 'No token returned')

      const pc = new RTCPeerConnection()
      pcRef.current = pc

      // Output audio
      const audio = new Audio()
      audio.autoplay = true
      audioRef.current = audio
      pc.ontrack = (e) => { audio.srcObject = e.streams[0] }

      // Microphone input
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => pc.addTrack(track, stream))

      // Data channel for events
      const dc = pc.createDataChannel('oai-events')
      dcRef.current = dc

      dc.onopen = () => {
        if (!isMounted.current) return
        setStatus('connected')

        dc.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: systemPrompt,
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: { model: 'whisper-1' },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 800,
            },
          },
        }))

        // AI starts with greeting
        dc.send(JSON.stringify({
          type: 'response.create',
          response: {
            modalities: ['text', 'audio'],
            instructions: `Greet ${studentName} warmly in ${targetLang} and introduce the topic "${topic}". Ask ONE simple question to start the conversation.`,
          },
        }))
      }

      dc.onmessage = (e) => {
        if (!isMounted.current) return
        const event = JSON.parse(e.data)

        if (event.type === 'response.audio.delta') {
          setStatus('speaking')
        }

        if (event.type === 'response.audio_transcript.done') {
          setTranscript(prev => [...prev, { role: 'ai', text: event.transcript }])
          setTurnCount(prev => {
            const next = prev + 1
            setXpEarned(next * 10)
            if (next >= MAX_TURNS) {
              setTimeout(() => setStatus('done'), 500)
            } else {
              setStatus('listening')
            }
            return next
          })
        }

        if (event.type === 'conversation.item.input_audio_transcription.completed') {
          setTranscript(prev => [...prev, { role: 'user', text: event.transcript }])
          setStatus('speaking')
        }

        if (event.type === 'error') {
          console.error('Realtime error:', event.error)
          if (isMounted.current) setStatus('error')
        }
      }

      dc.onerror = () => { if (isMounted.current) setStatus('error') }
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' && isMounted.current) setStatus('error')
      }

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      const sdpRes = await fetch(
        'https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${client_secret.value}`,
            'Content-Type': 'application/sdp',
          },
          body: offer.sdp,
        }
      )
      if (!sdpRes.ok) throw new Error(`SDP exchange failed: ${sdpRes.status}`)
      const answerSdp = await sdpRes.text()
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })
    } catch (err) {
      console.error('Realtime connection failed:', err.message)
      if (isMounted.current) setStatus('error')
    }
  }

  function endSession() {
    cleanup()
    onComplete?.(xpEarned)
  }

  const statusConfig = {
    idle:       { bg: 'bg-gray-100',        icon: '🎤', text: 'AI murabbiy bilan gaplashishni boshlash uchun bosing' },
    connecting: { bg: 'bg-yellow-100',      icon: '⏳', text: 'Ulanmoqda...' },
    connected:  { bg: 'bg-green-100',       icon: '✅', text: 'Ulandi! AI gapirmoqda...' },
    speaking:   { bg: 'bg-berry-glow',      icon: '🔊', text: 'AI murabbiy gapirmoqda...' },
    listening:  { bg: 'bg-red-50',          icon: '🎤', text: 'Sizni eshityapman... Gapiring!' },
    error:      { bg: 'bg-red-100',         icon: '❌', text: "Xatolik yuz berdi. Qayta urinib ko'ring." },
    done:       { bg: 'bg-green-100',       icon: '🎉', text: 'Suhbat tugadi! Ajoyib ish!' },
  }

  const curr = statusConfig[status] || statusConfig.idle

  return (
    <div className="flex-1 flex flex-col px-4 py-4 max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="text-center mb-4">
        <p className="text-sm font-black text-berry-deep">🎤 AI Murabbiy bilan suhbat</p>
        <p className="text-xs text-gray-400">Mavzu: {topic} · {turnCount}/{MAX_TURNS} navbat</p>
      </div>

      {/* Status indicator */}
      <div className={`${curr.bg} rounded-2xl p-4 text-center mb-4 flex items-center justify-center gap-3`}>
        <span className="text-2xl">{curr.icon}</span>
        <p className="text-sm font-semibold text-gray-700">{curr.text}</p>
      </div>

      {/* Transcript */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-[180px] max-h-[280px] bg-gray-50 rounded-2xl p-3">
        {transcript.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-6">
            {subject === 'english' ? 'English' : subject === 'russian' ? 'Rus' : "O'zbek"} tilida suhbat boshlanadi...
          </p>
        ) : (
          transcript.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm font-semibold ${
                msg.role === 'user'
                  ? 'bg-berry-deep text-white rounded-br-none'
                  : 'bg-white shadow text-gray-700 rounded-bl-none'
              }`}>
                {msg.text}
              </div>
            </div>
          ))
        )}

        {/* Animated dots when AI is speaking */}
        {status === 'speaking' && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-bl-none px-4 py-3 shadow">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-berry-mid animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Mic wave animation when listening */}
        {status === 'listening' && (
          <div className="flex justify-end">
            <div className="bg-red-50 border border-red-200 rounded-2xl rounded-br-none px-4 py-3">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-1.5 bg-red-400 rounded-full animate-bounce"
                    style={{ height: `${8 + (i % 3) * 8}px`, animationDelay: `${i * 0.1}s` }} />
                ))}
                <span className="text-xs text-red-500 font-bold ml-1">Gapiring...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3">
        {status === 'idle' && (
          <button onClick={startSession}
            className="bg-berry-deep text-white rounded-full py-4 font-black text-base shadow-lg hover:bg-berry-dark hover:scale-[1.02] transition-all">
            🎤 AI Murabbiy bilan gaplash
          </button>
        )}

        {status === 'error' && (
          <button onClick={startSession}
            className="bg-orange-500 text-white rounded-full py-4 font-black hover:scale-[1.02] transition-all">
            🔄 Qayta urinish
          </button>
        )}

        {['connected', 'speaking', 'listening'].includes(status) && (
          <button onClick={endSession}
            className="border-2 border-berry-light text-berry-mid rounded-full py-3 font-semibold hover:bg-berry-glow transition-all text-sm">
            Suhbatni tugatish ({MAX_TURNS - turnCount} navbat qoldi)
          </button>
        )}

        {(status === 'done' || turnCount >= MAX_TURNS) && (
          <button onClick={endSession}
            className="bg-green-500 text-white rounded-full py-4 font-black hover:scale-[1.02] transition-all shadow-lg">
            ✅ Suhbat tugadi! +{xpEarned} 🫐 · Davom etish →
          </button>
        )}

        <button onClick={() => onComplete?.(0)}
          className="text-xs text-gray-400 text-center hover:text-berry-mid transition-colors py-1">
          O'tkazib yuborish →
        </button>
      </div>
    </div>
  )
}
