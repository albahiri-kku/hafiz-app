import type { Category } from '../types/archive';

export const categories: Category[] = [
  {
    id: 'foundation',
    name: 'الوثائق الحاكمة',
    description: 'الميثاق واللائحة التنفيذية ومصفوفة الصلاحيات والأخلاقيات',
    icon: 'pillars',
    color: 'royal',
  },
  {
    id: 'policies',
    name: 'السياسات والمخاطر',
    description: 'سياسات السرية وتضارب المصالح والإبلاغ وسجل المخاطر',
    icon: 'policy',
    color: 'royal',
  },
  {
    id: 'committees',
    name: 'اللجان',
    description: 'لوائح اللجان المنبثقة ونماذج تشكيلها وتقاريرها',
    icon: 'team',
    color: 'royal',
  },
  {
    id: 'performance',
    name: 'الأداء والتقييم',
    description: 'إطار تقييم المجلس ونماذج تقييم العضو والمجلس',
    icon: 'chart',
    color: 'gold',
  },
  {
    id: 'meetings',
    name: 'الاجتماعات',
    description: 'محاضر الاجتماعات وجداول الأعمال والدعوات والاعتذار',
    icon: 'minutes',
    color: 'royal',
  },
  {
    id: 'decisions',
    name: 'القرارات والتفويض',
    description: 'صياغة القرارات ومتابعة تنفيذها وتفويض الصلاحيات',
    icon: 'gavel',
    color: 'gold',
  },
  {
    id: 'disclosures',
    name: 'الإفصاحات والإقرارات',
    description: 'إقرار تضارب المصالح السنوي واللحظي وإقرار السرية',
    icon: 'shield',
    color: 'royal',
  },
  {
    id: 'membership',
    name: 'العضوية',
    description: 'نماذج قبول الترشّح وطلبات الاستقالة من العضوية',
    icon: 'people',
    color: 'royal',
  },
  {
    id: 'correspondence',
    name: 'المراسلات الداخلية',
    description: 'المفكرات الداخلية وطلبات المعلومات من الإدارة التنفيذية',
    icon: 'mail',
    color: 'royal',
  },
  {
    id: 'regulations',
    name: 'اللوائح والأنظمة الجامعية',
    description: 'الأنظمة واللوائح الصادرة من مجلس شؤون الجامعات',
    icon: 'book',
    color: 'gold',
  },
];

export const getCategory = (id: string): Category | undefined =>
  categories.find((c) => c.id === id);
