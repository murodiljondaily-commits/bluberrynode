// Warm, soft UI sounds via Web Audio — smooth envelopes + a gentle lowpass so they
// don't sound like a broken speaker. Kept tiny and synthesized (no asset loading).
let audioCtx = null
function ctx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {})
  return audioCtx
}

// A single soft note: sine through a lowpass, with an exponential (natural) decay.
function note(freq, start, dur, peak = 0.22, cutoff = 2600) {
  const ac = ctx()
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  const lp = ac.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(cutoff, start)

  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq, start)
  osc.connect(lp); lp.connect(gain); gain.connect(ac.destination)

  // Quick soft attack, smooth exponential release — pleasant, not clicky.
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  osc.start(start)
  osc.stop(start + dur + 0.02)
}

// Pleasant rising two-note chime (C6 -> E6).
export function playCorrect() {
  const t = ctx().currentTime
  note(1046.5, t, 0.18, 0.20)
  note(1318.5, t + 0.10, 0.28, 0.20)
}

// Soft, low "aw" — two gentle low notes, not a harsh buzzer.
export function playWrong() {
  const t = ctx().currentTime
  note(311.1, t, 0.22, 0.16, 1400)        // Eb4
  note(233.1, t + 0.12, 0.30, 0.16, 1200) // Bb3
}

// Major arpeggio sparkle for lesson complete (C–E–G–C).
export function playCelebration() {
  const t = ctx().currentTime
  ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => note(f, t + i * 0.11, 0.35, 0.18))
}

// Quick upward shimmer for streaks.
export function playStreak() {
  const t = ctx().currentTime
  ;[659.25, 880, 1174.7].forEach((f, i) => note(f, t + i * 0.07, 0.22, 0.16))
}

// Very soft, short tick for card flips.
export function playFlip() {
  const t = ctx().currentTime
  note(880, t, 0.08, 0.10, 3000)
}
