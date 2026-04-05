import type { AyahData, EvaluationResponse, SessionStartResponse } from '../types/hafiz'
import type { MushafPageData } from '../components/MushafPage/types'

// In dev, Vite proxies /api → localhost:8000
// In production (Lovable / tunnel), set VITE_API_BASE_URL
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init)
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try { msg = (await res.json()).detail ?? msg } catch { /* ignore */ }
    throw new Error(msg)
  }
  return res.json() as Promise<T>
}

export const api = {
  health: () =>
    request<{ status: string; version: string; uptime_sec: number }>('/api/v1/health'),

  startSession: (ayahCode?: string) =>
    request<SessionStartResponse>('/api/v1/session/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ayah_code: ayahCode ?? null }),
    }),

  getAyah: (ayahCode: string) =>
    request<AyahData>(`/api/v1/quran/ayah/${ayahCode}`),

  getMushafPage: (pageNumber: number): Promise<MushafPageData> =>
    request<MushafPageData>(`/mushaf/page/${pageNumber}`),

  getFontUrl: (pageNumber: number): string =>
    `${API_BASE}/fonts/pages/QCF_P${String(pageNumber).padStart(3, '0')}.ttf`,

  evaluate: async (sessionId: string, audioBlob: Blob): Promise<EvaluationResponse> => {
    const form = new FormData()
    form.append('session_id', sessionId)
    form.append('audio', audioBlob, 'recitation.webm')
    return request<EvaluationResponse>('/api/v1/recitation/evaluate', {
      method: 'POST',
      body: form,
    })
  },
}
