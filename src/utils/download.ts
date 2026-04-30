import jsPDF from 'jspdf';
import type { ArchiveDocument } from '../types/archive';

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const sanitize = (s: string) =>
  s.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_').slice(0, 80);

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export function buildDocumentHtml(doc: ArchiveDocument): string {
  const sections =
    doc.body
      ?.map(
        (s) =>
          `${s.heading ? `<h2>${escapeHtml(s.heading)}</h2>` : ''}<p>${escapeHtml(
            s.body,
          )}</p>`,
      )
      .join('\n') ?? `<p>${escapeHtml(doc.summary)}</p>`;

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
  </div>
  <div style="margin-top:30px; padding-top:10px; border-top:1px dashed #bbd9c2; font-size:11px; color:#735622; text-align:center;">
    وثيقة صادرة من أرشيف أمانة مجلس الأمناء
  </div>
</div>`;
}

/** Download as a Word-compatible .doc (HTML based). */
export function downloadAsWord(doc: ArchiveDocument) {
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

/** Download as PDF via jspdf using rendered HTML (text-based fallback). */
export async function downloadAsPdf(doc: ArchiveDocument) {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

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

/** If filePath exists, download from it; else generate locally. */
export async function downloadDocument(
  doc: ArchiveDocument,
  format: 'pdf' | 'word',
) {
  if (doc.filePath && format === 'pdf') {
    const a = document.createElement('a');
    a.href = doc.filePath;
    a.download = '';
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }
  if (format === 'pdf') {
    await downloadAsPdf(doc);
  } else {
    downloadAsWord(doc);
  }
}
