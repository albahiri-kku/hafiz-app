import type { ArchiveDocument } from '../types/archive';

/**
 * فهرس الوثائق الرسمية لأمانة مجلس الأمناء
 * --------------------------------------------
 * المصدر: حزمة وثائق مجلس الأمناء (BOT Governance Pack)
 * يضم 31 وثيقة موزّعة على ٩ تصنيفات + قسم اللوائح الجامعية.
 *
 * الملفات الأصلية (بصيغة Word) موضوعة في `public/documents/`
 * ويتم تنزيلها كما هي عبر زر "تنزيل النسخة الأصلية".
 */

const ISSUER = 'أمانة مجلس الأمناء';
const ISSUE_DATE = '1446-01-01';
const DOC_BASE = '/documents';

const f = (name: string) => `${DOC_BASE}/${name}`;

export const documents: ArchiveDocument[] = [
  // ─── الوثائق الحاكمة ──────────────────────────────────
  {
    id: 'BOT-IDX-000',
    reference: 'BOT-IDX-000',
    title: 'المؤشر الرئيسي لحزمة الأدلة',
    category: 'foundation',
    date: ISSUE_DATE,
    issuer: ISSUER,
    classification: 'عام',
    summary:
      'الفهرس الرئيسي الذي يربط جميع وثائق الحزمة الحاكمة لمجلس الأمناء، ويحدد علاقاتها وتسلسل تطبيقها ومراجعها.',
    tags: ['فهرس', 'حوكمة', 'دليل'],
    filePath: f('BOT-IDX-000_-_المؤشر_الرئيسي_لحزمة_الأدلة.docx'),
  },
  {
    id: 'BOT-CHR-001',
    reference: 'BOT-CHR-001',
    title: 'ميثاق مجلس الأمناء',
    category: 'foundation',
    date: ISSUE_DATE,
    issuer: ISSUER,
    classification: 'عام',
    summary:
      'الميثاق العام الذي يحدد رؤية المجلس ورسالته واختصاصاته الجوهرية وعلاقته بالإدارة التنفيذية، ويُعدّ المرجعية العليا لباقي الوثائق.',
    tags: ['ميثاق', 'تأسيسي', 'حوكمة'],
    filePath: f('BOT-CHR-001_-_ميثاق_مجلس_الأمناء.docx'),
  },
  {
    id: 'BOT-BYL-002',
    reference: 'BOT-BYL-002',
    title: 'اللائحة التنفيذية لعمل المجلس',
    category: 'foundation',
    date: ISSUE_DATE,
    issuer: ISSUER,
    classification: 'عام',
    summary:
      'تنظم آليات عمل المجلس التفصيلية: انعقاد الاجتماعات، النصاب، التصويت، إصدار القرارات، توثيقها، ومتابعة تنفيذها.',
    tags: ['لائحة', 'تنفيذية', 'إجراءات'],
    filePath: f('BOT-BYL-002_-_اللائحة_التنفيذية_لعمل_المجلس.docx'),
  },
  {
    id: 'BOT-DOA-003',
    reference: 'BOT-DOA-003',
    title: 'مصفوفة الصلاحيات',
    category: 'foundation',
    date: ISSUE_DATE,
    issuer: ISSUER,
    classification: 'داخلي',
    summary:
      'الجدول الموحّد لتوزيع الصلاحيات بين المجلس ولجانه والإدارة التنفيذية، ومستويات الاعتماد المالية والإدارية لكل قرار.',
    tags: ['صلاحيات', 'تفويض', 'حوكمة'],
    filePath: f('BOT-DOA-003_-_مصفوفة_الصلاحيات.docx'),
  },
  {
    id: 'BOT-COC-005',
    reference: 'BOT-COC-005',
    title: 'ميثاق الأخلاقيات والسلوكيات',
    category: 'foundation',
    date: ISSUE_DATE,
    issuer: ISSUER,
    classification: 'عام',
    summary:
      'القيم والمبادئ المهنية الملزمة لأعضاء المجلس واللجان، وقواعد السلوك المتوقّعة في ممارسة العضوية وحفظ سمعة المؤسسة.',
    tags: ['أخلاقيات', 'سلوك', 'ميثاق'],
    filePath: f('BOT-COC-005_-_ميثاق_الأخلاقيات_والسلوكيات.docx'),
  },
  {
    id: 'BOT-OBM-009',
    reference: 'BOT-OBM-009',
    title: 'دليل العضو الجديد',
    category: 'foundation',
    date: ISSUE_DATE,
    issuer: ISSUER,
    classification: 'عام',
    summary:
      'حزمة التهيئة المعتمدة للعضو المنضمّ حديثاً للمجلس: نظرة شاملة على المؤسسة، الواجبات، الحقوق، الموارد المتاحة، والوثائق المرجعية.',
    tags: ['تهيئة', 'دليل', 'عضو جديد'],
    filePath: f('BOT-OBM-009-دليل-العضو-الجديد.docx'),
  },

  // ─── السياسات والمخاطر ───────────────────────────────
  {
    id: 'BOT-COI-006',
    reference: 'BOT-COI-006',
    title: 'سياسة تضارب المصالح',
    category: 'policies',
    date: ISSUE_DATE,
    issuer: ISSUER,
    classification: 'عام',
    summary:
      'الإطار المنظِّم لتعريف حالات تضارب المصالح، آليات الإفصاح المسبق واللحظي، وإجراءات المعالجة لضمان نزاهة قرارات المجلس.',
    tags: ['سياسة', 'تضارب مصالح', 'نزاهة'],
    filePath: f('BOT-COI-006_-_سياسة_تضارب_المصالح.docx'),
  },
  {
    id: 'BOT-CON-007',
    reference: 'BOT-CON-007',
    title: 'سياسة السرية وحماية المعلومات',
    category: 'policies',
    date: ISSUE_DATE,
    issuer: ISSUER,
    classification: 'عام',
    summary:
      'تنظم تصنيف معلومات المجلس، التزامات السرية على الأعضاء واللجان، وضوابط تداول الوثائق وأرشفتها وإتلافها.',
    tags: ['سرية', 'حماية معلومات', 'سياسة'],
    filePath: f('BOT-CON-007_-_سياسة_السرية_وحماية_المعلومات.docx'),
  },
  {
    id: 'BOT-WHB-008',
    reference: 'BOT-WHB-008',
    title: 'سياسة الإبلاغ عن المخالفات',
    category: 'policies',
    date: ISSUE_DATE,
    issuer: ISSUER,
    classification: 'عام',
    summary:
      'تكفل قنوات آمنة وسرية للإبلاغ عن المخالفات أو الممارسات غير الأخلاقية، وتحمي المُبلِّغ بحسن النية من أي تبعات.',
    tags: ['إبلاغ', 'مخالفات', 'حماية'],
    filePath: f('BOT-WHB-008_-_سياسة_الإبلاغ_عن_المخالفات.docx'),
  },
  {
    id: 'BOT-RSK-010',
    reference: 'BOT-RSK-010',
    title: 'سجل المخاطر المؤسسية',
    category: 'policies',
    date: ISSUE_DATE,
    issuer: ISSUER,
    classification: 'داخلي',
    summary:
      'السجل المعتمد للمخاطر الاستراتيجية والتشغيلية للمؤسسة، مع تصنيف الأثر والاحتمالية وضوابط التخفيف وأصحاب المسؤولية.',
    tags: ['مخاطر', 'سجل', 'حوكمة'],
    filePath: f('BOT-RSK-010-سجل-المخاطر-المؤسسية.docx'),
  },

  // ─── اللجان ───────────────────────────────────────────
  {
    id: 'BOT-COM-004',
    reference: 'BOT-COM-004',
    title: 'لوائح اللجان المنبثقة',
    category: 'committees',
    date: ISSUE_DATE,
    issuer: ISSUER,
    classification: 'عام',
    summary:
      'تنظم تشكيل اللجان الدائمة والمؤقتة المنبثقة عن المجلس، وتحدد اختصاصاتها وآلية اجتماعاتها وعلاقتها بالمجلس.',
    tags: ['لجان', 'لائحة', 'تشكيل'],
    filePath: f('BOT-COM-004_-_لوائح_اللجان_المنبثقة.docx'),
  },
  {
    id: 'BOT-FRM-016',
    reference: 'BOT-FRM-016',
    title: 'نموذج تشكيل لجنة منبثقة',
    category: 'committees',
    date: ISSUE_DATE,
    issuer: ISSUER,
    classification: 'عام',
    summary:
      'النموذج المعتمد لتشكيل أي لجنة منبثقة عن المجلس: الغرض، الأعضاء، المدة، الاختصاصات، والتقارير المطلوبة.',
    tags: ['نموذج', 'لجنة', 'تشكيل'],
    filePath: f('BOT-FRM-016 نموذج تشكيل لجنة منبثقة.docx'),
  },
  {
    id: 'BOT-FRM-017',
    reference: 'BOT-FRM-017',
    title: 'نموذج التقرير الدوري للجنة',
    category: 'committees',
    date: ISSUE_DATE,
    issuer: ISSUER,
    classification: 'داخلي',
    summary:
      'النموذج الذي تستخدمه اللجان المنبثقة في رفع تقاريرها الدورية للمجلس: الإنجازات، التحديات، التوصيات.',
    tags: ['نموذج', 'تقرير', 'لجنة'],
    filePath: f('BOT-FRM-017 نموذج التقرير الدوري للجنة.docx'),
  },

  // ─── الأداء والتقييم ─────────────────────────────────
  {
    id: 'BOT-EVL-011',
    reference: 'BOT-EVL-011',
    title: 'إطار تقييم أداء المجلس',
    category: 'performance',
    date: ISSUE_DATE,
    issuer: ISSUER,
    classification: 'عام',
    summary:
      'الإطار المرجعي لقياس فاعلية أداء المجلس وأعضائه ولجانه، يحدد المعايير والمؤشرات وآلية التقييم الذاتي والخارجي.',
    tags: ['تقييم', 'أداء', 'إطار'],
    filePath: f('BOT-EVL-011-إطار-تقييم-أداء-المجلس.docx'),
  },
  {
    id: 'BOT-FRM-014',
    reference: 'BOT-FRM-014',
    title: 'نموذج تقييم أداء العضو السنوي',
    category: 'performance',
    date: ISSUE_DATE,
    issuer: ISSUER,
    classification: 'سري',
    summary:
      'استبيان التقييم الذاتي/المتبادل لعضو المجلس وفق معايير الحضور والمساهمة والإفصاح والتطوير المستمر.',
    tags: ['تقييم', 'عضو', 'سنوي'],
    filePath: f('BOT-FRM-014 نموذج تقييم أداء العضو السنوي.docx'),
  },
  {
    id: 'BOT-FRM-015',
    reference: 'BOT-FRM-015',
    title: 'نموذج تقييم أداء المجلس ككل',
    category: 'performance',
    date: ISSUE_DATE,
    issuer: ISSUER,
    classification: 'داخلي',
    summary:
      'النموذج الجامع لتقييم فاعلية المجلس بصورته الكلية: الديناميكية، جودة القرارات، التزام الحوكمة، علاقة المجلس بالإدارة.',
    tags: ['تقييم', 'مجلس', 'فاعلية'],
    filePath: f('BOT-FRM-015  نموذج تقييم أداء المجلس ككل.docx'),
  },

  // ─── الاجتماعات ──────────────────────────────────────
  {
    id: 'BOT-FRM-001',
    reference: 'BOT-FRM-001',
    title: 'محضر اجتماع مجلس الأمناء',
    category: 'meetings',
    date: ISSUE_DATE,
    issuer: ISSUER,
    classification: 'داخلي',
    summary:
      'القالب الموحّد لتدوين محاضر اجتماعات المجلس: الحاضرون، البنود، النقاشات، القرارات، التوصيات، والتوقيعات.',
    tags: ['نموذج', 'محضر', 'اجتماع'],
    filePath: f('BOT-FRM-001_-_محضر_اجتماع_مجلس_الأمناء.docx'),
  },
  {
    id: 'BOT-FRM-002',
    reference: 'BOT-FRM-002',
    title: 'جدول أعمال اجتماع مجلس الأمناء',
    category: 'meetings',
    date: ISSUE_DATE,
    issuer: ISSUER,
    classification: 'داخلي',
    summary:
      'القالب المعتمد لإعداد جدول الأعمال قبل كل اجتماع: ترقيم البنود، التوقيتات، المرفقات، والمسؤوليات.',
    tags: ['نموذج', 'جدول أعمال'],
    filePath: f('BOT-FRM-002_-_جدول_أعمال_اجتماع_مجلس_الأمناء.docx'),
  },
  {
    id: 'BOT-FRM-003',
    reference: 'BOT-FRM-003',
    title: 'خطاب دعوة لاجتماع المجلس',
    category: 'meetings',
    date: ISSUE_DATE,
    issuer: ISSUER,
    classification: 'عام',
    summary:
      'القالب الرسمي للدعوة لاجتماع المجلس مع بيان الزمان والمكان وآلية الحضور والمرفقات المطلوب الاطلاع عليها.',
    tags: ['نموذج', 'دعوة', 'خطاب'],
    filePath: f('BOT-FRM-003_-_خطاب_دعوة_لاجتماع_المجلس.docx'),
  },
  {
    id: 'BOT-FRM-004',
    reference: 'BOT-FRM-004',
    title: 'نموذج الاعتذار عن حضور الاجتماع',
    category: 'meetings',
    date: ISSUE_DATE,
    issuer: ISSUER,
    classification: 'داخلي',
    summary:
      'نموذج الاعتذار الرسمي يُقدمه العضو في حال تعذّر حضور الاجتماع، مع بيان السبب وآلية المتابعة.',
    tags: ['نموذج', 'اعتذار'],
    filePath: f('BOT-FRM-004_-_نموذج_الاعتذار_عن_حضور_الاجتماع.docx'),
  },
  {
    id: 'BOT-FRM-005',
    reference: 'BOT-FRM-005',
    title: 'تصويت بالتمرير',
    category: 'meetings',
    date: ISSUE_DATE,
    issuer: ISSUER,
    classification: 'داخلي',
    summary:
      'النموذج الذي تستخدمه الأمانة لإجراء تصويت بالتمرير على قرار خارج الاجتماعات الدورية، وفق ضوابط اللائحة.',
    tags: ['نموذج', 'تصويت', 'تمرير'],
    filePath: f('BOT-FRM-005_-_تصويت_بالتمرير.docx'),
  },
  {
    id: 'BOT-FRM-019',
    reference: 'BOT-FRM-019',
    title: 'نموذج طلب إدراج بند في جدول الأعمال',
    category: 'meetings',
    date: ISSUE_DATE,
    issuer: ISSUER,
    classification: 'داخلي',
    summary:
      'النموذج الذي يستخدمه عضو المجلس أو الجهة المعنية لطلب إضافة بند جديد لجدول أعمال الاجتماع القادم.',
    tags: ['نموذج', 'بند', 'جدول أعمال'],
    filePath: f('BOT-FRM-019  نموذج طلب إدراج بند في جدول الأعمال.docx'),
  },

  // ─── القرارات والتفويض ──────────────────────────────
  {
    id: 'BOT-FRM-006',
    reference: 'BOT-FRM-006',
    title: 'صياغة قرار',
    category: 'decisions',
    date: ISSUE_DATE,
    issuer: ISSUER,
    classification: 'عام',
    summary:
      'القالب المعياري لصياغة قرارات المجلس: ديباجة، حيثيات، مرفقات، رقم القرار، تاريخ النفاذ، آلية التنفيذ والمتابعة.',
    tags: ['نموذج', 'قرار', 'صياغة'],
    filePath: f('BOT-FRM-006_-_صياغة_قرار.docx'),
  },
  {
    id: 'BOT-FRM-007',
    reference: 'BOT-FRM-007',
    title: 'متابعة تنفيذ القرارات',
    category: 'decisions',
    date: ISSUE_DATE,
    issuer: ISSUER,
    classification: 'داخلي',
    summary:
      'النموذج الذي تستخدمه الأمانة لمتابعة حالة تنفيذ كل قرار من قرارات المجلس، مع نسبة الإنجاز والملاحظات.',
    tags: ['نموذج', 'متابعة', 'تنفيذ'],
    filePath: f('BOT-FRM-007_-_متابعة_تنفيذ_القرارات.docx'),
  },
  {
    id: 'BOT-FRM-008',
    reference: 'BOT-FRM-008',
    title: 'تفويض الصلاحيات',
    category: 'decisions',
    date: ISSUE_DATE,
    issuer: ISSUER,
    classification: 'داخلي',
    summary:
      'القالب الرسمي لتفويض جزء من صلاحيات المجلس أو رئيسه لجهة محددة، وفق مصفوفة الصلاحيات وضوابط اللائحة.',
    tags: ['نموذج', 'تفويض', 'صلاحيات'],
    filePath: f('BOT-FRM-008_-_تفويض_الصلاحيات.docx'),
  },

  // ─── الإفصاحات والإقرارات ──────────────────────────
  {
    id: 'BOT-FRM-009',
    reference: 'BOT-FRM-009',
    title: 'إقرار تضارب المصالح السنوي',
    category: 'disclosures',
    date: ISSUE_DATE,
    issuer: ISSUER,
    classification: 'سري',
    summary:
      'الإقرار الذي يقدّمه كل عضو سنوياً يفصح فيه عن أي حالة تضارب مصالح فعلية أو محتملة وفق سياسة COI.',
    tags: ['إقرار', 'تضارب مصالح', 'سنوي'],
    filePath: f('BOT-FRM-009_-_إقرار_تضارب_المصالح_السنوي.docx'),
  },
  {
    id: 'BOT-FRM-010',
    reference: 'BOT-FRM-010',
    title: 'الإفصاح اللحظي عن تضارب المصالح',
    category: 'disclosures',
    date: ISSUE_DATE,
    issuer: ISSUER,
    classification: 'سري',
    summary:
      'النموذج الذي يستخدمه العضو لتسجيل إفصاح لحظي قبل مناقشة بند يحتمل وجود تضارب مصالح فيه.',
    tags: ['إفصاح', 'تضارب', 'لحظي'],
    filePath: f('BOT-FRM-010_-_الإفصاح_اللحظي_عن_تضارب_المصالح.docx'),
  },
  {
    id: 'BOT-FRM-011',
    reference: 'BOT-FRM-011',
    title: 'إقرار السرية والاستقلالية',
    category: 'disclosures',
    date: ISSUE_DATE,
    issuer: ISSUER,
    classification: 'سري',
    summary:
      'الإقرار الذي يوقّعه العضو بالتزامه بسرية معلومات المجلس وحياديته واستقلاليته أثناء أداء مهامه.',
    tags: ['إقرار', 'سرية', 'استقلالية'],
    filePath: f('BOT-FRM-011_-_إقرار_السرية_والاستقلالية.docx'),
  },

  // ─── العضوية ─────────────────────────────────────────
  {
    id: 'BOT-FRM-012',
    reference: 'BOT-FRM-012',
    title: 'نموذج قبول الترشّح للعضوية',
    category: 'membership',
    date: ISSUE_DATE,
    issuer: ISSUER,
    classification: 'داخلي',
    summary:
      'النموذج الذي يعبّر فيه المرشّح عن قبوله الترشّح لعضوية المجلس، ويُقرّ بالتزامه بالميثاق والسياسات.',
    tags: ['نموذج', 'ترشح', 'عضوية'],
    filePath: f('BOT-FRM-012  نموذج قبول الترشح للعضوية.docx'),
  },
  {
    id: 'BOT-FRM-013',
    reference: 'BOT-FRM-013',
    title: 'نموذج طلب الاستقالة من العضوية',
    category: 'membership',
    date: ISSUE_DATE,
    issuer: ISSUER,
    classification: 'سري',
    summary:
      'النموذج الرسمي الذي يقدّمه العضو الراغب في الاستقالة، مع بيان الأسباب وتاريخ النفاذ المقترح.',
    tags: ['نموذج', 'استقالة', 'عضوية'],
    filePath: f('BOT-FRM-013  نموذج طلب الاستقالة من العضوية.docx'),
  },

  // ─── المراسلات الداخلية ─────────────────────────────
  {
    id: 'BOT-FRM-018',
    reference: 'BOT-FRM-018',
    title: 'نموذج مفكرة داخلية',
    category: 'correspondence',
    date: ISSUE_DATE,
    issuer: ISSUER,
    classification: 'داخلي',
    summary:
      'القالب الموحّد للمفكرات الداخلية بين أعضاء المجلس واللجان والأمانة، مع التصنيف والمرفقات.',
    tags: ['نموذج', 'مفكرة', 'مراسلات'],
    filePath: f('BOT-FRM-018 نموذج مفكرة داخلية.docx'),
  },
  {
    id: 'BOT-FRM-020',
    reference: 'BOT-FRM-020',
    title: 'نموذج طلب معلومات من الإدارة التنفيذية',
    category: 'correspondence',
    date: ISSUE_DATE,
    issuer: ISSUER,
    classification: 'داخلي',
    summary:
      'النموذج الذي يستخدمه المجلس أو لجانه لطلب معلومات أو تقارير محددة من الإدارة التنفيذية، مع المهلة الزمنية.',
    tags: ['نموذج', 'طلب معلومات', 'تنفيذية'],
    filePath: f('BOT-FRM-020 نموذج طلب معلومات من الإدارة التنفيذية.docx'),
  },
];

export const getDocumentById = (id: string): ArchiveDocument | undefined =>
  documents.find((d) => d.id === id);

export const getDocumentsByCategory = (cat: string): ArchiveDocument[] =>
  documents.filter((d) => d.category === cat);
