import type { Category } from '../types/archive';

export const categories: Category[] = [
  {
    id: 'foundation',
    name: 'الوثائق التأسيسية',
    description: 'النظام الأساسي للمجلس واللوائح المنظمة لعمل الأمانة',
    icon: 'pillars',
    color: 'royal',
  },
  {
    id: 'meetings',
    name: 'محاضر الاجتماعات',
    description: 'محاضر اجتماعات المجلس المعتمدة وجداول الأعمال',
    icon: 'minutes',
    color: 'royal',
  },
  {
    id: 'decisions',
    name: 'قرارات المجلس',
    description: 'القرارات الصادرة عن المجلس والتوصيات',
    icon: 'gavel',
    color: 'gold',
  },
  {
    id: 'reports',
    name: 'التقارير السنوية',
    description: 'التقارير الدورية وتقارير الأداء والإنجازات',
    icon: 'chart',
    color: 'royal',
  },
  {
    id: 'membership',
    name: 'التشكيل والعضوية',
    description: 'قرارات التشكيل وعضوية المجلس واللجان',
    icon: 'people',
    color: 'royal',
  },
  {
    id: 'finance',
    name: 'الشؤون المالية',
    description: 'الميزانيات وتقارير المراجعة والاستثمار',
    icon: 'finance',
    color: 'gold',
  },
  {
    id: 'committees',
    name: 'لجان المجلس',
    description: 'وثائق اللجان الدائمة والمؤقتة وأعمالها',
    icon: 'team',
    color: 'royal',
  },
  {
    id: 'policies',
    name: 'السياسات والإجراءات',
    description: 'السياسات المعتمدة وأدلة الإجراءات المعيارية',
    icon: 'policy',
    color: 'royal',
  },
  {
    id: 'correspondence',
    name: 'المراسلات والتعاميم',
    description: 'التعاميم والمراسلات الرسمية الصادرة عن الأمانة',
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
