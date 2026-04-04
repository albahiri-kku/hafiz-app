import type { QuranWord, WordError, RecitationMode, EvaluationResponse } from '../types/hafiz'

interface Props {
  words: QuranWord[]
  mode: RecitationMode
  result: EvaluationResponse | null
  isRecording: boolean
  currentWordIndex?: number   // array index of word being recited; -1 = none
}

type WordStatus = 'default' | 'active' | 'error' | 'near' | 'correct'

function getWordStatus(
  word: QuranWord,
  wordArrayIndex: number,
  result: EvaluationResponse | null,
  currentWordIndex: number,
): WordStatus {
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

export default function AyahDisplay({ words, mode, result, isRecording, currentWordIndex = -1 }: Props) {
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
          const status = getWordStatus(word, idx, result, currentWordIndex)
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
    </div>
  )
}
