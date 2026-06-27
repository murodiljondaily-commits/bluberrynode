let audioCtx = null
function ctx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  return audioCtx
}

function tone(freq, type, startTime, dur, g0 = 0.3, g1 = 0) {
  const ac = ctx()
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.connect(gain)
  gain.connect(ac.destination)
  osc.type = type
  osc.frequency.setValueAtTime(freq, startTime)
  gain.gain.setValueAtTime(g0, startTime)
  gain.gain.linearRampToValueAtTime(g1, startTime + dur)
  osc.start(startTime)
  osc.stop(startTime + dur)
}

export function playCorrect() {
  const now = ctx().currentTime
  tone(523.25, 'sine', now, 0.15, 0.3, 0)
  tone(659.25, 'sine', now + 0.12, 0.2, 0.3, 0)
}

export function playWrong() {
  const ac = ctx()
  const now = ac.currentTime
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.connect(gain)
  gain.connect(ac.destination)
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(200, now)
  osc.frequency.linearRampToValueAtTime(100, now + 0.25)
  gain.gain.setValueAtTime(0.25, now)
  gain.gain.linearRampToValueAtTime(0, now + 0.25)
  osc.start(now)
  osc.stop(now + 0.25)
}

export function playCelebration() {
  const now = ctx().currentTime
  ;[523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
    tone(freq, 'sine', now + i * 0.12, 0.2, 0.35, 0)
  })
}

export function playStreak() {
  const ac = ctx()
  const now = ac.currentTime
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.connect(gain)
  gain.connect(ac.destination)
  osc.type = 'sine'
  osc.frequency.setValueAtTime(400, now)
  osc.frequency.linearRampToValueAtTime(800, now + 0.3)
  gain.gain.setValueAtTime(0.25, now)
  gain.gain.linearRampToValueAtTime(0, now + 0.3)
  osc.start(now)
  osc.stop(now + 0.3)
}

export function playFlip() {
  const ac = ctx()
  const now = ac.currentTime
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.connect(gain)
  gain.connect(ac.destination)
  osc.type = 'sine'
  osc.frequency.setValueAtTime(800, now)
  osc.frequency.linearRampToValueAtTime(400, now + 0.1)
  gain.gain.setValueAtTime(0.2, now)
  gain.gain.linearRampToValueAtTime(0, now + 0.1)
  osc.start(now)
  osc.stop(now + 0.1)
}
