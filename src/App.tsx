import { useState, useCallback, useEffect, useRef } from 'react'
import type {
  RecitationMode, AppPhase, AyahData, EvaluationResponse, SessionStats, AyahResult
} from './types/hafiz'
import { api } from './services/api'
import { useContinuousRecorder } from './hooks/useAudioRecorder'
import StartScreen from './components/StartScreen'
import Header from './components/Header'
import AyahDisplay from './components/AyahDisplay'
import MicButton from './components/MicButton'
import SessionSummary from './components/SessionSummary'

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

  // ─── Chunk evaluation callback ────────────────────────────────────────────
  function handleChunkReady(blob: Blob) {
    const sid  = sessionIdRef.current
    const ayah = ayahDataRef.current
    if (!sid || !ayah) { resume(); return }

    setEvalError(null)
    setCurrentWordIndex(-1)   // freeze word highlight during analysis

    api.evaluate(sid, blob)
      .then((evalResult) => {
        setResult(evalResult)

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

        if (action === 'ADVANCE') {
          // Brief green flash → load next ayah → resume recording
          const nextCode = evalResult.expected_next_ayah_code ?? ayah.next_ayah_code
          setTimeout(async () => {
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

  // ─── Render ───────────────────────────────────────────────────────────────
  if (phase === 'start') {
    return (
      <StartScreen
        onStart={handleStart}
        loading={startLoading}
        error={startError}
      />
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
