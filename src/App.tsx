import { useState, useCallback, useEffect, useRef } from 'react'
import type {
  RecitationMode, AppPhase, AyahData, EvaluationResponse, SessionStats, AyahResult
} from './types/hafiz'
import { api } from './services/api'
import { useContinuousRecorder } from './hooks/useAudioRecorder'
import { useRecitationSession } from './hooks/useRecitationSession'
import StartScreen from './components/StartScreen'
import Header from './components/Header'
import AyahDisplay from './components/AyahDisplay'
import MicButton from './components/MicButton'
import SessionSummary from './components/SessionSummary'
import MushafPage from './components/MushafPage'

const EMPTY_STATS: SessionStats = {
  totalAyahs: 0, correct: 0, errors: 0, reviews: 0, holds: 0, history: [],
}

export default function App() {
  const [phase, setPhase]           = useState<AppPhase>('start')
  const [mode, setMode]             = useState<RecitationMode>('tilawa')
  const [ayahData, setAyahData]     = useState<AyahData | null>(null)
  const [result, setResult]         = useState<EvaluationResponse | null>(null)
  const [stats, setStats]           = useState<SessionStats>(EMPTY_STATS)
  const [startLoading, setStartLoading] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const [evalError, setEvalError]   = useState<string | null>(null)
  const [currentWordIndex, setCurrentWordIndex] = useState(-1)
  const [mushafPage, setMushafPage] = useState(1)

  // ─── Word-level tracking session (Mushaf viewer) ──────────────────────────
  const {
    trackingState: mushafTracking,
    startSession:  startTrackingSession,
    syncState:     syncTrackingState,
    endSession:    endTrackingSession,
  } = useRecitationSession()

  // Refs for use inside callbacks to avoid stale closures
  const sessionIdRef = useRef('')
  const ayahDataRef  = useRef<AyahData | null>(null)
  useEffect(() => { ayahDataRef.current = ayahData }, [ayahData])

  // ─── Continuous recorder ──────────────────────────────────────────────────
  const { phase: recordPhase, audioLevel, silenceCountdown, start, resume, stop } =
    useContinuousRecorder({
      silenceThresholdDb: -45,
      silenceDurationMs:  5000,
      onChunkReady: handleChunkReady,
    })

  // ─── Word highlight: advance every 700 ms while recording, no result yet ──
  useEffect(() => {
    if (recordPhase !== 'recording' || result || !ayahData) return
    if (currentWordIndex < 0) return
    if (currentWordIndex >= ayahData.words.length - 1) return
    const t = setTimeout(() => setCurrentWordIndex((i) => i + 1), 700)
    return () => clearTimeout(t)
  }, [recordPhase, currentWordIndex, result, ayahData])

  // ─── Replay word highlight at actual Whisper timing (max REPLAY_MAX_MS) ──
  const replayTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  function _clearReplayTimers() {
    replayTimersRef.current.forEach(clearTimeout)
    replayTimersRef.current = []
  }

  function _replayWordTimestamps(
    wts: NonNullable<EvaluationResponse['word_timestamps']>,
    wordCount: number,
    afterMs: number,
    onDone: () => void,
  ) {
    _clearReplayTimers()
    if (wts.length === 0) { onDone(); return }

    const REPLAY_MAX_MS = 1400
    const first = wts[0].start_sec
    const last  = wts[wts.length - 1].end_sec
    const span  = Math.max(last - first, 0.1)
    const scale = REPLAY_MAX_MS / span   // compress to fit in REPLAY_MAX_MS

    wts.forEach((wt, i) => {
      if (i >= wordCount) return   // don't index past reference words
      const delay = afterMs + (wt.start_sec - first) * scale
      replayTimersRef.current.push(
        setTimeout(() => setCurrentWordIndex(i), delay)
      )
    })

    const totalDelay = afterMs + REPLAY_MAX_MS + 80
    replayTimersRef.current.push(setTimeout(onDone, totalDelay))
  }

  // ─── Chunk evaluation callback ────────────────────────────────────────────
  function handleChunkReady(blob: Blob) {
    const sid  = sessionIdRef.current
    const ayah = ayahDataRef.current
    if (!sid || !ayah) { resume(); return }

    _clearReplayTimers()
    setEvalError(null)
    setCurrentWordIndex(-1)   // freeze word highlight during analysis

    api.evaluate(sid, blob)
      .then((evalResult) => {
        const action = evalResult.action ?? 'HOLD'
        setStats((prev) => ({
          ...prev,
          totalAyahs: prev.totalAyahs + 1,
          correct:  prev.correct  + (action === 'ADVANCE' ? 1 : 0),
          errors:   prev.errors   + (action === 'REPEAT'  ? 1 : 0),
          reviews:  prev.reviews  + (action === 'REVIEW'  ? 1 : 0),
          holds:    prev.holds    + (action === 'HOLD'    ? 1 : 0),
          history: [
            ...prev.history,
            {
              ayah_code:   ayah.ayah_code,
              surah:       ayah.surah,
              ayah:        ayah.ayah,
              final_label: evalResult.final_label ?? '',
              action,
              asr_text:    evalResult.asr_text ?? '',
              confidence:  evalResult.confidence ?? 0,
              word_errors: evalResult.word_errors ?? [],
            } satisfies AyahResult,
          ],
        }))

        // Replay word highlight at actual Whisper timing before showing verdict
        const wts = evalResult.word_timestamps
        const showVerdict = () => setResult(evalResult)

        if (wts && wts.length > 0 && ayah.words.length > 0) {
          _replayWordTimestamps(wts, ayah.words.length, 0, showVerdict)
        } else {
          showVerdict()
        }

        if (action === 'ADVANCE') {
          // Brief green flash → load next ayah → resume recording
          const nextCode = evalResult.expected_next_ayah_code ?? ayah.next_ayah_code
          setTimeout(async () => {
            _clearReplayTimers()
            if (!nextCode) {
              stop()
              setPhase('summary')
              return
            }
            try {
              const data = await api.getAyah(nextCode)
              ayahDataRef.current = data
              setAyahData(data)
              setResult(null)
              setCurrentWordIndex(0)
              resume()
            } catch (e) {
              setEvalError(e instanceof Error ? e.message : 'خطأ في تحميل الآية')
              resume()
            }
          }, 1500)
        } else {
          // REPEAT / REVIEW / HOLD — show inline error 3 s, then resume same ayah
          setTimeout(() => {
            _clearReplayTimers()
            setResult(null)
            setCurrentWordIndex(0)
            resume()
          }, 3000)
        }
      })
      .catch((e) => {
        setEvalError(e instanceof Error ? e.message : 'خطأ في التقييم')
        resume()
      })
  }

  // ─── Start session ────────────────────────────────────────────────────────
  const handleStart = useCallback(async (ayahCode: string | undefined, selectedMode: RecitationMode) => {
    setStartLoading(true)
    setStartError(null)
    setMode(selectedMode)
    try {
      const session = await api.startSession(ayahCode)
      sessionIdRef.current = session.session_id

      const startCode = session.ayah_code ?? ayahCode ?? '001001'
      const data = await api.getAyah(startCode)
      ayahDataRef.current = data
      setAyahData(data)
      setResult(null)
      setStats(EMPTY_STATS)
      setPhase('reciting')

      await start()
      setCurrentWordIndex(0)
    } catch (e) {
      setStartError(e instanceof Error ? e.message : 'حدث خطأ في بدء الجلسة')
    } finally {
      setStartLoading(false)
    }
  }, [start])

  // ─── End session ──────────────────────────────────────────────────────────
  const handleEndSession = useCallback(() => {
    stop()
    setPhase('summary')
  }, [stop])

  const handleRestart = useCallback(() => {
    stop()
    setPhase('start')
    setResult(null)
    setAyahData(null)
    sessionIdRef.current = ''
    ayahDataRef.current  = null
    setStats(EMPTY_STATS)
    setCurrentWordIndex(-1)
  }, [stop])

  // ─── Mushaf browse handlers ───────────────────────────────────────────────
  const handleBrowseMushaf = useCallback(async () => {
    setMushafPage(1)
    setPhase('mushaf_browse')
    try { await startTrackingSession(1) } catch { /* non-fatal */ }
  }, [startTrackingSession])

  const handleMushafBack = useCallback(async () => {
    try { await endTrackingSession() } catch { /* non-fatal */ }
    setPhase('start')
  }, [endTrackingSession])

  // ─── Render ───────────────────────────────────────────────────────────────
  if (phase === 'start') {
    return (
      <StartScreen
        onStart={handleStart}
        onBrowseMushaf={handleBrowseMushaf}
        loading={startLoading}
        error={startError}
      />
    )
  }

  if (phase === 'mushaf_browse') {
    return (
      <div className="min-h-screen bg-parchment-50 flex flex-col" dir="rtl">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-stone-200 sticky top-0 z-10">
          <button
            onClick={handleMushafBack}
            className="font-ui text-sm text-stone-600 hover:text-stone-800 transition-colors"
          >
            ← رجوع
          </button>
          <span className="font-ui text-sm font-semibold text-stone-700">المصحف الشريف</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMushafPage(p => Math.max(1, p - 1))}
              disabled={mushafPage <= 1}
              className="px-3 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 font-ui text-sm disabled:opacity-40 transition"
            >
              ‹
            </button>
            <span className="font-ui text-xs text-stone-500 min-w-[3rem] text-center">
              {mushafPage} / 604
            </span>
            <button
              onClick={() => setMushafPage(p => Math.min(604, p + 1))}
              disabled={mushafPage >= 604}
              className="px-3 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 font-ui text-sm disabled:opacity-40 transition"
            >
              ›
            </button>
          </div>
        </div>

        {/* Mushaf page */}
        <div className="flex-1 overflow-y-auto py-4 px-2">
          <MushafPage
            pageNumber={mushafPage}
            tracking={mushafTracking}
            onPageChange={(p) => {
              setMushafPage(p)
              syncTrackingState({ ...mushafTracking }).catch(() => {})
            }}
            onSessionStop={handleMushafBack}
          />
        </div>
      </div>
    )
  }

  if (phase === 'summary') {
    return <SessionSummary stats={stats} onRestart={handleRestart} />
  }

  return (
    <div className="min-h-screen bg-parchment-50 flex flex-col" dir="rtl">
      {ayahData && (
        <Header
          surah={ayahData.surah}
          ayah={ayahData.ayah}
          mode={mode}
          onModeChange={setMode}
          onEndSession={handleEndSession}
        />
      )}

      {/* Error notice */}
      {evalError && (
        <div className="mx-4 mt-3 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          <p className="font-ui text-xs text-red-600">{evalError}</p>
        </div>
      )}

      {/* Ayah display */}
      {ayahData ? (
        <AyahDisplay
          words={ayahData.words}
          mode={mode}
          result={result}
          isRecording={recordPhase === 'recording'}
          currentWordIndex={currentWordIndex}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="font-ui text-stone-400 text-sm animate-pulse">جارٍ التحميل…</div>
        </div>
      )}

      {/* Recording status strip */}
      <MicButton
        phase={recordPhase}
        audioLevel={audioLevel}
        silenceCountdown={silenceCountdown}
      />

      {/* Stats bar */}
      <div className="bg-white border-t border-stone-100 px-6 py-2 flex justify-around">
        <StatPill label="صحيح" value={stats.correct} color="text-emerald-600" />
        <StatPill label="خطأ" value={stats.errors} color="text-red-500" />
        <StatPill label="مراجعة" value={stats.reviews} color="text-amber-500" />
      </div>
    </div>
  )
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <p className={`font-ui font-bold text-base ${color}`}>{value}</p>
      <p className="font-ui text-xs text-stone-400">{label}</p>
    </div>
  )
}
