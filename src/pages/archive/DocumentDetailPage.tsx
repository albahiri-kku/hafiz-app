import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { documents, getDocumentById } from '../../data/documents';
import { getCategory } from '../../data/categories';
import { formatHijri } from '../../utils/format';
import DocumentCard from '../../components/archive/DocumentCard';
import DocumentViewer from '../../components/archive/DocumentViewer';
import {
  IconCalendar,
  IconChevron,
  IconDownload,
  IconExternal,
  IconEye,
  IconFile,
  IconShield,
} from '../../components/archive/Icons';
import {
  downloadDocument,
  isPdfFile,
  isWordFile,
} from '../../utils/download';

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [downloading, setDownloading] = useState<'pdf' | 'word' | null>(null);

  const doc = id ? getDocumentById(id) : undefined;

  useEffect(() => {
    if (!doc) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [doc]);

  if (!doc) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-2xl mb-3">الوثيقة غير موجودة</h1>
        <p className="text-ink-700/70 mb-6">
          الوثيقة المطلوبة غير متاحة في الأرشيف.
        </p>
        <button onClick={() => navigate(-1)} className="btn-primary">
          العودة
        </button>
      </div>
    );
  }

  const cat = getCategory(doc.category);
  const related = documents
    .filter((d) => d.category === doc.category && d.id !== doc.id)
    .slice(0, 3);

  const handleDownload = async (fmt: 'pdf' | 'word') => {
    try {
      setDownloading(fmt);
      await downloadDocument(doc, fmt);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="container-page py-10">
      <nav className="text-sm flex items-center gap-1 text-ink-700/70 mb-6">
        <Link to="/" className="hover:text-royal-700">الرئيسية</Link>
        <IconChevron size={14} />
        <Link to="/documents" className="hover:text-royal-700">الوثائق</Link>
        {cat && (
          <>
            <IconChevron size={14} />
            <Link
              to={`/documents?cat=${cat.id}`}
              className="hover:text-royal-700"
            >
              {cat.name}
            </Link>
          </>
        )}
      </nav>

      <div className="grid lg:grid-cols-[1fr_320px] gap-8">
        <article className="card p-6 md:p-10">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-14 h-14 rounded-xl bg-royal-50 text-royal-700 flex items-center justify-center shrink-0">
              <IconFile size={26} />
            </div>
            <div className="flex-1">
              {doc.reference && (
                <div className="text-xs font-mono text-gold-700 mb-1">
                  {doc.reference}
                </div>
              )}
              <h1 className="text-2xl md:text-3xl !mt-0 mb-2">{doc.title}</h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-ink-700/70">
                <span className="flex items-center gap-1">
                  <IconCalendar size={14} />
                  {formatHijri(doc.date)}
                </span>
                {doc.issuer && <span>· {doc.issuer}</span>}
                {doc.classification && (
                  <span className="badge bg-royal-50 text-royal-700">
                    <IconShield size={12} />
                    {doc.classification}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-sand-50 border-r-4 border-gold-500 px-4 py-3 mb-6 rounded">
            <div className="text-xs text-gold-700 font-semibold mb-1">ملخص الوثيقة</div>
            <p className="text-sm leading-relaxed">{doc.summary}</p>
          </div>

          {doc.body && doc.body.length > 0 ? (
            <div className="prose-doc">
              {doc.body.map((s, i) => (
                <div key={i}>
                  {s.heading && <h2>{s.heading}</h2>}
                  <p>{s.body}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-ink-700/70 bg-sand-50 p-4 rounded-lg">
              لا تتوفر معاينة نصية. استخدم زر "استعراض" لعرض الوثيقة في النافذة، أو نزّلها بصيغة PDF/Word.
            </div>
          )}

          {doc.tags.length > 0 && (
            <div className="mt-8 pt-4 border-t border-royal-100 flex flex-wrap gap-1.5">
              {doc.tags.map((t) => (
                <span key={t} className="badge bg-royal-50 text-royal-700">
                  {t}
                </span>
              ))}
            </div>
          )}
        </article>

        <aside className="space-y-4">
          <div className="card p-5">
            <h3 className="text-sm font-semibold mb-3 text-royal-900">
              الإجراءات
            </h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setViewerOpen(true)}
                className="btn-primary w-full"
              >
                <IconEye size={16} />
                استعراض الوثيقة
              </button>
              <button
                onClick={() => handleDownload('word')}
                disabled={downloading !== null}
                className={`${isWordFile(doc) ? 'btn-primary' : 'btn-outline'} w-full`}
              >
                <IconDownload size={16} />
                {downloading === 'word'
                  ? 'جارٍ التجهيز…'
                  : isWordFile(doc)
                    ? 'تنزيل النسخة الأصلية (Word)'
                    : 'تنزيل Word'}
              </button>
              <button
                onClick={() => handleDownload('pdf')}
                disabled={downloading !== null}
                className={`${isPdfFile(doc) ? 'btn-primary' : 'btn-outline'} w-full`}
              >
                <IconDownload size={16} />
                {downloading === 'pdf'
                  ? 'جارٍ التجهيز…'
                  : isPdfFile(doc)
                    ? 'تنزيل النسخة الأصلية (PDF)'
                    : 'تنزيل PDF'}
              </button>
              {doc.sourceUrl && (
                <a
                  href={doc.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline w-full"
                >
                  <IconExternal size={16} />
                  المصدر الرسمي
                </a>
              )}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold mb-3 text-royal-900">
              بيانات الوثيقة
            </h3>
            <dl className="text-sm space-y-2">
              {doc.reference && (
                <div className="flex justify-between gap-2 border-b border-royal-50 pb-2">
                  <dt className="text-ink-700/60">المرجع</dt>
                  <dd className="font-mono text-gold-700">{doc.reference}</dd>
                </div>
              )}
              <div className="flex justify-between gap-2 border-b border-royal-50 pb-2">
                <dt className="text-ink-700/60">التاريخ</dt>
                <dd>{formatHijri(doc.date)}</dd>
              </div>
              {cat && (
                <div className="flex justify-between gap-2 border-b border-royal-50 pb-2">
                  <dt className="text-ink-700/60">التصنيف</dt>
                  <dd>{cat.name}</dd>
                </div>
              )}
              {doc.issuer && (
                <div className="flex justify-between gap-2 border-b border-royal-50 pb-2">
                  <dt className="text-ink-700/60">الجهة</dt>
                  <dd>{doc.issuer}</dd>
                </div>
              )}
              {doc.classification && (
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-700/60">السرّية</dt>
                  <dd>{doc.classification}</dd>
                </div>
              )}
            </dl>
          </div>

          {related.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold mb-3 text-royal-900">
                وثائق ذات صلة
              </h3>
              <ul className="space-y-2">
                {related.map((r) => (
                  <li key={r.id}>
                    <Link
                      to={`/documents/${r.id}`}
                      className="text-sm text-royal-700 hover:text-royal-900 block leading-snug"
                    >
                      {r.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl mb-4">في نفس التصنيف</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {related.map((r) => (
              <DocumentCard key={r.id} doc={r} />
            ))}
          </div>
        </section>
      )}

      <DocumentViewer
        doc={doc}
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />
    </div>
  );
}
