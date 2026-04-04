import type { RecitationMode } from '../types/hafiz'
import { SURAH_NAMES } from '../types/hafiz'

interface Props {
  surah: number
  ayah: number
  mode: RecitationMode
  onModeChange: (m: RecitationMode) => void
  onEndSession: () => void
}

export default function Header({ surah, ayah, mode, onModeChange, onEndSession }: Props) {
  const surahName = SURAH_NAMES[surah] ?? `سورة ${surah}`

  return (
    <header className="bg-emerald-800 text-white px-4 py-3 flex items-center justify-between shadow-md">
      {/* Left: end session */}
      <button
        onClick={onEndSession}
        className="text-emerald-200 hover:text-white text-sm font-ui transition-colors"
        aria-label="إنهاء الجلسة"
      >
        إنهاء
      </button>

      {/* Center: surah + ayah */}
      <div className="text-center">
        <p className="font-quran text-lg leading-tight">{surahName}</p>
        <p className="font-ui text-xs text-emerald-200">الآية {ayah}</p>
      </div>

      {/* Right: mode toggle */}
      <div className="flex items-center gap-1 bg-emerald-900 rounded-full p-1">
        <button
          onClick={() => onModeChange('tilawa')}
          className={`px-3 py-1 rounded-full text-xs font-ui transition-all ${
            mode === 'tilawa' ? 'bg-white text-emerald-800 font-semibold' : 'text-emerald-300'
          }`}
        >
          تلاوة
        </button>
        <button
          onClick={() => onModeChange('hifz')}
          className={`px-3 py-1 rounded-full text-xs font-ui transition-all ${
            mode === 'hifz' ? 'bg-white text-emerald-800 font-semibold' : 'text-emerald-300'
          }`}
        >
          حفظ
        </button>
      </div>
    </header>
  )
}
