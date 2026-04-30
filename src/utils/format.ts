/**
 * Format a Hijri-style date string for display.
 * Accepts strings like "1445-06-18" and renders Arabic month names.
 */
const HIJRI_MONTHS = [
  'محرم',
  'صفر',
  'ربيع الأول',
  'ربيع الآخر',
  'جمادى الأولى',
  'جمادى الآخرة',
  'رجب',
  'شعبان',
  'رمضان',
  'شوال',
  'ذو القعدة',
  'ذو الحجة',
];

const toArabicDigits = (s: string | number): string =>
  String(s).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);

export function formatHijri(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return date;
  const [, y, mo, d] = m;
  const monthIdx = Math.max(0, Math.min(11, Number(mo) - 1));
  return `${toArabicDigits(d)} ${HIJRI_MONTHS[monthIdx]} ${toArabicDigits(y)}هـ`;
}

export function formatNumber(n: number): string {
  return toArabicDigits(n);
}
