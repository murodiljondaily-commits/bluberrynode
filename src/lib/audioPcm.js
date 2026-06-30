// Convert a recorded (webm/opus) Blob to 16 kHz mono 16-bit little-endian LPCM —
// the raw format Yandex SpeechKit STT accepts (the browser can't record OggOpus on
// Chrome, so we decode + resample in the browser instead).
export async function blobToLpcm16k(blob) {
  const arrayBuf = await blob.arrayBuffer()
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  const ctx = new AudioCtx()
  let decoded
  try {
    decoded = await ctx.decodeAudioData(arrayBuf)
  } finally {
    ctx.close()
  }

  // Mix down to mono.
  const channels = decoded.numberOfChannels
  const len = decoded.length
  const mono = new Float32Array(len)
  for (let c = 0; c < channels; c++) {
    const data = decoded.getChannelData(c)
    for (let i = 0; i < len; i++) mono[i] += data[i] / channels
  }

  // Resample to 16 kHz (linear).
  const targetRate = 16000
  const ratio = decoded.sampleRate / targetRate
  const outLen = Math.max(1, Math.floor(len / ratio))
  const out = new Int16Array(outLen)
  for (let i = 0; i < outLen; i++) {
    const s = Math.max(-1, Math.min(1, mono[Math.floor(i * ratio)] || 0))
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return new Blob([out.buffer], { type: 'application/octet-stream' })
}
