/**
 * useRecitationSession
 * --------------------
 * Manages a server-side word-level tracking session for the Mushaf viewer.
 *
 * Wraps trackingApi to provide:
 *  - trackingState : live TrackingState (current word, errors, active ayah)
 *  - sessionId     : server-side session ID (null when no session active)
 *  - wordReports   : accumulated WordTajweedReport objects
 *  - startSession  : create session and initialise tracking state
 *  - syncState     : push updated tracking state after audio evaluation
 *  - markRepeat    : mark current word as error (REPEAT action)
 *  - endSession    : end session and return final report
 */
import { useState, useCallback, useRef } from 'react'
import { trackingApi, type WordReport } from '../services/api'
import type { TrackingState } from '../components/MushafPage/types'

const EMPTY_TRACKING: TrackingState = {
  current_word_key:  null,
  error_word_keys:   [],
  active_ayah_words: [],
}

export interface RecitationSessionHook {
  sessionId:     string | null
  trackingState: TrackingState
  wordReports:   WordReport[]
  loading:       boolean
  error:         string | null
  startSession:  (pageNumber: number, activeAyahWords?: string[], currentWordKey?: string) => Promise<string>
  syncState:     (state: TrackingState, audioFeatures?: Record<string, unknown>) => Promise<void>
  markRepeat:    (wordKey?: string) => Promise<void>
  endSession:    () => Promise<WordReport[]>
  clearError:    () => void
}

export function useRecitationSession(): RecitationSessionHook {
  const [sessionId, setSessionId]         = useState<string | null>(null)
  const [trackingState, setTrackingState] = useState<TrackingState>(EMPTY_TRACKING)
  const [wordReports, setWordReports]     = useState<WordReport[]>([])
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState<string | null>(null)
  const sessionIdRef = useRef<string | null>(null)

  const startSession = useCallback(async (
    pageNumber: number,
    activeAyahWords: string[] = [],
    currentWordKey?: string,
  ): Promise<string> => {
    setLoading(true)
    setError(null)
    try {
      const res = await trackingApi.startSession(pageNumber, activeAyahWords, currentWordKey)
      setSessionId(res.session_id)
      sessionIdRef.current = res.session_id
      setTrackingState(res.tracking_state)
      setWordReports([])
      return res.session_id
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start tracking session'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const syncState = useCallback(async (
    state: TrackingState,
    audioFeatures?: Record<string, unknown>,
  ): Promise<void> => {
    const sid = sessionIdRef.current
    if (!sid) return
    try {
      const res = await trackingApi.evaluate(sid, state, audioFeatures)
      setTrackingState(res.tracking_state)
      if (res.word_report) {
        setWordReports(prev => [...prev, res.word_report!])
      }
    } catch (err) {
      // Non-fatal — local state is already updated; log but don't throw
      console.warn('[useRecitationSession] syncState error:', err)
    }
  }, [])

  const markRepeat = useCallback(async (wordKey?: string): Promise<void> => {
    const sid = sessionIdRef.current
    if (!sid) return
    try {
      const res = await trackingApi.repeat(sid, wordKey)
      setTrackingState(res.tracking_state)
    } catch (err) {
      console.warn('[useRecitationSession] markRepeat error:', err)
    }
  }, [])

  const endSession = useCallback(async (): Promise<WordReport[]> => {
    const sid = sessionIdRef.current
    if (!sid) return []
    setLoading(true)
    try {
      const res = await trackingApi.end(sid)
      setSessionId(null)
      sessionIdRef.current = null
      setTrackingState(EMPTY_TRACKING)
      setWordReports([])
      return res.word_reports
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to end session'
      setError(msg)
      return wordReports
    } finally {
      setLoading(false)
    }
  }, [wordReports])

  const clearError = useCallback(() => setError(null), [])

  return {
    sessionId,
    trackingState,
    wordReports,
    loading,
    error,
    startSession,
    syncState,
    markRepeat,
    endSession,
    clearError,
  }
}
