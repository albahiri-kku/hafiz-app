import * as React from 'react'

export interface WordResult {
  word_index: number
  expected:   string
  heard:      string
  correct:    boolean
  error_type: string | null
}

export interface StreamResponse {
  status:          'listening' | 'word_evaluated' | 'ayah_complete' | 'silence_detected' | 'session_ended'
  word_result:     WordResult | null
  word_results?:   WordResult[]        // جميع النتائج إذا انتهت أكثر من كلمة في drain واحد
  word_index:      number
  summary?:        Record<string, unknown>
  next_ayah_code?: string
}

interface Options {
  sessionId:  string
  apiBase:    string
  apiKey?:    string
  onResult:   (r: StreamResponse) => void
  onError?:   (err: Error) => void
}

export function useLiveRecitation({ sessionId, apiBase, apiKey, onResult, onError }: Options) {
  const [active, setActive] = React.useState(false)
  const intervalRef  = React.useRef<ReturnType<typeof setInterval> | null>(null)
  const pcmBufferRef = React.useRef<Float32Array>(new Float32Array(0))
  const streamRef    = React.useRef<MediaStream | null>(null)
  const audioCtxRef  = React.useRef<AudioContext | null>(null)
  const sendingRef   = React.useRef(false)
  const tokenRef     = React.useRef(0)

  const SEND_INTERVAL_MS  = 800
  const SAMPLES_PER_CHUNK = 12800

  const sendChunk = React.useCallback(async () => {
    if (sendingRef.current) return
    const buf = pcmBufferRef.current
    if (buf.length < SAMPLES_PER_CHUNK) return
    const chunk = buf.slice(0, SAMPLES_PER_CHUNK)
    pcmBufferRef.current = buf.slice(SAMPLES_PER_CHUNK)
    sendingRef.current = true
    try {
      const form = new FormData()
      form.append('session_id',  sessionId)
      form.append('encoding',    'f32le')
      form.append('sample_rate', '16000')
      form.append('audio_chunk', new Blob([chunk.buffer], { type: 'application/octet-stream' }))
      const headers: Record<string, string> = {}
      if (apiKey) headers['X-API-Key'] = apiKey
      const res = await fetch(`${apiBase}/api/v1/recitation/stream`, {
        method: 'POST', headers, body: form,
      })
      if (!res.ok) return
      const data: StreamResponse = await res.json()
      onResult(data)
    } catch (e) {
      onError?.(e instanceof Error ? e : new Error(String(e)))
    } finally {
      sendingRef.current = false
    }
  }, [sessionId, apiBase, apiKey, onResult, onError])

  // Ref so the interval always calls the latest sendChunk (picks up sessionId changes)
  const sendChunkRef = React.useRef(sendChunk)
  React.useEffect(() => { sendChunkRef.current = sendChunk }, [sendChunk])

  // fire-and-forget raw sender used for flush — no onResult/onError, no size check
  const sendChunkRaw = React.useCallback(async (samples: Float32Array) => {
    const form = new FormData()
    form.append('session_id',  sessionId)
    form.append('encoding',    'f32le')
    form.append('sample_rate', '16000')
    form.append('audio_chunk', new Blob([samples.buffer as ArrayBuffer], { type: 'application/octet-stream' }))
    const headers: Record<string, string> = {}
    if (apiKey) headers['X-API-Key'] = apiKey
    await fetch(`${apiBase}/api/v1/recitation/stream`, {
      method: 'POST', headers, body: form,
    }).catch(() => {})
  }, [sessionId, apiBase, apiKey])

  const sendChunkRawRef = React.useRef(sendChunkRaw)
  React.useEffect(() => { sendChunkRawRef.current = sendChunkRaw }, [sendChunkRaw])

  const start = React.useCallback(async () => {
    const token = ++tokenRef.current
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { noiseSuppression: true, echoCancellation: true, autoGainControl: true },
      video: false,
    })
    streamRef.current   = stream
    const ctx           = new AudioContext({ sampleRate: 16000 })
    audioCtxRef.current = ctx
    const source        = ctx.createMediaStreamSource(stream)
    const processor     = ctx.createScriptProcessor(4096, 1, 1)
    processor.onaudioprocess = (e) => {
      if (tokenRef.current !== token) return
      const samples = e.inputBuffer.getChannelData(0)
      const prev    = pcmBufferRef.current
      const next    = new Float32Array(prev.length + samples.length)
      next.set(prev)
      next.set(samples, prev.length)
      pcmBufferRef.current = next
    }
    source.connect(processor)
    processor.connect(ctx.destination)
    await new Promise(r => setTimeout(r, 500))
    pcmBufferRef.current = new Float32Array(0)
    // Use sendChunkRef.current() so interval always sees latest sessionId
    intervalRef.current  = setInterval(() => sendChunkRef.current(), SEND_INTERVAL_MS)
    setActive(true)
  }, [])

  const stop = React.useCallback(() => {
    // flush: أرسل ما تبقى في الـ buffer + chunk صمت لإغلاق VAD
    const flushAndSilence = async () => {
      const buf = pcmBufferRef.current
      // أرسل ما تبقى في الـ buffer إذا كان فيه صوت
      if (buf.length > 0) {
        await sendChunkRawRef.current(buf)
      }
      // أرسل 6 chunks صمت (6 × 800ms = 4.8s) لتصريف جميع الكلمات المتبقية
      // كل كلمة تحتاج chunk واحدة على الأقل لإطلاق REF_TIMEOUT
      const silence = new Float32Array(12800) // 800ms @ 16kHz
      for (let i = 0; i < 6; i++) {
        await sendChunkRawRef.current(silence)
      }
    }
    flushAndSilence().catch(() => {})

    tokenRef.current++
    if (intervalRef.current) clearInterval(intervalRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    audioCtxRef.current?.close()
    pcmBufferRef.current = new Float32Array(0)
    sendingRef.current   = false
    setActive(false)
  }, [])

  return { active, start, stop }
}
