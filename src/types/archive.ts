export type CategoryId =
  | 'foundation'
  | 'meetings'
  | 'decisions'
  | 'reports'
  | 'membership'
  | 'finance'
  | 'committees'
  | 'policies'
  | 'correspondence'
  | 'regulations';

export interface Category {
  id: CategoryId;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export interface DocumentSection {
  heading?: string;
  body: string;
}

export interface ArchiveDocument {
  id: string;
  title: string;
  category: CategoryId;
  date: string;
  reference?: string;
  summary: string;
  tags: string[];
  /** Optional path under /public, e.g. "/documents/foo.pdf" */
  filePath?: string;
  /** Optional external URL (e.g. official source) */
  sourceUrl?: string;
  /** Inline body shown in viewer when no file is attached */
  body?: DocumentSection[];
  /** ISO date of latest update */
  updatedAt?: string;
  /** Issuing authority */
  issuer?: string;
  /** Confidentiality level */
  classification?: 'عام' | 'داخلي' | 'سري';
}

export interface RegulationItem {
  id: string;
  title: string;
  issuer: string;
  category: 'نظام' | 'لائحة' | 'دليل' | 'قرار';
  year?: string;
  sourceUrl: string;
  filePath?: string;
  summary?: string;
}
