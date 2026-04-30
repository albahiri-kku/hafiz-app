// v1.4
import { useEffect, useRef, useState } from 'react'
import type { MushafPageData, MushafLine, MushafWord, TrackingState } from './types'
import { SURAH_NAMES } from '../../types/hafiz'
import './MushafPage.css'

const _API_BASE = import.meta.env.VITE_API_URL ?? ''
const _API_KEY  = import.meta.env.VITE_API_KEY  ?? ''

// Fallback Arabic-Quran font stack used while QCF page font is loading
// or has failed. Uthmani Unicode renders correctly here, never as the
// raw FB5x presentation forms (which would look like ٱپـپ — wrong).
const FALLBACK_FONT_STACK = "'Amiri Quran', 'Scheherazade New', 'Traditional Arabic', serif"

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
// Arabic-Indic numerals
// ---------------------------------------------------------------------------
const toArabicIndic = (n: number): string =>
  String(n).split('').map(d => String.fromCharCode(0x0660 + +d)).join('')

// ---------------------------------------------------------------------------
// Font injection — QCF per-page woff2 (v1.3: API_BASE-aware URLs)
// ---------------------------------------------------------------------------
// Each page uses its own font-family name so browser caches each independently.
// Font URLs are resolved against _API_BASE so they reach the API server even
// when the SPA host (Vercel) does not serve /fonts/* (it rewrites to index.html).
// Falls back to 'Scheherazade New' / serif when woff2 not loaded yet.

const _injectedPages = new Set<number>()
let _surahNameInjected = false

function injectSurahNameFont() {
  if (_surahNameInjected || document.getElementById('mushaf-surah-name-font')) return
  _surahNameInjected = true
  const style = document.createElement('style')
  style.id = 'mushaf-surah-name-font'
  style.textContent = `
    @font-face {
      font-family: 'SurahNameV4';
      src: url('${_API_BASE}/fonts/surah-name-v4.ttf') format('truetype');
      font-display: block;     /* hide PUA chars while loading — never show empty boxes */
    }
  `
  document.head.appendChild(style)
}

function injectPageFont(
  pageNumber: number,
  onFail: () => void,
): string {
  const pageStr   = String(pageNumber).padStart(3, '0')
  const fontFamily = `QCFPage${pageStr}`
  const fontUrl    = `${_API_BASE}/fonts/pages/QCF_P${pageStr}.woff2`
  const styleId    = `qcf-font-page-${pageStr}`

  injectSurahNameFont()

  if (!document.getElementById(styleId)) {
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      @font-face {
        font-family: '${fontFamily}';
        src: url('${fontUrl}') format('woff2');
        /* block (not swap) — qpc PUA codepoints render as wrong Arabic letters
           (e.g. ﭑ→ٱ, ﭒ→پ) in fallback fonts. Better to show nothing for ~3s
           than to flash broken Arabic. The 2-second timer below switches to
           Uthmani Unicode (which IS readable in fallback) before block expires. */
        font-display: block;
      }
    `
    document.head.appendChild(style)
  }

  // (Previously injected QCF_BSML here — removed: AAT-only font, no Chrome
  // support. The per-page QCF font already contains the basmallah glyphs.)

  // Verify the font actually loads (2 s timeout → fallback)
  if (!_injectedPages.has(pageNumber)) {
    _injectedPages.add(pageNumber)
    if ('FontFace' in window) {
      const ff = new FontFace(fontFamily, `url('${fontUrl}') format('woff2')`)
      const timer = setTimeout(onFail, 2000)
      ff.load()
        .then(() => clearTimeout(timer))
        .catch(() => { clearTimeout(timer); onFail() })
    } else {
      setTimeout(onFail, 2000)
    }
  }

  return fontFamily
}

// ---------------------------------------------------------------------------
// Surah name banner (SurahNameV4 — direct PUA codepoint rendering)
// ---------------------------------------------------------------------------
// SurahNameV4's cmap has each calligraphic glyph at a stable PUA codepoint:
//   U+E000          → calligraphic سُورَةُ ornament
//   U+E000+surahNum → calligraphic surah-name glyph (e.g. U+E00E = إبراهيم)
// Render the codepoints directly instead of relying on `liga` GSUB triggers
// (which were the original "surah-icon surahNNN" pattern) — that path was
// fragile across browsers and produced empty .notdef boxes when ligatures
// failed to activate.
const SURAH_PREFIX_CP = 0xE000
function SurahBanner({ surahNumber }: { surahNumber: number | null }) {
  if (!surahNumber) return null
  const prefixGlyph = String.fromCharCode(SURAH_PREFIX_CP)
  const nameGlyph   = String.fromCharCode(SURAH_PREFIX_CP + surahNumber)
  // Use dir="ltr" + reversed source order: PUA codepoints have bidi class L,
  // so within an RTL container they're rendered in source order anyway. To
  // make Arabic readers (right→left) see "سُورَةُ <name>" we put the name
  // glyph first (visual LEFT) and the prefix glyph last (visual RIGHT).
  return (
    <div
      className="mushaf-surah-banner"
      dir="ltr"
      aria-label={`سورة ${SURAH_NAMES[surahNumber] || surahNumber}`}
    >
      {nameGlyph}{prefixGlyph}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Word token
// ---------------------------------------------------------------------------
interface WordProps {
  word: MushafWord
  isCurrent: boolean
  isError: boolean
  fontFamily: string          // per-page QCF font family name
  useFallbackFont: boolean    // true → show uthmani Unicode text instead of QPC glyph
  onWordClick?: (wordKey: string) => void
}

function WordToken({ word, isCurrent, isError, fontFamily, useFallbackFont, onWordClick }: WordProps) {
  const classes = [
    'mushaf-word',
    isCurrent ? 'word-current' : '',
    isError   ? 'word-error'   : '',
  ].filter(Boolean).join(' ')

  // QPC glyph codes only render with the per-page font; on fallback we render
  // Uthmani Unicode in a generic Arabic-Quran font (NEVER the QCF page font,
  // because in fallback the page font isn't loaded and the Uthmani text would
  // render in browser default which is often serif Latin → broken).
  const display = useFallbackFont ? word.text : (word.text_qpc || word.text)
  const fontStack = useFallbackFont
    ? FALLBACK_FONT_STACK
    : `'${fontFamily}', ${FALLBACK_FONT_STACK}`

  return (
    <span
      className={classes}
      data-word-key={word.word_key}
      data-word-index={word.word_index}
      style={{ fontFamily: fontStack }}
      onClick={() => onWordClick?.(word.word_key)}
      dir="rtl"
    >
      {display}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Line row
// ---------------------------------------------------------------------------
interface LineProps {
  line: MushafLine
  tracking: TrackingState
  fontFamily: string
  useFallbackFont: boolean
  onWordClick?: (wordKey: string) => void
}

function MushafLineRow({ line, tracking, fontFamily, useFallbackFont, onWordClick }: LineProps) {
  const isActiveAyah = line.words.some(w =>
    tracking.active_ayah_words.includes(w.word_key)
  )
  const lineClasses = [
    'mushaf-line',
    line.line_type === 'basmallah' ? 'basmallah-line' : '',
    line.line_type === 'ayah' ? 'ayah-line' : '',
    line.is_centered ? 'centered' : '',
    isActiveAyah ? 'ayah-active' : '',
  ].filter(Boolean).join(' ')

  if (line.line_type === 'surah_name') {
    return (
      <div className={`mushaf-line centered ${isActiveAyah ? 'ayah-active' : ''}`}>
        <SurahBanner surahNumber={line.surah_number} />
      </div>
    )
  }

  if (line.line_type === 'basmallah') {
    // Render basmallah as plain Uthmani Unicode in a Quran-style font.
    //
    // Why not use the per-page QCF font? Each per-page font's cmap maps
    // codepoints sequentially to that page's content glyphs — `#"!`
    // (U+0023..U+0021, the qpcV1 slot) on page 106 returns the first three
    // word-glyphs of An-Nisa 4:176, NOT the basmallah. Different page,
    // different glyphs at the same codepoints. Only the dedicated QCF_BSML
    // font has stable basmallah codepoints, but it uses Apple AAT which
    // Chrome and Firefox can't render.
    //
    // Falling back to Uthmani Unicode in Amiri Quran / Scheherazade gives
    // every browser a clean, dignified basmallah that visually matches the
    // first ayah of Al-Fatihah (also rendered in the same Uthmani style).
    return (
      <div className={lineClasses}>
        <span
          className="mushaf-basmallah-text"
          dir="rtl"
          style={{ fontFamily: FALLBACK_FONT_STACK }}
        >
          بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
        </span>
      </div>
    )
  }

  // ayah line — group consecutive words by ayah so Phase 2 ayah-level
  // tracking can target [data-ayah-key] without touching word spans.
  const ayahGroups: { ayahKey: string; words: MushafWord[] }[] = []
  for (const w of line.words) {
    const ayahKey = w.word_key.split(':').slice(0, 2).join(':')
    const last = ayahGroups[ayahGroups.length - 1]
    if (last && last.ayahKey === ayahKey) last.words.push(w)
    else ayahGroups.push({ ayahKey, words: [w] })
  }

  return (
    <div className={lineClasses}>
      {ayahGroups.map(g => (
        <span key={g.ayahKey} className="mushaf-ayah" data-ayah-key={g.ayahKey}>
          {g.words.map(word => (
            <WordToken
              key={word.word_key}
              word={word}
              isCurrent={tracking.current_word_key === word.word_key}
              isError={tracking.error_word_keys.includes(word.word_key)}
              fontFamily={fontFamily}
              useFallbackFont={useFallbackFont}
              onWordClick={onWordClick}
            />
          ))}
        </span>
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
          style={{ width: i === 0 ? '60%' : `${75 + (i * 7) % 20}%`, margin: '6px auto' }}
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
  onPageChange?: (pageNumber: number) => void
  onSessionStop?: () => void
}

export default function MushafPage({ pageNumber, tracking, onWordClick }: MushafPageProps) {
  const [pageData, setPageData]         = useState<MushafPageData | null>(null)
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [fontFallback, setFontFallback] = useState(false)
  const [fontFamily, setFontFamily]     = useState('Scheherazade New')
  const abortRef = useRef<AbortController | null>(null)

  // Fetch page data + inject font, with one retry on transient failure to
  // survive Modal cold starts (~30 s on first request after scale-to-zero).
  useEffect(() => {
    setLoading(true)
    setError(null)
    setPageData(null)
    setFontFallback(false)

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    const fetchPage = (attempt = 1): Promise<MushafPageData> =>
      fetch(`${_API_BASE}/mushaf/page/${pageNumber}`, {
        signal: ctrl.signal,
        headers: _API_KEY ? { 'X-API-Key': _API_KEY } : {},
      }).then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<MushafPageData>
      }).catch(err => {
        if (err?.name === 'AbortError' || attempt >= 2) throw err
        // 1 s pause, then one retry — covers transient network blips and
        // a Modal worker that was still warming up on the first try.
        return new Promise<MushafPageData>((resolve, reject) =>
          setTimeout(() => fetchPage(attempt + 1).then(resolve).catch(reject), 1000)
        )
      })

    fetchPage()
      .then(data => {
        setPageData(data)
        setLoading(false)
        const ff = injectPageFont(pageNumber, () => setFontFallback(true))
        setFontFamily(ff)
      })
      .catch(err => {
        if (err.name === 'AbortError') return
        setError(err.message || 'فشل تحميل الصفحة')
        setLoading(false)
      })

    return () => ctrl.abort()
  }, [pageNumber])

  // Page header info
  const juzName = pageData?.juz_number ? (JUZ_NAMES[pageData.juz_number] ?? `الجزء ${pageData.juz_number}`) : ''
  // Show surah name on EVERY page (not only on pages that start a new surah).
  // For middle-of-surah pages we derive it from the first ayah-line's surah
  // number — this matches Madinah Mushaf headers which always carry the
  // current surah name in the top corner.
  const dominantSurah = pageData?.lines
    ?.find(l => l.line_type === 'ayah' && l.surah_number)
    ?.surah_number ?? null
  const headerSurahName = dominantSurah ? (SURAH_NAMES[dominantSurah] ?? '') : ''

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
    <div
      className="mushaf-page"
      dir="rtl"
      style={{ '--qcf-page-font': `'${fontFamily}'` } as React.CSSProperties}
    >

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="mushaf-header">
        <span className="mushaf-header-juz">{juzName}</span>
        {headerSurahName && (
          <span className="mushaf-header-surah">
            سُورَةُ {headerSurahName}
          </span>
        )}
      </div>

      {/* ── Frame + lines ───────────────────────────────────────────── */}
      <div className="mushaf-frame">
        <div className="mushaf-frame-inner">
          {pageData.lines.map(line => (
            <MushafLineRow
              key={line.line_number}
              line={line}
              tracking={tracking}
              fontFamily={fontFamily}
              useFallbackFont={fontFallback}
              onWordClick={onWordClick}
            />
          ))}
        </div>
      </div>

      {/* ── Fallback font warning (only when woff2 fails to load) ──────── */}
      <div className={`mushaf-font-warning${fontFallback ? ' visible' : ''}`}>
        ⚠ خط احتياطي — خط QCF غير محمَّل
      </div>

      {/* ── Page number ─────────────────────────────────────────────── */}
      <div className="mushaf-page-number">
        ─ {toArabicIndic(pageNumber)} ─
      </div>

    </div>
  )
}
