/**
 * HafizAudioProcessor — AudioWorkletProcessor
 * يعمل بالـ native sample rate (عادةً 48000Hz) ويُعيد التشفير إلى 16000Hz
 * قبل الإرسال — يتجنب التشويه الناتج عن إجبار AudioContext على 16000
 *
 * نوعان من الرسائل:
 *   { type: 'pcm', data: Float32Array }  — بيانات 16kHz كل CHUNK_16K عينة
 *   { type: 'word_end' }                 — إشارة نهاية كلمة (VAD)
 */
class HafizAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    // نسبة الـ downsampling: 48000/16000 = 3 (أو 44100/16000 ≈ 2.756)
    this._ratio     = sampleRate / 16000          // sampleRate = AudioWorkletGlobalScope global
    this._accumBuf  = []                          // عينات native قبل الـ downsampling
    this._outBuf    = []                          // عينات 16kHz بعد الـ downsampling
    this._CHUNK     = 4096                        // عدد العينات 16kHz في كل postMessage

    // VAD thresholds (تُطبَّق على إشارة الـ native rate قبل downsampling)
    this._SPEECH_THR              = 0.012
    this._SILENCE_THR             = 0.006
    this._inSpeech                = false
    this._silenceFrames           = 0
    this._SILENCE_FRAMES_NEEDED   = 20
    this._speechFrames            = 0
    this._MIN_SPEECH_FRAMES       = 3
    this._accumForResample        = 0.0
    this._accumCount              = 0
    this._resamplePhase           = 0.0
  }

  process(inputs) {
    const ch = inputs[0]?.[0]
    if (!ch) return true

    // ── VAD على الـ native frame ──────────────────────────────────────────
    let sum = 0
    for (let i = 0; i < ch.length; i++) sum += ch[i] * ch[i]
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

    // ── Downsampling بـ averaging (linear interpolation) ──────────────────
    // كل عينة في 16kHz = متوسط (ratio) عينة native
    for (let i = 0; i < ch.length; i++) {
      this._resamplePhase += 1
      this._accumForResample += ch[i]
      this._accumCount++

      if (this._resamplePhase >= this._ratio) {
        this._resamplePhase -= this._ratio
        this._outBuf.push(this._accumForResample / this._accumCount)
        this._accumForResample = 0
        this._accumCount = 0
      }
    }

    // أرسل كل CHUNK عينة 16kHz
    while (this._outBuf.length >= this._CHUNK) {
      const chunk = new Float32Array(this._outBuf.splice(0, this._CHUNK))
      this.port.postMessage({ type: 'pcm', data: chunk }, [chunk.buffer])
    }

    return true
  }
}

registerProcessor('hafiz-audio-processor', HafizAudioProcessor)
