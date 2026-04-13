import type { QuranWord, WordError, RecitationMode, EvaluationResponse, HeardEntry } from '../types/hafiz'

interface Props {
  words: QuranWord[]
  mode: RecitationMode
  result: EvaluationResponse | null
  isRecording: boolean
  currentWordIndex?: number
  wordColorMap?: Record<number, 'correct' | 'error' | 'unheard'>
  heardLog?: HeardEntry[]
}

type WordStatus = 'default' | 'active' | 'error' | 'near' | 'correct' | 'unheard'

function getWordStatus(
  word: QuranWord,
  wordArrayIndex: number,
  result: EvaluationResponse | null,
  currentWordIndex: number,
  wordColorMap: Record<number, 'correct' | 'error' | 'unheard'> = {},
): WordStatus {
  // Streaming per-word color takes priority over batch result
  if (wordColorMap[wordArrayIndex]) return wordColorMap[wordArrayIndex]
  // Active word highlight during recording (no result yet)
  if (!result && wordArrayIndex === currentWordIndex) return 'active'
  if (!result) return 'default'
  const action = result.action ?? ''

  // Check word errors by position
  const errors: WordError[] = result.word_errors ?? []
  const errPos = new Set(errors.map((e) => e.position))
  if (errPos.has(word.word_index)) return 'error'

  // Near matches from probe details
  const probe = result.word_probe_details
  if (probe && probe.near_match_count > 0) {
    // We don't know exact positions from details alone, mark as near if action=REVIEW
    if (action === 'REVIEW') return 'near'
  }

  if (action === 'ADVANCE') return 'correct'
  return 'default'
}

function WordToken({ word, status, hidden }: {
  word: QuranWord
  status: WordStatus
  hidden: boolean
}) {
  const styleMap: Record<WordStatus, string> = {
    default: 'text-stone-800',
    active:  'text-emerald-800 bg-emerald-100 rounded px-0.5 ring-2 ring-emerald-400 ring-offset-1 animate-pulse',
    correct: 'text-emerald-700 bg-emerald-50 rounded px-0.5',
    near:    'text-amber-700 bg-amber-50 rounded px-0.5',
    error:   'text-red-700 bg-red-50 rounded px-0.5 border-b-2 border-red-400',
    unheard: 'text-orange-400 bg-orange-50 rounded px-0.5 border-b-2 border-orange-300 border-dashed',
  }

  if (hidden) {
    // Hifz mode: show dots proportional to word length
    const dots = '•'.repeat(Math.max(2, word.uthmani_text.replace(/\s/g, '').length))
    return (
      <span className="inline-block mx-1 text-stone-300 font-quran text-2xl select-none" dir="rtl">
        {dots}
      </span>
    )
  }

  return (
    <span
      className={`inline-block mx-1 font-quran text-3xl leading-loose cursor-default transition-all duration-200 ${styleMap[status]}`}
      dir="rtl"
      data-word-index={word.word_index}
    >
      {word.uthmani_text}
    </span>
  )
}

function heardText(entry: HeardEntry): string {
  if (entry.error_type === 'VAD_MISSED') return 'صمت'
  if (!entry.heard || entry.heard === '—') return 'صمت'
  return entry.heard
}

export default function AyahDisplay({ words, mode, result, isRecording, currentWordIndex = -1, wordColorMap = {}, heardLog = [] }: Props) {
  const isHifz = mode === 'hifz'

  return (
    <div
      className={`
        flex-1 flex flex-col items-center justify-center p-6
        transition-opacity duration-300 ${isRecording ? 'opacity-60' : 'opacity-100'}
      `}
    >
      {/* Decorative divider */}
      <div className="w-16 h-0.5 bg-emerald-200 rounded mb-6" />

      {/* Words */}
      <div
        className="text-center leading-loose max-w-xl"
        dir="rtl"
        lang="ar"
      >
        {words.map((word, idx) => {
          const status = getWordStatus(word, idx, result, currentWordIndex, wordColorMap)
          // In hifz mode, hide words unless they have an error (show correction)
          const hidden = isHifz && result === null
          return (
            <span key={word.word_index} className="relative group">
              <WordToken word={word} status={status} hidden={hidden} />
              {/* Error tooltip */}
              {status === 'error' && (() => {
                const err = (result?.word_errors ?? []).find((e) => e.position === word.word_index)
                if (!err) return null
                return (
                  <span
                    className="
                      absolute bottom-full right-0 mb-2 z-10
                      bg-red-700 text-white text-xs font-ui
                      px-2 py-1 rounded shadow-lg whitespace-nowrap
                      opacity-0 group-hover:opacity-100
                      pointer-events-none transition-opacity
                    "
                    dir="rtl"
                  >
                    قرأت: {err.got || '—'}<br />
                    المتوقع: {err.expected}
                  </span>
                )
              })()}
            </span>
          )
        })}
      </div>

      {/* Divider */}
      <div className="w-16 h-0.5 bg-emerald-200 rounded mt-6" />

      {/* Word count */}
      {!isHifz && (
        <p className="mt-3 text-xs text-stone-400 font-ui">
          {words.length} كلمة
        </p>
      )}

      {/* Live heard box */}
      {isRecording && (
        <div className="mt-4 w-full max-w-xl rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
          <p className="font-ui text-xs text-stone-400 mb-1.5">ما سمعه النظام</p>
          {heardLog.length === 0 ? (
            <p className="font-ui text-xs text-stone-300 text-center py-1">في انتظار الكلام…</p>
          ) : (
            <div className="flex flex-wrap gap-x-2 gap-y-1.5" dir="rtl">
              {heardLog.map((entry, i) => {
                const text = heardText(entry)
                const isSilent = text === 'صمت'
                return (
                  <span
                    key={i}
                    className={`inline-flex flex-col items-center font-ui text-xs leading-tight px-1.5 py-0.5 rounded-md border ${
                      isSilent
                        ? 'bg-stone-100 border-stone-300 text-stone-400'
                        : entry.correct
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-red-50 border-red-200 text-red-600'
                    }`}
                  >
                    <span className="font-quran text-sm">{entry.expected}</span>
                    <span className={`text-[10px] mt-0.5 ${isSilent ? 'text-stone-400' : entry.correct ? 'text-emerald-500' : 'text-red-400'}`}>
                      {isSilent ? '🔇 صمت' : text}
                    </span>
                  </span>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
