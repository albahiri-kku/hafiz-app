/**
 * api.final.ts — DROP-IN REPLACEMENT for hafiz-app/src/services/api.ts
 *
 * SINGLE behavioural change vs. the existing file:
 *   authHeaders() now also injects `Authorization: Bearer <token>` when the
 *   user is logged in (token stored in localStorage under "hafiz:token").
 *
 * Everything else is byte-identical to the current services/api.ts:
 *   - Same API_BASE / API_KEY env variables
 *   - Same request() wrapper
 *   - Same api object with all existing methods
 *   - Same trackingApi object unchanged
 *
 * Result:
 *   - Guest users: unchanged behaviour (no Authorization header sent)
 *   - Logged-in users: every request (incl. /evaluate-file) carries the
 *     bearer token, enabling the backend write-through hook to attribute
 *     evaluations to the user + optionally trigger SM-2 auto-attempts.
 */

import type { AyahData, EvaluationResponse, SessionStartResponse, EvaluateFileResponse } from '../types/hafiz'
import type { MushafPageData, TrackingState } from '../components/MushafPage/types'
import { getStoredToken } from '../api/institutionalApi'   // NEW: institutional token source

// In dev, Vite proxies /api → localhost:8000
// In production, set VITE_API_URL (e.g. https://hafiz-production.up.railway.app)
const API_BASE   = import.meta.env.VITE_API_URL ?? ''
const API_KEY    = import.meta.env.VITE_API_KEY  ?? ''

/**
 * Build headers for every backend call.
 * Always includes X-API-Key if VITE_API_KEY is set (unchanged).
 * Additionally includes Authorization: Bearer <token> if the user is
 * logged in via the institutional layer (NEW, zero effect when logged out).
 */
function authHeaders(): HeadersInit {
  const headers: Record<string, string> = {}
  if (API_KEY) headers['X-API-Key'] = API_KEY
  const token = getStoredToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers ?? {}) },
  })
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

  evaluateFile: async (
    file: File,
    surahNumber: number | null,
    ayahStart: number | null,
    ayahEnd: number | null,
    autoDetect: boolean = false,
  ): Promise<EvaluateFileResponse> => {
    const form = new FormData()
    form.append('audio', file, file.name)
    if (autoDetect) {
      form.append('auto_detect', 'true')
    } else {
      form.append('surah_number', String(surahNumber))
      form.append('ayah_start', String(ayahStart))
      form.append('ayah_end', String(ayahEnd))
    }
    return request<EvaluateFileResponse>('/api/v1/recitation/evaluate-file', {
      method: 'POST',
      body: form,
    })
  },
}

// ---------------------------------------------------------------------------
// Tracking API — word-level Tajweed session for the Mushaf viewer
// (Unchanged from the existing services/api.ts)
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
