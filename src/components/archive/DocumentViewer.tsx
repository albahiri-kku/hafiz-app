import { useEffect, useState } from 'react';
import type { ArchiveDocument } from '../../types/archive';
import { downloadDocument } from '../../utils/download';
import { formatHijri } from '../../utils/format';
import { getCategory } from '../../data/categories';
import {
  IconClose,
  IconDownload,
  IconPrint,
  IconShield,
  IconCalendar,
  IconExternal,
} from './Icons';

interface Props {
  doc: ArchiveDocument;
  open: boolean;
  onClose: () => void;
}

export default function DocumentViewer({ doc, open, onClose }: Props) {
  const [downloading, setDownloading] = useState<'pdf' | 'word' | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const cat = getCategory(doc.category);

  const handleDownload = async (format: 'pdf' | 'word') => {
    try {
      setDownloading(format);
      await downloadDocument(doc, format);
    } finally {
      setDownloading(null);
    }
  };

  const handlePrint = () => {
    const w = window.open('', '_blank', 'width=900,height=1000');
    if (!w) return;
    const content = document.getElementById('doc-print-area')?.innerHTML ?? '';
    w.document.write(
      `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>${doc.title}</title>
       <style>body{font-family:'Noto Sans Arabic',sans-serif;padding:40px;color:#1a2620}
       h1,h2,h3{color:#163322}table{width:100%;border-collapse:collapse}
       td,th{border:1px solid #dcecdf;padding:6px}</style></head>
       <body>${content}</body></html>`,
    );
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch md:items-center justify-center
                 bg-ink-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white w-full md:max-w-4xl md:max-h-[90vh] md:rounded-2xl
                   shadow-2xl flex flex-col overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-l from-royal-800 to-royal-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-gold-300 mb-0.5">
              {cat?.name ?? 'وثيقة'}
              {doc.reference && <span className="mr-2">— {doc.reference}</span>}
            </div>
            <h2 className="text-lg md:text-xl text-white truncate">{doc.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-white shrink-0"
            aria-label="إغلاق"
          >
            <IconClose />
          </button>
        </div>

        <div className="bg-sand-50 px-6 py-3 border-b border-royal-100 flex flex-wrap items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-ink-700/80">
            <IconCalendar size={14} />
            {formatHijri(doc.date)}
          </span>
          {doc.issuer && (
            <span className="text-ink-700/80">
              <span className="text-ink-700/50">الجهة:</span> {doc.issuer}
            </span>
          )}
          {doc.classification && (
            <span className="badge bg-white border border-royal-100 text-royal-800">
              <IconShield size={12} />
              {doc.classification}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto bg-sand-50 px-4 py-6">
          <div
            id="doc-print-area"
            className="bg-white shadow-soft max-w-3xl mx-auto p-8 md:p-12 prose-doc"
          >
            <div className="text-center border-b-2 border-royal-700 pb-6 mb-8">
              <div className="text-xs tracking-widest text-royal-700 mb-2">
                المملكة العربية السعودية — أمانة مجلس الأمناء
              </div>
              <h1 className="text-2xl md:text-3xl !mt-0">{doc.title}</h1>
              {doc.reference && (
                <div className="font-mono text-sm text-gold-700 mt-2">
                  {doc.reference}
                </div>
              )}
            </div>

            <div className="bg-sand-50 border-r-4 border-gold-500 px-4 py-3 mb-6 rounded">
              <div className="text-xs text-gold-700 font-semibold mb-1">ملخص الوثيقة</div>
              <p className="!my-0 text-sm">{doc.summary}</p>
            </div>

            {doc.filePath ? (
              <iframe
                src={doc.filePath}
                title={doc.title}
                className="w-full h-[70vh] border border-royal-100 rounded-lg"
              />
            ) : doc.body && doc.body.length > 0 ? (
              doc.body.map((s, i) => (
                <div key={i}>
                  {s.heading && <h2>{s.heading}</h2>}
                  <p>{s.body}</p>
                </div>
              ))
            ) : (
              <div className="text-center text-ink-700/60 py-10">
                <p>المحتوى التفصيلي للوثيقة سيُتاح قريباً.</p>
                <p className="text-xs mt-2">
                  يمكن للأمانة رفع نسخة الـ PDF الأصلية إلى مجلد
                  <code className="mx-1 px-1.5 py-0.5 bg-sand-100 rounded font-mono">
                    public/documents/
                  </code>
                  لتظهر تلقائياً.
                </p>
              </div>
            )}

            {doc.tags.length > 0 && (
              <div className="mt-8 pt-4 border-t border-royal-100 flex flex-wrap gap-1.5">
                {doc.tags.map((t) => (
                  <span
                    key={t}
                    className="badge bg-royal-50 text-royal-700"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-royal-100 px-6 py-3 bg-white flex flex-wrap items-center justify-end gap-2">
          {doc.sourceUrl && (
            <a
              href={doc.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline"
            >
              <IconExternal size={16} />
              المصدر
            </a>
          )}
          <button onClick={handlePrint} className="btn-outline">
            <IconPrint size={16} />
            طباعة
          </button>
          <button
            onClick={() => handleDownload('word')}
            disabled={downloading !== null}
            className="btn-outline"
          >
            <IconDownload size={16} />
            {downloading === 'word' ? 'جارٍ التجهيز…' : 'تنزيل Word'}
          </button>
          <button
            onClick={() => handleDownload('pdf')}
            disabled={downloading !== null}
            className="btn-primary"
          >
            <IconDownload size={16} />
            {downloading === 'pdf' ? 'جارٍ التجهيز…' : 'تنزيل PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
