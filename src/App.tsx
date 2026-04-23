/**
 * App.final.tsx — DROP-IN REPLACEMENT for hafiz-app/src/App.tsx
 *
 * Changes vs. the existing App.tsx (surgical additions only):
 *   1. New imports:         LoginScreen, MyAccount, AccountChip
 *   2. New local type:      Phase = AppPhase | 'login' | 'account'
 *   3. PHASE_TO_PATH map:   two new keys (login, account)
 *   4. pathToPhase():       two new path matches
 *   5. Render logic:        two new early returns + AccountChip on landing
 *
 * Everything else is byte-identical to the existing App.tsx.
 * All existing behaviour preserved (phases, history, refs, hooks, handlers).
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import type {
  RecitationMode, AppPhase, AyahData, EvaluationResponse, SessionStats, HeardEntry,
  EvaluateFileResponse,
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
import UploadScreen from './components/UploadScreen'
import ReportScreen from './components/ReportScreen'
import LandingPage from './pages/LandingPage'
// NEW: institutional layer UI
import LoginScreen from './components/LoginScreen'
import MyAccount from './components/MyAccount'
import AccountChip from './components/AccountChip'

const API_BASE = import.meta.env.VITE_API_URL ?? ''
const API_KEY  = import.meta.env.VITE_API_KEY  ?? ''

const EMPTY_STATS: SessionStats = {
  totalAyahs: 0, correct: 0, errors: 0, reviews: 0, holds: 0, history: [],
}

// NEW: locally extend AppPhase with the two institutional screens
// (no change to types/hafiz.ts required)
type Phase = AppPhase | 'login' | 'account'

// ─── URL ↔ phase mapping ────────────────────────────────────────────────────
const PHASE_TO_PATH: Record<Phase, string> = {
  landing: '/',
  upload: '/recite',
  evaluating: '/recite',
  report: '/report',
  start: '/app',
  reciting: '/app',
  summary: '/app',
  mushaf_browse: '/mushaf',
  login: '/login',        // NEW
  account: '/account',    // NEW
}

function pathToPhase(pathname: string, search: string): Phase {
  // Back-compat with legacy ?upload=1 / ?app=1 query params
  const params = new URLSearchParams(search)
  if (params.get('upload') === '1') return 'upload'
  if (params.get('app') === '1') return 'start'
  const p = pathname.replace(/\/+$/, '') || '/'
  if (p === '/recite')  return 'upload'
  if (p === '/report')  return 'report'
  if (p === '/app')     return 'start'
  if (p === '/mushaf')  return 'mushaf_browse'
  if (p === '/login')   return 'login'     // NEW
  if (p === '/account') return 'account'   // NEW
  return 'landing'
}

export default function App() {
  const _initialPhase: Phase = (() => {
    if (typeof window === 'undefined') return 'landing'
    return pathToPhase(window.location.pathname, window.location.search)
  })()
  const [phase, setPhase]           = useState<Phase>(_initialPhase)

  // Sync URL ↔ phase (pushState on phase change, popstate on back/forward)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const target = PHASE_TO_PATH[phase] ?? '/'
    if (window.location.pathname !== target) {
      window.history.pushState({ phase }, '', target)
    }
  }, [phase])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onPop = () => {
      setPhase(pathToPhase(window.location.pathname, window.location.search))
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

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
  // ─── evaluate-file state ──────────────────────────────────────────────
  const [fileReport, setFileReport]       = useState<EvaluateFileResponse | null>(null)
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string | null>(null)
  const [fileUploadError, setFileUploadError] = useState<string | null>(null)
  const [fileLoading, setFileLoading]     = useState(false)
  const [fileSurah, setFileSurah]         = useState(1)
  const [fileAyahStart, setFileAyahStart] = useState(1)
  const [fileAyahEnd, setFileAyahEnd]     = useState(1)
  const [wordErrors, setWordErrors] = useState<Array<{expected: string, heard: string, error_type: string | null}>>([])
  const [wordColorMap, setWordColorMap] = useState<Record<number, 'correct' | 'error' | 'unheard'>>({})
  const [waitingForEval, setWaitingForEval] = useState(false)
  const [heardLog, setHeardLog] = useState<HeardEntry[]>([])
  const heardLogRef   = useRef<HeardEntry[]>([])
  const sessionStartRef = useRef<number>(0)
  const waitingForEvalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ─── Word-level tracking session (Mushaf viewer) ──────────────────────
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

  // ─── Stream result handler ref — populated after liveStop is available ──
  const streamResultRef = useRef<(r: StreamResponse) => void>(() => {})

  // ─── Live recitation hook ──────────────────────────────────────────────
  const { active, start: liveStart, stop: liveStop, pauseSending: livePauseSending } = useLiveRecitation({
    sessionId,
    apiBase: API_BASE,
    apiKey:  API_KEY || undefined,
    onResult: (r: StreamResponse) => streamResultRef.current(r),
    onError:  (err: Error) => setEvalError(err.message),
  })

  // Wire the actual handler every render — captures latest liveStop / ayahDataRef
  streamResultRef.current = (r: StreamResponse) => {
    if (r.status === 'word_evaluated') {
      const allWords = (r.word_results && r.word_results.length > 0)
        ? r.word_results
        : r.word_result ? [r.word_result] : []
      for (const wr of allWords) {
        const elapsed_sec = (Date.now() - sessionStartRef.current) / 1000
        const entry: HeardEntry = {
          word_index:  wr.word_index,
          expected:    wr.expected,
          heard:       wr.heard ?? '',
          correct:     wr.correct,
          error_type:  wr.error_type,
          elapsed_sec: Math.round(elapsed_sec * 10) / 10,
        }
        heardLogRef.current = [...heardLogRef.current, entry]
        setHeardLog(heardLogRef.current)
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
        const totalWords = ayahDataRef.current?.words.length ?? 0
        if (totalWords > 0 && wr.word_index >= totalWords - 1) {
          setWaitingForEval(true)
          if (waitingForEvalTimerRef.current) clearTimeout(waitingForEvalTimerRef.current)
          waitingForEvalTimerRef.current = setTimeout(() => setWaitingForEval(false), 10_000)
        }
      }

    } else if (r.status === 'ayah_complete') {
      const nextCode = r.next_ayah_code
      setStats(prev => ({ ...prev, totalAyahs: prev.totalAyahs + 1 }))
      if (!nextCode) {
        liveStop()
        setPhase('summary')
        return
      }
      livePauseSending(600)
      if (waitingForEvalTimerRef.current) clearTimeout(waitingForEvalTimerRef.current)
      setWaitingForEval(false)
      api.getAyah(nextCode)
        .then((data) => {
          correctWordsRef.current = new Set()
          wrongWordsRef.current   = new Set()
          ayahDataRef.current     = data
          setAyahData(data)
          setResult(null)
          setCurrentWordIndex(-1)
          setWordColorMap({})
        })
        .catch((e) => setEvalError(e instanceof Error ? e.message : 'خطأ في تحميل الآية'))

    } else if (r.status === 'session_ended') {
      if (waitingForEvalTimerRef.current) clearTimeout(waitingForEvalTimerRef.current)
      setWaitingForEval(false)
      liveStop()
      setPhase('summary')
    }
  }

  // ─── Start session ────────────────────────────────────────────────────
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
      heardLogRef.current = []
      setHeardLog([])
      sessionStartRef.current = Date.now()
      setPhase('reciting')

      await liveStart()
      setCurrentWordIndex(0)
    } catch (e) {
      setStartError(e instanceof Error ? e.message : 'حدث خطأ في بدء الجلسة')
    } finally {
      setStartLoading(false)
    }
  }, [liveStart])

  // ─── End session ──────────────────────────────────────────────────────
  const handleEndSession = useCallback(() => {
    liveStop()
    setPhase('summary')
  }, [liveStop])

  const handleRestart = useCallback(() => {
    if (waitingForEvalTimerRef.current) clearTimeout(waitingForEvalTimerRef.current)
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
    heardLogRef.current = []
    setHeardLog([])
    setCurrentWordIndex(-1)
    setWaitingForEval(false)
  }, [liveStop])

  // ─── evaluate-file handlers ──────────────────────────────────────────
  const handleUploadFile = useCallback(() => {
    setFileUploadError(null)
    setFileReport(null)
    setPhase('upload')
  }, [])

  const handleEvaluateFile = useCallback(async (
    file: File, surah: number, start: number, end: number, autoDetect: boolean = false,
  ) => {
    setFileLoading(true)
    setFileUploadError(null)
    setFileSurah(surah)
    setFileAyahStart(start)
    setFileAyahEnd(end)
    setPhase('evaluating')
    if (uploadedAudioUrl) URL.revokeObjectURL(uploadedAudioUrl)
    setUploadedAudioUrl(URL.createObjectURL(file))
    try {
      const report = await api.evaluateFile(
        file,
        autoDetect ? null : surah,
        autoDetect ? null : start,
        autoDetect ? null : end,
        autoDetect,
      )
      if (autoDetect && report.surah_number && report.ayah_start && report.ayah_end) {
        setFileSurah(report.surah_number)
        setFileAyahStart(report.ayah_start)
        setFileAyahEnd(report.ayah_end)
      }
      setFileReport(report)
      setPhase('report')
    } catch (e) {
      console.error('[hafiz] evaluateFile error:', e)
      setFileUploadError(e instanceof Error ? e.message : 'حدث خطأ أثناء التقييم')
      setPhase('upload')
    } finally {
      setFileLoading(false)
    }
  }, [uploadedAudioUrl])

  // ─── Mushaf browse handlers ──────────────────────────────────────────
  const handleBrowseMushaf = useCallback(async () => {
    setMushafPage(1)
    setPhase('mushaf_browse')
    try { await startTrackingSession(1) } catch { /* non-fatal */ }
  }, [startTrackingSession])

  const handleMushafBack = useCallback(async () => {
    try { await endTrackingSession() } catch { /* non-fatal */ }
    setPhase('start')
  }, [endTrackingSession])

  // ─── Render ──────────────────────────────────────────────────────────

  // NEW: institutional screens — early returns BEFORE legacy landing
  if (phase === 'login') {
    return (
      <LoginScreen
        onAuthenticated={() => setPhase('account')}
        onBack={() => setPhase('landing')}
      />
    )
  }

  if (phase === 'account') {
    return (
      <MyAccount
        onLogout={() => setPhase('landing')}
      />
    )
  }

  if (phase === 'landing') {
    return (
      <>
        <AccountChip
          onNavigate={(path) => {
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', path)
            }
            setPhase(pathToPhase(path, ''))
          }}
        />
        <LandingPage
          onStart={() => setPhase('upload')}
          onSignIn={() => setPhase('login')}
        />
      </>
    )
  }

  if (phase === 'start') {
    return (
      <StartScreen
        onStart={handleStart}
        onBrowseMushaf={handleBrowseMushaf}
        onUploadFile={handleUploadFile}
        loading={startLoading}
        error={startError}
      />
    )
  }

  if (phase === 'upload') {
    return (
      <UploadScreen
        onEvaluate={handleEvaluateFile}
        onBack={() => setPhase('landing')}
        loading={fileLoading}
        error={fileUploadError}
      />
    )
  }

  if (phase === 'evaluating') {
    return (
      <div className="min-h-screen bg-parchment-50 flex flex-col items-center justify-center" dir="rtl">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin mx-auto" />
          <p className="font-ui text-stone-600 font-medium">جارٍ تقييم التلاوة…</p>
          <p className="font-ui text-xs text-stone-400">قد يستغرق حتى 30 ثانية</p>
        </div>
      </div>
    )
  }

  if (phase === 'report') {
    if (!fileReport) {
      return (
        <UploadScreen
          onEvaluate={handleEvaluateFile}
          onBack={() => setPhase('start')}
          loading={false}
          error="حدث خطأ في عرض التقرير — يرجى المحاولة مجدداً"
        />
      )
    }
    return (
      <ReportScreen
        report={fileReport}
        surah={fileSurah}
        ayahStart={fileAyahStart}
        ayahEnd={fileAyahEnd}
        audioUrl={uploadedAudioUrl}
        onUploadAnother={() => {
          setFileReport(null)
          setFileUploadError(null)
          setPhase('upload')
        }}
        onHome={() => setPhase('landing')}
      />
    )
  }

  if (phase === 'mushaf_browse') {
    return (
      <div className="min-h-screen bg-parchment-50 flex flex-col" dir="rtl">
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
    return <SessionSummary stats={stats} wordErrors={wordErrors} heardLog={heardLogRef.current} onRestart={handleRestart} />
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

      {evalError && (
        <div className="mx-4 mt-3 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          <p className="font-ui text-xs text-red-600">{evalError}</p>
        </div>
      )}

      {ayahData ? (
        <AyahDisplay
          words={ayahData.words}
          mode={mode}
          result={result}
          isRecording={active}
          currentWordIndex={currentWordIndex}
          wordColorMap={wordColorMap}
          heardLog={heardLog}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="font-ui text-stone-400 text-sm animate-pulse">جارٍ التحميل…</div>
        </div>
      )}

      {waitingForEval && (
        <div className="mx-4 mb-1 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
          <p className="font-ui text-xs text-amber-700">جارٍ التقييم… استعد للآية التالية</p>
        </div>
      )}

      <MicButton
        phase={active ? 'recording' : 'idle'}
        audioLevel={0}
        silenceCountdown={0}
      />

      <div className="flex justify-center pb-1">
        <button
          onClick={handleEndSession}
          className="font-ui text-sm text-stone-500 hover:text-red-500 transition-colors px-4 py-2"
        >
          إنهاء الجلسة ←
        </button>
      </div>

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
