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

// ─── Constants ───────────────────────────────────────────────────────────────

const RULE_AR: Record<string, string> = {
  MADD_TABII: 'مد طبيعي', MADD_LAZIM: 'مد لازم كلمي', MADD_WAJIB_MUTTASIL: 'مد واجب متصل',
  MADD_MUNFASIL: 'مد منفصل', MADD_AARID_LISUKOON: 'مد عارض للسكون', MADD_LIN: 'مد لين',
  NOON_SAKINAH_IZHAR: 'إظهار', NOON_SAKINAH_IDGHAM: 'إدغام', NOON_SAKINAH_IQLAB: 'إقلاب',
  NOON_SAKINAH_IKHFAA: 'إخفاء', MEEM_SAKINAH_IZHAR_SHAFAWI: 'إظهار شفوي',
  MEEM_SAKINAH_IDGHAM_SHAFAWI: 'إدغام شفوي', MEEM_SAKINAH_IKHFAA_SHAFAWI: 'إخفاء شفوي',
  QALQALA: 'قلقلة', GHUNNA: 'غنة',
}

type TabId = 'summary' | 'words' | 'madd' | 'details'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normAr(s: string | null | undefined): string {
  return (s || '').replace(/[\u064B-\u0652\u0670\u0640]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').trim()
}

interface ReasonInfo { kind: 'ok' | 'low' | 'high' | 'error' | 'pending'; label: string }
function parseReason(ev: TajweedEventEntry): ReasonInfo {
  const s = ev.tajweed_check_status, r = ev.tajweed_check_reason || ''
  if (s === 'OK') return r.includes('TEXTUAL_ONLY') ? { kind: 'ok', label: 'مرجع نصي' } : { kind: 'ok', label: 'صحيح' }
  if (s === 'WARNING' || s === 'ERROR') {
    const sh = r.match(/word_dur=(\d+)ms\s*<\s*(\d+)ms/); if (sh) return { kind: 'low', label: `أقل (${sh[1]}/${sh[2]}ms)` }
    const lg = r.match(/word_dur=(\d+)ms\s*>>\s*(\d+)ms/); if (lg) return { kind: 'high', label: `أعلى (${lg[1]}ms)` }
    return { kind: s === 'ERROR' ? 'error' : 'low', label: s === 'ERROR' ? 'خطأ تجويدي' : 'تحذير' }
  }
  return { kind: 'pending', label: s }
}

function buildEventsMap(alignments: WordAlignmentEntry[], tajweedEvents: TajweedEventEntry[]): Map<number, TajweedEventEntry[]> {
  const groups = new Map<string, TajweedEventEntry[][]>()
  let prevKey = '', curGroup: TajweedEventEntry[] = []
  for (const ev of tajweedEvents) { const k = normAr(ev.word_text); if (!k) continue; if (k !== prevKey) { if (curGroup.length && prevKey) { if (!groups.has(prevKey)) groups.set(prevKey, []); groups.get(prevKey)!.push(curGroup) } prevKey = k; curGroup = [ev] } else curGroup.push(ev) }
  if (curGroup.length && prevKey) { if (!groups.has(prevKey)) groups.set(prevKey, []); groups.get(prevKey)!.push(curGroup) }
  const ptrs = new Map<string, number>(), result = new Map<number, TajweedEventEntry[]>()
  for (const e of alignments) { const k = normAr(e.reference_word || e.asr_word || ''); const wg = groups.get(k) || []; const p = ptrs.get(k) || 0; result.set(e.word_index, p < wg.length ? wg[p] : []); ptrs.set(k, p + 1) }
  return result
}

async function exportToPDF(element: HTMLElement) {
  const { default: html2canvas } = await import('html2canvas')
  const { jsPDF } = await import('jspdf')
  const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#fafaf9' })
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const w = 210, h = (canvas.height * w) / canvas.width, ph = 297
  let pos = 0
  while (pos < h) { if (pos > 0) pdf.addPage(); pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, -pos, w, h); pos += ph }
  pdf.save(`hafiz-report-${Date.now()}.pdf`)
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function WordTooltip({ entry, events }: { entry: WordAlignmentEntry; events: TajweedEventEntry[] }) {
  const seen = new Set<string>(), rows: ReactNode[] = []
  if (entry.status === 'SUBSTITUTION') rows.push(<div key="sub" className="flex items-center gap-1.5 pb-1 mb-1 border-b border-stone-100"><span className="w-2 h-2 rounded-full bg-red-500" /><span className="text-stone-600">المرجع:</span><span className="font-quran text-emerald-700 text-sm">{entry.reference_word}</span></div>)
  else if (entry.status === 'LOW_CONFIDENCE_MATCH') rows.push(<div key="lc" className="flex items-center gap-1.5 pb-1 mb-1 border-b border-stone-100"><span className="w-2 h-2 rounded-full bg-yellow-400" /><span className="text-stone-600">ثقة {Math.round((entry.probability ?? 0) * 100)}%</span></div>)
  else if (entry.status === 'MISSED') rows.push(<div key="m" className="text-red-600 font-medium">كلمة مفقودة</div>)
  for (const ev of events) { const rk = ev.applied_rule ?? ev.event_type; const dk = `${rk}-${ev.tajweed_check_status}`; if (seen.has(dk)) continue; seen.add(dk); const rn = RULE_AR[rk] || rk; const ri = parseReason(ev); const dc = { ok: 'bg-emerald-500', low: 'bg-red-500', high: 'bg-amber-500', error: 'bg-red-700', pending: 'bg-stone-300' }[ri.kind]; const tc = { ok: 'text-emerald-700', low: 'text-red-600', high: 'text-amber-600', error: 'text-red-700', pending: 'text-stone-400' }[ri.kind]; rows.push(<div key={dk} className="flex items-center gap-2 py-0.5"><span className={`w-2 h-2 rounded-full ${dc}`} /><span className="text-stone-700 flex-1 truncate">{rn}</span><span className={`text-xs ${tc}`}>{ri.label}</span></div>) }
  if (!rows.length) rows.push(<p key="e" className="text-stone-400 text-xs">لا أحكام</p>)
  return (<div className="absolute bottom-full mb-2 z-50 bg-white border border-stone-200 rounded-xl shadow-xl px-3 py-2 w-52 text-xs font-ui text-right pointer-events-none" style={{ left: '50%', transform: 'translateX(-50%)' }} dir="rtl"><div className="absolute -bottom-[6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-b border-r border-stone-200 rotate-45" /><div className="space-y-0.5">{rows}</div></div>)
}

function WordChip({ entry, events }: { entry: WordAlignmentEntry; events: TajweedEventEntry[] }) {
  const [open, setOpen] = useState(false)
  const cls = { MATCH: 'bg-emerald-100 text-emerald-800 border-emerald-200', LOW_CONFIDENCE_MATCH: 'bg-yellow-100 text-yellow-800 border-yellow-300', SUBSTITUTION: 'bg-amber-100 text-amber-800 border-amber-200', SUFFIX_MATCH: 'bg-orange-100 text-orange-800 border-orange-300', TASHKEEL_MISMATCH: 'bg-purple-100 text-purple-800 border-purple-300', CPAE_FALLBACK: 'bg-red-50 text-red-400 border-red-200 opacity-70 line-through', EXTRA: 'bg-stone-100 text-stone-500 border-stone-200 opacity-60', MISSED: 'bg-red-100 text-red-700 border-red-200' }[entry.status] ?? 'bg-stone-100 text-stone-600 border-stone-200'
  const icon = { MATCH: '', LOW_CONFIDENCE_MATCH: '?', SUBSTITUTION: '\u2260', SUFFIX_MATCH: '+', TASHKEEL_MISMATCH: '~', CPAE_FALLBACK: '~', EXTRA: '+', MISSED: '\u2014' }[entry.status] ?? ''
  const word = entry.status === 'MISSED' ? entry.reference_word : entry.asr_word
  const tip = events.length > 0 || entry.status !== 'MATCH'
  const issue = events.some(e => e.tajweed_check_status === 'WARNING' || e.tajweed_check_status === 'ERROR')
  const ok = events.some(e => e.tajweed_check_status === 'OK')
  return (
    <span className="relative inline-block" onMouseEnter={() => tip && setOpen(true)} onMouseLeave={() => setOpen(false)} onClick={() => tip && setOpen(true)}>
      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border font-quran text-sm ${cls} ${tip ? 'cursor-pointer hover:shadow-sm' : ''}`}>
        {icon && <span className="font-ui text-[10px] font-bold mr-0.5">{icon}</span>}{word}
        {(issue || ok) && <span className={`w-1.5 h-1.5 rounded-full ml-0.5 self-start mt-0.5 ${issue ? 'bg-amber-500' : 'bg-emerald-400'}`} />}
      </span>
      {open && tip && <WordTooltip entry={entry} events={events} />}
    </span>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function ReportScreen({ report, surah, ayahStart, ayahEnd, onUploadAnother, onHome }: Props) {
  const [tab, setTab] = useState<TabId>('summary')
  const reportRef = useRef<HTMLDivElement>(null)
  const hr = report.hafiz_report ?? report.narrative_report as HafizReport | null

  const alignments = report.word_alignment ?? []
  const matchCount = alignments.filter(w => w.status === 'MATCH').length
  const totalRef = alignments.filter(w => w.status !== 'EXTRA').length
  const accuracy = totalRef > 0 ? Math.round((matchCount / totalRef) * 100) : null

  const eventsMap = useMemo(() => buildEventsMap(report.word_alignment ?? [], report.tajweed_events ?? []), [report.word_alignment, report.tajweed_events])

  const surahName = SURAH_NAMES[surah] ?? `سورة ${surah}`
  const range = ayahStart === ayahEnd ? `الآية ${ayahStart}` : `الآيات ${ayahStart}\u2013${ayahEnd}`
  const maddItems: MaddBarEntry[] = report.word_gated_summary?.madd_summary ?? []
  const maddOk = maddItems.length > 0 ? Math.round(maddItems.filter(m => m.zone === 'OK').length / maddItems.length * 100) : null
  const waqfItems = report.ayah_boundary_waqf ?? []
  const waqfOk = waqfItems.length > 0 ? Math.round(waqfItems.filter(w => w.is_waqf).length / waqfItems.length * 100) : null

  const gradeCls = !hr ? '' :
    hr.overall_grade === 'ممتاز' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
    hr.overall_grade === 'جيد جداً' ? 'bg-teal-100 text-teal-800 border-teal-300' :
    hr.overall_grade === 'جيد' ? 'bg-amber-100 text-amber-800 border-amber-300' :
    'bg-red-100 text-red-800 border-red-300'

  const errorDist: ErrorDistribution[] = (hr as any)?.error_distribution ?? []
  const maddIssues = maddItems.filter(m => m.zone !== 'OK')

  return (
    <div className="min-h-screen bg-parchment-50 flex flex-col" dir="rtl">
      {/* ═══ STICKY HEADER ═══ */}
      <div className="sticky top-0 z-20">
        {/* Nav */}
        <div className="bg-gradient-to-l from-[#085041] to-[#0F6E56] px-4 pt-3 pb-2 text-white">
          <div className="flex items-center justify-between mb-2">
            <button onClick={onHome} className="text-emerald-200 hover:text-white text-xs font-ui">\u2190 الرئيسية</button>
            <div className="flex items-center gap-2">
              {hr && <span className={`px-2 py-0.5 rounded-full border font-ui text-[10px] font-bold ${gradeCls}`}>{hr.overall_grade}</span>}
              <button onClick={async () => { const prev = tab; setTab('summary'); await new Promise(r => setTimeout(r, 100)); if (reportRef.current) await exportToPDF(reportRef.current); setTab(prev) }} className="px-2 py-0.5 rounded bg-white/15 hover:bg-white/25 font-ui text-[10px]">PDF</button>
              <button onClick={onUploadAnother} className="px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 font-ui text-[10px] font-medium">ملف آخر</button>
            </div>
          </div>
          <h1 className="font-ui text-base font-bold">تقرير حافظ</h1>
          <p className="font-ui text-[10px] text-emerald-200">{surahName} \u00b7 {range}{hr ? ` \u00b7 ${(hr as any).reader_level ?? ''}` : ''}{report.total_runtime_sec != null ? ` \u00b7 ${report.total_runtime_sec.toFixed(0)}s` : ''}</p>

          {/* Metrics row inside header */}
          <div className="grid grid-cols-4 gap-1.5 mt-2">
            <MiniStat label="الكلمات" value={accuracy != null ? `${accuracy}%` : '\u2014'} good={accuracy != null && accuracy >= 80} />
            <MiniStat label="التجويد" value={`${report.tajweed_ok_count ?? 0}/${report.tajweed_event_count ?? 0}`} good={(report.tajweed_ok_count ?? 0) >= (report.tajweed_event_count ?? 1) * 0.8} />
            <MiniStat label="المد" value={maddOk != null ? `${maddOk}%` : '\u2014'} good={maddOk != null && maddOk >= 70} />
            <MiniStat label="الوقف" value={waqfOk != null ? `${waqfOk}%` : '\u2014'} good={waqfOk != null && waqfOk >= 80} />
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-stone-200 flex">
          {([
            ['summary', 'التقرير'],
            ['words', 'الكلمات'],
            ['madd', `المد${maddIssues.length > 0 ? ` (${maddIssues.length})` : ''}`],
            ['details', 'التفاصيل'],
          ] as [TabId, string][]).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 py-2 font-ui text-xs font-medium transition-colors
                ${tab === id ? 'text-emerald-700 border-b-2 border-emerald-600' : 'text-stone-400 hover:text-stone-600'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ TAB CONTENT ═══ */}
      <div ref={reportRef} className="flex-1 overflow-y-auto px-4 py-4 max-w-lg mx-auto w-full">

        {/* ── TAB: SUMMARY (التقرير) ── */}
        {tab === 'summary' && (
          <div className="space-y-4">
            {/* Narrative report */}
            {hr && (
              <div className="space-y-3">
                <p className="font-ui text-sm text-stone-800 leading-relaxed">{hr.opening}</p>
                {[
                  { key: 'accuracy', text: hr.accuracy_section, title: 'دقة الكلمات' },
                  { key: 'tajweed', text: hr.tajweed_section, title: 'أحكام التجويد' },
                  { key: 'madd', text: hr.madd_section, title: 'أحكام المد' },
                  { key: 'waqf', text: hr.waqf_section, title: 'الوقف' },
                  { key: 'ra', text: (hr as any).ra_section, title: 'التفخيم والترقيق' },
                  { key: 'consistency', text: (hr as any).consistency_section, title: 'تماثل المدود' },
                  { key: 'behavior', text: (hr as any).behavior_section, title: 'سلوك القارئ' },
                ].filter(s => s.text).map(s => (
                  <div key={s.key} className="bg-stone-50 rounded-xl px-3 py-2">
                    <p className="font-ui text-xs font-bold text-emerald-800 mb-0.5">{s.title}</p>
                    <p className="font-ui text-sm text-stone-600 leading-relaxed">{s.text}</p>
                  </div>
                ))}
                {hr.recommendations.length > 0 && (
                  <div className="bg-emerald-50 rounded-xl px-3 py-2.5 border border-emerald-100">
                    <p className="font-ui text-xs font-bold text-emerald-800 mb-1">التوصيات</p>
                    <ol className="list-decimal list-inside space-y-1 font-ui text-sm text-stone-700 leading-relaxed">
                      {hr.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                    </ol>
                  </div>
                )}
                <p className="font-ui text-sm text-emerald-700 font-medium leading-relaxed text-center pt-2">{hr.closing}</p>
              </div>
            )}
            {/* Actions */}
            <div className="space-y-2 pt-2">
              <button onClick={onUploadAnother} className="w-full py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white font-ui font-semibold text-sm transition-all shadow-md">رفع ملف آخر</button>
            </div>
          </div>
        )}

        {/* ── TAB: WORDS (الكلمات) ── */}
        {tab === 'words' && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1 relative">
              {alignments.map(entry => <WordChip key={entry.word_index} entry={entry} events={eventsMap.get(entry.word_index) ?? []} />)}
            </div>
            <div className="flex flex-wrap gap-2 pt-2 border-t border-stone-100">
              {[
                { cls: 'bg-emerald-100', label: 'مطابق' }, { cls: 'bg-yellow-100', label: 'ثقة منخفضة' },
                { cls: 'bg-amber-100', label: 'مختلف' }, { cls: 'bg-red-100', label: 'مفقود' },
              ].map(item => <span key={item.label} className="flex items-center gap-1"><span className={`w-2.5 h-2.5 rounded ${item.cls}`} /><span className="font-ui text-[10px] text-stone-500">{item.label}</span></span>)}
            </div>
            {/* Error distribution bars */}
            {errorDist.length > 0 && (
              <div className="pt-2">
                <p className="font-ui text-xs font-semibold text-stone-600 mb-2">توزيع الأحكام</p>
                {errorDist.map(ed => (
                  <div key={ed.rule_ar} className="mb-1.5">
                    <div className="flex justify-between font-ui text-[10px] mb-0.5">
                      <span className="text-stone-600">{ed.rule_ar}</span>
                      <span className="text-stone-400">{ed.ok}/{ed.total}</span>
                    </div>
                    <div className="h-2 bg-stone-100 rounded-full overflow-hidden flex">
                      {ed.ok > 0 && <div className="h-full bg-emerald-400" style={{ width: `${Math.round(ed.ok / ed.total * 100)}%` }} />}
                      {ed.warning > 0 && <div className="h-full bg-amber-400" style={{ width: `${Math.round(ed.warning / ed.total * 100)}%` }} />}
                      {ed.error > 0 && <div className="h-full bg-red-400" style={{ width: `${Math.round(ed.error / ed.total * 100)}%` }} />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: MADD (المد) ── */}
        {tab === 'madd' && (
          <div className="space-y-2">
            {maddItems.length === 0 ? (
              <p className="font-ui text-sm text-stone-400 text-center py-8">لا توجد أحكام مد</p>
            ) : (
              <>
                <p className="font-ui text-xs text-stone-500 mb-1">{maddItems.filter(m => m.zone === 'OK').length}/{maddItems.length} ضمن النطاق</p>
                {maddItems.map((m, i) => {
                  const bc = m.verdict === 'ERROR' ? 'border-red-400' : m.verdict === 'WARNING' ? 'border-amber-400' : m.verdict === 'PASS' ? 'border-emerald-400' : 'border-stone-300'
                  const vc = m.verdict === 'ERROR' ? 'text-red-600' : m.verdict === 'WARNING' ? 'text-amber-600' : m.verdict === 'PASS' ? 'text-emerald-600' : 'text-stone-500'
                  const vl = m.verdict === 'ERROR' ? 'خطأ' : m.verdict === 'WARNING' ? 'تنبيه' : m.verdict === 'PASS' ? 'صحيح' : 'إعلام'
                  return (
                    <div key={i} className={`rounded-xl bg-white px-3 py-2.5 shadow-sm`}>
                      {/* Header: word + verdict icon */}
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-base ${m.verdict === 'PASS' ? '' : m.verdict === 'ERROR' ? 'text-red-500' : 'text-amber-500'}`}>
                            {m.verdict === 'PASS' ? '\u2705' : m.verdict === 'ERROR' ? '\u274c' : '\u26a0\ufe0f'}
                          </span>
                          <span className="font-quran text-base font-bold text-stone-800">{m.word_text || '\u2014'}</span>
                        </div>
                        <span className="font-ui text-[10px] text-stone-400">{m.madd_label_ar}</span>
                      </div>
                      {/* Gauge bar — modern circular-end design */}
                      <div className="relative h-2 bg-stone-100 rounded-full overflow-hidden">
                        {/* Fill from left to indicator position */}
                        <div className="absolute inset-y-0 right-0 rounded-full transition-all"
                          style={{
                            width: `${Math.min(m.indicator_position_pct, 100)}%`,
                            background: m.verdict === 'PASS' ? '#10B981' : m.verdict === 'ERROR' ? '#EF4444' : '#F59E0B',
                            opacity: 0.7,
                          }} />
                        {/* Reference range marker */}
                        <div className="absolute top-0 h-full border-r-2 border-stone-400/50" style={{ right: '40%' }} />
                      </div>
                      {/* Stats row */}
                      <div className="flex items-center justify-between mt-1 font-ui text-[10px]">
                        <span className="text-stone-400">{m.obligation === 'WAJIB' ? 'واجب' : 'جائز'}</span>
                        <span className={`font-bold ${vc}`}>{Math.round(m.ratio * 100)}%</span>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}

        {/* ── TAB: DETAILS (التفاصيل) ── */}
        {tab === 'details' && (
          <div className="space-y-3">
            {/* Waqf */}
            {waqfItems.length > 0 && (
              <div>
                <p className="font-ui text-xs font-semibold text-stone-600 mb-1.5">الوقوف</p>
                <div className="flex flex-wrap gap-1.5">
                  {waqfItems.map(ev => (
                    <span key={ev.ayah_code} className={`px-2 py-0.5 rounded-full border font-ui text-[10px] ${ev.is_waqf ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-stone-50 text-stone-500 border-stone-200'}`}>
                      <span className="font-quran text-xs">{ev.word_text || ev.ayah_code}</span>
                      <span className="opacity-60 mr-1">{ev.is_waqf ? 'وقف' : 'وصل'}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {/* Pipeline */}
            {report.pipeline_status !== 'EXACT' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                <p className="font-ui text-[10px] text-amber-700">المطابقة: {report.pipeline_status}</p>
              </div>
            )}
            {/* ASR */}
            {report.asr_text && (
              <details className="bg-white rounded-xl p-3">
                <summary className="font-ui text-xs font-semibold text-stone-600 cursor-pointer">النص المستخرج</summary>
                <p className="font-quran text-sm text-stone-700 leading-loose mt-2" dir="rtl">{report.asr_text}</p>
              </details>
            )}
            {/* Behavior */}
            {(report.behavior_events ?? []).length > 0 && (
              <div>
                <p className="font-ui text-xs font-semibold text-stone-600 mb-1">سلوك القارئ</p>
                <div className="flex flex-wrap gap-1.5">
                  {(report.behavior_events ?? []).map((be, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full border border-blue-200 bg-blue-50 font-ui text-[10px] text-blue-700">
                      {be.type === 'REPETITION' ? `تكرار: ${be.word ?? ''}` : 'إعادة'}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

// ─── Mini stat (inside header) ───────────────────────────────────────────────

function MiniStat({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div className={`rounded-lg px-1.5 py-1 text-center ${good ? 'bg-emerald-900/30' : 'bg-red-900/20'}`}>
      <p className={`font-ui font-bold text-sm ${good ? 'text-emerald-200' : 'text-red-300'}`}>{value}</p>
      <p className="font-ui text-[9px] text-emerald-300/70">{label}</p>
    </div>
  )
}
