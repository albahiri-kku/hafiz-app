import type { AyahData, EvaluationResponse, SessionStartResponse } from '../types/hafiz'
import type { MushafPageData, TrackingState } from '../components/MushafPage/types'

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

// ---------------------------------------------------------------------------
// Tracking API — word-level Tajweed session for the Mushaf viewer
// ---------------------------------------------------------------------------

export interface TrackingSessionState {
  session_id: string
  tracking_state: TrackingState
}

export interface WordReport {
  word_key: string
  word_index: number
  applicable_rules: string[]
  is_correct: boolean
  overall_severity: string
  tracking_decision: string
  violations: Array<{
    engine: string
    rule_name: string
    expected: string
    detected: string
    confidence: number
    severity: string
    description: string
  }>
}

export const trackingApi = {
  startSession: (
    currentPage: number,
    activeAyahWords: string[] = [],
    currentWordKey?: string,
  ): Promise<TrackingSessionState> =>
    request<TrackingSessionState>('/api/v1/tracking/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        current_page: currentPage,
        active_ayah_words: activeAyahWords,
        current_word_key: currentWordKey ?? null,
      }),
    }),

  evaluate: (
    sessionId: string,
    trackingState: TrackingState,
    audioFeatures?: Record<string, unknown>,
  ): Promise<{ tracking_state: TrackingState; word_report: WordReport | null }> =>
    request('/api/v1/tracking/session/' + sessionId + '/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        current_word_key:  trackingState.current_word_key,
        error_word_keys:   trackingState.error_word_keys,
        active_ayah_words: trackingState.active_ayah_words,
        audio_features:    audioFeatures ?? null,
      }),
    }),

  repeat: (
    sessionId: string,
    wordKey?: string,
  ): Promise<{ tracking_state: TrackingState }> =>
    request('/api/v1/tracking/session/' + sessionId + '/repeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word_key: wordKey ?? null }),
    }),

  getState: (sessionId: string): Promise<TrackingSessionState> =>
    request<TrackingSessionState>('/api/v1/tracking/session/' + sessionId + '/state'),

  end: (sessionId: string): Promise<{ session_id: string; summary: Record<string, unknown>; word_reports: WordReport[] }> =>
    request('/api/v1/tracking/session/' + sessionId + '/end', { method: 'POST' }),

  getReport: (sessionId: string): Promise<{ session_id: string; summary: Record<string, unknown>; word_reports: WordReport[] }> =>
    request('/api/v1/tracking/session/' + sessionId + '/report'),

  deleteSession: (sessionId: string): Promise<{ deleted: boolean }> =>
    request('/api/v1/tracking/session/' + sessionId, { method: 'DELETE' }),
}
