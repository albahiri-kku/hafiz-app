// v1.1
// MushafPage — local type definitions

export interface MushafWord {
  word_index: number;
  word_key: string;      // "surah:ayah:position"  e.g. "2:6:1"
  text: string;          // uthmani text (fallback font rendering)
  text_qpc: string;      // QPC V1 glyph (per-page font rendering)
  position: number;      // word order within ayah
}

export interface MushafLine {
  line_number: number;
  line_type: 'ayah' | 'surah_name' | 'basmallah';
  is_centered: boolean;
  surah_number: number | null;
  words: MushafWord[];
}

export interface MushafPageData {
  page_number: number;
  juz_number: number | null;
  lines: MushafLine[];
}

export interface TrackingState {
  current_word_key: string | null;    // soft gold highlight — "s:a:w" format
  error_word_keys: string[];          // red highlight
  active_ayah_words: string[];        // light gold — whole ayah highlight
}
