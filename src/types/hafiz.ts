export interface QuranWord {
  word_index: number
  uthmani_text: string
  word_location: string
}

export interface AyahData {
  ayah_code: string
  surah: number
  ayah: number
  uthmani_text: string
  word_count: number
  words: QuranWord[]
  next_ayah_code: string | null
}

export interface SessionStartResponse {
  session_id: string
  ayah_code: string | null
  mode: 'FIXED' | 'AUTO_DETECT'
  status: string
}

export interface WordError {
  position: number   // 1-indexed
  expected: string
  got: string
}

export interface WordTimestamp {
  word: string
  start_sec: number
  end_sec: number
  probability?: number
}

export interface WordProbeDetails {
  coverage_mode: string
  word_count_expected: number
  word_count_predicted: number
  exact_match_count: number
  near_match_count: number
  morphological_mismatch_count: number
  mismatch_count: number
  missing_count: number
  extra_count: number
}

export interface EvaluationResponse {
  session_id: string
  pipeline_status: string
  should_advance: boolean
  current_ayah_code: string
  final_label: string | null
  action: string | null
  confidence: number | null
  reason: string | null
  fusion_case: string | null
  asr_text: string | null
  expected_next_ayah_code: string | null
  word_errors: WordError[] | null
  word_timestamps: WordTimestamp[] | null
  word_probe_verdict: string | null
  word_probe_details: WordProbeDetails | null
}

export interface HeardEntry {
  word_index:  number
  expected:    string
  heard:       string        // "" أو "—" = صمت
  correct:     boolean
  error_type:  string | null
  elapsed_sec: number        // ثوانٍ منذ بداية الجلسة
}

export type RecitationMode = 'tilawa' | 'hifz'
export type AppPhase = 'start' | 'reciting' | 'summary' | 'mushaf_browse' | 'upload' | 'evaluating' | 'report'

export interface WordAlignmentEntry {
  word_index: number
  asr_word: string
  reference_word: string
  start_sec: number
  end_sec: number
  duration_ms: number
  probability: number
  match_score: number
  correct: boolean
  status: 'MATCH' | 'SUBSTITUTION' | 'EXTRA' | 'MISSED'
}

export interface EvaluateFileResponse {
  pipeline_status: string
  matched_start_ayah_code: string | null
  matched_end_ayah_code: string | null
  final_label: string | null
  action: string | null
  confidence: number | null
  tajweed_verdict: string | null
  madd_verdict: string | null
  waqf_verdict: string | null
  verdict_confidence: number | null
  tajweed_event_count: number | null
  tajweed_error_count: number | null
  tajweed_ok_count: number | null
  asr_text: string | null
  word_timestamps: WordTimestamp[] | null
  word_errors: WordError[] | null
  word_alignment: WordAlignmentEntry[] | null
  total_runtime_sec: number
  cpae_runtime_sec: number | null
  cpae_quality: string | null
  cpae_confidence: number | null
  profiling: Record<string, number> | null
}
export type RecordingState = 'idle' | 'recording' | 'processing'

export interface AyahResult {
  ayah_code: string
  surah: number
  ayah: number
  final_label: string
  action: string
  asr_text: string
  confidence: number
  word_errors: WordError[]
}

export interface SessionStats {
  totalAyahs: number
  correct: number      // ADVANCE
  errors: number       // REPEAT
  reviews: number      // REVIEW
  holds: number        // HOLD
  history: AyahResult[]
}

// Surah names
export const SURAH_NAMES: Record<number, string> = {
  1: 'الفاتحة', 2: 'البقرة', 3: 'آل عمران', 4: 'النساء', 5: 'المائدة',
  6: 'الأنعام', 7: 'الأعراف', 8: 'الأنفال', 9: 'التوبة', 10: 'يونس',
  11: 'هود', 12: 'يوسف', 13: 'الرعد', 14: 'إبراهيم', 15: 'الحجر',
  16: 'النحل', 17: 'الإسراء', 18: 'الكهف', 19: 'مريم', 20: 'طه',
  21: 'الأنبياء', 22: 'الحج', 23: 'المؤمنون', 24: 'النور', 25: 'الفرقان',
  26: 'الشعراء', 27: 'النمل', 28: 'القصص', 29: 'العنكبوت', 30: 'الروم',
  31: 'لقمان', 32: 'السجدة', 33: 'الأحزاب', 34: 'سبأ', 35: 'فاطر',
  36: 'يس', 37: 'الصافات', 38: 'ص', 39: 'الزمر', 40: 'غافر',
  41: 'فصلت', 42: 'الشورى', 43: 'الزخرف', 44: 'الدخان', 45: 'الجاثية',
  46: 'الأحقاف', 47: 'محمد', 48: 'الفتح', 49: 'الحجرات', 50: 'ق',
  51: 'الذاريات', 52: 'الطور', 53: 'النجم', 54: 'القمر', 55: 'الرحمن',
  56: 'الواقعة', 57: 'الحديد', 58: 'المجادلة', 59: 'الحشر', 60: 'الممتحنة',
  61: 'الصف', 62: 'الجمعة', 63: 'المنافقون', 64: 'التغابن', 65: 'الطلاق',
  66: 'التحريم', 67: 'الملك', 68: 'القلم', 69: 'الحاقة', 70: 'المعارج',
  71: 'نوح', 72: 'الجن', 73: 'المزمل', 74: 'المدثر', 75: 'القيامة',
  76: 'الإنسان', 77: 'المرسلات', 78: 'النبأ', 79: 'النازعات', 80: 'عبس',
  81: 'التكوير', 82: 'الانفطار', 83: 'المطففين', 84: 'الانشقاق', 85: 'البروج',
  86: 'الطارق', 87: 'الأعلى', 88: 'الغاشية', 89: 'الفجر', 90: 'البلد',
  91: 'الشمس', 92: 'الليل', 93: 'الضحى', 94: 'الشرح', 95: 'التين',
  96: 'العلق', 97: 'القدر', 98: 'البينة', 99: 'الزلزلة', 100: 'العاديات',
  101: 'القارعة', 102: 'التكاثر', 103: 'العصر', 104: 'الهمزة', 105: 'الفيل',
  106: 'قريش', 107: 'الماعون', 108: 'الكوثر', 109: 'الكافرون', 110: 'النصر',
  111: 'المسد', 112: 'الإخلاص', 113: 'الفلق', 114: 'الناس',
}

export function labelToArabic(label: string): string {
  const map: Record<string, string> = {
    VALID:                      'صحيح ✓',
    VALID_TOLERANT:             'صحيح مع تحفظ ✓',
    VALID_VARIANT:              'وجه صحيح ✓',
    MADD_ERROR:                 'خطأ في المد',
    PRONUNCIATION_ISSUE:        'خطأ في النطق',
    POSSIBLE_WORD_SUBSTITUTION: 'احتمال استبدال كلمة',
    MIXED_ERROR:                'خطأ مختلط',
    REVIEW_NEEDED:              'يحتاج مراجعة',
    SEQUENCE_ERROR:             'خطأ في الترتيب',
    SESSION_ERROR:              'خطأ في الجلسة',
    ASR_ARTIFACT:               'ضوضاء صوتية',
  }
  return map[label] ?? label
}

export function actionColor(action: string): string {
  if (action === 'ADVANCE') return 'text-emerald-700 bg-emerald-50 border-emerald-200'
  if (action === 'REPEAT')  return 'text-red-700 bg-red-50 border-red-200'
  if (action === 'REVIEW')  return 'text-amber-700 bg-amber-50 border-amber-200'
  return 'text-gray-700 bg-gray-50 border-gray-200'
}
