/**
 * HafizAudioProcessor — AudioWorkletProcessor
 * VAD event-driven: يكتشف نهاية الكلمة (صمت بعد صوت) ويُرسل postMessage
 * نوعان من الرسائل:
 *   { type: 'pcm', data: Float32Array }  — بيانات صوتية كل 4096 عينة
 *   { type: 'word_end' }                 — إشارة نهاية كلمة
 */
class HafizAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this._buf = []
    this._CHUNK = 4096
    this._SPEECH_THR = 0.012
    this._SILENCE_THR = 0.006
    this._inSpeech = false
    this._silenceFrames = 0
    this._SILENCE_FRAMES_NEEDED = 20
    this._speechFrames = 0
    this._MIN_SPEECH_FRAMES = 3
  }

  process(inputs) {
    const ch = inputs[0]?.[0]
    if (!ch) return true

    let sum = 0
    for (let i = 0; i < ch.length; i++) {
      this._buf.push(ch[i])
      sum += ch[i] * ch[i]
    }
    const rms = Math.sqrt(sum / ch.length)

    if (rms > this._SPEECH_THR) {
      this._inSpeech = true
      this._silenceFrames = 0
      this._speechFrames++
    } else if (this._inSpeech && rms < this._SILENCE_THR) {
      this._silenceFrames++
      if (this._silenceFrames >= this._SILENCE_FRAMES_NEEDED &&
          this._speechFrames >= this._MIN_SPEECH_FRAMES) {
        this._inSpeech = false
        this._silenceFrames = 0
        this._speechFrames = 0
        this.port.postMessage({ type: 'word_end' })
      }
    } else {
      if (!this._inSpeech) this._silenceFrames = 0
    }

    while (this._buf.length >= this._CHUNK) {
      const chunk = new Float32Array(this._buf.splice(0, this._CHUNK))
      this.port.postMessage({ type: 'pcm', data: chunk }, [chunk.buffer])
    }

    return true
  }
}

registerProcessor('hafiz-audio-processor', HafizAudioProcessor)
