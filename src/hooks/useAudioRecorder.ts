import { useCallback, useRef, useState } from 'react'

function getMimeType(): string {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? ''
}

export type RecorderPhase = 'idle' | 'recording' | 'submitting'

interface Options {
  /** dB level below which is considered silence (default: -45) */
  silenceThresholdDb?: number
  /** Milliseconds of continuous silence before auto-submit (default: 5000) */
  silenceDurationMs?: number
  onChunkReady: (blob: Blob) => void
}

interface Refs {
  phase: RecorderPhase
  stream: MediaStream | null
  audioCtx: AudioContext | null
  analyser: AnalyserNode | null
  recorder: MediaRecorder | null
  chunks: Blob[]
  silenceStart: number | null
  animFrame: number
}

export function useContinuousRecorder({
  silenceThresholdDb = -45,
  silenceDurationMs = 5000,
  onChunkReady,
}: Options) {
  const [phase, setPhase]               = useState<RecorderPhase>('idle')
  const [audioLevel, setAudioLevel]     = useState(0)           // 0–1
  const [silenceCountdown, setSilenceCountdown] = useState(0)   // seconds remaining

  // All mutable I/O state in one ref to avoid stale closures in rAF loop
  const r = useRef<Refs>({
    phase: 'idle',
    stream: null,
    audioCtx: null,
    analyser: null,
    recorder: null,
    chunks: [],
    silenceStart: null,
    animFrame: 0,
  })

  // Always-fresh callback ref
  const onChunkReadyRef = useRef(onChunkReady)
  onChunkReadyRef.current = onChunkReady

  // ── Internal: submit current chunk ────────────────────────────────────────
  const submitChunk = useCallback(() => {
    cancelAnimationFrame(r.current.animFrame)
    r.current.silenceStart = null
    setSilenceCountdown(0)
    setAudioLevel(0)

    const rec = r.current.recorder
    if (!rec || rec.state === 'inactive') return

    rec.onstop = () => {
      const blob = new Blob(r.current.chunks, { type: rec.mimeType || 'audio/webm' })
      r.current.chunks = []
      r.current.phase = 'submitting'
      setPhase('submitting')
      onChunkReadyRef.current(blob)
    }
    rec.stop()
  }, [])

  // ── Internal: audio monitoring loop (rAF) ─────────────────────────────────
  const monitorRef = useRef<() => void>()
  monitorRef.current = () => {
    if (r.current.phase !== 'recording' || !r.current.analyser) return

    const buf = new Float32Array(r.current.analyser.fftSize)
    r.current.analyser.getFloatTimeDomainData(buf)
    const rms = Math.sqrt(buf.reduce((acc, v) => acc + v * v, 0) / buf.length)
    const db = 20 * Math.log10(Math.max(rms, 1e-7))

    // Map roughly -70 dB → 0, -20 dB → 1
    setAudioLevel(Math.max(0, Math.min(1, (db + 70) / 50)))

    if (db < silenceThresholdDb) {
      if (r.current.silenceStart === null) r.current.silenceStart = Date.now()
      const elapsed = Date.now() - r.current.silenceStart
      const remaining = Math.max(0, silenceDurationMs - elapsed)
      setSilenceCountdown(Math.ceil(remaining / 1000))
      if (elapsed >= silenceDurationMs) {
        submitChunk()
        return
      }
    } else {
      r.current.silenceStart = null
      setSilenceCountdown(0)
    }

    r.current.animFrame = requestAnimationFrame(() => monitorRef.current?.())
  }

  // ── Internal: start a fresh MediaRecorder on the existing stream ───────────
  const startRecorderChunk = useCallback(() => {
    if (!r.current.stream) return
    const mimeType = getMimeType()
    const rec = new MediaRecorder(r.current.stream, mimeType ? { mimeType } : undefined)
    r.current.chunks = []
    r.current.recorder = rec
    rec.ondataavailable = (e) => { if (e.data.size > 0) r.current.chunks.push(e.data) }
    rec.start(200)
    r.current.silenceStart = null
    setSilenceCountdown(0)
    r.current.phase = 'recording'
    setPhase('recording')
    r.current.animFrame = requestAnimationFrame(() => monitorRef.current?.())
  }, [])

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Acquire microphone and begin recording + silence detection. */
  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    const ctx = new AudioContext()
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 1024
    ctx.createMediaStreamSource(stream).connect(analyser)
    r.current.stream  = stream
    r.current.audioCtx = ctx
    r.current.analyser = analyser
    startRecorderChunk()
  }, [startRecorderChunk])

  /** Resume recording after a chunk has been evaluated (called by App.tsx). */
  const resume = useCallback(() => {
    if (r.current.phase !== 'submitting') return
    startRecorderChunk()
  }, [startRecorderChunk])

  /** Permanently stop recording and release microphone. */
  const stop = useCallback(() => {
    cancelAnimationFrame(r.current.animFrame)
    const rec = r.current.recorder
    if (rec && rec.state !== 'inactive') {
      rec.onstop = null   // prevent spurious callback
      rec.stop()
    }
    r.current.stream?.getTracks().forEach((t) => t.stop())
    r.current.audioCtx?.close()
    r.current.recorder = null
    r.current.stream   = null
    r.current.audioCtx = null
    r.current.analyser = null
    r.current.chunks   = []
    r.current.silenceStart = null
    r.current.phase = 'idle'
    setPhase('idle')
    setAudioLevel(0)
    setSilenceCountdown(0)
  }, [])

  return { phase, audioLevel, silenceCountdown, start, resume, stop }
}
