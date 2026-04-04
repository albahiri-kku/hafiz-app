import type { RecorderPhase } from '../hooks/useAudioRecorder'

interface Props {
  phase: RecorderPhase
  audioLevel: number       // 0–1
  silenceCountdown: number // seconds until auto-submit; 0 = voice detected
}

const BAR_COUNT = 12

export default function MicButton({ phase, audioLevel, silenceCountdown }: Props) {
  if (phase === 'idle') return null

  const isRecording  = phase === 'recording'
  const isSubmitting = phase === 'submitting'

  return (
    <div className="flex flex-col items-center gap-2 py-4 bg-white border-t border-stone-100">

      {/* Status label */}
      <p className="font-ui text-xs text-stone-500 h-4">
        {isSubmitting && 'جارٍ التحليل…'}
        {isRecording && silenceCountdown > 0 && `صمت — إرسال خلال ${silenceCountdown}ث`}
        {isRecording && silenceCountdown === 0 && 'جارٍ التسجيل'}
      </p>

      {/* Visual indicator */}
      <div className="flex items-end gap-0.5 h-8">
        {isSubmitting ? (
          /* Spinner */
          <svg className="w-6 h-6 text-emerald-600 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        ) : (
          /* Audio level bars */
          Array.from({ length: BAR_COUNT }).map((_, i) => {
            // Each bar lights up proportionally to audioLevel
            const threshold = (i + 1) / BAR_COUNT
            const active = audioLevel >= threshold
            // Bars get taller toward the center
            const dist = Math.abs(i - (BAR_COUNT - 1) / 2) / ((BAR_COUNT - 1) / 2)
            const heightPct = 30 + (1 - dist) * 70   // 30% to 100%

            return (
              <div
                key={i}
                className={`w-1.5 rounded-full transition-all duration-75 ${
                  active
                    ? silenceCountdown > 0
                      ? 'bg-amber-400'
                      : 'bg-emerald-500'
                    : 'bg-stone-200'
                }`}
                style={{ height: `${heightPct}%` }}
              />
            )
          })
        )}
      </div>

      {/* Silence progress bar */}
      {isRecording && silenceCountdown > 0 && (
        <div className="w-32 h-0.5 bg-stone-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-400 rounded-full transition-all duration-1000"
            style={{ width: `${(silenceCountdown / 5) * 100}%` }}
          />
        </div>
      )}
    </div>
  )
}
