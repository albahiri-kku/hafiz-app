import { Link } from 'react-router-dom';
import { categories } from '../../data/categories';
import { documents } from '../../data/documents';
import { regulations } from '../../data/regulations';
import { formatNumber } from '../../utils/format';
import DocumentCard from '../../components/archive/DocumentCard';
import {
  IconArchive,
  IconBook,
  IconChevron,
  IconFolder,
  IconShield,
} from '../../components/archive/Icons';

export default function HomePage() {
  const recent = [...documents]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 6);

  return (
    <div>
      <section className="gradient-royal text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pattern-bg" />
        <div className="container-page py-20 md:py-28 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-3 py-1 text-xs mb-6">
              <IconShield size={14} />
              <span>الأرشيف الرسمي — أمانة مجلس الأمناء</span>
            </div>
            <h1 className="text-3xl md:text-5xl text-white !leading-tight mb-5">
              مكتبة موحّدة لجميع وثائق المجلس،
              <br />
              <span className="text-gold-300">منظَّمة وآمنة وسهلة الوصول.</span>
            </h1>
            <p className="text-royal-100/90 text-lg leading-relaxed mb-8">
              فهرس إلكتروني شامل للقرارات والمحاضر والسياسات والتقارير،
              مع اللوائح والأنظمة الجامعية الصادرة عن مجلس شؤون الجامعات —
              يمكن استعراضها وتنزيلها بصيغة PDF أو Word.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/documents" className="btn-gold">
                <IconFolder size={16} />
                تصفح الوثائق
              </Link>
              <Link
                to="/regulations"
                className="btn border border-white/30 text-white hover:bg-white/10"
              >
                <IconBook size={16} />
                اللوائح والأنظمة
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page -mt-10 relative z-10 mb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[
            { label: 'إجمالي الوثائق', value: documents.length, icon: <IconArchive /> },
            { label: 'تصنيفات الأرشيف', value: categories.length, icon: <IconFolder /> },
            { label: 'لوائح وأنظمة', value: regulations.length, icon: <IconBook /> },
            { label: 'تحديث مستمر', value: '٢٤/٧', icon: <IconShield />, raw: true },
          ].map((s, i) => (
            <div
              key={i}
              className="card p-5 flex items-center gap-4"
            >
              <div className="w-11 h-11 rounded-lg bg-royal-50 text-royal-700 flex items-center justify-center">
                {s.icon}
              </div>
              <div>
                <div className="text-2xl font-display text-royal-900">
                  {s.raw ? s.value : formatNumber(s.value as number)}
                </div>
                <div className="text-xs text-ink-700/70">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page mb-16">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl">تصنيفات الأرشيف</h2>
            <p className="text-sm text-ink-700/70 mt-1">
              تصفّح الوثائق وفق التصنيف الرسمي للأمانة
            </p>
          </div>
          <Link
            to="/documents"
            className="hidden sm:flex items-center text-royal-700 text-sm font-medium hover:text-royal-900"
          >
            عرض الكل
            <IconChevron size={16} />
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => {
            const count = documents.filter((d) => d.category === cat.id).length;
            const isGold = cat.color === 'gold';
            return (
              <Link
                key={cat.id}
                to={`/documents?cat=${cat.id}`}
                className={`card p-5 hover:shadow-ring hover:-translate-y-0.5 transition-all flex gap-4 group`}
              >
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
                    isGold
                      ? 'bg-gold-50 text-gold-700'
                      : 'bg-royal-50 text-royal-700'
                  }`}
                >
                  <IconFolder size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base group-hover:text-royal-700">
                      {cat.name}
                    </h3>
                    <span className="badge bg-royal-50 text-royal-700">
                      {formatNumber(count)}
                    </span>
                  </div>
                  <p className="text-xs text-ink-700/70 mt-1 leading-relaxed">
                    {cat.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="container-page mb-20">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl">أحدث الوثائق</h2>
            <p className="text-sm text-ink-700/70 mt-1">
              آخر ما أُضيف إلى الأرشيف
            </p>
          </div>
          <Link
            to="/documents"
            className="hidden sm:flex items-center text-royal-700 text-sm font-medium hover:text-royal-900"
          >
            عرض الكل
            <IconChevron size={16} />
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recent.map((d) => (
            <DocumentCard key={d.id} doc={d} />
          ))}
        </div>
      </section>
    </div>
  );
}
