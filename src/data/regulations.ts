import type { RegulationItem } from '../types/archive';

/**
 * اللوائح والأنظمة الجامعية الصادرة عن مجلس شؤون الجامعات
 * المصدر الرسمي: https://www.cua.gov.sa/regulations-and-regulations/
 *
 * الروابط الفرعية ترتبط بصفحة المصدر الرسمية. عند توفر ملفات PDF محلياً،
 * يمكن وضعها في `public/regulations/` وتحديث `filePath`.
 */

export const CUA_SOURCE_URL = 'https://www.cua.gov.sa/regulations-and-regulations/';

export const regulations: RegulationItem[] = [
  {
    id: 'reg-uni-system',
    title: 'نظام الجامعات',
    issuer: 'مجلس شؤون الجامعات',
    category: 'نظام',
    year: '1441هـ',
    sourceUrl: CUA_SOURCE_URL,
    summary:
      'النظام الجديد للجامعات الصادر بالمرسوم الملكي، ويُحدد إطار العمل الجامعي والاستقلالية الأكاديمية والمالية.',
  },
  {
    id: 'reg-uni-system-bylaw',
    title: 'اللائحة التنفيذية لنظام الجامعات',
    issuer: 'مجلس شؤون الجامعات',
    category: 'لائحة',
    year: '1441هـ',
    sourceUrl: CUA_SOURCE_URL,
    summary:
      'اللائحة المنظمة لتطبيق نظام الجامعات وأحكامه التنفيذية في كافة الجامعات الحكومية والأهلية.',
  },
  {
    id: 'reg-cua-system',
    title: 'نظام مجلس شؤون الجامعات',
    issuer: 'مجلس شؤون الجامعات',
    category: 'نظام',
    sourceUrl: CUA_SOURCE_URL,
    summary: 'النظام المنظم لاختصاصات المجلس وتشكيله وآلية عمله.',
  },
  {
    id: 'reg-faculty',
    title:
      'اللائحة المنظمة لشؤون منسوبي الجامعات السعوديين من أعضاء هيئة التدريس ومن في حكمهم',
    issuer: 'مجلس شؤون الجامعات',
    category: 'لائحة',
    sourceUrl: CUA_SOURCE_URL,
    summary:
      'تنظم شؤون التعيين والترقية والإجازات والحقوق والواجبات لأعضاء هيئة التدريس السعوديين.',
  },
  {
    id: 'reg-non-saudi',
    title: 'لائحة توظيف غير السعوديين في الجامعات',
    issuer: 'مجلس شؤون الجامعات',
    category: 'لائحة',
    sourceUrl: CUA_SOURCE_URL,
    summary: 'تنظم تعاقد الجامعات مع الكفاءات غير السعودية ومتطلباته.',
  },
  {
    id: 'reg-grad-studies',
    title: 'اللائحة الموحدة للدراسات العليا',
    issuer: 'مجلس شؤون الجامعات',
    category: 'لائحة',
    sourceUrl: CUA_SOURCE_URL,
    summary:
      'تنظم برامج الدراسات العليا وشروط القبول وضوابط الإشراف ومنح الدرجات.',
  },
  {
    id: 'reg-study-exams',
    title: 'لائحة الدراسة والاختبارات للمرحلة الجامعية',
    issuer: 'مجلس شؤون الجامعات',
    category: 'لائحة',
    sourceUrl: CUA_SOURCE_URL,
    summary:
      'الإطار التنظيمي للقبول والتسجيل والاختبارات والإنذارات والتخرج لطلاب البكالوريوس.',
  },
  {
    id: 'reg-students',
    title: 'لائحة شؤون الطلاب',
    issuer: 'مجلس شؤون الجامعات',
    category: 'لائحة',
    sourceUrl: CUA_SOURCE_URL,
    summary: 'تنظم حقوق الطلاب وواجباتهم وأنشطتهم وقواعد التأديب.',
  },
  {
    id: 'reg-financial',
    title: 'لائحة الموارد المالية للجامعات',
    issuer: 'مجلس شؤون الجامعات',
    category: 'لائحة',
    sourceUrl: CUA_SOURCE_URL,
    summary:
      'تنظم مصادر الإيرادات والاستثمار والوقف الجامعي وأوجه الصرف في الجامعات.',
  },
  {
    id: 'reg-rewards',
    title: 'لائحة المكافآت',
    issuer: 'مجلس شؤون الجامعات',
    category: 'لائحة',
    sourceUrl: CUA_SOURCE_URL,
    summary: 'تحدد ضوابط صرف المكافآت لأعضاء هيئة التدريس والعاملين والطلاب.',
  },
  {
    id: 'reg-secondment',
    title: 'لائحة الانتداب والتفرغ العلمي',
    issuer: 'مجلس شؤون الجامعات',
    category: 'لائحة',
    sourceUrl: CUA_SOURCE_URL,
    summary:
      'تنظم إجراءات وحقوق الانتداب والإعارة والتفرغ العلمي لأعضاء هيئة التدريس.',
  },
  {
    id: 'reg-hospitals',
    title: 'لائحة المستشفيات الجامعية',
    issuer: 'مجلس شؤون الجامعات',
    category: 'لائحة',
    sourceUrl: CUA_SOURCE_URL,
    summary:
      'الإطار التنظيمي لتشغيل المستشفيات الجامعية وعلاقتها التكاملية مع كليات العلوم الصحية.',
  },
  {
    id: 'reg-private',
    title: 'نظام التعليم العالي الأهلي',
    issuer: 'مجلس شؤون الجامعات',
    category: 'نظام',
    sourceUrl: CUA_SOURCE_URL,
    summary: 'ينظم تأسيس وتشغيل الجامعات والكليات الأهلية في المملكة.',
  },
  {
    id: 'reg-investments',
    title: 'لائحة الاستثمار في الجامعات',
    issuer: 'مجلس شؤون الجامعات',
    category: 'لائحة',
    sourceUrl: CUA_SOURCE_URL,
    summary:
      'تنظم استثمار أصول الجامعات وأوقافها وتحدد ضوابط الشراكات والأنشطة الاستثمارية.',
  },
];
