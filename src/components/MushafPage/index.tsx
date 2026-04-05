// v1.1
import { useEffect, useRef, useState, useCallback } from 'react'
import type { MushafPageData, MushafLine, MushafWord, TrackingState } from './types'
import './MushafPage.css'

// ---------------------------------------------------------------------------
// Juz names (1–30)
// ---------------------------------------------------------------------------
const JUZ_NAMES: Record<number, string> = {
  1: 'الجزء الأوّل', 2: 'الجزء الثاني', 3: 'الجزء الثالث', 4: 'الجزء الرابع',
  5: 'الجزء الخامس', 6: 'الجزء السادس', 7: 'الجزء السابع', 8: 'الجزء الثامن',
  9: 'الجزء التاسع', 10: 'الجزء العاشر', 11: 'الجزء الحادي عشر', 12: 'الجزء الثاني عشر',
  13: 'الجزء الثالث عشر', 14: 'الجزء الرابع عشر', 15: 'الجزء الخامس عشر',
  16: 'الجزء السادس عشر', 17: 'الجزء السابع عشر', 18: 'الجزء الثامن عشر',
  19: 'الجزء التاسع عشر', 20: 'الجزء العشرون', 21: 'الجزء الحادي والعشرون',
  22: 'الجزء الثاني والعشرون', 23: 'الجزء الثالث والعشرون', 24: 'الجزء الرابع والعشرون',
  25: 'الجزء الخامس والعشرون', 26: 'الجزء السادس والعشرون', 27: 'الجزء السابع والعشرون',
  28: 'الجزء الثامن والعشرون', 29: 'الجزء التاسع والعشرون', 30: 'الجزء الثلاثون',
}

// ---------------------------------------------------------------------------
// Arabic-Indic numerals helper
// ---------------------------------------------------------------------------
const toArabicIndic = (n: number): string =>
  String(n).split('').map(d => String.fromCharCode(0x0660 + +d)).join('')

// ---------------------------------------------------------------------------
// Font injection — dynamically load QCF per-page font
// ---------------------------------------------------------------------------
const FONT_TIMEOUT_MS = 2000
const _injectedFonts = new Set<number>()

function injectPageFont(pageNumber: number, onFail: () => void): void {
  if (_injectedFonts.has(pageNumber)) return
  _injectedFonts.add(pageNumber)

  const fontUrl = `/fonts/pages/QCF_P${String(pageNumber).padStart(3, '0')}.ttf`
  const styleId = `qcf-font-${pageNumber}`
  if (document.getElementById(styleId)) return

  const style = document.createElement('style')
  style.id = styleId
  style.textContent = `
    @font-face {
      font-family: 'QCFPageFont';
      src: url('${fontUrl}') format('truetype');
      font-display: block;
    }
  `
  document.head.appendChild(style)

  // Check if font actually loads within timeout
  if ('FontFace' in window) {
    const ff = new FontFace('QCFPageFont', `url('${fontUrl}')`)
    const timer = setTimeout(onFail, FONT_TIMEOUT_MS)
    ff.load().then(() => {
      clearTimeout(timer)
      // Font loaded OK — remove any existing fallback warning
    }).catch(() => {
      clearTimeout(timer)
      onFail()
    })
  } else {
    setTimeout(onFail, FONT_TIMEOUT_MS)
  }
}

// ---------------------------------------------------------------------------
// Surah name rendering (SurahNameV4 ligature system)
// ---------------------------------------------------------------------------
function SurahBanner({ surahNumber }: { surahNumber: number | null }) {
  if (!surahNumber) return null
  const ligature = `surah-icon surah${String(surahNumber).padStart(3, '0')}`
  return (
    <div className="mushaf-surah-banner" dir="ltr" aria-label={`سورة رقم ${surahNumber}`}>
      {ligature}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Word component
// ---------------------------------------------------------------------------
interface WordProps {
  word: MushafWord
  isCurrent: boolean
  isError: boolean
  useFallbackFont: boolean
  onWordClick?: (wordKey: string) => void
}

function WordToken({ word, isCurrent, isError, useFallbackFont, onWordClick }: WordProps) {
  const classes = [
    'mushaf-word',
    isCurrent ? 'word-current' : '',
    isError   ? 'word-error'   : '',
  ].filter(Boolean).join(' ')

  // Use uthmani text when QCF font not available
  const display = useFallbackFont ? word.text : (word.text_qpc || word.text)

  return (
    <span
      className={classes}
      data-word-key={word.word_key}
      data-word-index={word.word_index}
      onClick={() => onWordClick?.(word.word_key)}
      dir="rtl"
    >
      {display}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Line component
// ---------------------------------------------------------------------------
interface LineProps {
  line: MushafLine
  tracking: TrackingState
  useFallbackFont: boolean
  onWordClick?: (wordKey: string) => void
}

function MushafLineRow({ line, tracking, useFallbackFont, onWordClick }: LineProps) {
  const isActiveAyah = line.words.some(w =>
    tracking.active_ayah_words.includes(w.word_key)
  )
  const lineClasses = [
    'mushaf-line',
    line.is_centered ? 'centered' : '',
    isActiveAyah ? 'ayah-active' : '',
  ].filter(Boolean).join(' ')

  if (line.line_type === 'surah_name') {
    return (
      <div className={lineClasses}>
        <SurahBanner surahNumber={line.surah_number} />
      </div>
    )
  }

  if (line.line_type === 'basmallah') {
    return (
      <div className={lineClasses}>
        <div className="mushaf-basmallah" dir="rtl">
          بِسۡمِ ٱللَّهِ ٱلرَّحۡمَـٰنِ ٱلرَّحِيمِ
        </div>
      </div>
    )
  }

  // ayah line
  return (
    <div className={lineClasses}>
      {line.words.map(word => (
        <WordToken
          key={word.word_key}
          word={word}
          isCurrent={tracking.current_word_key === word.word_key}
          isError={tracking.error_word_keys.includes(word.word_key)}
          useFallbackFont={useFallbackFont}
          onWordClick={onWordClick}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------
function LoadingSkeleton() {
  return (
    <div className="mushaf-skeleton">
      {Array.from({ length: 17 }).map((_, i) => (
        <div
          key={i}
          className="mushaf-skeleton-line"
          style={{ width: i === 0 ? '60%' : `${75 + Math.random() * 20}%`, margin: '6px auto' }}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// MushafPage — main component
// ---------------------------------------------------------------------------
export interface MushafPageProps {
  pageNumber: number
  tracking: TrackingState
  onWordClick?: (wordKey: string) => void
}

export default function MushafPage({ pageNumber, tracking, onWordClick }: MushafPageProps) {
  const [pageData, setPageData]   = useState<MushafPageData | null>(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [fontFallback, setFontFallback] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  // Fetch page data
  useEffect(() => {
    setLoading(true)
    setError(null)
    setPageData(null)
    setFontFallback(false)

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    fetch(`/mushaf/page/${pageNumber}`, { signal: ctrl.signal })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<MushafPageData>
      })
      .then(data => {
        setPageData(data)
        setLoading(false)
        // Inject per-page font
        injectPageFont(pageNumber, () => setFontFallback(true))
      })
      .catch(err => {
        if (err.name === 'AbortError') return
        setError(err.message || 'فشل تحميل الصفحة')
        setLoading(false)
      })

    return () => ctrl.abort()
  }, [pageNumber])

  // Derive page header info
  const juzName = pageData?.juz_number ? (JUZ_NAMES[pageData.juz_number] ?? `الجزء ${pageData.juz_number}`) : ''
  const surahNumber = pageData?.lines?.find(l => l.line_type === 'ayah' && l.surah_number)?.surah_number ?? null
  const surahHeaderLine = pageData?.lines?.find(l => l.line_type === 'surah_name')

  if (loading) return <LoadingSkeleton />

  if (error) {
    return (
      <div style={{ textAlign: 'center', color: '#c0392b', padding: '20px', fontFamily: 'sans-serif' }}>
        ⚠ {error}
      </div>
    )
  }

  if (!pageData) return null

  return (
    <div className="mushaf-page" dir="rtl">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="mushaf-header">
        <span className="mushaf-header-juz">{juzName}</span>
        {surahHeaderLine && surahHeaderLine.surah_number && (
          <span className="mushaf-header-surah">
            سُورَةٌ {surahHeaderLine.surah_number}
          </span>
        )}
      </div>

      {/* ── Frame + lines ─────────────────────────────────────────────── */}
      <div className="mushaf-frame">
        <div className="mushaf-frame-inner">
          {pageData.lines.map(line => (
            <MushafLineRow
              key={line.line_number}
              line={line}
              tracking={tracking}
              useFallbackFont={fontFallback}
              onWordClick={onWordClick}
            />
          ))}
        </div>
      </div>

      {/* ── Fallback font warning ──────────────────────────────────────── */}
      {fontFallback && (
        <div className="mushaf-font-warning">⚠ خط احتياطي — خط QCF غير متوفر</div>
      )}

      {/* ── Page number ───────────────────────────────────────────────── */}
      <div className="mushaf-page-number">
        ─ {toArabicIndic(pageNumber)} ─
      </div>

    </div>
  )
}
