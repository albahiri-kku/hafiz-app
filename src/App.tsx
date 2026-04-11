import { useState, useCallback, useEffect, useRef } from 'react'
import type {
  RecitationMode, AppPhase, AyahData, EvaluationResponse, SessionStats
} from './types/hafiz'
import { api } from './services/api'
import { useLiveRecitation } from './hooks/useLiveRecitation'
import type { StreamResponse } from './hooks/useLiveRecitation'
import { useRecitationSession } from './hooks/useRecitationSession'
import StartScreen from './components/StartScreen'
import Header from './components/Header'
import AyahDisplay from './components/AyahDisplay'
import MicButton from './components/MicButton'
import SessionSummary from './components/SessionSummary'
import MushafPage from './components/MushafPage'

const API_BASE = import.meta.env.VITE_API_URL ?? ''
const API_KEY  = import.meta.env.VITE_API_KEY  ?? ''

const EMPTY_STATS: SessionStats = {
  totalAyahs: 0, correct: 0, errors: 0, reviews: 0, holds: 0, history: [],
}

export default function App() {
  const [phase, setPhase]           = useState<AppPhase>('start')
  const [mode, setMode]             = useState<RecitationMode>('tilawa')
  const [sessionId, setSessionId]   = useState('')
  const [ayahData, setAyahData]     = useState<AyahData | null>(null)
  const [result, setResult]         = useState<EvaluationResponse | null>(null)
  const [stats, setStats]           = useState<SessionStats>(EMPTY_STATS)
  const [startLoading, setStartLoading] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const [evalError, setEvalError]   = useState<string | null>(null)
  const [currentWordIndex, setCurrentWordIndex] = useState(-1)
  const [mushafPage, setMushafPage] = useState(1)
  const [wordErrors, setWordErrors] = useState<Array<{expected: string, heard: string, error_type: string | null}>>([])
  const [wordColorMap, setWordColorMap] = useState<Record<number, 'correct' | 'error' | 'unheard'>>({})


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

  // Word correctness tracking (per-ayah, reset on advance)
  const correctWordsRef = useRef<Set<string>>(new Set())
  const wrongWordsRef   = useRef<Set<string>>(new Set())

  // ─── Stream result handler ref — populated after liveStop is available ────
  const streamResultRef = useRef<(r: StreamResponse) => void>(() => {})

  // ─── Live recitation hook ─────────────────────────────────────────────────
  const { active, start: liveStart, stop: liveStop } = useLiveRecitation({
    sessionId,
    apiBase: API_BASE,
    apiKey:  API_KEY || undefined,
    onResult: (r: StreamResponse) => streamResultRef.current(r),
    onError:  (err: Error) => setEvalError(err.message),
  })

  // Wire the actual handler every render — captures latest liveStop / ayahDataRef
  streamResultRef.current = (r: StreamResponse) => {
    if (r.status === 'word_evaluated') {
      // استخدم word_results (الكل) إذا توفر، وإلا word_result (الأخير فقط)
      const allWords = (r.word_results && r.word_results.length > 0)
        ? r.word_results
        : r.word_result ? [r.word_result] : []
      for (const wr of allWords) {
        const wordLoc = ayahDataRef.current?.words[wr.word_index]?.word_location
                        ?? String(wr.word_index)
        if (wr.correct) {
          correctWordsRef.current.add(wordLoc)
          setStats((prev) => ({ ...prev, correct: prev.correct + 1 }))
          setWordColorMap((prev) => ({ ...prev, [wr.word_index]: 'correct' }))
        } else {
          wrongWordsRef.current.add(wordLoc)
          setStats((prev) => ({ ...prev, errors: prev.errors + 1 }))
          setWordErrors((prev) => [...prev, { expected: wr.expected, heard: wr.heard ?? '—', error_type: wr.error_type }])
          const _color = (wr.error_type === 'ASR_FAILED' || !wr.heard) ? 'unheard' as const : 'error' as const
          setWordColorMap((prev) => ({ ...prev, [wr.word_index]: _color }))
        }
        setCurrentWordIndex(wr.word_index)
      }

    } else if (r.status === 'ayah_complete') {
      const nextCode = r.next_ayah_code
      if (!nextCode) {
        liveStop()
        setPhase('summary')
        return
      }
      api.getAyah(nextCode)
        .then((data) => {
          correctWordsRef.current = new Set()
          wrongWordsRef.current   = new Set()
          ayahDataRef.current     = data
          setAyahData(data)
          setResult(null)
          setCurrentWordIndex(0)
          setWordColorMap({})
        })
        .catch((e) => setEvalError(e instanceof Error ? e.message : 'خطأ في تحميل الآية'))

    } else if (r.status === 'session_ended') {
      liveStop()
      setPhase('summary')
    }
  }

  // ─── Start session ────────────────────────────────────────────────────────
  const handleStart = useCallback(async (ayahCode: string | undefined, selectedMode: RecitationMode) => {
    setStartLoading(true)
    setStartError(null)
    setMode(selectedMode)
    try {
      const session = await api.startSession(ayahCode)
      sessionIdRef.current = session.session_id
      setSessionId(session.session_id)

      const startCode = session.ayah_code ?? ayahCode ?? '001001'
      const data = await api.getAyah(startCode)
      ayahDataRef.current     = data
      correctWordsRef.current = new Set()
      wrongWordsRef.current   = new Set()
      setAyahData(data)
      setResult(null)
      setStats(EMPTY_STATS)
      setWordErrors([])
      setWordColorMap({})
      setPhase('reciting')

      await liveStart()
      setCurrentWordIndex(0)
    } catch (e) {
      setStartError(e instanceof Error ? e.message : 'حدث خطأ في بدء الجلسة')
    } finally {
      setStartLoading(false)
    }
  }, [liveStart])

  // ─── End session ──────────────────────────────────────────────────────────
  const handleEndSession = useCallback(() => {
    liveStop()
    setPhase('summary')
  }, [liveStop])

  const handleRestart = useCallback(() => {
    liveStop()
    setPhase('start')
    setResult(null)
    setAyahData(null)
    sessionIdRef.current    = ''
    ayahDataRef.current     = null
    correctWordsRef.current = new Set()
    wrongWordsRef.current   = new Set()
    setSessionId('')
    setStats(EMPTY_STATS)
    setWordErrors([])
    setWordColorMap({})
    setCurrentWordIndex(-1)
  }, [liveStop])

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
    return <SessionSummary stats={stats} wordErrors={wordErrors} onRestart={handleRestart} />
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
          isRecording={active}
          currentWordIndex={currentWordIndex}
          wordColorMap={wordColorMap}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="font-ui text-stone-400 text-sm animate-pulse">جارٍ التحميل…</div>
        </div>
      )}

      {/* Recording status strip */}
      <MicButton
        phase={active ? 'recording' : 'idle'}
        audioLevel={0}
        silenceCountdown={0}
      />

      {/* End session button */}
      <div className="flex justify-center pb-1">
        <button
          onClick={handleEndSession}
          className="font-ui text-sm text-stone-500 hover:text-red-500 transition-colors px-4 py-2"
        >
          إنهاء الجلسة ←
        </button>
      </div>

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
