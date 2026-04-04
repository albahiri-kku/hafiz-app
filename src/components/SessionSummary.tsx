import type { SessionStats, AyahResult } from '../types/hafiz'
import { SURAH_NAMES, labelToArabic } from '../types/hafiz'

interface Props {
  stats: SessionStats
  onRestart: () => void
}

function ayahLabel(r: AyahResult) {
  const surahName = SURAH_NAMES[r.surah] ?? `سورة ${r.surah}`
  return `${surahName} ${r.ayah}`
}

function ActionBadge({ action }: { action: string }) {
  if (action === 'ADVANCE') return <span className="text-emerald-600 text-xs font-ui">✓ صحيح</span>
  if (action === 'REPEAT')  return <span className="text-red-600 text-xs font-ui">✗ خطأ</span>
  return <span className="text-amber-600 text-xs font-ui">~ مراجعة</span>
}

export default function SessionSummary({ stats, onRestart }: Props) {
  const { totalAyahs, correct, errors, reviews, history } = stats
  const accuracy = totalAyahs > 0 ? Math.round((correct / totalAyahs) * 100) : 0

  return (
    <div className="min-h-screen bg-parchment-50 flex flex-col" dir="rtl">
      {/* Header */}
      <div className="bg-emerald-800 text-white px-6 py-8 text-center">
        <h1 className="font-quran text-3xl mb-1">ملخص الجلسة</h1>
        <p className="font-ui text-emerald-200 text-sm">{totalAyahs} آية تمت تلاوتها</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 m-4">
        <StatCard label="صحيح" value={correct} color="emerald" icon="✅" />
        <StatCard label="خطأ" value={errors} color="red" icon="🔴" />
        <StatCard label="مراجعة" value={reviews} color="amber" icon="🟡" />
      </div>

      {/* Accuracy circle */}
      <div className="mx-4 bg-white rounded-2xl shadow-sm p-4 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full border-4 border-emerald-400 flex items-center justify-center">
          <span className="font-ui font-bold text-emerald-700 text-lg">{accuracy}٪</span>
        </div>
        <div>
          <p className="font-ui font-semibold text-stone-700">دقة التلاوة</p>
          <p className="font-ui text-xs text-stone-400">
            {accuracy >= 90 ? 'ممتاز 🌟' : accuracy >= 70 ? 'جيد 👍' : 'يحتاج تحسين 📚'}
          </p>
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="mx-4 mt-3 bg-white rounded-2xl shadow-sm p-4">
          <h2 className="font-ui font-semibold text-stone-700 mb-3">تفاصيل الآيات</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {history.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-stone-100 last:border-0">
                <div>
                  <p className="font-quran text-sm text-stone-700">{ayahLabel(r)}</p>
                  {r.word_errors.length > 0 && (
                    <p className="font-ui text-xs text-red-500">
                      {r.word_errors.length} خطأ في الكلمات
                    </p>
                  )}
                </div>
                <ActionBadge action={r.action} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Restart */}
      <div className="p-4 mt-auto">
        <button
          onClick={onRestart}
          className="w-full py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white font-ui font-semibold text-base transition-all shadow-md"
        >
          جلسة جديدة ←
        </button>
      </div>
    </div>
  )
}

function StatCard({ label, value, color, icon }: {
  label: string; value: number; color: string; icon: string
}) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-700',
  }
  return (
    <div className={`rounded-2xl p-3 text-center ${colors[color]}`}>
      <p className="text-2xl mb-1">{icon}</p>
      <p className="font-ui font-bold text-xl">{value}</p>
      <p className="font-ui text-xs opacity-70">{label}</p>
    </div>
  )
}
