// v1.1
/**
 * MushafPage smoke tests — 6 cases
 *
 * Test framework: Vitest + @testing-library/react
 * To run:
 *   npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom
 *   npx vitest run src/components/MushafPage/MushafPage.test.tsx
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import MushafPage from './index'
import type { MushafPageData, TrackingState } from './types'

// ---------------------------------------------------------------------------
// Mock fetch — return canned page data
// ---------------------------------------------------------------------------
const MOCK_PAGE_DATA: MushafPageData = {
  page_number: 3,
  juz_number: 1,
  lines: [
    // surah_name line
    {
      line_number: 0,
      line_type: 'surah_name',
      is_centered: true,
      surah_number: 2,
      words: [],
    },
    // basmallah line
    {
      line_number: 1,
      line_type: 'basmallah',
      is_centered: true,
      surah_number: null,
      words: [],
    },
    // 13 regular ayah lines
    ...Array.from({ length: 13 }, (_, i) => ({
      line_number: i + 2,
      line_type: 'ayah' as const,
      is_centered: false,
      surah_number: 2,
      words: [
        {
          word_index:  i * 5 + 1,
          word_key:    `2:${i + 6}:1`,
          text:        `كلمة${i + 1}`,
          text_qpc:    '\uE001',
          position:    1,
        },
        {
          word_index:  i * 5 + 2,
          word_key:    `2:${i + 6}:2`,
          text:        `كلمة${i + 1}-2`,
          text_qpc:    '\uE002',
          position:    2,
        },
      ],
    })),
  ],
}

const EMPTY_TRACKING: TrackingState = {
  current_word_key: null,
  error_word_keys:  [],
  active_ayah_words: [],
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(MOCK_PAGE_DATA),
  }))
  // Stub FontFace API
  vi.stubGlobal('FontFace', vi.fn().mockImplementation(() => ({
    load: () => Promise.resolve({}),
  })))
})

// ---------------------------------------------------------------------------
// Test 1 — Renders without crash with 15 lines of mock data
// ---------------------------------------------------------------------------
describe('MushafPage', () => {
  it('renders without crash with mock page data (15 lines)', async () => {
    const { container } = render(
      <MushafPage pageNumber={3} tracking={EMPTY_TRACKING} />
    )
    // Wait for async fetch
    await screen.findByText(/─ ٣ ─/)  // Arabic-Indic page number
    expect(container.querySelector('.mushaf-page')).not.toBeNull()
    expect(container.querySelectorAll('.mushaf-line').length).toBe(15)
  })

  // -------------------------------------------------------------------------
  // Test 2 — surah_name line has class 'mushaf-surah-banner'
  // -------------------------------------------------------------------------
  it('renders surah_name line with class mushaf-surah-banner', async () => {
    const { container } = render(
      <MushafPage pageNumber={3} tracking={EMPTY_TRACKING} />
    )
    await screen.findByText(/─ ٣ ─/)
    const banner = container.querySelector('.mushaf-surah-banner')
    expect(banner).not.toBeNull()
  })

  // -------------------------------------------------------------------------
  // Test 3 — word spans have data-word-key attribute
  // -------------------------------------------------------------------------
  it('renders word spans with data-word-key attributes', async () => {
    const { container } = render(
      <MushafPage pageNumber={3} tracking={EMPTY_TRACKING} />
    )
    await screen.findByText(/─ ٣ ─/)
    const words = container.querySelectorAll('[data-word-key]')
    expect(words.length).toBeGreaterThan(0)
    // Check that the first ayah word has expected key format
    const keys = Array.from(words).map(w => w.getAttribute('data-word-key'))
    expect(keys.some(k => k && /^\d+:\d+:\d+$/.test(k))).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 4 — word-current class applied to correct word_key
  // -------------------------------------------------------------------------
  it("applies 'word-current' class to the current word_key", async () => {
    const tracking: TrackingState = {
      current_word_key:  '2:6:1',
      error_word_keys:   [],
      active_ayah_words: [],
    }
    const { container } = render(
      <MushafPage pageNumber={3} tracking={tracking} />
    )
    await screen.findByText(/─ ٣ ─/)
    const current = container.querySelector('[data-word-key="2:6:1"]')
    expect(current?.classList.contains('word-current')).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 5 — word-error class applied to correct word_key
  // -------------------------------------------------------------------------
  it("applies 'word-error' class to error word keys", async () => {
    const tracking: TrackingState = {
      current_word_key:  null,
      error_word_keys:   ['2:7:1'],
      active_ayah_words: [],
    }
    const { container } = render(
      <MushafPage pageNumber={3} tracking={tracking} />
    )
    await screen.findByText(/─ ٣ ─/)
    const errWord = container.querySelector('[data-word-key="2:7:1"]')
    expect(errWord?.classList.contains('word-error')).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 6 — page number shown in Arabic-Indic numerals
  // -------------------------------------------------------------------------
  it('shows page number in Arabic-Indic numerals', async () => {
    render(<MushafPage pageNumber={3} tracking={EMPTY_TRACKING} />)
    // Arabic-Indic "3" is ٣ (U+0663)
    const footer = await screen.findByText(/─ ٣ ─/)
    expect(footer).not.toBeNull()
  })
})
