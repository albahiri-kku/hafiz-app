/**
 * AskTajweed.tsx — اسأل Hafiz Phase 1.0 page
 *
 * Pre-production UI for the deterministic tajweed Q&A service.
 * Phase 1.0 covers NoonSakinah إظهار حلقي داخل الكلمة only (678 positions).
 *
 * No mushaf integration yet — that's Phase 1.1+. This page accepts a
 * word_key directly (e.g., "001007:3") so we can exercise the full
 * pipeline end-to-end before adding click-to-ask UX.
 *
 * Endpoint: POST /api/v1/tajweed_qa
 *           GET  /api/v1/tajweed_qa/markers
 */
import { useState, useCallback, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_URL ?? ''
const API_KEY = import.meta.env.VITE_API_KEY ?? ''

type QuestionType = 'BASIC' | 'WHY' | 'WHY_NOT' | 'OBLIGATION' | 'ALL'

type Classification =
  | 'CLEAN'
  | 'BLIND_SPOT'
  | 'CAT_D_UNCERTAIN'
  | 'CAT_D_KNOWN_GAP'
  | 'DETERMINISTIC_NO_RULE'
  | 'OUT_OF_PHASE_SCOPE'
  | 'INCONSISTENCY'

type AnswerPayload = {
  word_key: string
  question_type: string
  classification: Classification
  answer: string
  components: Record<string, string>
  is_terminal: boolean
  inconsistency_report: Record<string, unknown> | null
  event_atoms_used: Record<string, string>
}

type MarkersPayload = {
  blind_spots: string[]
  cat_d_positions: string[]
}

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'BASIC', label: 'الحكم فقط' },
  { value: 'ALL', label: 'الحكم + السبب + الدرجة (الكلّ)' },
  { value: 'WHY', label: 'السبب' },
  { value: 'WHY_NOT', label: 'لماذا ليس إدغاماً؟' },
  { value: 'OBLIGATION', label: 'درجة الحكم' },
]

const SAMPLES: { word_key: string; label: string }[] = [
  { word_key: '001007:3', label: '1:7 — أَنْعَمْتَ (إظهار + ع)' },
  { word_key: '005006:46', label: '5:6 — مِّنْهُ (إظهار + ه)' },
  { word_key: '003110:8', label: '3:110 — وَتَنْهَوْنَ (إظهار + ه)' },
  { word_key: '075027:1', label: '75:27 — مَنْ ۜ رَاقٍ (BLIND_SPOT)' },
  { word_key: '001001:1', label: '1:1 — بِسْمِ (لا حكم)' },
  { word_key: '106004:1', label: '106:4 — مِنْ خَوْفٍ (خارج Phase 1.0)' },
]

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (API_KEY) headers['X-API-Key'] = API_KEY
  return headers
}

function classificationBadge(c: Classification): { text: string; bg: string } {
  switch (c) {
    case 'CLEAN':
      return { text: 'موثوق', bg: 'bg-green-100 text-green-800 border-green-300' }
    case 'BLIND_SPOT':
      return { text: 'خطأ موثَّق — يحتاج عالم', bg: 'bg-red-100 text-red-800 border-red-300' }
    case 'CAT_D_UNCERTAIN':
    case 'CAT_D_KNOWN_GAP':
      return { text: 'يحتاج عالم', bg: 'bg-orange-100 text-orange-800 border-orange-300' }
    case 'DETERMINISTIC_NO_RULE':
      return { text: 'لا حكم خاصّ', bg: 'bg-blue-100 text-blue-800 border-blue-300' }
    case 'OUT_OF_PHASE_SCOPE':
      return { text: 'خارج النطاق', bg: 'bg-gray-100 text-gray-800 border-gray-300' }
    case 'INCONSISTENCY':
      return { text: 'تفاعل غير معرَّف', bg: 'bg-purple-100 text-purple-800 border-purple-300' }
    default:
      return { text: c, bg: 'bg-gray-100 text-gray-800 border-gray-300' }
  }
}

// Render markdown bolding (**x** → <strong>x</strong>) + paragraph breaks.
// No HTML in input — we escape first.
function renderAnswer(answer: string): string {
  const escaped = answer
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  const bolded = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  return bolded
    .split(/\n\n+/)
    .map((p) => `<p style="margin: 0 0 12px;">${p.replace(/\n/g, '<br>')}</p>`)
    .join('')
}

export default function AskTajweed({ onBack }: { onBack?: () => void }) {
  const [wordKey, setWordKey] = useState<string>('001007:3')
  const [questionType, setQuestionType] = useState<QuestionType>('ALL')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [payload, setPayload] = useState<AnswerPayload | null>(null)
  const [markers, setMarkers] = useState<MarkersPayload | null>(null)

  // Pre-load BLIND_SPOTs once (frontend uses for warning before click)
  useEffect(() => {
    fetch(`${API_BASE}/api/v1/tajweed_qa/markers`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setMarkers(data as MarkersPayload)
      })
      .catch(() => {
        /* non-blocking */
      })
  }, [])

  const onAsk = useCallback(async () => {
    setLoading(true)
    setError(null)
    setPayload(null)
    try {
      const r = await fetch(`${API_BASE}/api/v1/tajweed_qa`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          word_key: wordKey.trim(),
          question_type: questionType,
        }),
      })
      if (!r.ok) {
        const detail = await r.text()
        throw new Error(`HTTP ${r.status}: ${detail.slice(0, 200)}`)
      }
      const data = (await r.json()) as AnswerPayload
      setPayload(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [wordKey, questionType])

  const isMarked = markers && markers.blind_spots.includes(wordKey.trim())

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold m-0">اسأل Hafiz</h1>
            <p className="text-xs text-gray-500 mt-1 m-0">
              Phase 1.0 — إظهار حلقي داخل الكلمة فقط (678 موضعاً، 85 سورة)
            </p>
          </div>
          {onBack && (
            <button
              onClick={onBack}
              className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1 border border-gray-300 rounded"
            >
              ← العودة
            </button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-6">
        <div className="bg-yellow-50 border border-yellow-300 rounded-md p-4 mb-6 text-sm">
          <p className="m-0 mb-1">
            <strong>هذه نسخة pre-production</strong> — مراحل لاحقة ستُضيف نقر
            مباشر على المصحف. حالياً: أَدخل <code className="bg-yellow-100 px-1 rounded">word_key</code> بصيغة{' '}
            <code className="bg-yellow-100 px-1 rounded">سورة:آية:كلمة</code>{' '}
            (مثال: <code className="bg-yellow-100 px-1 rounded">001007:3</code>).
          </p>
          <p className="m-0 text-xs text-yellow-900 mt-2">
            النظام deterministic — لا LLM. الأجوبة من محرّك Hafiz + مكتبة ذرّات
            معتمدة من العالم.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-md p-5 mb-6">
          <label className="block text-sm font-semibold mb-2">
            الموضع (word_key)
          </label>
          <input
            type="text"
            value={wordKey}
            onChange={(e) => setWordKey(e.target.value)}
            placeholder="مثال: 001007:3"
            className="w-full border border-gray-300 rounded px-3 py-2 mb-3 font-mono text-left"
            dir="ltr"
            onKeyDown={(e) => {
              if (e.key === 'Enter') onAsk()
            }}
          />
          {isMarked && (
            <div className="bg-red-50 border border-red-200 rounded px-3 py-2 mb-3 text-sm text-red-800">
              ⚠ هذا الموضع مُسجَّل كـ BLIND_SPOT — Hafiz لا يَجيب
              deterministically عليه.
            </div>
          )}

          <label className="block text-sm font-semibold mb-2">
            نوع السؤال
          </label>
          <select
            value={questionType}
            onChange={(e) => setQuestionType(e.target.value as QuestionType)}
            className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
          >
            {QUESTION_TYPES.map((qt) => (
              <option key={qt.value} value={qt.value}>
                {qt.label}
              </option>
            ))}
          </select>

          <button
            onClick={onAsk}
            disabled={loading || !wordKey.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 rounded font-semibold"
          >
            {loading ? 'جارٍ السؤال...' : 'اسأل'}
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-md p-5 mb-6">
          <h2 className="text-sm font-semibold mb-3 m-0">أمثلة</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SAMPLES.map((s) => (
              <button
                key={s.word_key}
                onClick={() => setWordKey(s.word_key)}
                className="text-right text-sm border border-gray-200 hover:border-blue-400 hover:bg-blue-50 rounded px-3 py-2"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-300 rounded-md p-4 mb-6 text-sm text-red-800">
            <strong>خطأ:</strong> {error}
          </div>
        )}

        {payload && (
          <div className="bg-white border border-gray-200 rounded-md p-5 mb-6">
            <div className="flex justify-between items-start mb-4">
              <span className="text-sm text-gray-500 font-mono" dir="ltr">
                {payload.word_key}
              </span>
              <span
                className={`text-xs font-semibold px-3 py-1 border rounded-full ${
                  classificationBadge(payload.classification).bg
                }`}
              >
                {classificationBadge(payload.classification).text}
              </span>
            </div>
            <div
              className="leading-relaxed text-base"
              style={{ lineHeight: 1.85 }}
              dangerouslySetInnerHTML={{ __html: renderAnswer(payload.answer) }}
            />
            {Object.keys(payload.event_atoms_used).length > 0 && (
              <details className="mt-4 text-xs text-gray-500">
                <summary className="cursor-pointer">
                  المصادر (atoms المُستخدَمة)
                </summary>
                <ul className="mt-2 space-y-1 list-disc pr-5">
                  {Object.entries(payload.event_atoms_used).map(([role, id]) => (
                    <li key={role}>
                      <code className="bg-gray-100 px-1 rounded">{role}</code>{' '}
                      → <code className="bg-gray-100 px-1 rounded">{id}</code>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}

        <footer className="text-center text-xs text-gray-400 mt-8 pb-8">
          <p className="m-0">
            اسأل Hafiz Phase 1.0 · scholar-approved 2026-05-03 · FCR 0.00% · CCR
            100%
          </p>
        </footer>
      </main>
    </div>
  )
}
