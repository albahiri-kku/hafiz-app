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
  MADD_TABII: 'مد طبيعي', MADD_LAZIM: 'مد لازم كلمي', MADD_WAJIB_MUTTASIL: 'مد واجب متصل',
  MADD_MUNFASIL: 'مد منفصل', MADD_AARID_LISUKOON: 'مد عارض للسكون', MADD_LIN: 'مد لين',
  NOON_SAKINAH_IZHAR: 'إظهار', NOON_SAKINAH_IDGHAM: 'إدغام', NOON_SAKINAH_IQLAB: 'إقلاب',
  NOON_SAKINAH_IKHFAA: 'إخفاء', MEEM_SAKINAH_IZHAR_SHAFAWI: 'إظهار شفوي',
  MEEM_SAKINAH_IDGHAM_SHAFAWI: 'إدغام شفوي', MEEM_SAKINAH_IKHFAA_SHAFAWI: 'إخفاء شفوي',
  QALQALA: 'قلقلة', GHUNNA: 'غنة',
}

const LETTER_AR: Record<string, string> = {
  khaa: 'الخاء', saad: 'الصاد', daad: 'الضاد', taa: 'الطاء',
  zhaa: 'الظاء', ghayn: 'الغين', qaaf: 'القاف',
}

type TabId = 'summary' | 'words' | 'madd' | 'audio' | 'details'
const TAB_ORDER: TabId[] = ['summary', 'words', 'madd', 'audio', 'details']

const RECITERS = [
  { id: 'Alafasy_128kbps', short: 'العفاسي' },
  { id: 'Abdurrahmaan_As-Sudais_192kbps', short: 'السديس' },
  { id: 'Saood_ash-Shuraym_128kbps', short: 'الشريم' },
  { id: 'Husary_128kbps', short: 'الحصري' },
  { id: 'Minshawy_Murattal_128kbps', short: 'المنشاوي' },
] as const

function ayahAudioUrl(reciterId: string, surah: number, ayah: number): string {
  const s = String(surah).padStart(3, '0'); const a = String(ayah).padStart(3, '0')
  return `https://everyayah.com/data/${reciterId}/${s}${a}.mp3`
}

function normAr(s: string | null | undefined): string {
  return (s || '')
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').trim()
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
    alert('تعذّر تصدير التقرير. تأكد من اتصال الإنترنت وأعد المحاولة.')
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function arDigit(n: number | string): string {
  const map: Record<string, string> = { '0':'٠','1':'١','2':'٢','3':'٣','4':'٤','5':'٥','6':'٦','7':'٧','8':'٨','9':'٩' }
  return String(n).replace(/[0-9]/g, d => map[d] ?? d)
}

function statusToWordClass(s: WordAlignmentEntry['status']): string {
  switch (s) {
    case 'MATCH': return 'good'
    case 'LOW_CONFIDENCE_MATCH':
    case 'SUBSTITUTION':
    case 'SUFFIX_MATCH':
    case 'TASHKEEL_MISMATCH': return 'warn'
    case 'CPAE_FALLBACK':
    case 'MISSED': return 'err'
    case 'EXTRA': return 'extra'
    default: return ''
  }
}

interface MetricData { label: string; v: number | null; kind: 'ok' | 'warn' | 'err' | 'none' }

function kindFor(pct: number | null, goodAt = 80, warnAt = 60): MetricData['kind'] {
  if (pct == null) return 'none'
  if (pct >= goodAt) return 'ok'
  if (pct >= warnAt) return 'warn'
  return 'err'
}

// ─── Main ──────────────────────────────────────────────────────────────────

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

  const surahName = SURAH_NAMES[surah] ?? `سورة ${surah}`
  const range = ayahStart === ayahEnd
    ? `الآية ${arDigit(ayahStart)}`
    : `الآيات ${arDigit(ayahStart)}\u2013${arDigit(ayahEnd)}`

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
    score >= 90 ? 'ممتاز' : score >= 75 ? 'جيد جداً' : score >= 60 ? 'جيد' : 'يحتاج تحسين'
  )

  const metrics: MetricData[] = [
    { label: 'مَخارج الحُروف', v: accuracy,   kind: kindFor(accuracy, 85, 70) },
    { label: 'أحكام التَّجويد', v: tajweedPct, kind: kindFor(tajweedPct, 80, 60) },
    { label: 'المُدود',         v: maddOk,     kind: kindFor(maddOk, 75, 55) },
    { label: 'الإيقاع والتَّرتيل', v: waqfOk,  kind: kindFor(waqfOk, 80, 60) },
  ]

  const errorDist: ErrorDistribution[] = hr?.error_distribution ?? []

  const tafkhimItems: TafkhimEntry[] = (report.word_gated_summary?.tafkhim_summary ?? []) as TafkhimEntry[]
  const saktaItems: SaktaEntry[] = (report.word_gated_summary?.sakta_summary ?? []) as SaktaEntry[]
  const baselineHz = (report.word_gated_summary?.reciter_baseline_hz ?? null) as number | null
  const tafkhimMeasured = tafkhimItems.filter(t => t.acoustic === 'MEASURED')
  const tafkhimIssues = tafkhimMeasured.filter(t =>
    t.verdict === 'ISSUE' || t.verdict === 'WEAK_TAFKHIM' ||
    (t.expected && t.detected && t.expected !== t.detected && t.detected !== 'AMBIGUOUS'),
  )

  // Compute findings: top 5 issue words
  const findings = useMemo(() => {
    const out: Array<{ kind: 'err' | 'warn' | 'ok'; word: string; rule: string; desc: string }> = []
    // 1. missed / substitution / CPAE_FALLBACK
    for (const w of alignments) {
      if (out.length >= 5) break
      if (w.status === 'MISSED') out.push({ kind: 'err', word: w.reference_word, rule: 'كلمة مفقودة', desc: 'لم تُقرأ هذه الكلمة.' })
      else if (w.status === 'SUBSTITUTION') out.push({ kind: 'warn', word: w.asr_word || w.reference_word, rule: 'استبدال كلمة', desc: `المرجع: ${w.reference_word}` })
      else if (w.status === 'CPAE_FALLBACK') out.push({ kind: 'err', word: w.reference_word || w.asr_word, rule: 'غير مسموعة', desc: 'لم يتمكن النظام من محاذاة الصوت بهذه الكلمة.' })
    }
    // 2. madd errors
    for (const m of maddItems) {
      if (out.length >= 5) break
      if (m.zone === 'CRITICAL_SHORT' || m.verdict === 'ERROR') {
        const hmRef = m.harakah_ms > 0 ? Math.round(m.ref_ms / m.harakah_ms) : 0
        out.push({ kind: 'err', word: m.word_text || '—', rule: m.madd_label_ar, desc: `المطلوب حوالي ${arDigit(hmRef)} حركات.` })
      } else if (m.zone === 'SHORT' || m.zone === 'LONG' || m.verdict === 'WARNING') {
        out.push({ kind: 'warn', word: m.word_text || '—', rule: m.madd_label_ar, desc: m.zone === 'SHORT' ? 'المدّ أقل من المطلوب.' : 'المدّ أطول من المطلوب.' })
      }
    }
    // 3. tafkhim issues
    for (const t of tafkhimIssues) {
      if (out.length >= 5) break
      const letterAr = t.letter_name ? (LETTER_AR[t.letter_name] ?? t.letter_name) : ''
      out.push({
        kind: 'warn',
        word: t.word_text,
        rule: t.kind === 'lam_jalalah' ? 'لام الجلالة' : `تفخيم ${letterAr}`,
        desc: t.verdict === 'WEAK_TAFKHIM' ? 'التفخيم ضعيف عن المتوقّع.' : 'لم يتحقق الحكم المتوقّع.',
      })
    }
    return out.slice(0, 5)
  }, [alignments, maddItems, tafkhimIssues])

  // ─── Tab indicator position ──
  const tabIdx = TAB_ORDER.indexOf(tab)
  const tabIndicatorStyle = {
    transform: `translateX(${tabIdx * -100}%)`,
  } as React.CSSProperties

  return (
    <div className="hafiz-report" dir="rtl">
      <div className="ru-container">
        {/* Top bar */}
        <div className="rp-topbar">
          <a onClick={onHome}>← الرئيسية</a>
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
            >حفظ PDF</button>
          </div>
        </div>

        <p className="rp-notice">
          تقرير حافظ يُنتَج بواسطة الذكاء الاصطناعي وقد يحتوي على بعض الأخطاء التي تستلزم المراجعة والتدقيق من معلّم قرآن.
        </p>

        {/* Results card */}
        <div className="ru-card results" ref={reportRef}>
          <div className="results-head">
            <div>
              <div className="t-eyebrow solo">نَتيجَة التَّقييم</div>
              <h2 className="results-title t-display">سُورة {surahName} · {range}</h2>
              <div className="results-meta">
                <AudioFile />
                <span>{alignments.length > 0 ? `${arDigit(alignments.length)} كلمة` : 'التلاوة'}</span>
                {report.total_runtime_sec != null && (
                  <><span className="dot">·</span><span>{arDigit(report.total_runtime_sec.toFixed(0))} ثانية تحليل</span></>
                )}
                {findings.length > 0 && (
                  <><span className="dot">·</span><span>اكتُشِفت {arDigit(findings.length)} ملاحظة</span></>
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
                  <b>{m.v != null ? `${arDigit(m.v)}٪` : '—'}</b>
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
              <strong>⚠ تعذّر تحليل معظم التسجيل.</strong>{' '}
              نظام المحاذاة الصوتية لم يتمكن من الربط بين الصوت والنص لـ
              {' '}<strong>{arDigit(cpaeFallbackCount)} من {arDigit(totalRef)}</strong> كلمة.
              التقييمات قد لا تعكس التلاوة الفعلية — يُفضَّل إعادة التسجيل في بيئة هادئة.
            </div>
          )}

          {/* Ayah review */}
          {alignments.length > 0 && (
            <div className="ayah-review">
              <h3 className="ar-title">مُراجَعة الآية</h3>
              <p className="ayat-line t-quran" dir="rtl">
                {alignments.map(entry => {
                  const cls = statusToWordClass(entry.status)
                  const events = eventsMap.get(entry.word_index) ?? []
                  const ruleNames = events.map(e => RULE_AR[e.applied_rule ?? e.event_type] ?? (e.applied_rule ?? e.event_type)).join(' / ')
                  const word = entry.status === 'MISSED' ? entry.reference_word : (entry.asr_word || entry.reference_word)
                  const tip = ruleNames || (entry.status !== 'MATCH' ? entry.status : '')
                  return (
                    <span key={entry.word_index}>
                      <span className={`word ${cls}`} title={tip || undefined}>{word}</span>{' '}
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
              تَقْييم تِلاوة جَديدة <ArrowLeft />
            </button>
            <button
              className="btn btn-ghost"
              onClick={async () => {
                if (reportRef.current) await exportToPDF(reportRef.current)
              }}
            >حفظ التقرير</button>
            <button
              className="btn btn-ghost"
              onClick={() => setTab('audio')}
            >اِسمَع التِّلاوة الصَّحيحة</button>
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
              {id === 'summary' && 'التقرير'}
              {id === 'words' && 'الكلمات'}
              {id === 'madd' && 'المد'}
              {id === 'audio' && 'الصوت'}
              {id === 'details' && 'التفاصيل'}
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

// ─── Score Ring ─────────────────────────────────────────────────────────────

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
        {arDigit(pct)}<span>٪</span>
      </div>
    </div>
  )
}

// ─── Summary Panel (narrative) ─────────────────────────────────────────────

function SummaryPanel({ hr }: { hr: HafizReport | null }): ReactNode {
  if (!hr) {
    return (
      <div className="rp-panel">
        <p style={{ color: 'var(--cream-dim)', fontSize: 14, textAlign: 'center' }}>
          التقرير النصي غير متوفّر لهذه التلاوة.
        </p>
      </div>
    )
  }
  const sections = [
    { t: 'دقة الكلمات',     v: hr.accuracy_section },
    { t: 'أحكام التجويد',   v: hr.tajweed_section },
    { t: 'أحكام المد',      v: hr.madd_section },
    { t: 'الوقف',           v: hr.waqf_section },
    { t: 'التفخيم والترقيق', v: hr.ra_section },
    { t: 'تماثل المدود',    v: hr.consistency_section },
    { t: 'سلوك القارئ',     v: hr.behavior_section },
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
          <h4>التوصيات</h4>
          <ol>{hr.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ol>
        </div>
      )}
      {hr.closing && <p className="narr-closing">{hr.closing}</p>}
    </div>
  )
}

// ─── Words Panel ────────────────────────────────────────────────────────────

function WordsPanel({
  alignments, eventsMap, errorDist,
}: {
  alignments: WordAlignmentEntry[]
  eventsMap: Map<number, TajweedEventEntry[]>
  errorDist: ErrorDistribution[]
}) {
  return (
    <div className="rp-panel">
      <h3>الكلمات المُقيَّمة</h3>
      <div className="word-grid">
        {alignments.map(entry => {
          const word = entry.status === 'MISSED' ? entry.reference_word : (entry.asr_word || entry.reference_word)
          const evs = eventsMap.get(entry.word_index) ?? []
          const ruleNames = evs.map(e => RULE_AR[e.applied_rule ?? e.event_type] ?? (e.applied_rule ?? e.event_type))
          const marker = {
            MATCH: '', LOW_CONFIDENCE_MATCH: '?', SUBSTITUTION: '≠',
            SUFFIX_MATCH: '+', TASHKEEL_MISMATCH: '~', CPAE_FALLBACK: '·',
            EXTRA: '+', MISSED: '—',
          }[entry.status] ?? ''
          const tip = ruleNames.length ? ruleNames.join(' · ') : entry.status !== 'MATCH' ? entry.status : undefined
          return (
            <span key={entry.word_index} className={`wchip s-${entry.status}`} title={tip}>
              {marker && <span className="wchip-marker">{marker}</span>}
              {word}
            </span>
          )
        })}
      </div>
      <div className="legend">
        {[
          ['var(--emerald-bright)', 'مطابق'],
          ['var(--gold)', 'ثقة منخفضة / استبدال'],
          ['#F0B070', 'حرف زائد / تشكيل'],
          ['var(--red-deep)', 'مفقود / غير مسموع'],
        ].map(([c, l]) => (
          <span key={l} className="legend-item">
            <span className="legend-swatch" style={{ background: c }} />{l}
          </span>
        ))}
      </div>

      {errorDist.length > 0 && (
        <div>
          <h3 style={{ marginTop: 8 }}>توزيع الأحكام</h3>
          {errorDist.map(ed => {
            const total = Math.max(ed.total, 1)
            return (
              <div key={ed.rule_ar} className="dist-row">
                <div className="dist-head">
                  <span>{ed.rule_ar}</span>
                  <span>{arDigit(ed.ok)} / {arDigit(ed.total)}</span>
                </div>
                <div className="dist-bar">
                  {ed.ok > 0 && <span className="seg-ok" style={{ width: `${(ed.ok / total) * 100}%` }} />}
                  {ed.warning > 0 && <span className="seg-warn" style={{ width: `${(ed.warning / total) * 100}%` }} />}
                  {ed.error > 0 && <span className="seg-err" style={{ width: `${(ed.error / total) * 100}%` }} />}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Madd Panel ────────────────────────────────────────────────────────────

function MaddPanel({
  items, lowQualityAudio, fallbackCount, totalRef,
  tafkhimItems, tafkhimMeasured, tafkhimIssues, baselineHz,
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
      <h3>أحكام المد</h3>
      {lowQualityAudio && (
        <div className="warn-banner" style={{ fontSize: 12 }}>
          <strong>جودة الصوت منخفضة</strong> — تعذّرت محاذاة {arDigit(fallbackCount)} من {arDigit(totalRef)} كلمة.
          قياسات المدّ التالية غير موثوقة.
        </div>
      )}
      {items.length === 0 ? (
        <p style={{ color: 'var(--cream-dim)', fontSize: 13, textAlign: 'center', padding: 24 }}>
          لا توجد أحكام مدّ في هذا النطاق.
        </p>
      ) : (
        <>
          <p style={{ color: 'var(--cream-dim)', fontSize: 12 }}>
            {arDigit(items.filter(m => m.zone === 'OK').length)} / {arDigit(items.length)} ضمن النطاق
          </p>
          {items.map((m, i) => {
            const measuredH = m.harakah_ms > 0 ? m.measured_ms / m.harakah_ms : 0
            const refH = m.harakah_ms > 0 ? m.ref_ms / m.harakah_ms : 0
            const unreliable = m.measurement_reliable === false || m.verdict === 'PENDING'
            const cls =
              unreliable ? 'madd-none' :
              m.zone === 'OK' ? 'madd-ok' :
              (m.zone === 'SHORT' || m.zone === 'LONG') ? 'madd-warn' : 'madd-err'
            return (
              <div key={i} className="madd-card">
                <div className="madd-left">
                  <div className="mw">{m.word_text || '—'}</div>
                  <div className="ml">
                    {m.madd_label_ar}
                    {m.performance_transformed && (
                      <span className="tag-mode">· {m.performance_mode === 'WAQF' ? 'عند الوقف' : 'عند الوصل'}</span>
                    )}
                  </div>
                </div>
                <div className="madd-right">
                  {unreliable ? (
                    <>
                      <div className="mv" style={{ fontSize: 13 }}>
                        <span className="ref">المرجع {fmtH(refH)}</span>
                        <span className="unit">حركات</span>
                      </div>
                      <div className="note">غير مقاس صوتياً</div>
                    </>
                  ) : (
                    <>
                      <div className={`mv ${cls}`}>
                        <span>{fmtH(measuredH)}</span>
                        <span className="sep">/</span>
                        <span className="ref">{fmtH(refH)}</span>
                        <span className="unit">حركات</span>
                      </div>
                      {m.inconsistent_with_peers && (
                        <div className="note">غير منضبط مع مثله</div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </>
      )}

      {/* Tafkhim / Tarqiq */}
      {tafkhimItems.length > 0 && (
        <>
          <h3 style={{ marginTop: 12 }}>التفخيم والترقيق</h3>
          <p style={{ color: 'var(--cream-dim)', fontSize: 11 }}>
            {arDigit(tafkhimMeasured.length)} مقاس صوتياً من {arDigit(tafkhimItems.length)}
            {baselineHz != null && (
              <> · بصمة القارئ: F2 = <span style={{ fontVariantNumeric: 'tabular-nums' }}>{arDigit(Math.round(baselineHz))}</span> Hz</>
            )}
          </p>
          {tafkhimIssues.length > 0 && (
            <p style={{ color: 'var(--gold-bright)', fontSize: 12 }}>
              {arDigit(tafkhimIssues.length)} ملاحظة تستدعي المراجعة
            </p>
          )}
          {tafkhimItems.map((t, i) => {
            const isLam = t.kind === 'lam_jalalah'
            const label = isLam
              ? (t.expected === 'TARQIQ' ? 'ترقيق لام الجلالة' : 'تفخيم لام الجلالة')
              : `تفخيم ${t.letter_name ? (LETTER_AR[t.letter_name] ?? t.letter_name) : ''}`
            const isIssue = t.verdict === 'ISSUE' || t.verdict === 'WEAK_TAFKHIM' ||
              (isLam && t.expected && t.detected && t.expected !== t.detected && t.detected !== 'AMBIGUOUS')
            const measured = t.acoustic === 'MEASURED'
            const cls = !measured ? 'madd-none' : isIssue ? 'madd-err' : 'madd-ok'
            return (
              <div key={i} className="madd-card">
                <div className="madd-left">
                  <div className="mw">{t.word_text}</div>
                  <div className="ml">{label}</div>
                </div>
                <div className="madd-right">
                  {measured && t.f2_min_hz != null ? (
                    <>
                      <div className={`mv ${cls}`} style={{ fontSize: 14 }}>
                        {arDigit(Math.round(t.f2_min_hz))} Hz
                        {t.f2_ratio != null && (
                          <span className="ref" style={{ marginInlineStart: 6, fontSize: 12 }}>
                            (نسبة {t.f2_ratio.toFixed(2)})
                          </span>
                        )}
                      </div>
                      <div className={`note ${cls}`} style={{ color: 'inherit' }}>
                        {t.detected === 'TAFKHIM_OK' ? 'تفخيم صحيح' :
                         t.detected === 'WEAK_TAFKHIM' ? 'تفخيم ضعيف' :
                         t.detected === 'TAFKHIM' ? 'تفخيم' :
                         t.detected === 'TARQIQ' ? 'ترقيق' :
                         t.detected === 'AMBIGUOUS' ? 'ضمن النطاق' : '—'}
                      </div>
                    </>
                  ) : (
                    <div className="note" style={{ fontStyle: 'italic' }}>بدون قياس صوتي</div>
                  )}
                </div>
              </div>
            )
          })}
        </>
      )}

      {/* Sakta — 5 canonical + Anfal-Tawbah juncture */}
      {saktaItems.length > 0 && (
        <>
          <h3 style={{ marginTop: 12 }}>السكت</h3>
          <p style={{ color: 'var(--cream-dim)', fontSize: 11 }}>
            {arDigit(saktaItems.length)} موضع سكت — سكتات رواية حفص عن عاصم
          </p>
          {saktaItems.map((s, i) => {
            const measured = s.acoustic === 'MEASURED'
            const isIssue = s.verdict === 'ISSUE'
            const isWeak = s.verdict === 'WEAK'
            const cls = !measured ? 'madd-none' : isIssue ? 'madd-err' : isWeak ? 'madd-warn' : 'madd-ok'
            const obligAr = s.obligation === 'WAJIB' ? 'واجب' : 'جائز'
            const verdictAr =
              s.probe_verdict === 'MISSING' ? 'لم يُنفَّذ' :
              s.probe_verdict === 'TOO_SHORT' ? 'قصير' :
              s.probe_verdict === 'TOO_LONG' ? 'طويل' :
              s.probe_verdict === 'OVER_WAQF' ? 'وقف كامل' :
              s.probe_verdict === 'OK' ? 'منضبط' : '—'
            return (
              <div key={i} className="madd-card">
                <div className="madd-left">
                  <div className="mw">{s.word_text}</div>
                  <div className="ml">سكت {obligAr}</div>
                </div>
                <div className="madd-right">
                  {measured && s.gap_ms != null ? (
                    <>
                      <div className={`mv ${cls}`} style={{ fontSize: 14 }}>
                        {arDigit(Math.round(s.gap_ms))} ms
                      </div>
                      <div className={`note ${cls}`} style={{ color: 'inherit' }}>
                        {verdictAr}
                      </div>
                    </>
                  ) : (
                    <div className="note" style={{ fontStyle: 'italic' }}>بدون قياس</div>
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

// ─── Audio Panel ────────────────────────────────────────────────────────────

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
      <h3>تلاوتك</h3>
      {audioUrl ? (
        <audio controls src={audioUrl} preload="metadata" />
      ) : (
        <p style={{ color: 'var(--cream-dim)', fontSize: 13, textAlign: 'center', padding: 14 }}>
          الملف الصوتي غير متاح
        </p>
      )}

      <h3>تلاوة مرجعية</h3>
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
            <span>الآية {arDigit(a)}</span>
            <span style={{ fontSize: 16 }}>{playing === a ? '⏸' : '▶'}</span>
          </button>
        ))}
      </div>
      <audio ref={ref} preload="none" />

      <p style={{ color: 'var(--cream-dim)', fontSize: 10, textAlign: 'center' }}>
        المصدر: EveryAyah.com — استمع للقارئ المرجعي ثم قارن بتلاوتك
      </p>
    </div>
  )
}

// ─── Details Panel ──────────────────────────────────────────────────────────

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
      {/* Waqf */}
      {waqfItems && waqfItems.length > 0 && (
        <div>
          <h3>الوقوف</h3>
          <div className="waqf-chips">
            {waqfItems.map(ev => (
              <span key={ev.ayah_code} className={`waqf-chip ${ev.is_waqf ? 'on' : ''}`}>
                <span className="qw t-quran">{ev.word_text || ev.ayah_code}</span>
                <span style={{ opacity: 0.7 }}>{ev.is_waqf ? 'وقف' : 'وصل'}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Pipeline */}
      {report.pipeline_status && report.pipeline_status !== 'EXACT' && (
        <div>
          <h3>حالة المطابقة</h3>
          <span className="pill warn">{report.pipeline_status}</span>
        </div>
      )}

      {/* Tajweed event summary */}
      {tajweedEvents.length > 0 && (
        <div>
          <h3>أحداث التجويد</h3>
          <p style={{ color: 'var(--cream-dim)', fontSize: 12 }}>
            إجمالي {arDigit(tajweedEvents.length)}
            {' · '}صحيح {arDigit(tajweedEvents.filter(e => e.tajweed_check_status === 'OK').length)}
            {' · '}تحذير {arDigit(tajweedEvents.filter(e => e.tajweed_check_status === 'WARNING').length)}
            {' · '}خطأ {arDigit(tajweedEvents.filter(e => e.tajweed_check_status === 'ERROR').length)}
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
          <h3>سلوك القارئ</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {behaviorEvents.map((be, i) => (
              <span key={i} className="pill blue">
                {be.type === 'REPETITION' ? `تكرار: ${be.word ?? ''}` : 'إعادة من أول الآية'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ASR text */}
      {report.asr_text && (
        <details>
          <summary>النص المُستخرَج من التسجيل</summary>
          <p className="asr">{report.asr_text}</p>
        </details>
      )}
    </div>
  )
}

// ─── Icons ──────────────────────────────────────────────────────────────────

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
