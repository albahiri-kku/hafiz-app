import { useState, useMemo, useRef, type ReactNode } from 'react'
import type { EvaluateFileResponse, WordAlignmentEntry, TajweedEventEntry, MaddBarEntry, HafizReport, ErrorDistribution } from '../types/hafiz'
import { SURAH_NAMES } from '../types/hafiz'

interface Props {
  report: EvaluateFileResponse
  surah: number
  ayahStart: number
  ayahEnd: number
  onUploadAnother: () => void
  onHome: () => void
}

// ─── Arabic rule names ────────────────────────────────────────────────────────

const RULE_AR: Record<string, string> = {
  MADD_TABII:                  'مد طبيعي',
  MADD_LAZIM:                  'مد لازم كلمي',
  MADD_WAJIB_MUTTASIL:         'مد واجب متصل',
  MADD_MUNFASIL:               'مد منفصل',
  MADD_AARID_LISUKOON:         'مد عارض للسكون',
  MADD_LIN:                    'مد لين',
  NOON_SAKINAH_IZHAR:          'إظهار',
  NOON_SAKINAH_IDGHAM:         'إدغام',
  NOON_SAKINAH_IQLAB:          'إقلاب',
  NOON_SAKINAH_IKHFAA:         'إخفاء',
  MEEM_SAKINAH_IZHAR_SHAFAWI:  'إظهار شفوي',
  MEEM_SAKINAH_IDGHAM_SHAFAWI: 'إدغام شفوي',
  MEEM_SAKINAH_IKHFAA_SHAFAWI: 'إخفاء شفوي',
  QALQALA:                     'قلقلة',
  GHUNNA:                      'غنة',
}

// ─── Normalize Arabic ─────────────────────────────────────────────────────────

function normAr(s: string | null | undefined): string {
  return (s || '')
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .trim()
}

// ─── Parse tajweed reason ─────────────────────────────────────────────────────

interface ReasonInfo { kind: 'ok' | 'low' | 'high' | 'error' | 'pending'; label: string }

function parseReason(ev: TajweedEventEntry): ReasonInfo {
  const s = ev.tajweed_check_status
  const r = ev.tajweed_check_reason || ''
  if (s === 'OK') {
    if (r.includes('TEXTUAL_ONLY')) return { kind: 'ok', label: 'مرجع نصي' }
    return { kind: 'ok', label: 'صحيح' }
  }
  if (s === 'WARNING' || s === 'ERROR') {
    const short = r.match(/word_dur=(\d+)ms\s*<\s*(\d+)ms/)
    if (short) return { kind: 'low', label: `أقل من المطلوب (${short[1]}ms / ${short[2]}ms)` }
    const long  = r.match(/word_dur=(\d+)ms\s*>>\s*(\d+)ms/)
    if (long)  return { kind: 'high', label: `أعلى من المطلوب (${long[1]}ms)` }
    if (r.includes('قصير'))     return { kind: 'low',  label: 'مد قصير' }
    if (r.includes('excessive')) return { kind: 'high', label: 'مد مبالغ فيه' }
    return { kind: s === 'ERROR' ? 'error' : 'low', label: s === 'ERROR' ? 'خطأ في التجويد' : 'تحذير تجويدي' }
  }
  if (s === 'PENDING_ACOUSTIC') return { kind: 'pending', label: 'تحتاج فحص صوتي' }
  return { kind: 'pending', label: s }
}

// ─── Word tooltip ─────────────────────────────────────────────────────────────

function WordTooltip({ entry, events }: { entry: WordAlignmentEntry; events: TajweedEventEntry[] }) {
  const seen = new Set<string>()
  const rows: ReactNode[] = []

  if (entry.status === 'SUBSTITUTION') {
    rows.push(
      <div key="sub" className="flex items-center gap-1.5 pb-1.5 mb-1.5 border-b border-stone-100">
        <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
        <span className="text-stone-600 flex-1">المرجع:</span>
        <span className="font-quran text-emerald-700 text-sm">{entry.reference_word}</span>
      </div>
    )
  } else if (entry.status === 'LOW_CONFIDENCE_MATCH') {
    rows.push(
      <div key="lc" className="flex items-center gap-1.5 pb-1.5 mb-1.5 border-b border-stone-100">
        <span className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" />
        <span className="text-stone-600">ثقة {Math.round((entry.probability ?? 0) * 100)}%</span>
        <span className="text-stone-400 mr-auto">— تحقق يدوياً</span>
      </div>
    )
  } else if (entry.status === 'MISSED') {
    rows.push(<div key="miss" className="flex items-center gap-1.5 text-red-600 font-medium"><span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" /><span>كلمة مفقودة</span></div>)
  } else if (entry.status === 'TASHKEEL_MISMATCH') {
    const tc = entry.tashkeel_check
    const HARAKA_AR: Record<string, string> = { fatha: 'فتحة', damma: 'ضمة', kasra: 'كسرة', sukun: 'سكون' }
    rows.push(
      <div key="tashkeel" className="space-y-1 pb-1.5 mb-1.5 border-b border-stone-100">
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" /><span className="text-purple-700 font-medium">خطأ تشكيل</span></div>
        {tc && (<div className="text-xs text-stone-500 pr-3.5 space-y-0.5"><p>نُطق: <span className="text-red-600 font-medium">{HARAKA_AR[tc.whisper_haraka] ?? tc.whisper_haraka}</span> ({tc.whisper_haraka_char})</p><p>المرجع: <span className="text-emerald-600 font-medium">{HARAKA_AR[tc.ref_haraka] ?? tc.ref_haraka}</span> ({tc.ref_haraka_char})</p></div>)}
      </div>
    )
  } else if (entry.status === 'SUFFIX_MATCH') {
    rows.push(<div key="suffix" className="flex items-center gap-1.5 pb-1.5 mb-1.5 border-b border-stone-100"><span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" /><span className="text-stone-600 flex-1">حرف زائد</span><span className="font-quran text-orange-700 text-sm">{entry.asr_word}</span></div>)
  } else if (entry.status === 'CPAE_FALLBACK') {
    rows.push(<div key="fb" className="flex items-center gap-1.5 text-red-500"><span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" /><span>لم تُقرأ فعلياً</span></div>)
  } else if (entry.status === 'EXTRA') {
    rows.push(<div key="extra" className="flex items-center gap-1.5 text-stone-500"><span className="w-2 h-2 rounded-full bg-stone-300 flex-shrink-0" /><span>كلمة إضافية</span></div>)
  }

  for (const ev of events) {
    const ruleKey = ev.applied_rule ?? ev.event_type
    const dedupKey = `${ruleKey}-${ev.tajweed_check_status}`
    if (seen.has(dedupKey)) continue
    seen.add(dedupKey)
    const ruleName = RULE_AR[ruleKey] || ruleKey
    const reason   = parseReason(ev)
    const dotCls   = { ok: 'bg-emerald-500', low: 'bg-red-500', high: 'bg-amber-500', error: 'bg-red-700', pending: 'bg-stone-300' }[reason.kind]
    const textCls  = { ok: 'text-emerald-700', low: 'text-red-600', high: 'text-amber-600', error: 'text-red-700', pending: 'text-stone-400' }[reason.kind]
    rows.push(<div key={dedupKey} className="flex items-center gap-2 py-0.5"><span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotCls}`} /><span className="text-stone-700 flex-1 truncate">{ruleName}</span><span className={`text-xs ${textCls} shrink-0`}>{reason.label}</span></div>)
  }
  if (rows.length === 0) rows.push(<p key="empty" className="text-stone-400 text-xs">لا أحكام مُفحوصة</p>)

  return (
    <div className="absolute bottom-full mb-2 z-50 bg-white border border-stone-200 rounded-xl shadow-xl px-3 py-2.5 w-56 text-xs font-ui text-right pointer-events-none select-none" style={{ right: 'auto', left: '50%', transform: 'translateX(-50%)', maxWidth: 'min(14rem, calc(100vw - 1.5rem))' }} dir="rtl">
      <div className="absolute -bottom-[7px] left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-b border-r border-stone-200 rotate-45" />
      <div className="space-y-0.5">{rows}</div>
    </div>
  )
}

// ─── Word chip ────────────────────────────────────────────────────────────────

function WordChip({ entry, events }: { entry: WordAlignmentEntry; events: TajweedEventEntry[] }) {
  const [open, setOpen] = useState(false)
  const chipCls = { MATCH: 'bg-emerald-100 text-emerald-800 border-emerald-200', LOW_CONFIDENCE_MATCH: 'bg-yellow-100 text-yellow-800 border-yellow-300', SUBSTITUTION: 'bg-amber-100 text-amber-800 border-amber-200', SUFFIX_MATCH: 'bg-orange-100 text-orange-800 border-orange-300', TASHKEEL_MISMATCH: 'bg-purple-100 text-purple-800 border-purple-300', CPAE_FALLBACK: 'bg-red-50 text-red-400 border-red-200 opacity-70 line-through', EXTRA: 'bg-stone-100 text-stone-500 border-stone-200 opacity-60', MISSED: 'bg-red-100 text-red-700 border-red-200' }[entry.status] ?? 'bg-stone-100 text-stone-600 border-stone-200'
  const icon = { MATCH: '', LOW_CONFIDENCE_MATCH: '?', SUBSTITUTION: '\u2260', SUFFIX_MATCH: '+', TASHKEEL_MISMATCH: '~', CPAE_FALLBACK: '~', EXTRA: '+', MISSED: '\u2014' }[entry.status] ?? ''
  const word = entry.status === 'MISSED' ? entry.reference_word : entry.asr_word
  const hasTooltip = events.length > 0 || entry.status !== 'MATCH'
  const hasTajweedIssue = events.some(e => e.tajweed_check_status === 'WARNING' || e.tajweed_check_status === 'ERROR')
  const hasTajweedOk = events.some(e => e.tajweed_check_status === 'OK')

  return (
    <span className="relative inline-block" onMouseEnter={() => hasTooltip && setOpen(true)} onMouseLeave={() => setOpen(false)} onClick={() => hasTooltip && setOpen(true)}>
      <span className={`inline-flex items-center gap-0.5 px-2 py-1 rounded-lg border font-quran text-base transition-shadow ${chipCls} ${hasTooltip ? 'cursor-pointer hover:shadow-sm' : ''}`}>
        {icon && <span className="font-ui text-xs font-bold mr-0.5">{icon}</span>}
        {word}
        {(hasTajweedIssue || hasTajweedOk) && <span className={`w-1.5 h-1.5 rounded-full ml-0.5 flex-shrink-0 self-start mt-1 ${hasTajweedIssue ? 'bg-amber-500' : 'bg-emerald-400'}`} />}
      </span>
      {open && hasTooltip && <WordTooltip entry={entry} events={events} />}
    </span>
  )
}

// ─── Build word→events map ───────────────────────────────────────────────────

function buildEventsMap(alignments: WordAlignmentEntry[], tajweedEvents: TajweedEventEntry[]): Map<number, TajweedEventEntry[]> {
  const groups = new Map<string, TajweedEventEntry[][]>()
  let prevKey = '', curGroup: TajweedEventEntry[] = []
  for (const ev of tajweedEvents) {
    const k = normAr(ev.word_text)
    if (!k) continue
    if (k !== prevKey) { if (curGroup.length > 0 && prevKey) { if (!groups.has(prevKey)) groups.set(prevKey, []); groups.get(prevKey)!.push(curGroup) } prevKey = k; curGroup = [ev] } else { curGroup.push(ev) }
  }
  if (curGroup.length > 0 && prevKey) { if (!groups.has(prevKey)) groups.set(prevKey, []); groups.get(prevKey)!.push(curGroup) }
  const pointers = new Map<string, number>(), result = new Map<number, TajweedEventEntry[]>()
  for (const entry of alignments) { const k = normAr(entry.reference_word || entry.asr_word || ''); const wg = groups.get(k) || []; const ptr = pointers.get(k) || 0; result.set(entry.word_index, ptr < wg.length ? wg[ptr] : []); pointers.set(k, ptr + 1) }
  return result
}

// ─── PDF Export ──────────────────────────────────────────────────────────────

async function exportToPDF(element: HTMLElement) {
  const { default: html2canvas } = await import('html2canvas')
  const { jsPDF } = await import('jspdf')
  const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#fafaf9' })
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const imgWidth = 210
  const imgHeight = (canvas.height * imgWidth) / canvas.width
  // Handle multi-page if content is long
  const pageHeight = 297
  let position = 0
  while (position < imgHeight) {
    if (position > 0) pdf.addPage()
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, -position, imgWidth, imgHeight)
    position += pageHeight
  }
  pdf.save(`hafiz-report-${Date.now()}.pdf`)
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ReportScreen({ report, surah, ayahStart, ayahEnd, onUploadAnother, onHome }: Props) {
  const reportRef = useRef<HTMLDivElement>(null)
  const hr = report.hafiz_report ?? report.narrative_report as HafizReport | null

  const alignments   = report.word_alignment ?? []
  const matchCount   = alignments.filter(w => w.status === 'MATCH').length
  const lowConfCount = alignments.filter(w => w.status === 'LOW_CONFIDENCE_MATCH').length
  const issueCount   = alignments.filter(w => ['SUBSTITUTION','SUFFIX_MATCH','CPAE_FALLBACK','MISSED'].includes(w.status)).length
  const totalRef     = alignments.filter(w => w.status !== 'EXTRA').length
  const accuracy     = totalRef > 0 ? Math.round((matchCount / totalRef) * 100) : null

  const eventsMap = useMemo(() => buildEventsMap(report.word_alignment ?? [], report.tajweed_events ?? []), [report.word_alignment, report.tajweed_events])

  const surahName = SURAH_NAMES[surah] ?? `سورة ${surah}`
  const range = ayahStart === ayahEnd ? `الآية ${ayahStart}` : `الآيات ${ayahStart}\u2013${ayahEnd}`
  const maddItems: MaddBarEntry[] = report.word_gated_summary?.madd_summary ?? []
  const maddOk = maddItems.length > 0 ? Math.round(maddItems.filter(m => m.zone === 'OK').length / maddItems.length * 100) : null
  const waqfItems = report.ayah_boundary_waqf ?? []
  const waqfOk = waqfItems.length > 0 ? Math.round(waqfItems.filter(w => w.is_waqf).length / waqfItems.length * 100) : null

  const gradeCls = !hr ? '' :
    hr.overall_grade === 'ممتاز'    ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
    hr.overall_grade === 'جيد جداً' ? 'bg-teal-100 text-teal-800 border-teal-300' :
    hr.overall_grade === 'جيد'      ? 'bg-amber-100 text-amber-800 border-amber-300' :
                                      'bg-red-100 text-red-800 border-red-300'

  const errorDist: ErrorDistribution[] = (hr as any)?.error_distribution ?? []
  const behaviorEvents = report.behavior_events ?? []

  return (
    <div className="min-h-screen bg-parchment-50 flex flex-col" dir="rtl">

      {/* Sticky nav */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-stone-200 px-4 py-2.5 flex items-center justify-between">
        <button onClick={onHome} className="font-ui text-sm text-stone-500 hover:text-stone-700">\u2190 الرئيسية</button>
        <span className="font-ui text-xs text-stone-400">{surahName} \u00b7 {range}</span>
        <button onClick={onUploadAnother} className="font-ui text-sm text-emerald-700 hover:text-emerald-600 font-medium">ملف آخر</button>
      </div>

      <div ref={reportRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-4 max-w-lg mx-auto w-full">

        {/* ═══ HEADER ═══ */}
        <div className="bg-gradient-to-l from-[#085041] to-[#0F6E56] rounded-2xl shadow-md p-5 text-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="font-ui text-lg font-bold">تقرير حافظ</h1>
              <p className="font-ui text-xs text-emerald-200 mt-0.5">{surahName} \u00b7 {range}</p>
            </div>
            <div className="flex items-center gap-2">
              {hr && <span className={`px-3 py-1 rounded-full border font-ui text-xs font-bold ${gradeCls}`}>{hr.overall_grade}</span>}
              <button onClick={() => reportRef.current && exportToPDF(reportRef.current)} className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 font-ui text-xs transition-colors" title="تصدير PDF">PDF</button>
            </div>
          </div>
          {hr && (
            <div className="flex items-center gap-2 text-emerald-200 font-ui text-xs">
              <span>المستوى: <b className="text-white">{(hr as any).reader_level ?? ''}</b></span>
              {report.total_runtime_sec != null && <span>\u00b7 {report.total_runtime_sec.toFixed(1)}s</span>}
            </div>
          )}
        </div>

        {/* ═══ METRICS ROW ═══ */}
        <div className="grid grid-cols-4 gap-2">
          <MetricCard label="دقة الكلمات" value={accuracy != null ? `${accuracy}%` : '\u2014'} color={accuracy != null && accuracy >= 80 ? '#10B981' : accuracy != null && accuracy >= 60 ? '#F59E0B' : '#EF4444'} />
          <MetricCard label="التجويد" value={`${report.tajweed_ok_count ?? 0}/${report.tajweed_event_count ?? 0}`} color={(report.tajweed_ok_count ?? 0) >= (report.tajweed_event_count ?? 1) * 0.8 ? '#10B981' : '#F59E0B'} />
          <MetricCard label="المد" value={maddOk != null ? `${maddOk}%` : '\u2014'} color={maddOk != null && maddOk >= 80 ? '#10B981' : '#F59E0B'} />
          <MetricCard label="الوقف" value={waqfOk != null ? `${waqfOk}%` : '\u2014'} color={waqfOk != null && waqfOk >= 80 ? '#10B981' : '#F59E0B'} />
        </div>

        {/* ═══ ERROR DISTRIBUTION ═══ */}
        {errorDist.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="font-ui text-sm font-semibold text-stone-600 mb-3">توزيع الأحكام</p>
            <div className="space-y-2">
              {errorDist.map(ed => {
                const okPct = ed.total > 0 ? Math.round(ed.ok / ed.total * 100) : 0
                return (
                  <div key={ed.rule_ar}>
                    <div className="flex justify-between font-ui text-xs mb-0.5">
                      <span className="text-stone-700">{ed.rule_ar}</span>
                      <span className="text-stone-400">{ed.ok}/{ed.total} سليم</span>
                    </div>
                    <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden flex">
                      {ed.ok > 0 && <div className="h-full bg-emerald-400" style={{ width: `${okPct}%` }} />}
                      {ed.warning > 0 && <div className="h-full bg-amber-400" style={{ width: `${Math.round(ed.warning / ed.total * 100)}%` }} />}
                      {ed.error > 0 && <div className="h-full bg-red-400" style={{ width: `${Math.round(ed.error / ed.total * 100)}%` }} />}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ═══ BEHAVIOR EVENTS ═══ */}
        {behaviorEvents.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {behaviorEvents.map((be, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-blue-200 bg-blue-50 font-ui text-xs text-blue-700">
                {be.type === 'REPETITION' ? `تكرار: ${be.word ?? ''}` : `إعادة من أول الآية`}
              </span>
            ))}
          </div>
        )}

        {/* ═══ WORD ALIGNMENT GRID ═══ */}
        {alignments.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="font-ui text-sm font-semibold text-stone-600 mb-1">
              كلمة بكلمة
              <span className="font-normal text-stone-400 mr-2 text-xs">
                ({matchCount}/{totalRef} مطابق{lowConfCount > 0 ? ` \u00b7 ${lowConfCount} منخفضة` : ''}{issueCount > 0 ? ` \u00b7 ${issueCount} مشكلة` : ''})
              </span>
            </p>
            <p className="font-ui text-xs text-stone-400 mb-3">مرّر على الكلمة لرؤية أحكام التجويد</p>
            <div className="flex flex-wrap gap-1.5 relative">
              {alignments.map(entry => <WordChip key={entry.word_index} entry={entry} events={eventsMap.get(entry.word_index) ?? []} />)}
            </div>
            <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-stone-100">
              {[
                { cls: 'bg-emerald-100 text-emerald-800', label: 'مطابق' },
                { cls: 'bg-yellow-100 text-yellow-800', label: 'ثقة منخفضة' },
                { cls: 'bg-amber-100 text-amber-800', label: 'مختلف' },
                { cls: 'bg-orange-100 text-orange-800', label: 'حرف زائد' },
                { cls: 'bg-purple-100 text-purple-800', label: 'خطأ تشكيل' },
                { cls: 'bg-red-50 text-red-400 opacity-70 line-through', label: 'وهمية' },
                { cls: 'bg-red-100 text-red-700', label: 'مفقود' },
              ].map(item => <span key={item.label} className="flex items-center gap-1"><span className={`inline-block w-3 h-3 rounded ${item.cls}`} /><span className="font-ui text-xs text-stone-500">{item.label}</span></span>)}
            </div>
          </div>
        )}

        {/* ═══ MADD DURATION BARS ═══ */}
        {maddItems.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            <p className="font-ui text-sm font-semibold text-stone-600">
              تقييم أحكام المد
              <span className="font-normal text-stone-400 mr-2 text-xs">({maddItems.filter(m => m.zone === 'OK').length}/{maddItems.length} ضمن النطاق)</span>
            </p>
            {maddItems.map((m, i) => {
              const bc = m.verdict === 'ERROR' ? 'border-red-400' : m.verdict === 'WARNING' ? 'border-amber-400' : m.verdict === 'PASS' ? 'border-emerald-400' : 'border-stone-300'
              const vl = m.verdict === 'ERROR' ? 'خطأ' : m.verdict === 'WARNING' ? 'تنبيه' : m.verdict === 'PASS' ? 'صحيح' : 'إعلام'
              const vc = m.verdict === 'ERROR' ? 'text-red-600' : m.verdict === 'WARNING' ? 'text-amber-600' : m.verdict === 'PASS' ? 'text-emerald-600' : 'text-stone-500'
              return (
                <div key={i} className={`border-r-4 ${bc} rounded-lg bg-stone-50 px-3 py-2.5 space-y-1.5`}>
                  <div className="flex items-center justify-between"><span className="font-quran text-base font-bold text-emerald-900">{m.word_text || '\u2014'}</span><span className="font-ui text-xs text-stone-500">{m.madd_label_ar}</span></div>
                  <div className="flex gap-3 font-ui text-xs text-stone-500"><span>{m.obligation === 'WAJIB' ? 'واجب' : 'جائز'}</span><span className={vc}>{vl}</span></div>
                  <div className="relative h-4 rounded overflow-hidden flex">
                    {m.bar_segments.map(seg => <div key={seg.id} className="h-full" style={{ width: `${seg.width_pct}%`, backgroundColor: seg.color, opacity: 0.3 }} />)}
                    <div className="absolute top-0 h-full w-0.5 bg-stone-800" style={{ right: `${100 - m.indicator_position_pct}%` }} />
                  </div>
                  <div className="flex justify-between font-ui text-[10px] text-stone-400"><span>قصير</span><span>مقبول</span><span>طويل</span></div>
                  <div className="flex gap-3 font-ui text-xs text-stone-500">
                    <span>المقاس: <b className="text-stone-700">{(m.measured_ms / 1000).toFixed(2)}ث</b></span>
                    <span>المرجعي: <b className="text-stone-700">{(m.ref_ms / 1000).toFixed(2)}ث</b></span>
                    <span>النسبة: <b className="text-stone-700">{Math.round(m.ratio * 100)}%</b></span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ═══ HAFIZ REPORT (Narrative) ═══ */}
        {hr && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-gradient-to-l from-[#085041] to-[#0F6E56] px-4 py-3 flex items-center justify-between">
              <span className="font-ui text-sm font-bold text-white">تقرير حافظ</span>
              <span className={`px-2.5 py-0.5 rounded-full border font-ui text-xs font-bold ${gradeCls}`}>{hr.overall_grade}</span>
            </div>
            <div className="p-4 space-y-3">
              <p className="font-ui text-sm text-stone-800 font-semibold leading-relaxed">{hr.opening}</p>
              {[
                { key: 'accuracy', text: hr.accuracy_section, title: 'دقة الكلمات' },
                { key: 'tajweed', text: hr.tajweed_section, title: 'أحكام التجويد' },
                { key: 'madd', text: hr.madd_section, title: 'أحكام المد' },
                { key: 'waqf', text: hr.waqf_section, title: 'الوقف' },
                { key: 'ra', text: (hr as any).ra_section, title: 'التفخيم والترقيق' },
                { key: 'consistency', text: (hr as any).consistency_section, title: 'تماثل المدود (النظير)' },
                { key: 'behavior', text: (hr as any).behavior_section, title: 'سلوك القارئ' },
              ].filter(s => s.text).map(s => (
                <div key={s.key}><p className="font-ui text-xs font-bold text-emerald-800 mb-0.5">{s.title}</p><p className="font-ui text-sm text-stone-600 leading-relaxed">{s.text}</p></div>
              ))}
              {hr.recommendations.length > 0 && (
                <div>
                  <p className="font-ui text-xs font-bold text-emerald-800 mb-1">التوصيات</p>
                  <ol className="list-decimal list-inside space-y-1 font-ui text-sm text-stone-600 leading-relaxed pr-1">
                    {hr.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                  </ol>
                </div>
              )}
              <p className="font-ui text-sm text-emerald-700 font-medium leading-relaxed pt-2 border-t border-stone-100">{hr.closing}</p>
            </div>
          </div>
        )}

        {/* ═══ ASR TEXT ═══ */}
        {report.asr_text && (
          <details className="bg-white rounded-2xl shadow-sm p-4">
            <summary className="font-ui text-sm font-semibold text-stone-600 cursor-pointer select-none">النص المستخرج</summary>
            <p className="font-quran text-base text-stone-700 leading-loose mt-3 text-right" dir="rtl">{report.asr_text}</p>
          </details>
        )}

        {/* Pipeline status */}
        {report.pipeline_status !== 'EXACT' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <p className="font-ui text-xs text-amber-700">حالة المطابقة: {report.pipeline_status}{report.matched_start_ayah_code && report.matched_end_ayah_code && <> \u00b7 {report.matched_start_ayah_code} \u2192 {report.matched_end_ayah_code}</>}</p>
          </div>
        )}

        {/* ═══ ACTIONS ═══ */}
        <div className="space-y-2 pb-4">
          <button onClick={onUploadAnother} className="w-full py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white font-ui font-semibold text-base transition-all shadow-md">رفع ملف آخر \u2190</button>
          <button onClick={onHome} className="w-full py-2.5 font-ui text-sm text-stone-500 hover:text-stone-700 transition-colors">العودة للرئيسية</button>
        </div>

      </div>
    </div>
  )
}

// ─── Metric Card ─────────────────────────────────────────────────────────────

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-2.5 text-center">
      <p className="font-ui font-bold text-lg" style={{ color }}>{value}</p>
      <p className="font-ui text-[10px] text-stone-400 leading-tight">{label}</p>
    </div>
  )
}
