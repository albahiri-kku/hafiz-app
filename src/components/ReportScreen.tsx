import type { EvaluateFileResponse, WordAlignmentEntry } from '../types/hafiz'
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
  if (verdict === 'TAJWEED_OK')       return { label: 'تجويد سليم', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' }
  if (verdict === 'TAJWEED_PARTIAL')  return { label: 'تجويد جزئي', cls: 'bg-amber-100 text-amber-800 border-amber-200' }
  if (verdict === 'TAJWEED_ERROR')    return { label: 'خطأ تجويدي', cls: 'bg-red-100 text-red-800 border-red-200' }
  if (verdict === 'TAJWEED_UNCHECKED') return { label: 'لم يُتحقق', cls: 'bg-stone-100 text-stone-600 border-stone-200' }
  return { label: verdict, cls: 'bg-stone-100 text-stone-600 border-stone-200' }
}

function maddBadge(verdict: string | null) {
  if (!verdict || verdict === 'NO_MADD') return null
  if (verdict.includes('OK') || verdict.includes('CORRECT')) return { label: 'المد صحيح', cls: 'text-emerald-700' }
  if (verdict.includes('SHORT') || verdict.includes('TOO_SHORT')) return { label: 'المد قصير', cls: 'text-red-600' }
  if (verdict.includes('LONG') || verdict.includes('TOO_LONG'))   return { label: 'المد طويل', cls: 'text-amber-600' }
  return { label: verdict, cls: 'text-stone-500' }
}

// ─── Word chip ────────────────────────────────────────────────────────────────

function WordChip({ entry }: { entry: WordAlignmentEntry }) {
  const cls = {
    MATCH:        'bg-emerald-100 text-emerald-800 border-emerald-200',
    SUBSTITUTION: 'bg-amber-100 text-amber-800 border-amber-200',
    EXTRA:        'bg-stone-100 text-stone-500 border-stone-200 opacity-60',
    MISSED:       'bg-red-100 text-red-700 border-red-200',
  }[entry.status] ?? 'bg-stone-100 text-stone-600 border-stone-200'

  const icon = {
    MATCH:        '',
    SUBSTITUTION: '≠',
    EXTRA:        '+',
    MISSED:       '—',
  }[entry.status] ?? ''

  const word = entry.status === 'MISSED' ? entry.reference_word : entry.asr_word

  return (
    <span className={`inline-flex items-center gap-0.5 px-2 py-1 rounded-lg border font-quran text-base ${cls}`}
          title={entry.status === 'SUBSTITUTION' ? `المرجع: ${entry.reference_word}` : undefined}>
      {icon && <span className="font-ui text-xs font-bold">{icon}</span>}
      {word}
    </span>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ReportScreen({ report, surah, ayahStart, ayahEnd, onUploadAnother, onHome }: Props) {
  const badge = tajweedBadge(report.tajweed_verdict)
  const madd  = maddBadge(report.madd_verdict)

  const alignments = report.word_alignment ?? []
  const matchCount = alignments.filter(w => w.status === 'MATCH').length
  const totalRef   = alignments.filter(w => w.status !== 'EXTRA').length
  const accuracy   = totalRef > 0 ? Math.round((matchCount / totalRef) * 100) : null

  const surahName = SURAH_NAMES[surah] ?? `سورة ${surah}`
  const range = ayahStart === ayahEnd ? `الآية ${ayahStart}` : `الآيات ${ayahStart}–${ayahEnd}`

  return (
    <div className="min-h-screen bg-parchment-50 flex flex-col" dir="rtl">

      {/* Header bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-stone-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={onHome}
          className="font-ui text-sm text-stone-500 hover:text-stone-700 transition-colors"
        >
          ← الرئيسية
        </button>
        <span className="font-ui text-sm font-semibold text-stone-700">تقرير التلاوة</span>
        <button
          onClick={onUploadAnother}
          className="font-ui text-sm text-emerald-700 hover:text-emerald-600 transition-colors font-medium"
        >
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
              {madd && (
                <span className={`font-ui text-sm font-medium ${madd.cls}`}>{madd.label}</span>
              )}
            </div>
          </div>

          {/* Key stats row */}
          <div className="flex gap-3 pt-1">
            {accuracy !== null && (
              <Stat label="دقة الكلمات" value={`${accuracy}%`}
                color={accuracy >= 80 ? 'text-emerald-600' : accuracy >= 60 ? 'text-amber-600' : 'text-red-500'} />
            )}
            {report.cpae_confidence !== null && (
              <Stat label="ثقة المحاذاة" value={`${Math.round(report.cpae_confidence * 100)}%`}
                color={report.cpae_confidence >= 0.7 ? 'text-emerald-600' : 'text-amber-600'} />
            )}
            <Stat label="وقت التقييم" value={`${report.total_runtime_sec?.toFixed(1)}s`} color="text-stone-500" />
          </div>
        </div>

        {/* Word alignment grid */}
        {alignments.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="font-ui text-sm font-semibold text-stone-600 mb-3">
              كلمة بكلمة
              <span className="font-normal text-stone-400 mr-2 text-xs">
                ({matchCount}/{totalRef} مطابق)
              </span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {alignments.map((entry) => (
                <WordChip key={entry.word_index} entry={entry} />
              ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-stone-100">
              {[
                { cls: 'bg-emerald-100 text-emerald-800', label: 'مطابق' },
                { cls: 'bg-amber-100 text-amber-800', label: 'مختلف' },
                { cls: 'bg-red-100 text-red-700', label: 'مفقود' },
                { cls: 'bg-stone-100 text-stone-500 opacity-60', label: 'إضافي' },
              ].map((item) => (
                <span key={item.label} className="flex items-center gap-1">
                  <span className={`inline-block w-3 h-3 rounded ${item.cls}`} />
                  <span className="font-ui text-xs text-stone-500">{item.label}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Substitutions detail */}
        {alignments.some(w => w.status === 'SUBSTITUTION') && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="font-ui text-sm font-semibold text-stone-600 mb-2">الاختلافات</p>
            <div className="space-y-2">
              {alignments
                .filter(w => w.status === 'SUBSTITUTION')
                .map((entry) => (
                  <div key={entry.word_index} className="flex items-center gap-2 text-sm">
                    <span className="font-quran text-red-700">{entry.asr_word}</span>
                    <span className="font-ui text-stone-400 text-xs">←</span>
                    <span className="font-quran text-emerald-700">{entry.reference_word}</span>
                    <span className="font-ui text-xs text-stone-400 mr-auto">
                      {entry.duration_ms}ms
                    </span>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* Pipeline status note */}
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
