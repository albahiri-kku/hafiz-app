import { Link } from 'react-router-dom';
import type { ArchiveDocument } from '../../types/archive';
import { getCategory } from '../../data/categories';
import { formatHijri } from '../../utils/format';
import { IconCalendar, IconEye, IconFile, IconShield } from './Icons';

interface Props {
  doc: ArchiveDocument;
}

const classBadge: Record<string, string> = {
  'عام': 'bg-royal-50 text-royal-700',
  'داخلي': 'bg-gold-50 text-gold-700',
  'سري': 'bg-red-50 text-red-700',
};

export default function DocumentCard({ doc }: Props) {
  const cat = getCategory(doc.category);
  return (
    <Link
      to={`/documents/${doc.id}`}
      className="card p-5 hover:shadow-ring hover:-translate-y-0.5 transition-all flex flex-col gap-3 group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="w-11 h-11 rounded-lg bg-royal-50 text-royal-700 flex items-center justify-center shrink-0">
          <IconFile size={22} />
        </div>
        {doc.classification && (
          <span
            className={`badge ${classBadge[doc.classification] ?? 'bg-stone-100 text-stone-700'}`}
          >
            <IconShield size={12} />
            {doc.classification}
          </span>
        )}
      </div>

      <div>
        <h3 className="text-base font-semibold text-royal-900 leading-snug group-hover:text-royal-700">
          {doc.title}
        </h3>
        {doc.reference && (
          <div className="text-xs font-mono text-gold-700 mt-1">
            {doc.reference}
          </div>
        )}
      </div>

      <p className="text-sm text-ink-700/80 line-clamp-2 leading-relaxed">
        {doc.summary}
      </p>

      <div className="flex items-center justify-between text-xs text-ink-700/60 pt-3 border-t border-royal-50">
        <span className="flex items-center gap-1.5">
          <IconCalendar size={14} />
          {formatHijri(doc.date)}
        </span>
        {cat && (
          <span className="text-royal-700 font-medium">
            {cat.name}
          </span>
        )}
      </div>

      <div className="flex items-center text-royal-700 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
        <IconEye size={16} />
        <span className="mr-1.5">عرض الوثيقة</span>
      </div>
    </Link>
  );
}
