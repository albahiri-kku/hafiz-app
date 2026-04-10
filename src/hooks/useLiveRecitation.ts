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
    intervalRef.current  = setInterval(sendChunk, SEND_INTERVAL_MS)
    setActive(true)
  }, [sendChunk])

  const stop = React.useCallback(() => {
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
