import { useState, useMemo, type ReactNode } from 'react'
import type { EvaluateFileResponse, WordAlignmentEntry, AyahBoundaryWaqfEntry, TajweedEventEntry } from '../types/hafiz'
import { SURAH_NAMES } from '../types/hafiz'

interface Props {
  report: EvaluateFileResponse
  surah: number
  ayahStart: number
  ayahEnd: number
  onUploadAnother: () => void
  onHome: () => void
}

// ─── Verdict helpers ─────────────────────────────────────────────────────────

function tajweedBadge(verdict: string | null) {
  if (!verdict) return { label: 'غير محدد', cls: 'bg-stone-100 text-stone-600 border-stone-200' }
  if (verdict === 'TAJWEED_OK')       return { label: 'تجويد سليم',  cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' }
  if (verdict === 'TAJWEED_PARTIAL')  return { label: 'تجويد جزئي',  cls: 'bg-amber-100 text-amber-800 border-amber-200' }
  if (verdict === 'TAJWEED_WARNING')  return { label: 'تحذير تجويدي', cls: 'bg-orange-100 text-orange-800 border-orange-200' }
  if (verdict === 'TAJWEED_ERROR')    return { label: 'خطأ تجويدي',  cls: 'bg-red-100 text-red-800 border-red-200' }
  if (verdict === 'TAJWEED_UNCHECKED') return { label: 'لم يُتحقق',  cls: 'bg-stone-100 text-stone-600 border-stone-200' }
  return { label: verdict, cls: 'bg-stone-100 text-stone-600 border-stone-200' }
}

function maddBadge(verdict: string | null) {
  if (!verdict || verdict === 'NO_MADD') return null
  if (verdict.includes('OK') || verdict.includes('CORRECT')) return { label: 'المد صحيح', cls: 'text-emerald-700' }
  if (verdict.includes('SHORT') || verdict.includes('TOO_SHORT')) return { label: 'المد قصير', cls: 'text-red-600' }
  if (verdict.includes('LONG') || verdict.includes('TOO_LONG'))   return { label: 'المد طويل', cls: 'text-amber-600' }
  return { label: verdict, cls: 'text-stone-500' }
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
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '') // harakat + tatweel + superscript alef
    .replace(/[أإآٱ]/g, 'ا')                     // أضف ٱ (U+0671 ألف الوصل) — يظهر في نصوص CPAE
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
    // لا نُظهر نص backend الخام — نستخدم وصفاً عاماً
    return { kind: s === 'ERROR' ? 'error' : 'low', label: s === 'ERROR' ? 'خطأ في التجويد' : 'تحذير تجويدي' }
  }
  if (s === 'PENDING_ACOUSTIC') return { kind: 'pending', label: 'تحتاج فحص صوتي' }
  return { kind: 'pending', label: s }
}

// ─── Word tooltip ─────────────────────────────────────────────────────────────

function WordTooltip({ entry, events }: { entry: WordAlignmentEntry; events: TajweedEventEntry[] }) {
  const seen = new Set<string>()
  const rows: ReactNode[] = []

  // Alignment status row (if not plain MATCH)
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
    rows.push(
      <div key="miss" className="flex items-center gap-1.5 text-red-600 font-medium">
        <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
        <span>كلمة مفقودة</span>
      </div>
    )
  } else if (entry.status === 'TASHKEEL_MISMATCH') {
    const tc = entry.tashkeel_check
    const HARAKA_AR: Record<string, string> = { fatha: 'فتحة', damma: 'ضمة', kasra: 'كسرة', sukun: 'سكون' }
    rows.push(
      <div key="tashkeel" className="space-y-1 pb-1.5 mb-1.5 border-b border-stone-100">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />
          <span className="text-purple-700 font-medium">خطأ تشكيل</span>
        </div>
        {tc && (
          <div className="text-xs text-stone-500 pr-3.5 space-y-0.5">
            <p>نُطق: <span className="text-red-600 font-medium">{HARAKA_AR[tc.whisper_haraka] ?? tc.whisper_haraka}</span> ({tc.whisper_haraka_char})</p>
            <p>المرجع: <span className="text-emerald-600 font-medium">{HARAKA_AR[tc.ref_haraka] ?? tc.ref_haraka}</span> ({tc.ref_haraka_char})</p>
          </div>
        )}
      </div>
    )
  } else if (entry.status === 'SUFFIX_MATCH') {
    rows.push(
      <div key="suffix" className="flex items-center gap-1.5 pb-1.5 mb-1.5 border-b border-stone-100">
        <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
        <span className="text-stone-600 flex-1">حرف زائد في النهاية</span>
        <span className="font-quran text-orange-700 text-sm">{entry.asr_word}</span>
      </div>
    )
  } else if (entry.status === 'CPAE_FALLBACK') {
    rows.push(
      <div key="fallback" className="space-y-1 pb-1.5 mb-1.5 border-b border-stone-100">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
          <span className="text-red-600 font-medium">timestamps وهمية — لم تُقرأ فعلياً</span>
        </div>
        <p className="text-stone-400 text-xs pr-3.5">
          CPAE لم يستطع محاذاة هذه الكلمة — المدة والثقة قيم افتراضية
        </p>
      </div>
    )
  } else if (entry.status === 'EXTRA') {
    rows.push(
      <div key="extra" className="flex items-center gap-1.5 text-stone-500">
        <span className="w-2 h-2 rounded-full bg-stone-300 flex-shrink-0" />
        <span>كلمة إضافية</span>
      </div>
    )
  }

  // Tajweed event rows
  for (const ev of events) {
    // Use applied_rule if available (waqf variant), else event_type
    const ruleKey = ev.applied_rule ?? ev.event_type
    // Skip duplicate rule+status combos (wasl + waqf entries for same occurrence)
    const dedupKey = `${ruleKey}-${ev.tajweed_check_status}`
    if (seen.has(dedupKey)) continue
    seen.add(dedupKey)

    const ruleName = RULE_AR[ruleKey] || ruleKey
    const reason   = parseReason(ev)
    const dotCls   = { ok: 'bg-emerald-500', low: 'bg-red-500', high: 'bg-amber-500', error: 'bg-red-700', pending: 'bg-stone-300' }[reason.kind]
    const textCls  = { ok: 'text-emerald-700', low: 'text-red-600', high: 'text-amber-600', error: 'text-red-700', pending: 'text-stone-400' }[reason.kind]

    rows.push(
      <div key={dedupKey} className="flex items-center gap-2 py-0.5">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotCls}`} />
        <span className="text-stone-700 flex-1 truncate">{ruleName}</span>
        <span className={`text-xs ${textCls} shrink-0`}>{reason.label}</span>
      </div>
    )
  }

  if (rows.length === 0) {
    rows.push(<p key="empty" className="text-stone-400 text-xs">لا أحكام مُفحوصة</p>)
  }

  return (
    <div
      className="absolute bottom-full mb-2 z-50
                 bg-white border border-stone-200 rounded-xl shadow-xl
                 px-3 py-2.5 w-56 text-xs font-ui text-right
                 pointer-events-none select-none"
      style={{
        // مركز أفقياً على الكلمة مع منع الخروج عن الشاشة
        right: 'auto',
        left: '50%',
        transform: 'translateX(-50%)',
        maxWidth: 'min(14rem, calc(100vw - 1.5rem))',
      }}
      dir="rtl"
    >
      {/* Arrow */}
      <div className="absolute -bottom-[7px] left-1/2 -translate-x-1/2
                      w-3.5 h-3.5 bg-white border-b border-r border-stone-200 rotate-45" />
      <div className="space-y-0.5">{rows}</div>
    </div>
  )
}

// ─── Word chip ────────────────────────────────────────────────────────────────

function WordChip({ entry, events }: { entry: WordAlignmentEntry; events: TajweedEventEntry[] }) {
  const [open, setOpen] = useState(false)

  const chipCls = {
    MATCH:                 'bg-emerald-100 text-emerald-800 border-emerald-200',
    LOW_CONFIDENCE_MATCH:  'bg-yellow-100 text-yellow-800 border-yellow-300',
    SUBSTITUTION:          'bg-amber-100 text-amber-800 border-amber-200',
    SUFFIX_MATCH:          'bg-orange-100 text-orange-800 border-orange-300',
    TASHKEEL_MISMATCH:     'bg-purple-100 text-purple-800 border-purple-300',
    CPAE_FALLBACK:         'bg-red-50 text-red-400 border-red-200 opacity-70 line-through',
    EXTRA:                 'bg-stone-100 text-stone-500 border-stone-200 opacity-60',
    MISSED:                'bg-red-100 text-red-700 border-red-200',
  }[entry.status] ?? 'bg-stone-100 text-stone-600 border-stone-200'

  const icon = {
    MATCH:                 '',
    LOW_CONFIDENCE_MATCH:  '?',
    SUBSTITUTION:          '≠',
    SUFFIX_MATCH:          '+',
    TASHKEEL_MISMATCH:     '~',
    CPAE_FALLBACK:         '~',
    EXTRA:                 '+',
    MISSED:                '—',
  }[entry.status] ?? ''

  const word       = entry.status === 'MISSED' ? entry.reference_word : entry.asr_word
  const hasTooltip = events.length > 0 || entry.status !== 'MATCH'

  // Tajweed summary indicator (dot on chip corner)
  const hasTajweedIssue = events.some(e =>
    e.tajweed_check_status === 'WARNING' || e.tajweed_check_status === 'ERROR'
  )
  const hasTajweedOk = events.some(e => e.tajweed_check_status === 'OK')

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => hasTooltip && setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      // على mobile: النقر يفتح (لا يُغلق إذا كان مفتوحاً بالفعل بـ hover)
      onClick={() => hasTooltip && setOpen(true)}
    >
      <span
        className={`inline-flex items-center gap-0.5 px-2 py-1 rounded-lg border font-quran text-base
                    transition-shadow ${chipCls}
                    ${hasTooltip ? 'cursor-pointer hover:shadow-sm hover:border-opacity-70' : ''}`}
      >
        {icon && <span className="font-ui text-xs font-bold mr-0.5">{icon}</span>}
        {word}
        {/* Small dot indicator for tajweed status */}
        {(hasTajweedIssue || hasTajweedOk) && (
          <span
            className={`w-1.5 h-1.5 rounded-full ml-0.5 flex-shrink-0 self-start mt-1
                        ${hasTajweedIssue ? 'bg-amber-500' : 'bg-emerald-400'}`}
          />
        )}
      </span>

      {open && hasTooltip && <WordTooltip entry={entry} events={events} />}
    </span>
  )
}

// ─── Build word→events map (consecutive-grouping dequeue) ───────────────────

function buildEventsMap(
  alignments: WordAlignmentEntry[],
  tajweedEvents: TajweedEventEntry[]
): Map<number, TajweedEventEntry[]> {
  // Group consecutive same-word events → per-occurrence arrays
  const groups = new Map<string, TajweedEventEntry[][]>()
  let prevKey = ''
  let curGroup: TajweedEventEntry[] = []

  for (const ev of tajweedEvents) {
    const k = normAr(ev.word_text)
    if (!k) continue  // تخطَ الأحداث بدون نص (بيانات ناقصة من الـ backend)
    if (k !== prevKey) {
      if (curGroup.length > 0 && prevKey) {
        if (!groups.has(prevKey)) groups.set(prevKey, [])
        groups.get(prevKey)!.push(curGroup)
      }
      prevKey = k
      curGroup = [ev]
    } else {
      curGroup.push(ev)
    }
  }
  if (curGroup.length > 0 && prevKey) {
    if (!groups.has(prevKey)) groups.set(prevKey, [])
    groups.get(prevKey)!.push(curGroup)
  }

  // Match word_alignment entries to event groups (by occurrence order)
  const pointers = new Map<string, number>()
  const result   = new Map<number, TajweedEventEntry[]>()

  for (const entry of alignments) {
    const k          = normAr(entry.reference_word || entry.asr_word || '')
    const wordGroups = groups.get(k) || []
    const ptr        = pointers.get(k) || 0
    result.set(entry.word_index, ptr < wordGroups.length ? wordGroups[ptr] : [])
    pointers.set(k, ptr + 1)
  }

  return result
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ReportScreen({ report, surah, ayahStart, ayahEnd, onUploadAnother, onHome }: Props) {
  const badge = tajweedBadge(report.tajweed_verdict)
  const madd  = maddBadge(report.madd_verdict)

  const alignments   = report.word_alignment ?? []
  const matchCount    = alignments.filter(w => w.status === 'MATCH').length
  const lowConfCount  = alignments.filter(w => w.status === 'LOW_CONFIDENCE_MATCH').length
  const issueCount    = alignments.filter(w =>
    ['SUBSTITUTION','SUFFIX_MATCH','CPAE_FALLBACK','MISSED'].includes(w.status)
  ).length
  const totalRef      = alignments.filter(w => w.status !== 'EXTRA').length
  const accuracy      = totalRef > 0 ? Math.round((matchCount / totalRef) * 100) : null

  // الاعتماد على report.word_alignment مباشرةً (لا على alignments التي قد تُنشئ [] جديدة كل render)
  const eventsMap = useMemo(
    () => buildEventsMap(report.word_alignment ?? [], report.tajweed_events ?? []),
    [report.word_alignment, report.tajweed_events]
  )

  const surahName = SURAH_NAMES[surah] ?? `سورة ${surah}`
  const range     = ayahStart === ayahEnd ? `الآية ${ayahStart}` : `الآيات ${ayahStart}–${ayahEnd}`

  return (
    <div className="min-h-screen bg-parchment-50 flex flex-col" dir="rtl">

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-stone-200 px-4 py-3 flex items-center justify-between">
        <button onClick={onHome} className="font-ui text-sm text-stone-500 hover:text-stone-700 transition-colors">
          ← الرئيسية
        </button>
        <span className="font-ui text-sm font-semibold text-stone-700">تقرير التلاوة</span>
        <button onClick={onUploadAnother} className="font-ui text-sm text-emerald-700 hover:text-emerald-600 transition-colors font-medium">
          ملف آخر
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 max-w-lg mx-auto w-full">

        {/* Surah + verdict */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <div>
            <p className="font-ui text-xs text-stone-400">{surahName} · {range}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`px-3 py-1 rounded-full border font-ui text-sm font-semibold ${badge.cls}`}>
                {badge.label}
              </span>
              {madd && <span className={`font-ui text-sm font-medium ${madd.cls}`}>{madd.label}</span>}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            {accuracy !== null && (
              <Stat label="دقة الكلمات" value={`${accuracy}%`}
                color={accuracy >= 80 ? 'text-emerald-600' : accuracy >= 60 ? 'text-amber-600' : 'text-red-500'} />
            )}
            {report.cpae_confidence != null && (
              <Stat
                label={`محاذاة${report.cpae_quality ? ` · ${report.cpae_quality}` : ''}`}
                value={`${Math.round(report.cpae_confidence * 100)}%`}
                color={report.cpae_confidence >= 0.7 ? 'text-emerald-600' : report.cpae_confidence >= 0.5 ? 'text-amber-600' : 'text-red-500'}
              />
            )}
            <Stat
              label="وقت التقييم"
              value={report.total_runtime_sec != null ? `${report.total_runtime_sec.toFixed(1)}s` : '—'}
              color="text-stone-500"
            />
          </div>
        </div>

        {/* Word alignment grid */}
        {alignments.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="font-ui text-sm font-semibold text-stone-600 mb-1">
              كلمة بكلمة
              <span className="font-normal text-stone-400 mr-2 text-xs">
                ({matchCount}/{totalRef} مطابق
              {lowConfCount > 0 ? ` · ${lowConfCount} منخفضة` : ''}
              {issueCount > 0 ? ` · ${issueCount} مشكلة` : ''})
              </span>
            </p>
            <p className="font-ui text-xs text-stone-400 mb-3">مرّر على الكلمة لرؤية أحكام التجويد</p>

            <div className="flex flex-wrap gap-1.5 relative">
              {alignments.map((entry) => (
                <WordChip
                  key={entry.word_index}
                  entry={entry}
                  events={eventsMap.get(entry.word_index) ?? []}
                />
              ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-stone-100">
              {[
                { cls: 'bg-emerald-100 text-emerald-800',  label: 'مطابق' },
                { cls: 'bg-yellow-100 text-yellow-800',    label: 'ثقة منخفضة' },
                { cls: 'bg-amber-100 text-amber-800',      label: 'مختلف' },
                { cls: 'bg-orange-100 text-orange-800',    label: 'حرف زائد' },
                { cls: 'bg-purple-100 text-purple-800',   label: 'خطأ تشكيل' },
                { cls: 'bg-red-50 text-red-400 opacity-70 line-through', label: 'وهمية (CPAE)' },
                { cls: 'bg-red-100 text-red-700',          label: 'مفقود' },
                { cls: 'bg-stone-100 text-stone-500 opacity-60', label: 'إضافي' },
              ].map(item => (
                <span key={item.label} className="flex items-center gap-1">
                  <span className={`inline-block w-3 h-3 rounded ${item.cls}`} />
                  <span className="font-ui text-xs text-stone-500">{item.label}</span>
                </span>
              ))}
              {/* Dot legend */}
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                <span className="font-ui text-xs text-stone-500">تحذير تجويدي</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                <span className="font-ui text-xs text-stone-500">تجويد صحيح</span>
              </span>
            </div>
          </div>
        )}

        {/* Words needing review */}
        {alignments.some(w =>
          ['SUBSTITUTION','LOW_CONFIDENCE_MATCH','SUFFIX_MATCH','CPAE_FALLBACK'].includes(w.status)
        ) && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="font-ui text-sm font-semibold text-stone-600 mb-2">كلمات تحتاج مراجعة</p>
            <div className="space-y-2">
              {alignments
                .filter(w => ['SUBSTITUTION','LOW_CONFIDENCE_MATCH','SUFFIX_MATCH','CPAE_FALLBACK'].includes(w.status))
                .map(entry => {
                  const labelCls =
                    entry.status === 'SUBSTITUTION'       ? 'text-red-700' :
                    entry.status === 'SUFFIX_MATCH'        ? 'text-orange-700' :
                    entry.status === 'CPAE_FALLBACK'       ? 'text-red-400 line-through' :
                    /* LOW_CONFIDENCE_MATCH */                'text-yellow-700'
                  const note =
                    entry.status === 'LOW_CONFIDENCE_MATCH' ? `ثقة ${Math.round((entry.probability ?? 0) * 100)}%` :
                    entry.status === 'SUFFIX_MATCH'          ? 'حرف زائد' :
                    entry.status === 'CPAE_FALLBACK'         ? 'وهمية' :
                    `${entry.duration_ms}ms`
                  return (
                    <div key={entry.word_index} className="flex items-center gap-2 text-sm">
                      <span className={`font-quran ${labelCls}`}>{entry.asr_word ?? entry.reference_word}</span>
                      {entry.status !== 'CPAE_FALLBACK' && (
                        <>
                          <span className="font-ui text-stone-400 text-xs">←</span>
                          <span className="font-quran text-emerald-700">{entry.reference_word}</span>
                        </>
                      )}
                      <span className="font-ui text-xs text-stone-400 mr-auto">{note}</span>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* Waqf boundary */}
        {(report.ayah_boundary_waqf ?? []).length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="font-ui text-sm font-semibold text-stone-600 mb-3">الوقوف</p>
            <div className="flex flex-wrap gap-2">
              {(report.ayah_boundary_waqf as AyahBoundaryWaqfEntry[]).map(ev => (
                <span
                  key={ev.ayah_code}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border font-ui text-xs font-medium ${
                    ev.is_waqf
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-stone-50 text-stone-500 border-stone-200'
                  }`}
                >
                  <span className="font-quran text-sm">{ev.word_text || ev.ayah_code}</span>
                  <span className="opacity-60">{ev.is_waqf ? '— وقف' : '— وصل'}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tajweed summary */}
        {(report.tajweed_event_count ?? 0) > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="font-ui text-sm font-semibold text-stone-600 mb-3">
              أحداث التجويد
              <span className="font-normal text-stone-400 mr-2 text-xs">
                ({report.tajweed_checked_count ?? 0} مفحوص من {report.tajweed_event_count})
              </span>
            </p>
            <div className="flex gap-4">
              {(report.tajweed_ok_count ?? 0) > 0 && (
                <div className="text-center">
                  <p className="font-ui font-bold text-base text-emerald-600">{report.tajweed_ok_count}</p>
                  <p className="font-ui text-xs text-stone-400">سليم</p>
                </div>
              )}
              {(report.tajweed_warning_count ?? 0) > 0 && (
                <div className="text-center">
                  <p className="font-ui font-bold text-base text-amber-600">{report.tajweed_warning_count}</p>
                  <p className="font-ui text-xs text-stone-400">تحذير</p>
                </div>
              )}
              {(report.tajweed_error_count ?? 0) > 0 && (
                <div className="text-center">
                  <p className="font-ui font-bold text-base text-red-600">{report.tajweed_error_count}</p>
                  <p className="font-ui text-xs text-stone-400">خطأ</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ASR text */}
        {report.asr_text && (
          <details className="bg-white rounded-2xl shadow-sm p-4">
            <summary className="font-ui text-sm font-semibold text-stone-600 cursor-pointer select-none">
              النص المستخرج
            </summary>
            <p className="font-quran text-base text-stone-700 leading-loose mt-3 text-right" dir="rtl">
              {report.asr_text}
            </p>
          </details>
        )}

        {/* Pipeline status */}
        {report.pipeline_status !== 'EXACT' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <p className="font-ui text-xs text-amber-700">
              حالة المطابقة: {report.pipeline_status}
              {report.matched_start_ayah_code && report.matched_end_ayah_code && (
                <> · {report.matched_start_ayah_code} → {report.matched_end_ayah_code}</>
              )}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2 pb-4">
          <button
            onClick={onUploadAnother}
            className="w-full py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white font-ui font-semibold text-base transition-all shadow-md"
          >
            رفع ملف آخر ←
          </button>
          <button
            onClick={onHome}
            className="w-full py-2.5 font-ui text-sm text-stone-500 hover:text-stone-700 transition-colors"
          >
            العودة للرئيسية
          </button>
        </div>

      </div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center flex-1">
      <p className={`font-ui font-bold text-lg ${color}`}>{value}</p>
      <p className="font-ui text-xs text-stone-400">{label}</p>
    </div>
  )
}
