import { useState } from 'react'
import type { RecitationMode } from '../types/hafiz'
import { SURAH_NAMES } from '../types/hafiz'

interface Props {
  onStart: (ayahCode: string | undefined, mode: RecitationMode) => void
  onBrowseMushaf: () => void
  onUploadFile: () => void
  loading: boolean
  error: string | null
}

// Surah ayah counts (for validation)
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

export default function StartScreen({ onStart, onBrowseMushaf, onUploadFile, loading, error }: Props) {
  const [mode, setMode] = useState<RecitationMode>('tilawa')
  const [autoDetect, setAutoDetect] = useState(false)
  const [surah, setSurah] = useState(1)
  const [ayah, setAyah] = useState(1)

  const maxAyah = SURAH_LENGTHS[surah] ?? 1
  const ayahCode = autoDetect ? undefined : `${String(surah).padStart(3, '0')}${String(ayah).padStart(3, '0')}`

  function handleSurahChange(v: number) {
    setSurah(v)
    setAyah(1)
  }

  return (
    <div className="min-h-screen bg-parchment-50 flex flex-col items-center justify-center p-6" dir="rtl">
      {/* Logo */}
      <div className="mb-8 text-center flex flex-col items-center">
        <img
          src="/icons/hafiz-logo.png"
          alt="حافِظ"
          className="w-24 h-24 mb-3 object-contain"
        />
        <p className="font-ui text-stone-500 text-sm">تقييم التلاوة القرآنية بالذكاء الاصطناعي</p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-3xl shadow-lg p-6 space-y-5">

        {/* Mode */}
        <div>
          <label className="font-ui text-sm font-semibold text-stone-600 block mb-2">وضع التلاوة</label>
          <div className="flex gap-2">
            {(['tilawa', 'hifz'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2.5 rounded-xl font-ui text-sm font-medium border-2 transition-all ${
                  mode === m
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                    : 'border-stone-200 text-stone-500 hover:border-stone-300'
                }`}
              >
                {m === 'tilawa' ? '📖 تلاوة' : '🧠 حفظ'}
              </button>
            ))}
          </div>
          <p className="font-ui text-xs text-stone-400 mt-1">
            {mode === 'tilawa' ? 'النص ظاهر — مناسب للمراجعة والتحسين' : 'النص مخفي — اختبر حفظك'}
          </p>
        </div>

        {/* Starting position */}
        <div>
          <label className="font-ui text-sm font-semibold text-stone-600 block mb-2">موضع البداية</label>

          <label className="flex items-center gap-2 mb-3 cursor-pointer">
            <input
              type="checkbox"
              checked={autoDetect}
              onChange={(e) => setAutoDetect(e.target.checked)}
              className="w-4 h-4 accent-emerald-600"
            />
            <span className="font-ui text-sm text-stone-600">اكتشاف تلقائي من الصوت</span>
          </label>

          {!autoDetect && (
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="font-ui text-xs text-stone-400 block mb-1">السورة</label>
                <select
                  value={surah}
                  onChange={(e) => handleSurahChange(Number(e.target.value))}
                  className="w-full border border-stone-200 rounded-xl px-2 py-2 font-ui text-sm focus:outline-none focus:border-emerald-400"
                  dir="rtl"
                >
                  {Array.from({ length: 114 }, (_, i) => i + 1).map((s) => (
                    <option key={s} value={s}>
                      {s}. {SURAH_NAMES[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-24">
                <label className="font-ui text-xs text-stone-400 block mb-1">الآية</label>
                <input
                  type="number"
                  min={1}
                  max={maxAyah}
                  value={ayah}
                  onChange={(e) => setAyah(Math.min(maxAyah, Math.max(1, Number(e.target.value))))}
                  className="w-full border border-stone-200 rounded-xl px-2 py-2 font-ui text-sm text-center focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            <p className="font-ui text-xs text-red-600">{error}</p>
          </div>
        )}

        {/* Start button */}
        <button
          onClick={() => onStart(ayahCode, mode)}
          disabled={loading}
          className="w-full py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white font-ui font-semibold text-base transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-md"
        >
          {loading ? 'جارٍ التهيئة…' : 'ابدأ التلاوة ←'}
        </button>
      </div>

      {/* Secondary actions */}
      <div className="mt-4 flex flex-col items-center gap-2">
        <button
          onClick={onUploadFile}
          className="font-ui text-sm text-emerald-700 hover:text-emerald-600 underline underline-offset-2 transition-colors"
        >
          تقييم ملف مسجّل ←
        </button>
        <button
          onClick={onBrowseMushaf}
          className="font-ui text-sm text-stone-500 hover:text-stone-700 underline underline-offset-2 transition-colors"
        >
          تصفح المصحف ←
        </button>
      </div>

      <p className="mt-3 font-ui text-xs text-stone-400 text-center">
        يتطلب إذن الميكروفون للتلاوة المباشرة
      </p>
    </div>
  )
}
