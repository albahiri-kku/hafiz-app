import { useState, useMemo, useRef, useEffect, type ReactNode } from 'react'
import type {
  EvaluateFileResponse, WordAlignmentEntry, TajweedEventEntry,
  MaddBarEntry, TafkhimEntry, SaktaEntry, HafizReport, ErrorDistribution,
} from '../types/hafiz'
import { SURAH_NAMES } from '../types/hafiz'
import '../styles/hafiz-theme.css'

interface Props {
  report: EvaluateFileResponse
  surah: number
  ayahStart: number
  ayahEnd: number
  onUploadAnother: () => void
  onHome: () => void
  audioUrl?: string | null
}

const RULE_AR: Record<string, string> = {
  MADD_TABII: 'ظ…ط¯ ط·ط¨ظٹط¹ظٹ', MADD_LAZIM: 'ظ…ط¯ ظ„ط§ط²ظ… ظƒظ„ظ…ظٹ', MADD_WAJIB_MUTTASIL: 'ظ…ط¯ ظˆط§ط¬ط¨ ظ…طھطµظ„',
  MADD_MUNFASIL: 'ظ…ط¯ ظ…ظ†ظپطµظ„', MADD_AARID_LISUKOON: 'ظ…ط¯ ط¹ط§ط±ط¶ ظ„ظ„ط³ظƒظˆظ†', MADD_LIN: 'ظ…ط¯ ظ„ظٹظ†',
  NOON_SAKINAH_IZHAR: 'ط¥ط¸ظ‡ط§ط±', NOON_SAKINAH_IDGHAM: 'ط¥ط¯ط؛ط§ظ…', NOON_SAKINAH_IQLAB: 'ط¥ظ‚ظ„ط§ط¨',
  NOON_SAKINAH_IKHFAA: 'ط¥ط®ظپط§ط،', MEEM_SAKINAH_IZHAR_SHAFAWI: 'ط¥ط¸ظ‡ط§ط± ط´ظپظˆظٹ',
  MEEM_SAKINAH_IDGHAM_SHAFAWI: 'ط¥ط¯ط؛ط§ظ… ط´ظپظˆظٹ', MEEM_SAKINAH_IKHFAA_SHAFAWI: 'ط¥ط®ظپط§ط، ط´ظپظˆظٹ',
  QALQALA: 'ظ‚ظ„ظ‚ظ„ط©', GHUNNA: 'ط؛ظ†ط©',
}

const LETTER_AR: Record<string, string> = {
  khaa: 'ط§ظ„ط®ط§ط،', saad: 'ط§ظ„طµط§ط¯', daad: 'ط§ظ„ط¶ط§ط¯', taa: 'ط§ظ„ط·ط§ط،',
  zhaa: 'ط§ظ„ط¸ط§ط،', ghayn: 'ط§ظ„ط؛ظٹظ†', qaaf: 'ط§ظ„ظ‚ط§ظپ',
}

type TabId = 'summary' | 'words' | 'madd' | 'audio' | 'details'
const TAB_ORDER: TabId[] = ['summary', 'words', 'madd', 'audio', 'details']

const RECITERS = [
  { id: 'Alafasy_128kbps', short: 'ط§ظ„ط¹ظپط§ط³ظٹ' },
  { id: 'Abdurrahmaan_As-Sudais_192kbps', short: 'ط§ظ„ط³ط¯ظٹط³' },
  { id: 'Saood_ash-Shuraym_128kbps', short: 'ط§ظ„ط´ط±ظٹظ…' },
  { id: 'Husary_128kbps', short: 'ط§ظ„ط­طµط±ظٹ' },
  { id: 'Minshawy_Murattal_128kbps', short: 'ط§ظ„ظ…ظ†ط´ط§ظˆظٹ' },
] as const

function ayahAudioUrl(reciterId: string, surah: number, ayah: number): string {
  const s = String(surah).padStart(3, '0'); const a = String(ayah).padStart(3, '0')
  return `https://everyayah.com/data/${reciterId}/${s}${a}.mp3`
}

function normAr(s: string | null | undefined): string {
  return (s || '')
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
    .replace(/[ط£ط¥ط¢ظ±]/g, 'ط§').replace(/ط©/g, 'ظ‡').trim()
}

function buildEventsMap(alignments: WordAlignmentEntry[], tajweedEvents: TajweedEventEntry[]): Map<number, TajweedEventEntry[]> {
  const groups = new Map<string, TajweedEventEntry[][]>()
  let prevKey = '', curGroup: TajweedEventEntry[] = []
  for (const ev of tajweedEvents) {
    const k = normAr(ev.word_text); if (!k) continue
    if (k !== prevKey) {
      if (curGroup.length && prevKey) {
        if (!groups.has(prevKey)) groups.set(prevKey, [])
        groups.get(prevKey)!.push(curGroup)
      }
      prevKey = k; curGroup = [ev]
    } else curGroup.push(ev)
  }
  if (curGroup.length && prevKey) {
    if (!groups.has(prevKey)) groups.set(prevKey, [])
    groups.get(prevKey)!.push(curGroup)
  }
  const ptrs = new Map<string, number>()
  const result = new Map<number, TajweedEventEntry[]>()
  for (const e of alignments) {
    const k = normAr(e.reference_word || e.asr_word || '')
    const wg = groups.get(k) || []
    const p = ptrs.get(k) || 0
    result.set(e.word_index, p < wg.length ? wg[p] : [])
    ptrs.set(k, p + 1)
  }
  return result
}

async function exportToPDF(element: HTMLElement) {
  try {
    const { default: html2canvas } = await import('html2canvas')
    const { jsPDF } = await import('jspdf')
    const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#0B1410' })
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const w = 210, h = (canvas.height * w) / canvas.width, ph = 297
    let pos = 0
    while (pos < h) {
      if (pos > 0) pdf.addPage()
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, -pos, w, h)
      pos += ph
    }
    pdf.save(`hafiz-report-${Date.now()}.pdf`)
  } catch (e) {
    console.error('PDF export failed:', e)
    alert('طھط¹ط°ظ‘ط± طھطµط¯ظٹط± ط§ظ„طھظ‚ط±ظٹط±. طھط£ظƒط¯ ظ…ظ† ط§طھطµط§ظ„ ط§ظ„ط¥ظ†طھط±ظ†طھ ظˆط£ط¹ط¯ ط§ظ„ظ…ط­ط§ظˆظ„ط©.')
  }
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function arDigit(n: number | string): string {
  const map: Record<string, string> = { '0':'ظ ','1':'ظ،','2':'ظ¢','3':'ظ£','4':'ظ¤','5':'ظ¥','6':'ظ¦','7':'ظ§','8':'ظ¨','9':'ظ©' }
  return String(n).replace(/[0-9]/g, d => map[d] ?? d)
}

function statusToWordClass(s: WordAlignmentEntry['status']): string {
  switch (s) {
    case 'MATCH':
    case 'LOW_CONFIDENCE_MATCH':
    case 'CPAE_FALLBACK': return ''
    case 'SUBSTITUTION':
    case 'SUFFIX_MATCH':
    case 'TASHKEEL_MISMATCH': return 'warn'
    case 'MISSED': return 'err'
    case 'EXTRA': return 'extra'
    default: return ''
  }
}

const CONFIRMED_ERROR_STATUSES = new Set<WordAlignmentEntry['status']>([
  'SUBSTITUTION', 'SUFFIX_MATCH', 'TASHKEEL_MISMATCH', 'MISSED',
])

interface MetricData { label: string; v: number | null; kind: 'ok' | 'warn' | 'err' | 'none' }

function kindFor(pct: number | null, goodAt = 80, warnAt = 60): MetricData['kind'] {
  if (pct == null) return 'none'
  if (pct >= goodAt) return 'ok'
  if (pct >= warnAt) return 'warn'
  return 'err'
}

// â”€â”€â”€ Main â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function ReportScreen({ report, surah, ayahStart, ayahEnd, onUploadAnother, onHome, audioUrl }: Props) {
  const [tab, setTab] = useState<TabId>('summary')
  const reportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const prev = document.body.style.background
    document.body.style.background = '#0B1410'
    return () => { document.body.style.background = prev }
  }, [])

  const hr: HafizReport | null = (report.hafiz_report ?? (report.narrative_report as unknown as HafizReport) ?? null)

  const alignments = report.word_alignment ?? []
  const matchCount = alignments.filter(w => w.status === 'MATCH').length
  const totalRef = alignments.filter(w => w.status !== 'EXTRA').length
  const accuracy = totalRef > 0 ? Math.round((matchCount / totalRef) * 100) : null

  const cpaeFallbackCount = alignments.filter(w => w.status === 'CPAE_FALLBACK').length
  const lowQualityAudio = totalRef > 0 && cpaeFallbackCount / totalRef >= 0.4

  const eventsMap = useMemo(
    () => buildEventsMap(report.word_alignment ?? [], report.tajweed_events ?? []),
    [report.word_alignment, report.tajweed_events],
  )

  const surahName = SURAH_NAMES[surah] ?? `ط³ظˆط±ط© ${surah}`
  const range = ayahStart === ayahEnd
    ? `ط§ظ„ط¢ظٹط© ${arDigit(ayahStart)}`
    : `ط§ظ„ط¢ظٹط§طھ ${arDigit(ayahStart)}\u2013${arDigit(ayahEnd)}`

  const maddItems: MaddBarEntry[] = report.word_gated_summary?.madd_summary ?? []
  const maddOk = maddItems.length > 0
    ? Math.round(maddItems.filter(m => m.zone === 'OK').length / maddItems.length * 100)
    : null

  const waqfItems = report.ayah_boundary_waqf ?? []
  const waqfOk = waqfItems.length > 0
    ? Math.round(waqfItems.filter(w => w.is_waqf).length / waqfItems.length * 100)
    : null

  const tajweedTotal = report.tajweed_event_count ?? 0
  const tajweedOk = report.tajweed_ok_count ?? 0
  const tajweedPct = tajweedTotal > 0 ? Math.round((tajweedOk / tajweedTotal) * 100) : null

  // Compute score for ring (weight: accuracy.35 + tajweed.25 + madd.25 + waqf.15)
  const score = useMemo(() => {
    const parts: Array<[number, number]> = []
    if (accuracy != null) parts.push([accuracy, 0.35])
    if (tajweedPct != null) parts.push([tajweedPct, 0.25])
    if (maddOk != null) parts.push([maddOk, 0.25])
    if (waqfOk != null) parts.push([waqfOk, 0.15])
    if (!parts.length) return null
    const wSum = parts.reduce((s, [, w]) => s + w, 0)
    return Math.round(parts.reduce((s, [v, w]) => s + v * w, 0) / wSum)
  }, [accuracy, tajweedPct, maddOk, waqfOk])

  const grade = hr?.overall_grade ?? (
    score == null ? '' :
    score >= 90 ? 'ظ…ظ…طھط§ط²' : score >= 75 ? 'ط¬ظٹط¯ ط¬ط¯ط§ظ‹' : score >= 60 ? 'ط¬ظٹط¯' : 'ظٹط­طھط§ط¬ طھط­ط³ظٹظ†'
  )

  const metrics: MetricData[] = [
    { label: 'ظ…ظژط®ط§ط±ط¬ ط§ظ„ط­ظڈط±ظˆظپ', v: accuracy,   kind: kindFor(accuracy, 85, 70) },
    { label: 'ط£ط­ظƒط§ظ… ط§ظ„طھظژظ‘ط¬ظˆظٹط¯', v: tajweedPct, kind: kindFor(tajweedPct, 80, 60) },
    { label: 'ط§ظ„ظ…ظڈط¯ظˆط¯',         v: maddOk,     kind: kindFor(maddOk, 75, 55) },
    { label: 'ط§ظ„ط¥ظٹظ‚ط§ط¹ ظˆط§ظ„طھظژظ‘ط±طھظٹظ„', v: waqfOk,  kind: kindFor(waqfOk, 80, 60) },
  ]

  const errorDist: ErrorDistribution[] = hr?.error_distribution ?? []

  const tafkhimItems: TafkhimEntry[] = (report.word_gated_summary?.tafkhim_summary ?? []) as TafkhimEntry[]
  const _saktaSum = report.word_gated_summary?.sakta_summary as
    | { entries?: SaktaEntry[] } | SaktaEntry[] | undefined
  const saktaItems: SaktaEntry[] = Array.isArray(_saktaSum)
    ? (_saktaSum as SaktaEntry[])
    : (((_saktaSum as { entries?: SaktaEntry[] } | undefined)?.entries) ?? [])
  const baselineHz = (report.word_gated_summary?.reciter_baseline_hz ?? null) as number | null
  const tafkhimMeasured = tafkhimItems.filter(t => t.acoustic === 'MEASURED')
  const tafkhimIssues = tafkhimMeasured.filter(t =>
    t.verdict === 'ISSUE' || t.verdict === 'WEAK_TAFKHIM' ||
    (t.expected && t.detected && t.expected !== t.detected && t.detected !== 'AMBIGUOUS'),
  )

  // Compute findings: top 5 issue words
  const findings = useMemo(() => {
    const out: Array<{ kind: 'err' | 'warn' | 'ok'; word: string; rule: string; desc: string }> = []
    // 1. missed / substitution (confirmed only â€” CPAE_FALLBACK is alignment uncertainty, not a recitation error)
    for (const w of alignments) {
      if (out.length >= 5) break
      if (w.status === 'MISSED') out.push({ kind: 'err', word: w.reference_word, rule: 'ظƒظ„ظ…ط© ظ…ظپظ‚ظˆط¯ط©', desc: 'ظ„ظ… طھظڈظ‚ط±ط£ ظ‡ط°ظ‡ ط§ظ„ظƒظ„ظ…ط©.' })
      else if (w.status === 'SUBSTITUTION') out.push({ kind: 'warn', word: w.asr_word || w.reference_word, rule: 'ط§ط³طھط¨ط¯ط§ظ„ ظƒظ„ظ…ط©', desc: `ط§ظ„ظ…ط±ط¬ط¹: ${w.reference_word}` })
    }
    // 2. madd errors
    for (const m of maddItems) {
      if (out.length >= 5) break
      if (m.zone === 'CRITICAL_SHORT' || m.verdict === 'ERROR') {
        const hmRef = m.harakah_ms > 0 ? Math.round(m.ref_ms / m.harakah_ms) : 0
        out.push({ kind: 'err', word: m.word_text || 'â€”', rule: m.madd_label_ar, desc: `ط§ظ„ظ…ط·ظ„ظˆط¨ ط­ظˆط§ظ„ظٹ ${arDigit(hmRef)} ط­ط±ظƒط§طھ.` })
      } else if (m.zone === 'SHORT' || m.zone === 'LONG' || m.verdict === 'WARNING') {
        out.push({ kind: 'warn', word: m.word_text || 'â€”', rule: m.madd_label_ar, desc: m.zone === 'SHORT' ? 'ط§ظ„ظ…ط¯ظ‘ ط£ظ‚ظ„ ظ…ظ† ط§ظ„ظ…ط·ظ„ظˆط¨.' : 'ط§ظ„ظ…ط¯ظ‘ ط£ط·ظˆظ„ ظ…ظ† ط§ظ„ظ…ط·ظ„ظˆط¨.' })
      }
    }
    // 3. tafkhim issues
    for (const t of tafkhimIssues) {
      if (out.length >= 5) break
      const letterAr = t.letter_name ? (LETTER_AR[t.letter_name] ?? t.letter_name) : ''
      out.push({
        kind: 'warn',
        word: t.word_text,
        rule: t.kind === 'lam_jalalah' ? 'ظ„ط§ظ… ط§ظ„ط¬ظ„ط§ظ„ط©' : `طھظپط®ظٹظ… ${letterAr}`,
        desc: t.verdict === 'WEAK_TAFKHIM' ? 'ط§ظ„طھظپط®ظٹظ… ط¶ط¹ظٹظپ ط¹ظ† ط§ظ„ظ…طھظˆظ‚ظ‘ط¹.' : 'ظ„ظ… ظٹطھط­ظ‚ظ‚ ط§ظ„ط­ظƒظ… ط§ظ„ظ…طھظˆظ‚ظ‘ط¹.',
      })
    }
    return out.slice(0, 5)
  }, [alignments, maddItems, tafkhimIssues])

  // â”€â”€â”€ Tab indicator position â”€â”€
  const tabIdx = TAB_ORDER.indexOf(tab)
  const tabIndicatorStyle = {
    transform: `translateX(${tabIdx * -100}%)`,
  } as React.CSSProperties

  return (
    <div className="hafiz-report" dir="rtl">
      <div className="ru-container">
        {/* Top bar */}
        <div className="rp-topbar">
          <a onClick={onHome}>â†گ ط§ظ„ط±ط¦ظٹط³ظٹط©</a>
          <div className="rp-actions">
            {grade && <span className="grade-badge">{grade}</span>}
            <button
              className="btn btn-ghost"
              style={{ padding: '8px 16px', fontSize: 12 }}
              onClick={async () => {
                const prev = tab; setTab('summary')
                await new Promise(r => setTimeout(r, 80))
                if (reportRef.current) await exportToPDF(reportRef.current)
                setTab(prev)
              }}
            >ط­ظپط¸ PDF</button>
          </div>
        </div>

        <p className="rp-notice">
          طھظ‚ط±ظٹط± ط­ط§ظپط¸ ظٹظڈظ†طھظژط¬ ط¨ظˆط§ط³ط·ط© ط§ظ„ط°ظƒط§ط، ط§ظ„ط§طµط·ظ†ط§ط¹ظٹ ظˆظ‚ط¯ ظٹط­طھظˆظٹ ط¹ظ„ظ‰ ط¨ط¹ط¶ ط§ظ„ط£ط®ط·ط§ط، ط§ظ„طھظٹ طھط³طھظ„ط²ظ… ط§ظ„ظ…ط±ط§ط¬ط¹ط© ظˆط§ظ„طھط¯ظ‚ظٹظ‚ ظ…ظ† ظ…ط¹ظ„ظ‘ظ… ظ‚ط±ط¢ظ†.
        </p>

        {/* Results card */}
        <div className="ru-card results" ref={reportRef}>
          <div className="results-head">
            <div>
              <div className="t-eyebrow solo">ظ†ظژطھظٹط¬ظژط© ط§ظ„طھظژظ‘ظ‚ظٹظٹظ…</div>
              <h2 className="results-title t-display">ط³ظڈظˆط±ط© {surahName} آ· {range}</h2>
              <div className="results-meta">
                <AudioFile />
                <span>{alignments.length > 0 ? `${arDigit(alignments.length)} ظƒظ„ظ…ط©` : 'ط§ظ„طھظ„ط§ظˆط©'}</span>
                {report.total_runtime_sec != null && (
                  <><span className="dot">آ·</span><span>{arDigit(report.total_runtime_sec.toFixed(0))} ط«ط§ظ†ظٹط© طھط­ظ„ظٹظ„</span></>
                )}
                {findings.length > 0 && (
                  <><span className="dot">آ·</span><span>ط§ظƒطھظڈط´ظگظپطھ {arDigit(findings.length)} ظ…ظ„ط§ط­ط¸ط©</span></>
                )}
                {report.maqam_detection && report.maqam_detection.maqam !== 'UNKNOWN' && (
                  <><span className="dot">آ·</span><span>ط§ظ„ظ…ظ‚ط§ظ…: {
                    { sikah: 'ط§ظ„ط³ظٹظƒط§ظ‡', saba: 'ط§ظ„طµط¨ط§', kurd: 'ط§ظ„ظƒط±ط¯', rast: 'ط§ظ„ط±ط³طھ' }[
                      report.maqam_detection.maqam
                    ] ?? report.maqam_detection.maqam
                  } ({Math.round(report.maqam_detection.confidence * 100)}%)</span></>
                )}
              </div>
            </div>
            <div className="score-pod">
              <ScoreRing pct={score ?? 0} />
              <div className="score-label-lg">{grade || ''}</div>
            </div>
          </div>

          {/* Metrics */}
          <div className="metrics-row">
            {metrics.map(m => (
              <div key={m.label} className={`metric metric-${m.kind}`}>
                <div className="metric-head">
                  <span>{m.label}</span>
                  <b>{m.v != null ? `${arDigit(m.v)}ظھ` : 'â€”'}</b>
                </div>
                <div className="metric-bar">
                  <div style={{ width: `${m.v ?? 0}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Low quality warning */}
          {lowQualityAudio && (
            <div className="warn-banner">
              <strong>âڑ  طھط¹ط°ظ‘ط± طھط­ظ„ظٹظ„ ظ…ط¹ط¸ظ… ط§ظ„طھط³ط¬ظٹظ„.</strong>{' '}
              ظ†ط¸ط§ظ… ط§ظ„ظ…ط­ط§ط°ط§ط© ط§ظ„طµظˆطھظٹط© ظ„ظ… ظٹطھظ…ظƒظ† ظ…ظ† ط§ظ„ط±ط¨ط· ط¨ظٹظ† ط§ظ„طµظˆطھ ظˆط§ظ„ظ†طµ ظ„ظ€
              {' '}<strong>{arDigit(cpaeFallbackCount)} ظ…ظ† {arDigit(totalRef)}</strong> ظƒظ„ظ…ط©.
              ط§ظ„طھظ‚ظٹظٹظ…ط§طھ ظ‚ط¯ ظ„ط§ طھط¹ظƒط³ ط§ظ„طھظ„ط§ظˆط© ط§ظ„ظپط¹ظ„ظٹط© â€” ظٹظڈظپط¶ظژظ‘ظ„ ط¥ط¹ط§ط¯ط© ط§ظ„طھط³ط¬ظٹظ„ ظپظٹ ط¨ظٹط¦ط© ظ‡ط§ط¯ط¦ط©.
            </div>
          )}

          {/* Ayah review */}
          {alignments.length > 0 && (
            <div className="ayah-review">
              <h3 className="ar-title">ظ…ظڈط±ط§ط¬ظژط¹ط© ط§ظ„ط¢ظٹط©</h3>
              <p className="ayat-line t-quran" dir="rtl">
                {alignments.map(entry => {
                  const cls = statusToWordClass(entry.status)
                  const events = eventsMap.get(entry.word_index) ?? []
                  const warnEvs = events.filter(e => e.tajweed_check_status === 'WARNING' || e.tajweed_check_status === 'ERROR')
                  const ruleNames = warnEvs.map(e => RULE_AR[e.applied_rule ?? e.event_type] ?? (e.applied_rule ?? e.event_type)).join(' / ')
                  const word = entry.status === 'MISSED' ? entry.reference_word : (entry.asr_word || entry.reference_word)
                  const highlight = cls === 'warn' || cls === 'err'
                  const tip = highlight ? (ruleNames || entry.status) : undefined
                  return (
                    <span key={entry.word_index}>
                      <span className={`word ${highlight ? cls : ''}`} title={tip}>{word}</span>{' '}
                    </span>
                  )
                })}
              </p>
            </div>
          )}

          {/* Findings */}
          {findings.length > 0 && (
            <div className="findings-row">
              {findings.map((f, i) => (
                <div key={i} className={`finding finding-${f.kind}`}>
                  <div className="finding-head">
                    <span className={`finding-dot dot-${f.kind}`} />
                    <span className="finding-word t-quran">{f.word}</span>
                    <span className="finding-rule">{f.rule}</span>
                  </div>
                  <p className="finding-desc">{f.desc}</p>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="results-actions">
            <button className="btn btn-primary" onClick={onUploadAnother}>
              طھظژظ‚ظ’ظٹظٹظ… طھظگظ„ط§ظˆط© ط¬ظژط¯ظٹط¯ط© <ArrowLeft />
            </button>
            <button
              className="btn btn-ghost"
              onClick={async () => {
                if (reportRef.current) await exportToPDF(reportRef.current)
              }}
            >ط­ظپط¸ ط§ظ„طھظ‚ط±ظٹط±</button>
            <button
              className="btn btn-ghost"
              onClick={() => setTab('audio')}
            >ط§ظگط³ظ…ظژط¹ ط§ظ„طھظگظ‘ظ„ط§ظˆط© ط§ظ„طµظژظ‘ط­ظٹط­ط©</button>
          </div>
        </div>

        {/* Deep-data tabs */}
        <div className="rp-tabs">
          {TAB_ORDER.map(id => (
            <button
              key={id}
              className={`rp-tab ${tab === id ? 'active' : ''}`}
              onClick={() => setTab(id)}
            >
              {id === 'summary' && 'ط§ظ„طھظ‚ط±ظٹط±'}
              {id === 'words' && 'ط§ظ„ظƒظ„ظ…ط§طھ'}
              {id === 'madd' && 'ط§ظ„ظ…ط¯'}
              {id === 'audio' && 'ط§ظ„طµظˆطھ'}
              {id === 'details' && 'ط§ظ„طھظپط§طµظٹظ„'}
            </button>
          ))}
          <span className="rp-tab-indicator" style={tabIndicatorStyle} />
        </div>

        {/* Tab panels */}
        {tab === 'summary' && <SummaryPanel hr={hr} />}
        {tab === 'words' && (
          <WordsPanel
            alignments={alignments} eventsMap={eventsMap} errorDist={errorDist}
          />
        )}
        {tab === 'madd' && (
          <MaddPanel
            items={maddItems} lowQualityAudio={lowQualityAudio}
            fallbackCount={cpaeFallbackCount} totalRef={totalRef}
            tafkhimItems={tafkhimItems} tafkhimMeasured={tafkhimMeasured}
            tafkhimIssues={tafkhimIssues} baselineHz={baselineHz}
            saktaItems={saktaItems}
          />
        )}
        {tab === 'audio' && (
          <AudioPanel
            audioUrl={audioUrl ?? null} surah={surah}
            ayahStart={ayahStart} ayahEnd={ayahEnd}
          />
        )}
        {tab === 'details' && (
          <DetailsPanel report={report} waqfItems={waqfItems} />
        )}
      </div>
    </div>
  )
}

// â”€â”€â”€ Score Ring â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ScoreRing({ pct }: { pct: number }) {
  const r = 52, C = 2 * Math.PI * r
  const off = Math.max(0, Math.min(C, C - (pct / 100) * C))
  return (
    <div className="score-ring-lg">
      <svg viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} stroke="rgba(201,169,97,0.15)" strokeWidth="6" fill="none" />
        <circle
          cx="60" cy="60" r={r}
          stroke="url(#sg)" strokeWidth="6" fill="none"
          strokeDasharray={C} strokeDashoffset={off}
          transform="rotate(-90 60 60)" strokeLinecap="round"
        />
        <defs>
          <linearGradient id="sg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#E0BE74" />
            <stop offset="100%" stopColor="#C9A961" />
          </linearGradient>
        </defs>
      </svg>
      <div className="score-num-lg t-display">
        {arDigit(pct)}<span>ظھ</span>
      </div>
    </div>
  )
}

// â”€â”€â”€ Summary Panel (narrative) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function SummaryPanel({ hr }: { hr: HafizReport | null }): ReactNode {
  if (!hr) {
    return (
      <div className="rp-panel">
        <p style={{ color: 'var(--cream-dim)', fontSize: 14, textAlign: 'center' }}>
          ط§ظ„طھظ‚ط±ظٹط± ط§ظ„ظ†طµظٹ ط؛ظٹط± ظ…طھظˆظپظ‘ط± ظ„ظ‡ط°ظ‡ ط§ظ„طھظ„ط§ظˆط©.
        </p>
      </div>
    )
  }
  const sections = [
    { t: 'ط¯ظ‚ط© ط§ظ„ظƒظ„ظ…ط§طھ',     v: hr.accuracy_section },
    { t: 'ط£ط­ظƒط§ظ… ط§ظ„طھط¬ظˆظٹط¯',   v: hr.tajweed_section },
    { t: 'ط£ط­ظƒط§ظ… ط§ظ„ظ…ط¯',      v: hr.madd_section },
    { t: 'ط§ظ„ظˆظ‚ظپ',           v: hr.waqf_section },
    { t: 'ط§ظ„طھظپط®ظٹظ… ظˆط§ظ„طھط±ظ‚ظٹظ‚', v: hr.ra_section },
    { t: 'طھظ…ط§ط«ظ„ ط§ظ„ظ…ط¯ظˆط¯',    v: hr.consistency_section },
    { t: 'ط³ظ„ظˆظƒ ط§ظ„ظ‚ط§ط±ط¦',     v: hr.behavior_section },
  ].filter(s => s.v && s.v.trim())
  return (
    <div className="rp-panel narrative">
      {hr.opening && <p>{hr.opening}</p>}
      {sections.map(s => (
        <div key={s.t} className="narr-block">
          <div className="narr-title">{s.t}</div>
          <div className="narr-text">{s.v}</div>
        </div>
      ))}
      {hr.recommendations && hr.recommendations.length > 0 && (
        <div className="recs">
          <h4>ط§ظ„طھظˆطµظٹط§طھ</h4>
          <ol>{hr.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ol>
        </div>
      )}
      {hr.closing && <p className="narr-closing">{hr.closing}</p>}
    </div>
  )
}

// â”€â”€â”€ Words Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function WordsPanel({
  alignments, eventsMap, errorDist,
}: {
  alignments: WordAlignmentEntry[]
  eventsMap: Map<number, TajweedEventEntry[]>
  errorDist: ErrorDistribution[]
}) {
  const issueAlignments = alignments.filter(w => CONFIRMED_ERROR_STATUSES.has(w.status))
  const distWithIssues = errorDist.filter(ed => (ed.warning + ed.error) > 0)
  return (
    <div className="rp-panel">
      <h3>ط§ظ„ظƒظ„ظ…ط§طھ ط§ظ„طھظٹ طھط­طھط§ط¬ ظ…ط±ط§ط¬ط¹ط©</h3>
      {issueAlignments.length === 0 ? (
        <p style={{ color: 'var(--cream-dim)', fontSize: 13, textAlign: 'center', padding: 18 }}>
          ظ„ظ… طھظڈط±طµط¯ ط£ط®ط·ط§ط، ظ…ط¤ظƒط¯ط© ظپظٹ ط§ظ„ظƒظ„ظ…ط§طھ.
        </p>
      ) : (
        <div className="word-grid">
          {issueAlignments.map(entry => {
            const word = entry.status === 'MISSED' ? entry.reference_word : (entry.asr_word || entry.reference_word)
            const evs = eventsMap.get(entry.word_index) ?? []
            const ruleNames = evs
              .filter(e => e.tajweed_check_status === 'WARNING' || e.tajweed_check_status === 'ERROR')
              .map(e => RULE_AR[e.applied_rule ?? e.event_type] ?? (e.applied_rule ?? e.event_type))
            const marker = {
              SUBSTITUTION: 'â‰ ', SUFFIX_MATCH: '+', TASHKEEL_MISMATCH: '~', MISSED: 'â€”',
            }[entry.status as string] ?? ''
            const tip = ruleNames.length ? ruleNames.join(' آ· ') : entry.status
            return (
              <span key={entry.word_index} className={`wchip s-${entry.status}`} title={tip}>
                {marker && <span className="wchip-marker">{marker}</span>}
                {word}
              </span>
            )
          })}
        </div>
      )}
      <div className="legend">
        {[
          ['var(--gold)', 'ط§ط³طھط¨ط¯ط§ظ„ / طھط´ظƒظٹظ„'],
          ['#F0B070', 'ط­ط±ظپ ط²ط§ط¦ط¯'],
          ['var(--red-deep)', 'ظ…ظپظ‚ظˆط¯'],
        ].map(([c, l]) => (
          <span key={l} className="legend-item">
            <span className="legend-swatch" style={{ background: c }} />{l}
          </span>
        ))}
      </div>

      {distWithIssues.length > 0 && (
        <div>
          <h3 style={{ marginTop: 8 }}>ط§ظ„ظ…ظ„ط§ط­ط¸ط§طھ ط­ط³ط¨ ط§ظ„ظپط¦ط©</h3>
          {distWithIssues.map(ed => {
            const issues = ed.warning + ed.error
            const denom = Math.max(issues, 1)
            return (
              <div key={ed.rule_ar} className="dist-row">
                <div className="dist-head">
                  <span>{ed.rule_ar}</span>
                  <span>{arDigit(issues)} ظ…ظ„ط§ط­ط¸ط©</span>
                </div>
                <div className="dist-bar">
                  {ed.warning > 0 && <span className="seg-warn" style={{ width: `${(ed.warning / denom) * 100}%` }} />}
                  {ed.error > 0 && <span className="seg-err" style={{ width: `${(ed.error / denom) * 100}%` }} />}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// â”€â”€â”€ Madd Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function MaddPanel({
  items, lowQualityAudio, fallbackCount, totalRef,
  tafkhimIssues, baselineHz,
  saktaItems,
}: {
  items: MaddBarEntry[]
  lowQualityAudio: boolean
  fallbackCount: number
  totalRef: number
  tafkhimItems: TafkhimEntry[]
  tafkhimMeasured: TafkhimEntry[]
  tafkhimIssues: TafkhimEntry[]
  baselineHz: number | null
  saktaItems: SaktaEntry[]
}) {
  const fmtH = (h: number) => {
    const r = Math.round(h)
    return Math.abs(h - r) < 0.25 ? `${arDigit(r)}` : arDigit(h.toFixed(1))
  }

  return (
    <div className="rp-panel">
      <h3>ط£ط­ظƒط§ظ… ط§ظ„ظ…ط¯</h3>
      {lowQualityAudio && (
        <div className="warn-banner" style={{ fontSize: 12 }}>
          <strong>ط¬ظˆط¯ط© ط§ظ„طµظˆطھ ظ…ظ†ط®ظپط¶ط©</strong> â€” طھط¹ط°ظ‘ط±طھ ظ…ط­ط§ط°ط§ط© {arDigit(fallbackCount)} ظ…ظ† {arDigit(totalRef)} ظƒظ„ظ…ط©.
          ظ‚ظٹط§ط³ط§طھ ط§ظ„ظ…ط¯ظ‘ ط§ظ„طھط§ظ„ظٹط© ط؛ظٹط± ظ…ظˆط«ظˆظ‚ط©.
        </div>
      )}
      {(() => {
        const maddIssues = items.filter(m => {
          const unreliable = m.measurement_reliable === false || m.verdict === 'PENDING'
          return !unreliable && m.zone !== 'OK'
        })
        if (maddIssues.length === 0) {
          return (
            <p style={{ color: 'var(--cream-dim)', fontSize: 13, textAlign: 'center', padding: 18 }}>
              ظ„ط§ طھظˆط¬ط¯ ظ…ظ„ط§ط­ط¸ط§طھ ظ…ط¤ظƒط¯ط© ط¹ظ„ظ‰ ط§ظ„ظ…ط¯ظˆط¯.
            </p>
          )
        }
        return (
          <>
            <p style={{ color: 'var(--cream-dim)', fontSize: 12 }}>
              {arDigit(maddIssues.length)} ظ…ط¯ظ‘ ظٹط­طھط§ط¬ ظ…ط±ط§ط¬ط¹ط©
            </p>
            {maddIssues.map((m, i) => {
              const measuredH = m.harakah_ms > 0 ? m.measured_ms / m.harakah_ms : 0
              const refH = m.harakah_ms > 0 ? m.ref_ms / m.harakah_ms : 0
              const cls = (m.zone === 'SHORT' || m.zone === 'LONG') ? 'madd-warn' : 'madd-err'
              return (
                <div key={i} className="madd-card">
                  <div className="madd-left">
                    <div className="mw">{m.word_text || 'â€”'}</div>
                    <div className="ml">
                      {m.madd_label_ar}
                      {m.performance_transformed && (
                        <span className="tag-mode">آ· {m.performance_mode === 'WAQF' ? 'ط¹ظ†ط¯ ط§ظ„ظˆظ‚ظپ' : 'ط¹ظ†ط¯ ط§ظ„ظˆطµظ„'}</span>
                      )}
                    </div>
                  </div>
                  <div className="madd-right">
                    <div className={`mv ${cls}`}>
                      <span>{fmtH(measuredH)}</span>
                      <span className="sep">/</span>
                      <span className="ref">{fmtH(refH)}</span>
                      <span className="unit">ط­ط±ظƒط§طھ</span>
                    </div>
                    {m.inconsistent_with_peers && (
                      <div className="note">ط؛ظٹط± ظ…ظ†ط¶ط¨ط· ظ…ط¹ ظ…ط«ظ„ظ‡</div>
                    )}
                  </div>
                </div>
              )
            })}
          </>
        )
      })()}

      {/* Tafkhim / Tarqiq â€” confirmed issues only */}
      {tafkhimIssues.length > 0 && (
        <>
          <h3 style={{ marginTop: 12 }}>ط§ظ„طھظپط®ظٹظ… ظˆط§ظ„طھط±ظ‚ظٹظ‚</h3>
          <p style={{ color: 'var(--gold-bright)', fontSize: 12 }}>
            {arDigit(tafkhimIssues.length)} ظ…ظ„ط§ط­ط¸ط© طھط³طھط¯ط¹ظٹ ط§ظ„ظ…ط±ط§ط¬ط¹ط©
            {baselineHz != null && (
              <> آ· ط¨طµظ…ط© ط§ظ„ظ‚ط§ط±ط¦: F2 = <span style={{ fontVariantNumeric: 'tabular-nums' }}>{arDigit(Math.round(baselineHz))}</span> Hz</>
            )}
          </p>
          {tafkhimIssues.map((t, i) => {
            const isLam = t.kind === 'lam_jalalah'
            const label = isLam
              ? (t.expected === 'TARQIQ' ? 'طھط±ظ‚ظٹظ‚ ظ„ط§ظ… ط§ظ„ط¬ظ„ط§ظ„ط©' : 'طھظپط®ظٹظ… ظ„ط§ظ… ط§ظ„ط¬ظ„ط§ظ„ط©')
              : `طھظپط®ظٹظ… ${t.letter_name ? (LETTER_AR[t.letter_name] ?? t.letter_name) : ''}`
            return (
              <div key={i} className="madd-card">
                <div className="madd-left">
                  <div className="mw">{t.word_text}</div>
                  <div className="ml">{label}</div>
                </div>
                <div className="madd-right">
                  {t.f2_min_hz != null && (
                    <div className="mv madd-err" style={{ fontSize: 14 }}>
                      {arDigit(Math.round(t.f2_min_hz))} Hz
                      {t.f2_ratio != null && (
                        <span className="ref" style={{ marginInlineStart: 6, fontSize: 12 }}>
                          (ظ†ط³ط¨ط© {t.f2_ratio.toFixed(2)})
                        </span>
                      )}
                    </div>
                  )}
                  <div className="note madd-err" style={{ color: 'inherit' }}>
                    {t.detected === 'WEAK_TAFKHIM' ? 'طھظپط®ظٹظ… ط¶ط¹ظٹظپ' : 'ظ„ظ… ظٹطھط­ظ‚ظ‚ ط§ظ„ط­ظƒظ… ط§ظ„ظ…طھظˆظ‚ظ‘ط¹'}
                  </div>
                </div>
              </div>
            )
          })}
        </>
      )}

      {/* Sakta â€” confirmed issues only (exclude OK and JAIZ INFO) */}
      {saktaItems.filter(s => s.verdict === 'ISSUE' || s.verdict === 'WARNING').length > 0 && (
        <>
          <h3 style={{ marginTop: 12 }}>ط§ظ„ط³ظƒطھ</h3>
          {saktaItems.filter(s => s.verdict === 'ISSUE' || s.verdict === 'WARNING').map((s, i) => {
            const isIssue = s.verdict === 'ISSUE'
            const cls = isIssue ? 'madd-err' : 'madd-warn'
            const obligAr = s.obligation === 'WAJIB' ? 'ظˆط§ط¬ط¨ط©' : 'ط¬ط§ط¦ط²ط©'
            const verdictAr =
              s.probe_verdict === 'MISSING' ? 'ظ„ظ… ظٹظڈظ†ظپظژظ‘ط°' :
              s.probe_verdict === 'TOO_SHORT' ? 'ظ‚طµظٹط±' :
              s.probe_verdict === 'TOO_LONG' ? 'ط·ظˆظٹظ„' :
              s.probe_verdict === 'OVER_WAQF' ? 'ظˆظ‚ظپ ظƒط§ظ…ظ„' :
              s.probe_verdict === 'OK' ? 'ظ…ظ†ط¶ط¨ط·' : 'â€”'
            const trig = s.trigger_word ?? ''
            const nxt = s.next_word ?? ''
            return (
              <div key={i} className="madd-card">
                <div className="madd-left">
                  <div className="mw">{trig}{nxt ? ` â†گ ${nxt}` : ''}</div>
                  <div className="ml">ط³ظƒطھ {obligAr}</div>
                </div>
                <div className="madd-right">
                  {s.gap_ms != null ? (
                    <>
                      <div className={`mv ${cls}`} style={{ fontSize: 14 }}>
                        {arDigit(Math.round(s.gap_ms))} ms
                      </div>
                      <div className={`note ${cls}`} style={{ color: 'inherit' }}>
                        {verdictAr}
                      </div>
                    </>
                  ) : (
                    <div className="note" style={{ fontStyle: 'italic' }}>ط¨ط¯ظˆظ† ظ‚ظٹط§ط³</div>
                  )}
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

// â”€â”€â”€ Audio Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function AudioPanel({
  audioUrl, surah, ayahStart, ayahEnd,
}: {
  audioUrl: string | null; surah: number; ayahStart: number; ayahEnd: number
}) {
  const [reciter, setReciter] = useState<string>(RECITERS[0].id)
  const [playing, setPlaying] = useState<number | null>(null)
  const ref = useRef<HTMLAudioElement>(null)
  const ayahs = Array.from({ length: ayahEnd - ayahStart + 1 }, (_, i) => ayahStart + i)

  const play = (a: number) => {
    if (ref.current) {
      ref.current.src = ayahAudioUrl(reciter, surah, a)
      ref.current.play().catch(() => {})
      setPlaying(a)
      ref.current.onended = () => setPlaying(null)
    }
  }

  return (
    <div className="rp-panel">
      <h3>طھظ„ط§ظˆطھظƒ</h3>
      {audioUrl ? (
        <audio controls src={audioUrl} preload="metadata" />
      ) : (
        <p style={{ color: 'var(--cream-dim)', fontSize: 13, textAlign: 'center', padding: 14 }}>
          ط§ظ„ظ…ظ„ظپ ط§ظ„طµظˆطھظٹ ط؛ظٹط± ظ…طھط§ط­
        </p>
      )}

      <h3>طھظ„ط§ظˆط© ظ…ط±ط¬ط¹ظٹط©</h3>
      <div className="reciter-pills">
        {RECITERS.map(r => (
          <button
            key={r.id}
            className={`reciter-pill ${reciter === r.id ? 'active' : ''}`}
            onClick={() => { setReciter(r.id); setPlaying(null) }}
          >{r.short}</button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {ayahs.map(a => (
          <button
            key={a}
            className={`ayah-row ${playing === a ? 'on' : ''}`}
            onClick={() => play(a)}
          >
            <span>ط§ظ„ط¢ظٹط© {arDigit(a)}</span>
            <span style={{ fontSize: 16 }}>{playing === a ? 'âڈ¸' : 'â–¶'}</span>
          </button>
        ))}
      </div>
      <audio ref={ref} preload="none" />

      <p style={{ color: 'var(--cream-dim)', fontSize: 10, textAlign: 'center' }}>
        ط§ظ„ظ…طµط¯ط±: EveryAyah.com â€” ط§ط³طھظ…ط¹ ظ„ظ„ظ‚ط§ط±ط¦ ط§ظ„ظ…ط±ط¬ط¹ظٹ ط«ظ… ظ‚ط§ط±ظ† ط¨طھظ„ط§ظˆطھظƒ
      </p>
    </div>
  )
}

// â”€â”€â”€ Details Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function DetailsPanel({
  report, waqfItems,
}: {
  report: EvaluateFileResponse
  waqfItems: EvaluateFileResponse['ayah_boundary_waqf']
}) {
  const behaviorEvents = report.behavior_events ?? []
  const tajweedEvents = report.tajweed_events ?? []
  const warnEvents = tajweedEvents.filter(e => e.tajweed_check_status === 'WARNING' || e.tajweed_check_status === 'ERROR')

  return (
    <div className="rp-panel">
      {/* Waqf â€” only missed stops (wasl where waqf expected) */}
      {waqfItems && waqfItems.filter(w => !w.is_waqf).length > 0 && (
        <div>
          <h3>ظˆظ‚ظˆظپ ظ„ظ… طھظڈط·ط¨ظژظ‘ظ‚</h3>
          <div className="waqf-chips">
            {waqfItems.filter(w => !w.is_waqf).map(ev => (
              <span key={ev.ayah_code} className="waqf-chip">
                <span className="qw t-quran">{ev.word_text || ev.ayah_code}</span>
                <span style={{ opacity: 0.7 }}>ظˆطµظ„</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Pipeline */}
      {report.pipeline_status && report.pipeline_status !== 'EXACT' && (
        <div>
          <h3>ط­ط§ظ„ط© ط§ظ„ظ…ط·ط§ط¨ظ‚ط©</h3>
          <span className="pill warn">{report.pipeline_status}</span>
        </div>
      )}

      {/* Tajweed events â€” issues only */}
      {warnEvents.length > 0 && (
        <div>
          <h3>ظ…ظ„ط§ط­ط¸ط§طھ ط§ظ„طھط¬ظˆظٹط¯</h3>
          <p style={{ color: 'var(--cream-dim)', fontSize: 12 }}>
            طھط­ط°ظٹط± {arDigit(tajweedEvents.filter(e => e.tajweed_check_status === 'WARNING').length)}
            {' آ· '}ط®ط·ط£ {arDigit(tajweedEvents.filter(e => e.tajweed_check_status === 'ERROR').length)}
          </p>
          {warnEvents.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {warnEvents.slice(0, 20).map((ev, i) => (
                <span key={i} className={`pill ${ev.tajweed_check_status === 'ERROR' ? 'err' : 'warn'}`}>
                  <span className="t-quran" style={{ fontSize: 14 }}>{ev.word_text}</span>
                  <span style={{ opacity: 0.75 }}>{RULE_AR[ev.applied_rule ?? ev.event_type] ?? (ev.applied_rule ?? ev.event_type)}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Behavior */}
      {behaviorEvents.length > 0 && (
        <div>
          <h3>ط³ظ„ظˆظƒ ط§ظ„ظ‚ط§ط±ط¦</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {behaviorEvents.map((be, i) => (
              <span key={i} className="pill blue">
                {be.type === 'REPETITION' ? `طھظƒط±ط§ط±: ${be.word ?? ''}` : 'ط¥ط¹ط§ط¯ط© ظ…ظ† ط£ظˆظ„ ط§ظ„ط¢ظٹط©'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ASR text */}
      {report.asr_text && (
        <details>
          <summary>ط§ظ„ظ†طµ ط§ظ„ظ…ظڈط³طھط®ط±ظژط¬ ظ…ظ† ط§ظ„طھط³ط¬ظٹظ„</summary>
          <p className="asr">{report.asr_text}</p>
        </details>
      )}
    </div>
  )
}

// â”€â”€â”€ Icons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function AudioFile() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M4 2h8l4 4v12H4V2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M12 2v4h4M8 12v3M10 10v5M12 11v4M14 13v1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
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
