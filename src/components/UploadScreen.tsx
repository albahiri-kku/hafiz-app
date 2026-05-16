import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { SURAH_NAMES } from '../types/hafiz'
import MushafPage from './MushafPage'
import type { TrackingState } from './MushafPage/types'
import '../pages/LandingPage.css'

const _API_BASE = import.meta.env.VITE_API_URL ?? ''
const _API_KEY  = import.meta.env.VITE_API_KEY  ?? ''
const EMPTY_TRACKING: TrackingState = {
  current_word_key:   null,
  error_word_keys:    [],
  active_ayah_words:  [],
}

// Strip diacritics + normalise alif/ya/ta variants so search matches typed letters
// regardless of harakat or hamza form.
function normArabic(s: string): string {
  return s
    .replace(/[ً-ْٰـ]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .trim()
}

const SURAH_LIST: { n: number; name: string; norm: string }[] =
  Array.from({ length: 114 }, (_, i) => i + 1).map((n) => {
    const name = SURAH_NAMES[n]
    return { n, name, norm: normArabic(name) }
  })

function filterSurahs(query: string) {
  const q = query.trim()
  if (!q) return SURAH_LIST
  if (/^\d+$/.test(q)) {
    return SURAH_LIST.filter((s) => String(s.n).startsWith(q))
  }
  const nq = normArabic(q)
  if (!nq) return SURAH_LIST
  const prefix = SURAH_LIST.filter((s) => s.norm.startsWith(nq))
  const others = SURAH_LIST.filter((s) => !s.norm.startsWith(nq) && s.norm.includes(nq))
  return [...prefix, ...others]
}

const SURAH_LENGTHS: Record<number, number> = {
  1:7,2:286,3:200,4:176,5:120,6:165,7:206,8:75,9:129,10:109,
  11:123,12:111,13:43,14:52,15:99,16:128,17:111,18:110,19:98,20:135,
  21:112,22:78,23:118,24:64,25:77,26:227,27:93,28:88,29:69,30:60,
  31:34,32:30,33:73,34:54,35:45,36:83,37:182,38:88,39:75,40:85,
  41:54,42:53,43:89,44:59,45:37,46:35,47:38,48:29,49:18,50:45,
  51:60,52:49,53:62,54:55,55:78,56:96,57:29,58:22,59:24,60:13,
  61:14,62:11,63:11,64:18,65:12,66:12,67:30,68:52,69:52,70:44,
  71:28,72:28,73:20,74:56,75:40,76:31,77:50,78:40,79:46,80:42,
  81:29,82:19,83:36,84:25,85:22,86:17,87:19,88:26,89:30,90:20,
  91:15,92:21,93:11,94:8,95:8,96:19,97:5,98:8,99:8,100:11,
  101:11,102:8,103:3,104:9,105:5,106:4,107:7,108:3,109:6,110:3,
  111:5,112:4,113:5,114:6,
}

interface Props {
  onEvaluate: (file: File, surah: number, start: number, end: number, autoDetect: boolean) => void
  onBack: () => void
  loading: boolean
  error: string | null
}

type Mode = 'upload' | 'record'

export default function UploadScreen({ onEvaluate, onBack, loading, error }: Props) {
  const [mode, setMode] = useState<Mode>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [surah, setSurah] = useState(1)
  const [ayahStart, setAyahStart] = useState(1)
  const [ayahEnd, setAyahEnd] = useState(1)
  const [autoDetect, setAutoDetect] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const [recording, setRecording] = useState(false)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [recordError, setRecordError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)

  // Mushaf overlay (live-record companion)
  const [mushafOpen, setMushafOpen] = useState(false)
  const [mushafPage, setMushafPage] = useState<number | null>(null)
  const [mushafLoading, setMushafLoading] = useState(false)
  const [mushafError, setMushafError] = useState<string | null>(null)

  const maxAyah = SURAH_LENGTHS[surah] ?? 1
  const MAX_RECORD_SEC = 300

  // Warm up Modal as soon as the user enters live-record mode — the API has
  // scale-to-zero so the first cold request can take 30+ s. A cheap GET on
  // /mushaf/stats wakes the worker so subsequent calls (page lookup + page
  // fetch) hit a warm container and complete in <1 s.
  useEffect(() => {
    if (mode !== 'record') return
    fetch(`${_API_BASE}/mushaf/stats`, {
      headers: _API_KEY ? { 'X-API-Key': _API_KEY } : {},
    }).catch(() => { /* warm-up is best-effort */ })
  }, [mode])

  // Resolve (surah, ayahStart) → mushaf page when overlay is open or about to open.
  // The same page-state is the hook Phase 2 will use to auto-advance pages
  // when live tracking detects the reciter finished the last word on the page.
  // Single retry to absorb a Modal cold start that races with the warm-up ping.
  useEffect(() => {
    if (!mushafOpen) return
    let cancelled = false
    setMushafLoading(true)
    setMushafError(null)
    const fetchPage = (attempt = 1): Promise<{ page_number: number }> =>
      fetch(`${_API_BASE}/mushaf/ayah/${surah}/${ayahStart}`, {
        headers: _API_KEY ? { 'X-API-Key': _API_KEY } : {},
      }).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<{ page_number: number }>
      }).catch((err) => {
        if (attempt >= 2) throw err
        return new Promise<{ page_number: number }>((resolve, reject) =>
          setTimeout(() => fetchPage(attempt + 1).then(resolve).catch(reject), 1000)
        )
      })
    fetchPage()
      .then((data) => {
        if (cancelled) return
        setMushafPage(data.page_number)
        setMushafLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setMushafError(err?.message || 'تعذّر تحديد الصفحة')
        setMushafLoading(false)
      })
    return () => { cancelled = true }
  }, [mushafOpen, surah, ayahStart])

  function openMushaf() {
    if (autoDetect) return
    setMushafOpen(true)
  }
  function closeMushaf() {
    setMushafOpen(false)
  }
  function gotoPage(p: number) {
    if (p < 1 || p > 604) return
    setMushafPage(p)
  }

  function handleSurahChange(v: number) {
    setSurah(v); setAyahStart(1); setAyahEnd(1)
  }
  function handleStartChange(v: number) {
    const clamped = Math.min(maxAyah, Math.max(1, v))
    setAyahStart(clamped)
    if (ayahEnd < clamped) setAyahEnd(clamped)
  }
  function handleEndChange(v: number) {
    setAyahEnd(Math.min(maxAyah, Math.max(ayahStart, v)))
  }

  const acceptFile = useCallback((f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
    if (!['wav', 'mp3', 'm4a', 'mp4', 'ogg', 'opus', 'webm', 'aac'].includes(ext)) return
    if (f.size > 25 * 1024 * 1024) return
    if (f.size < 50 * 1024) return
    setFile(f)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) acceptFile(f)
  }, [acceptFile])

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) acceptFile(f)
  }

  const pickMimeType = (): string => {
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
    for (const c of candidates) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c)) return c
    }
    return ''
  }

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current); timerRef.current = null
    }
  }

  const startRecording = async () => {
    setRecordError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      })
      streamRef.current = stream
      const mimeType = pickMimeType()
      const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      mediaRecorderRef.current = mr
      chunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        const type = mr.mimeType || 'audio/webm'
        const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm'
        const blob = new Blob(chunksRef.current, { type })
        if (blob.size < 50 * 1024) {
          setRecordError('التسجيل قصير جداً — أعد المحاولة')
        } else if (blob.size > 25 * 1024 * 1024) {
          setRecordError('التسجيل يتجاوز 25 MB')
        } else {
          const recFile = new File([blob], `recitation-${Date.now()}.${ext}`, { type })
          setFile(recFile)
          if (previewUrl) URL.revokeObjectURL(previewUrl)
          setPreviewUrl(URL.createObjectURL(blob))
        }
        stopStream()
      }
      mr.start()
      setRecording(true)
      setElapsedSec(0)
      timerRef.current = window.setInterval(() => {
        setElapsedSec((s) => {
          const next = s + 1
          if (next >= MAX_RECORD_SEC && mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop()
          }
          return next
        })
      }, 1000)
    } catch (err: any) {
      setRecordError(err?.name === 'NotAllowedError'
        ? 'لم يُسمح بالوصول إلى الميكروفون'
        : 'تعذّر بدء التسجيل — تأكد من اتصال الميكروفون')
      stopStream()
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop()
    setRecording(false)
  }

  const discardRecording = () => {
    setFile(null)
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null) }
    setElapsedSec(0)
    setRecordError(null)
  }

  useEffect(() => () => {
    stopStream()
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const prev = document.body.style.background
    document.body.style.background = '#0B1410'
    return () => { document.body.style.background = prev }
  }, [])

  const switchMode = (m: Mode) => {
    if (recording) return
    if (m !== mode) {
      setFile(null)
      if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null) }
      setElapsedSec(0)
      setRecordError(null)
      if (inputRef.current) inputRef.current.value = ''
    }
    setMode(m)
  }

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const ayahCount = ayahEnd - ayahStart + 1
  const estimatedWords = ayahCount * 10
  const wordLimitWarning = !autoDetect && estimatedWords > 150
  const canSubmit = file !== null && !loading && !wordLimitWarning && !recording

  return (
    <div className="hafiz-landing">
      <section className="recite-upload">
        <div className="ru-container">
          <div className="ru-head">
            <div className="t-eyebrow">جَلْسَة تَقْيِيم</div>
            <h1 className="ru-title t-display">قَيِّم تِلاوَتَك</h1>
            <p className="ru-sub">
              ارفع ملفاً صوتياً لتلاوتك أو سجِّل مباشرةً، وسيُحلّلها حافِظ ويُقدّم تقييماً تفصيلياً للتجويد والمخارج.
            </p>
          </div>

          <div className="ru-card">
            {/* Mode tabs */}
            <div className="ru-tabs">
              <button
                className={`ru-tab ${mode === 'upload' ? 'active' : ''}`}
                onClick={() => switchMode('upload')}
                disabled={recording}
              >
                <UploadGlyph /> رَفْع مِلَفّ
              </button>
              <button
                className={`ru-tab ${mode === 'record' ? 'active' : ''}`}
                onClick={() => switchMode('record')}
                disabled={recording}
              >
                <MicGlyph /> تَسْجِيل مُباشِر
              </button>
              <span
                className="ru-tab-indicator"
                style={{ transform: mode === 'upload' ? 'translateX(0)' : 'translateX(-100%)' }}
              />
            </div>

            {/* Upload mode */}
            {mode === 'upload' && (
              <div
                className={`dropzone ${dragging ? 'over' : ''} ${file ? 'has-file' : ''}`}
                onClick={() => !file && inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".wav,.mp3,.m4a,.mp4,.ogg,.opus,.webm,.aac,audio/*"
                  style={{ display: 'none' }}
                  onChange={onInputChange}
                />
                {file ? (
                  <div className="file-pill">
                    <span className="fp-icon"><AudioFile /></span>
                    <div className="fp-info">
                      <div className="fp-name">{file.name}</div>
                      <div className="fp-meta">
                        {(file.size / 1024 / 1024).toFixed(2)} MB · جاهز للتقييم
                      </div>
                    </div>
                    <button
                      className="fp-remove"
                      onClick={(e) => {
                        e.stopPropagation(); setFile(null)
                        if (inputRef.current) inputRef.current.value = ''
                      }}
                      aria-label="إزالة الملف"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="dz-icon"><CloudUpload /></div>
                    <div className="dz-title">اِسحَب الملف هُنا أو اِضغط للاختيار</div>
                    <div className="dz-meta">WAV · MP3 · M4A · OGG — الحد الأقصى ٢٥MB</div>
                  </>
                )}
              </div>
            )}

            {/* Record mode */}
            {mode === 'record' && (
              <div className="recorder">
                {!file ? (
                  <>
                    <div className={`rec-orb ${recording ? 'live' : ''}`}>
                      <span className="orb-ring" />
                      <span className="orb-ring" />
                      <span className="orb-ring" />
                      <button
                        className="orb-core-btn"
                        onClick={recording ? stopRecording : startRecording}
                        aria-label={recording ? 'إيقاف' : 'بدء التسجيل'}
                      >
                        {recording ? <StopIcon /> : <MicGlyph />}
                      </button>
                    </div>
                    <div className="rec-time-big">{fmt(elapsedSec)}</div>
                    <div className="rec-hint">
                      {recording ? 'جارٍ التسجيل… تكلّم الآن' : `اضغط لبدء التسجيل · حد أقصى ${MAX_RECORD_SEC / 60} دقائق`}
                    </div>
                    {recordError && <div className="rec-err">{recordError}</div>}
                    <button
                      type="button"
                      className="mushaf-open-btn"
                      onClick={openMushaf}
                      disabled={autoDetect}
                      title={autoDetect ? 'عطّل الاكتشاف التلقائي لاختيار صفحة محدّدة' : ''}
                    >
                      <BookGlyph /> اِفتَح المُصحَف لِلقِراءة
                    </button>
                  </>
                ) : (
                  <div className="rec-preview">
                    <div className="file-pill">
                      <span className="fp-icon"><AudioFile /></span>
                      <div className="fp-info">
                        <div className="fp-name">تم التسجيل</div>
                        <div className="fp-meta">
                          {fmt(elapsedSec)} · {(file.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                      <button
                        className="fp-remove"
                        onClick={discardRecording}
                        aria-label="إعادة التسجيل"
                      >
                        ✕
                      </button>
                    </div>
                    {previewUrl && <audio src={previewUrl} controls />}
                  </div>
                )}
              </div>
            )}

            {/* Scope picker */}
            <div className="ru-scope">
              <div className="scope-head">
                <div className="t-eyebrow">نِطاق التِّلاوة</div>
                <label className="scope-toggle">
                  <input
                    type="checkbox"
                    checked={autoDetect}
                    onChange={(e) => setAutoDetect(e.target.checked)}
                  />
                  <span className="toggle-slot"><span className="toggle-knob" /></span>
                  اكتشاف الموضع تلقائياً
                </label>
              </div>

              <div className={`scope-fields ${autoDetect ? 'dim' : ''}`}>
                <div className="field">
                  <label htmlFor="ru-surah">السُّورة</label>
                  <SurahCombobox
                    id="ru-surah"
                    value={surah}
                    onChange={handleSurahChange}
                    disabled={autoDetect}
                  />
                </div>
                <div className="field field-pair">
                  <div>
                    <label htmlFor="ru-ayah-start">مِن آية</label>
                    <input
                      id="ru-ayah-start"
                      type="number" min={1} max={maxAyah} value={ayahStart}
                      onChange={(e) => handleStartChange(Number(e.target.value))}
                      disabled={autoDetect}
                    />
                  </div>
                  <div>
                    <label htmlFor="ru-ayah-end">إلى آية</label>
                    <input
                      id="ru-ayah-end"
                      type="number" min={ayahStart} max={maxAyah} value={ayahEnd}
                      onChange={(e) => handleEndChange(Number(e.target.value))}
                      disabled={autoDetect}
                    />
                  </div>
                </div>
              </div>
              <div className={`scope-foot ${wordLimitWarning ? 'warn' : ''}`}>
                {ayahCount} {ayahCount === 1 ? 'آية' : 'آيات'} · ~{estimatedWords} كلمة
                {wordLimitWarning ? ' — يتجاوز الحد (١٥٠ كلمة)، قلّل النطاق' : ' · الحد الأقصى ١٥٠ كلمة'}
              </div>
            </div>

            {error && <div className="ru-err-banner">{error}</div>}

            <button
              className={`btn btn-primary btn-lg ru-cta ${!canSubmit ? 'disabled' : ''}`}
              disabled={!canSubmit}
              onClick={() => file && onEvaluate(file, surah, ayahStart, ayahEnd, autoDetect)}
            >
              {loading ? (
                <>
                  <Spinner /> جارٍ التَّقييم…
                </>
              ) : (
                <>تَقْييم التِّلاوة <ArrowLeft /></>
              )}
            </button>

            <a
              className="ru-back"
              onClick={() => !loading && !recording && onBack()}
              style={(loading || recording) ? { opacity: 0.4, pointerEvents: 'none' } : undefined}
            >
              ← العودة
            </a>
          </div>
        </div>
      </section>

      {mushafOpen && (
        <div className={`mushaf-overlay ${controlsVisible ? 'controls-visible' : ''}`} onClick={onOverlayClick} onTouchStart={onOverlayTouchStart} onTouchEnd={onOverlayTouchEnd} role="dialog" aria-modal="true" aria-label="عرض المصحف للقراءة">
          <div className="mushaf-overlay-topbar" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="mushaf-overlay-close"
              onClick={closeMushaf}
              aria-label="إغلاق المصحف"
            >
              ✕
            </button>
            <div className="mushaf-overlay-page-nav" role="group" aria-label="تنقل بين الصفحات">
              <button
                type="button"
                className="page-nav-btn"
                onClick={() => mushafPage && gotoPage(mushafPage - 1)}
                disabled={!mushafPage || mushafPage <= 1}
                aria-label="الصفحة السابقة"
              >‹</button>
              <span className="page-nav-label">
                {mushafPage ? `صفحة ${mushafPage}` : '…'}
              </span>
              <button
                type="button"
                className="page-nav-btn"
                onClick={() => mushafPage && gotoPage(mushafPage + 1)}
                disabled={!mushafPage || mushafPage >= 604}
                aria-label="الصفحة التالية"
              >›</button>
            </div>
            <div className="mushaf-overlay-timer" aria-live="polite">
              {recording && <span className="rec-dot" aria-hidden />}
              <span>{fmt(elapsedSec)}</span>
            </div>
          </div>

          <div className="mushaf-overlay-stage">
            {mushafLoading && <div className="mushaf-overlay-status">جارٍ تحديد الصفحة…</div>}
            {mushafError && (
              <div className="mushaf-overlay-status err">
                ⚠ {mushafError}
              </div>
            )}
            {!mushafLoading && !mushafError && mushafPage !== null && (
              <MushafPage
                pageNumber={mushafPage}
                tracking={EMPTY_TRACKING}
                onPageChange={gotoPage}
              />
            )}
          </div>

          <div className="mushaf-overlay-bottombar" onClick={(e) => e.stopPropagation()}>
            {file ? (
              <button
                type="button"
                className="mushaf-overlay-mic done"
                onClick={closeMushaf}
                aria-label="انتهيت — العودة"
              >
                <CheckGlyph /> انتَهَيت — أَغلِق المُصحَف
              </button>
            ) : (
              <button
                type="button"
                className={`mushaf-overlay-mic ${recording ? 'live' : ''}`}
                onClick={recording ? stopRecording : startRecording}
                aria-label={recording ? 'إيقاف التسجيل' : 'بدء التسجيل'}
              >
                {recording ? <StopIcon /> : <MicGlyph />}
              </button>
            )}
            {recordError && <div className="mushaf-overlay-err">{recordError}</div>}
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════ Surah combobox ═══════════ */
interface SurahComboboxProps {
  id: string
  value: number
  onChange: (n: number) => void
  disabled?: boolean
}

function SurahCombobox({ id, value, onChange, disabled }: SurahComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const selectedLabel = `${value}. ${SURAH_NAMES[value]}`
  const filtered = useMemo(() => filterSurahs(query), [query])
  const listboxId = `${id}-listbox`

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        closeReset()
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    const list = listRef.current
    if (!list) return
    const node = list.children[activeIdx] as HTMLElement | undefined
    node?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx, open, filtered.length])

  function openWith(initialQuery = '') {
    if (disabled) return
    setQuery(initialQuery)
    const list = filterSurahs(initialQuery)
    const sel = list.findIndex((s) => s.n === value)
    setActiveIdx(sel >= 0 ? sel : 0)
    setOpen(true)
  }

  function closeReset() {
    setOpen(false)
    setQuery('')
  }

  function commit(idx: number) {
    const item = filtered[idx]
    if (!item) return
    onChange(item.n)
    closeReset()
    inputRef.current?.blur()
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (disabled) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) { openWith(); return }
      setActiveIdx((i) => Math.min(filtered.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) { openWith(); return }
      setActiveIdx((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      if (open && filtered.length > 0) {
        e.preventDefault()
        commit(activeIdx)
      }
    } else if (e.key === 'Escape') {
      if (open) { e.preventDefault(); closeReset() }
    } else if (e.key === 'Home' && open) {
      e.preventDefault(); setActiveIdx(0)
    } else if (e.key === 'End' && open) {
      e.preventDefault(); setActiveIdx(filtered.length - 1)
    }
  }

  function onChangeText(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setQuery(v)
    if (!open) setOpen(true)
    setActiveIdx(0)
  }

  return (
    <div className="select-wrap surah-combo" ref={wrapRef}>
      <input
        id={id}
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={open && filtered[activeIdx] ? `${id}-opt-${filtered[activeIdx].n}` : undefined}
        autoComplete="off"
        spellCheck={false}
        dir="rtl"
        disabled={disabled}
        value={open ? query : selectedLabel}
        placeholder={open ? 'اكتب اسم السُّورة أو رقمها…' : ''}
        onFocus={() => { if (!open) openWith() }}
        onClick={() => { if (!open) openWith() }}
        onChange={onChangeText}
        onKeyDown={onKeyDown}
      />
      <ChevronDown />
      {open && (
        <ul
          id={listboxId}
          role="listbox"
          ref={listRef}
          className="surah-options"
          dir="rtl"
        >
          {filtered.length === 0 && (
            <li className="surah-empty">لا توجد سورة مطابقة</li>
          )}
          {filtered.map((s, i) => (
            <li
              key={s.n}
              id={`${id}-opt-${s.n}`}
              role="option"
              aria-selected={s.n === value}
              className={`surah-option${i === activeIdx ? ' active' : ''}${s.n === value ? ' selected' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); commit(i) }}
              onMouseEnter={() => setActiveIdx(i)}
            >
              <span className="so-num">{s.n}</span>
              <span className="so-name">{s.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ═══════════ Icons ═══════════ */
function UploadGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 11V2M4 6l4-4 4 4M2 12v2h12v-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function MicGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="6" y="2" width="4" height="8" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3 7v1a5 5 0 0010 0V7M8 13v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
function CloudUpload() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden>
      <path d="M28 24a6 6 0 000-12 8 8 0 00-15.5 2A6 6 0 0014 26h14z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M20 18v10M16 22l4-4 4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function AudioFile() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M4 2h8l4 4v12H4V2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M12 2v4h4M8 12v3M10 10v5M12 11v4M14 13v1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
function ChevronDown() {
  return (
    <svg className="chev" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function StopIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="currentColor" aria-hidden>
      <rect x="6" y="6" width="10" height="10" rx="2" />
    </svg>
  )
}
function Spinner() {
  return (
    <svg className="spinner" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
function ArrowLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M9 3L4 7l5 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function BookGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M2 3h4a2 2 0 012 2v8a2 2 0 00-2-2H2V3zM14 3h-4a2 2 0 00-2 2v8a2 2 0 012-2h4V3z"
        stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
}
function CheckGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3 8.5l3 3L13 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
