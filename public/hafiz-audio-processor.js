/**
 * HafizAudioProcessor — AudioWorkletProcessor
 * يجمع Float32 samples من الميكروفون ويُرسلها بـ postMessage
 * كل 4096 عينة (~256ms @ 16kHz) لتقليل عدد الرسائل
 */
class HafizAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this._buf = []
    this._CHUNK = 4096
  }

  process(inputs) {
    const ch = inputs[0]?.[0]
    if (!ch) return true

    for (let i = 0; i < ch.length; i++) {
      this._buf.push(ch[i])
    }

    while (this._buf.length >= this._CHUNK) {
      const chunk = new Float32Array(this._buf.splice(0, this._CHUNK))
      this.port.postMessage(chunk, [chunk.buffer])
    }

    return true // أبقِ الـ processor حياً
  }
}

registerProcessor('hafiz-audio-processor', HafizAudioProcessor)
