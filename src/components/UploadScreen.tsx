import { useState, useRef, useCallback } from 'react'
import { SURAH_NAMES } from '../types/hafiz'

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

interface Props {
  onEvaluate: (file: File, surah: number, start: number, end: number) => void
  onBack: () => void
  loading: boolean
  error: string | null
}

export default function UploadScreen({ onEvaluate, onBack, loading, error }: Props) {
  const [file, setFile]       = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [surah, setSurah]     = useState(1)
  const [ayahStart, setAyahStart] = useState(1)
  const [ayahEnd, setAyahEnd] = useState(1)
  const inputRef = useRef<HTMLInputElement>(null)

  const maxAyah = SURAH_LENGTHS[surah] ?? 1

  function handleSurahChange(v: number) {
    setSurah(v)
    setAyahStart(1)
    setAyahEnd(1)
  }

  function handleStartChange(v: number) {
    const clamped = Math.min(maxAyah, Math.max(1, v))
    setAyahStart(clamped)
    if (ayahEnd < clamped) setAyahEnd(clamped)
  }

  function handleEndChange(v: number) {
    const clamped = Math.min(maxAyah, Math.max(ayahStart, v))
    setAyahEnd(clamped)
  }

  const acceptFile = useCallback((f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
    if (!['wav', 'mp3', 'm4a', 'ogg', 'webm'].includes(ext)) return
    if (f.size > 25 * 1024 * 1024) return
    if (f.size < 50 * 1024) return   // أصغر من 50KB — على الأرجح ملف تالف أو صامت
    setFile(f)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) acceptFile(f)
  }, [acceptFile])

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) acceptFile(f)
  }

  const ayahCount = ayahEnd - ayahStart + 1
  // تقدير عدد الكلمات: متوسط 10 كلمات/آية — تقريبي (الحد الدقيق يُحكَم من الـ backend)
  const estimatedWords = ayahCount * 10
  const wordLimitWarning = estimatedWords > 150
  const canSubmit = file !== null && !loading && !wordLimitWarning

  return (
    <div className="min-h-screen bg-parchment-50 flex flex-col items-center justify-center p-6" dir="rtl">

      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="font-quran text-4xl text-emerald-800 mb-1">حافِظ</h1>
        <p className="font-ui text-stone-500 text-sm">تقييم ملف تلاوة مسجّل</p>
      </div>

      <div className="w-full max-w-sm space-y-4">

        {/* Drop zone */}
        <div
          onClick={() => !file && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`
            relative border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer
            ${dragging ? 'border-emerald-500 bg-emerald-50' : 'border-stone-300 bg-white hover:border-emerald-400 hover:bg-parchment-50'}
            ${file ? 'border-emerald-500 bg-emerald-50 cursor-default' : ''}
          `}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".wav,.mp3,.m4a,.ogg,.webm,audio/*"
            className="hidden"
            onChange={onInputChange}
          />
          {file ? (
            <div className="space-y-1">
              <div className="text-2xl">🎵</div>
              <p className="font-ui text-sm font-semibold text-emerald-700 truncate">{file.name}</p>
              <p className="font-ui text-xs text-stone-400">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
              <button
                onClick={(e) => { e.stopPropagation(); setFile(null); if (inputRef.current) inputRef.current.value = '' }}
                className="font-ui text-xs text-red-400 hover:text-red-600 transition-colors mt-1"
              >
                إزالة الملف
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-3xl text-stone-300">🎙</div>
              <p className="font-ui text-sm font-semibold text-stone-600">اسحب الملف أو اضغط للاختيار</p>
              <p className="font-ui text-xs text-stone-400">WAV · MP3 · M4A — الحد الأقصى 25 MB</p>
            </div>
          )}
        </div>

        {/* Surah + Ayah selector */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <label className="font-ui text-sm font-semibold text-stone-600 block">نطاق التلاوة</label>

          {/* Surah */}
          <div>
            <label className="font-ui text-xs text-stone-400 block mb-1">السورة</label>
            <select
              value={surah}
              onChange={(e) => handleSurahChange(Number(e.target.value))}
              className="w-full border border-stone-200 rounded-xl px-3 py-2 font-ui text-sm focus:outline-none focus:border-emerald-400"
              dir="rtl"
            >
              {Array.from({ length: 114 }, (_, i) => i + 1).map((s) => (
                <option key={s} value={s}>{s}. {SURAH_NAMES[s]}</option>
              ))}
            </select>
          </div>

          {/* Ayah range */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="font-ui text-xs text-stone-400 block mb-1">من الآية</label>
              <input
                type="number" min={1} max={maxAyah} value={ayahStart}
                onChange={(e) => handleStartChange(Number(e.target.value))}
                className="w-full border border-stone-200 rounded-xl px-3 py-2 font-ui text-sm text-center focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div className="flex-1">
              <label className="font-ui text-xs text-stone-400 block mb-1">إلى الآية</label>
              <input
                type="number" min={ayahStart} max={maxAyah} value={ayahEnd}
                onChange={(e) => handleEndChange(Number(e.target.value))}
                className="w-full border border-stone-200 rounded-xl px-3 py-2 font-ui text-sm text-center focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          <p className={`font-ui text-xs ${wordLimitWarning ? 'text-red-500 font-medium' : 'text-stone-400'}`}>
            {ayahCount} {ayahCount === 1 ? 'آية' : 'آيات'} · ~{estimatedWords} كلمة
            {wordLimitWarning
              ? ' — يتجاوز الحد (150 كلمة)، قلّل النطاق'
              : ' · الحد الأقصى 150 كلمة'}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            <p className="font-ui text-xs text-red-600">{error}</p>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={() => file && onEvaluate(file, surah, ayahStart, ayahEnd)}
          disabled={!canSubmit}
          className="w-full py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white font-ui font-semibold text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
        >
          {loading ? 'جارٍ التقييم…' : 'تقييم التلاوة ←'}
        </button>

        {/* Back */}
        <button
          onClick={onBack}
          disabled={loading}
          className="w-full py-2.5 font-ui text-sm text-stone-500 hover:text-stone-700 transition-colors"
        >
          ← رجوع
        </button>
      </div>
    </div>
  )
}
