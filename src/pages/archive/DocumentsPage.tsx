import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { categories } from '../../data/categories';
import { documents } from '../../data/documents';
import DocumentCard from '../../components/archive/DocumentCard';
import SearchBar from '../../components/archive/SearchBar';
import { formatNumber } from '../../utils/format';
import { IconFolder } from '../../components/archive/Icons';

export default function DocumentsPage() {
  const [params, setParams] = useSearchParams();
  const initialCat = params.get('cat') ?? '';
  const initialQ = params.get('q') ?? '';

  const [active, setActive] = useState<string>(initialCat);
  const [query, setQuery] = useState<string>(initialQ);
  const [sort, setSort] = useState<'newest' | 'oldest' | 'title'>('newest');

  useEffect(() => {
    const next: Record<string, string> = {};
    if (active) next.cat = active;
    if (query) next.q = query;
    setParams(next, { replace: true });
  }, [active, query, setParams]);

  const filtered = useMemo(() => {
    let result = documents;
    if (active) result = result.filter((d) => d.category === active);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.summary.toLowerCase().includes(q) ||
          d.reference?.toLowerCase().includes(q) ||
          d.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return [...result].sort((a, b) => {
      if (sort === 'newest') return a.date < b.date ? 1 : -1;
      if (sort === 'oldest') return a.date < b.date ? -1 : 1;
      return a.title.localeCompare(b.title, 'ar');
    });
  }, [active, query, sort]);

  const allCategoryButtons = (
    <>
      <button
        onClick={() => setActive('')}
        className={`shrink-0 lg:w-full text-right px-3 py-2 rounded-lg text-sm flex items-center justify-between gap-2 transition-colors ${
          active === ''
            ? 'bg-royal-700 text-white'
            : 'bg-white border border-royal-100 lg:border-0 hover:bg-royal-50 text-ink-800'
        }`}
      >
        <span className="flex items-center gap-2 whitespace-nowrap">
          <IconFolder size={16} />
          الكل
        </span>
        <span className="text-xs opacity-70">
          {formatNumber(documents.length)}
        </span>
      </button>
      {categories.map((cat) => {
        const count = documents.filter((d) => d.category === cat.id).length;
        const selected = active === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => setActive(cat.id)}
            className={`shrink-0 lg:w-full text-right px-3 py-2 rounded-lg text-sm flex items-center justify-between gap-2 lg:mt-0.5 transition-colors ${
              selected
                ? 'bg-royal-700 text-white'
                : 'bg-white border border-royal-100 lg:border-0 hover:bg-royal-50 text-ink-800'
            }`}
          >
            <span className="whitespace-nowrap lg:truncate">{cat.name}</span>
            <span className="text-xs opacity-70">{formatNumber(count)}</span>
          </button>
        );
      })}
    </>
  );

  return (
    <div className="container-page py-8 sm:py-10">
      <header className="mb-6 sm:mb-8">
        <div className="text-xs text-royal-700 mb-2">الأرشيف</div>
        <h1 className="text-2xl sm:text-3xl mb-2">الوثائق</h1>
        <p className="text-sm sm:text-base text-ink-700/70">
          استعرض جميع وثائق الأمانة وفق التصنيف، أو ابحث بالعنوان أو رقم المرجع.
        </p>
      </header>

      {/* Mobile filters */}
      <div className="lg:hidden space-y-3 mb-6">
        <SearchBar value={query} onChange={setQuery} />
        <div
          className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scroll-smooth"
          style={{ scrollbarWidth: 'thin' }}
        >
          {allCategoryButtons}
        </div>
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-ink-700/70">
            <span className="text-royal-900 font-semibold">
              {formatNumber(filtered.length)}
            </span>{' '}
            وثيقة
          </span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="input !py-1.5 !text-xs !w-auto"
          >
            <option value="newest">الأحدث أولاً</option>
            <option value="oldest">الأقدم أولاً</option>
            <option value="title">حسب العنوان</option>
          </select>
        </div>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-6">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block space-y-4">
          <SearchBar value={query} onChange={setQuery} />

          <div className="card p-3">
            <div className="px-2 py-1 text-xs text-ink-700/60 font-semibold">
              التصنيفات
            </div>
            {allCategoryButtons}
          </div>

          <div className="card p-3">
            <div className="px-2 py-1 text-xs text-ink-700/60 font-semibold">
              الترتيب
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="input mt-1 !py-2"
            >
              <option value="newest">الأحدث أولاً</option>
              <option value="oldest">الأقدم أولاً</option>
              <option value="title">حسب العنوان</option>
            </select>
          </div>
        </aside>

        <section>
          <div className="hidden lg:flex items-center justify-between mb-4 text-sm">
            <span className="text-ink-700/70">
              عُثر على{' '}
              <span className="text-royal-900 font-semibold">
                {formatNumber(filtered.length)}
              </span>{' '}
              وثيقة
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="card p-10 text-center text-ink-700/60">
              لا توجد وثائق مطابقة. جرّب تعديل البحث أو إزالة المرشّحات.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((d) => (
                <DocumentCard key={d.id} doc={d} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
