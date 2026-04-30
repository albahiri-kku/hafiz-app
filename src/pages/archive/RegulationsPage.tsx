import { useMemo, useState } from 'react';
import { CUA_SOURCE_URL, regulations } from '../../data/regulations';
import SearchBar from '../../components/archive/SearchBar';
import {
  IconBook,
  IconExternal,
  IconShield,
} from '../../components/archive/Icons';
import { formatNumber } from '../../utils/format';

const CATS = ['الكل', 'نظام', 'لائحة', 'دليل', 'قرار'] as const;
type Cat = typeof CATS[number];

export default function RegulationsPage() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<Cat>('الكل');

  const filtered = useMemo(() => {
    let r = regulations;
    if (cat !== 'الكل') r = r.filter((x) => x.category === cat);
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      r = r.filter(
        (x) =>
          x.title.toLowerCase().includes(t) ||
          x.summary?.toLowerCase().includes(t),
      );
    }
    return r;
  }, [q, cat]);

  return (
    <div>
      <section className="bg-royal-900 text-white">
        <div className="container-page py-10 sm:py-14">
          <div className="flex items-center gap-2 text-gold-300 text-xs mb-3">
            <IconShield size={14} />
            <span>المصدر الرسمي: مجلس شؤون الجامعات</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl text-white mb-3">
            اللوائح والأنظمة الجامعية
          </h1>
          <p className="text-sm sm:text-base text-royal-100/90 max-w-3xl leading-relaxed mb-6">
            مرجعية موحّدة لجميع اللوائح والأنظمة الصادرة عن مجلس شؤون الجامعات،
            مع روابط مباشرة إلى المصدر الرسمي للاطلاع والتنزيل.
          </p>
          <a
            href={CUA_SOURCE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-gold"
          >
            <IconExternal size={16} />
            فتح صفحة اللوائح في موقع المجلس
          </a>
        </div>
      </section>

      <section className="container-page py-8 sm:py-10">
        <div className="grid md:grid-cols-[1fr_280px] gap-4 sm:gap-6 mb-6 sm:mb-8">
          <SearchBar
            value={q}
            onChange={setQ}
            placeholder="ابحث في اللوائح والأنظمة…"
          />
          <div className="flex flex-wrap gap-2">
            {CATS.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`badge px-3 py-1.5 text-sm ${
                  cat === c
                    ? 'bg-royal-700 text-white'
                    : 'bg-white border border-royal-100 text-ink-800 hover:bg-royal-50'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="text-sm text-ink-700/70 mb-4">
          {formatNumber(filtered.length)} عنصر
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <article
              key={r.id}
              className="card p-5 flex flex-col gap-3 hover:shadow-ring transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-lg bg-gold-50 text-gold-700 flex items-center justify-center">
                  <IconBook size={22} />
                </div>
                <span className="badge bg-royal-50 text-royal-700">
                  {r.category}
                </span>
              </div>
              <h3 className="text-base text-royal-900 leading-snug">{r.title}</h3>
              {r.summary && (
                <p className="text-sm text-ink-700/80 leading-relaxed line-clamp-3">
                  {r.summary}
                </p>
              )}
              <div className="text-xs text-ink-700/60 flex items-center justify-between pt-3 border-t border-royal-50 mt-auto">
                <span>{r.issuer}</span>
                {r.year && <span>{r.year}</span>}
              </div>
              <a
                href={r.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline w-full justify-center"
              >
                <IconExternal size={16} />
                فتح في المصدر
              </a>
            </article>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="card p-10 text-center text-ink-700/60">
            لا توجد نتائج مطابقة.
          </div>
        )}

        <div className="card p-5 mt-10 bg-sand-50 border-dashed">
          <h3 className="text-sm font-semibold mb-1">ملاحظة</h3>
          <p className="text-xs text-ink-700/70 leading-relaxed">
            القائمة أعلاه تستند إلى صفحة "اللوائح والأنظمة" في الموقع الرسمي
            لمجلس شؤون الجامعات. الروابط تُفتح في المصدر مباشرةً لضمان الحصول
            على أحدث نسخة معتمدة.
          </p>
        </div>
      </section>
    </div>
  );
}
