import type { EvaluationResponse } from '../types/hafiz'
import { labelToArabic, actionColor } from '../types/hafiz'

interface Props {
  result: EvaluationResponse
  onNext: () => void
  onRetry: () => void
}

export default function ResultBanner({ result, onNext, onRetry }: Props) {
  const action = result.action ?? 'REVIEW'
  const label = result.final_label ?? ''
  const confidence = result.confidence ? Math.round(result.confidence * 100) : null
  const wordErrors = result.word_errors ?? []
  const asrText = result.asr_text ?? ''

  const isAdvance = action === 'ADVANCE'
  const isRepeat = action === 'REPEAT'

  return (
    <div className={`mx-4 mb-3 rounded-2xl border px-4 py-3 animate-fade-in ${actionColor(action)}`}>
      {/* Verdict row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">
            {isAdvance ? '✅' : isRepeat ? '🔴' : '🟡'}
          </span>
          <div>
            <p className="font-ui font-semibold text-sm">{labelToArabic(label)}</p>
            {confidence !== null && (
              <p className="font-ui text-xs opacity-70">ثقة {confidence}٪</p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {!isAdvance && (
            <button
              onClick={onRetry}
              className="font-ui text-xs px-3 py-1.5 rounded-lg bg-white/50 hover:bg-white/80 border border-current/20 transition-colors"
            >
              أعد
            </button>
          )}
          <button
            onClick={onNext}
            className="font-ui text-xs px-3 py-1.5 rounded-lg bg-white/70 hover:bg-white font-semibold border border-current/20 transition-colors"
          >
            {isAdvance ? 'التالية ←' : 'تجاوز'}
          </button>
        </div>
      </div>

      {/* Word errors */}
      {wordErrors.length > 0 && (
        <div className="mt-2 pt-2 border-t border-current/10">
          <p className="font-ui text-xs font-semibold mb-1">أخطاء الكلمات:</p>
          <div className="flex flex-wrap gap-1" dir="rtl">
            {wordErrors.slice(0, 5).map((e, i) => (
              <span key={i} className="font-quran text-sm bg-red-100 text-red-700 rounded px-1.5 py-0.5">
                {e.expected}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ASR text (what was recognized) */}
      {asrText && !isAdvance && (
        <div className="mt-2 pt-2 border-t border-current/10">
          <p className="font-ui text-xs opacity-60 mb-0.5">ما فُهم من التلاوة:</p>
          <p className="font-quran text-sm" dir="rtl">{asrText}</p>
        </div>
      )}
    </div>
  )
}
