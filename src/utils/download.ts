import jsPDF from 'jspdf';
import type { ArchiveDocument } from '../types/archive';

const triggerDownload = (urlOrBlob: string | Blob, filename: string) => {
  const url =
    typeof urlOrBlob === 'string' ? urlOrBlob : URL.createObjectURL(urlOrBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  if (typeof urlOrBlob !== 'string') {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
};

const sanitize = (s: string) =>
  s.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_').slice(0, 80);

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const fileExt = (path?: string): string => {
  if (!path) return '';
  const m = /\.([^./?]+)(?:\?|$)/.exec(path);
  return m ? m[1].toLowerCase() : '';
};

export const isWordFile = (doc: ArchiveDocument) =>
  ['doc', 'docx'].includes(fileExt(doc.filePath));

export const isPdfFile = (doc: ArchiveDocument) =>
  fileExt(doc.filePath) === 'pdf';

/** Build a printable HTML representation of the document metadata. */
export function buildDocumentHtml(doc: ArchiveDocument): string {
  const sections =
    doc.body
      ?.map(
        (s) =>
          `${s.heading ? `<h2>${escapeHtml(s.heading)}</h2>` : ''}<p>${escapeHtml(
            s.body,
          )}</p>`,
      )
      .join('\n') ?? '';

  return `
<div style="font-family: 'Noto Sans Arabic', Arial, sans-serif; direction: rtl;">
  <div style="text-align:center; border-bottom:2px solid #235034; padding-bottom:14px; margin-bottom:20px;">
    <div style="color:#235034; font-size:14px; letter-spacing:1px;">المملكة العربية السعودية — أمانة مجلس الأمناء</div>
    <h1 style="color:#163322; margin:8px 0 4px; font-size:22px;">${escapeHtml(doc.title)}</h1>
    ${doc.reference ? `<div style="color:#735622; font-size:12px;">رقم المرجع: ${escapeHtml(doc.reference)}</div>` : ''}
  </div>
  <table style="width:100%; border-collapse:collapse; margin-bottom:18px; font-size:13px;">
    <tr><td style="padding:6px; border:1px solid #dcecdf; background:#f1f8f4; width:120px;"><b>التاريخ</b></td>
        <td style="padding:6px; border:1px solid #dcecdf;">${escapeHtml(doc.date)}</td></tr>
    ${doc.issuer ? `<tr><td style="padding:6px; border:1px solid #dcecdf; background:#f1f8f4;"><b>الجهة المصدرة</b></td><td style="padding:6px; border:1px solid #dcecdf;">${escapeHtml(doc.issuer)}</td></tr>` : ''}
    ${doc.classification ? `<tr><td style="padding:6px; border:1px solid #dcecdf; background:#f1f8f4;"><b>التصنيف</b></td><td style="padding:6px; border:1px solid #dcecdf;">${escapeHtml(doc.classification)}</td></tr>` : ''}
  </table>
  <div style="font-size:14px; line-height:1.9; color:#1a2620;">
    <p style="background:#faf7f1; padding:10px; border-right:3px solid #b8932a;">
      <b>ملخص:</b> ${escapeHtml(doc.summary)}
    </p>
    ${sections}
    ${
      !sections
        ? '<p style="color:#735622; font-size:12px; margin-top:24px;">' +
          'هذه صفحة الفهرس للوثيقة. للاطلاع على المحتوى التفصيلي يُرجى تنزيل النسخة الأصلية بصيغة Word.' +
          '</p>'
        : ''
    }
  </div>
  <div style="margin-top:30px; padding-top:10px; border-top:1px dashed #bbd9c2; font-size:11px; color:#735622; text-align:center;">
    وثيقة من أرشيف أمانة مجلس الأمناء
  </div>
</div>`;
}

/** Download original Word file if available, else generate one from metadata. */
export function downloadAsWord(doc: ArchiveDocument) {
  if (isWordFile(doc) && doc.filePath) {
    const fname = doc.filePath.split('/').pop() ?? `${doc.title}.docx`;
    triggerDownload(doc.filePath, fname);
    return;
  }
  const inner = buildDocumentHtml(doc);
  const html =
    `<html xmlns:o='urn:schemas-microsoft-com:office:office' ` +
    `xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>` +
    `<head><meta charset='utf-8'><title>${escapeHtml(doc.title)}</title></head>` +
    `<body dir='rtl' lang='ar'>${inner}</body></html>`;
  const blob = new Blob(['﻿', html], {
    type: 'application/msword;charset=utf-8',
  });
  triggerDownload(blob, `${sanitize(doc.title)}.doc`);
}

/** Download as PDF: native PDF if filePath is a .pdf, else generate from metadata. */
export async function downloadAsPdf(doc: ArchiveDocument) {
  if (isPdfFile(doc) && doc.filePath) {
    const fname = doc.filePath.split('/').pop() ?? `${doc.title}.pdf`;
    triggerDownload(doc.filePath, fname);
    return;
  }

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

  const container = document.createElement('div');
  container.style.cssText =
    'position:fixed; top:-10000px; right:0; width:560px; padding:24px; ' +
    'background:#fff; font-family:"Noto Sans Arabic", Arial, sans-serif; direction:rtl;';
  container.innerHTML = buildDocumentHtml(doc);
  document.body.appendChild(container);

  try {
    await pdf.html(container, {
      x: 18,
      y: 18,
      width: 560,
      windowWidth: 560,
      autoPaging: 'text',
      html2canvas: { scale: 0.85, useCORS: true, backgroundColor: '#ffffff' },
    });
    pdf.save(`${sanitize(doc.title)}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}

export async function downloadDocument(
  doc: ArchiveDocument,
  format: 'pdf' | 'word',
) {
  if (format === 'pdf') {
    await downloadAsPdf(doc);
  } else {
    downloadAsWord(doc);
  }
}

/**
 * Build an Office Online preview URL when the document is hosted on a
 * publicly reachable domain. Returns null when running on localhost or
 * when no Word file is attached.
 */
export function getOfficePreviewUrl(doc: ArchiveDocument): string | null {
  if (typeof window === 'undefined') return null;
  if (!isWordFile(doc) || !doc.filePath) return null;
  const host = window.location.hostname;
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.local')
  ) {
    return null;
  }
  const absolute = new URL(doc.filePath, window.location.origin).href;
  const encoded = encodeURIComponent(absolute);
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encoded}`;
}
