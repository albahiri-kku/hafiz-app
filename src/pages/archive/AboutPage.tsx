import {
  IconArchive,
  IconBook,
  IconFolder,
  IconShield,
} from '../../components/archive/Icons';

export default function AboutPage() {
  return (
    <div>
      <section className="gradient-royal text-white">
        <div className="container-page py-10 sm:py-14">
          <div className="text-xs text-gold-300 mb-3">عن الأمانة</div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl text-white">
            أمانة مجلس الأمناء — البوابة الموحّدة للوثائق
          </h1>
          <p className="text-sm sm:text-base text-royal-100/90 max-w-3xl mt-4 leading-relaxed">
            تتولى الأمانة العامة لمجلس الأمناء حفظ وتوثيق جميع القرارات
            والمحاضر والسياسات الصادرة عن المجلس، وإتاحتها للمستفيدين المعتمدين
            من خلال هذا الأرشيف الإلكتروني.
          </p>
        </div>
      </section>

      <section className="container-page py-10 sm:py-12">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card p-6">
            <div className="w-12 h-12 rounded-lg bg-royal-50 text-royal-700 flex items-center justify-center mb-3">
              <IconArchive />
            </div>
            <h2 className="text-xl mb-2">رؤية الأرشيف</h2>
            <p className="text-sm leading-relaxed text-ink-800">
              توفير منصة موحّدة وآمنة وذكية لحفظ الوثائق الرسمية للمجلس،
              تضمن سهولة الوصول والشفافية وحفظ الذاكرة المؤسسية للجهة.
            </p>
          </div>
          <div className="card p-6">
            <div className="w-12 h-12 rounded-lg bg-gold-50 text-gold-700 flex items-center justify-center mb-3">
              <IconShield />
            </div>
            <h2 className="text-xl mb-2">رسالتنا</h2>
            <p className="text-sm leading-relaxed text-ink-800">
              تنظيم وتصنيف وحفظ الوثائق وفق أعلى المعايير، وتمكين أصحاب
              العلاقة من الوصول السريع إليها مع ضمان السرّية والأمن المعلوماتي.
            </p>
          </div>
        </div>

        <div className="card p-6 mt-6">
          <h2 className="text-xl mb-4">منهجية التصنيف</h2>
          <p className="text-sm text-ink-800 leading-relaxed mb-4">
            تُصنَّف الوثائق إلى عشر فئات رئيسية تغطي كامل أعمال المجلس وأمانته،
            مع ضبط مستوى السرّية لكل وثيقة (عام / داخلي / سري) ومنح كل وثيقة
            رقماً مرجعياً موحّداً يسهّل تتبّعها.
          </p>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            {[
              'الوثائق التأسيسية',
              'محاضر الاجتماعات',
              'قرارات المجلس',
              'التقارير السنوية',
              'التشكيل والعضوية',
              'الشؤون المالية',
              'لجان المجلس',
              'السياسات والإجراءات',
              'المراسلات والتعاميم',
              'اللوائح والأنظمة الجامعية',
            ].map((c) => (
              <div
                key={c}
                className="flex items-center gap-2 bg-sand-50 px-3 py-2 rounded-lg"
              >
                <IconFolder size={14} />
                <span>{c}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6 mt-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-lg bg-royal-50 text-royal-700 flex items-center justify-center">
              <IconBook />
            </div>
            <h2 className="text-xl !mb-0">تكامل مع المرجعية الرسمية</h2>
          </div>
          <p className="text-sm leading-relaxed text-ink-800">
            يضم الأرشيف قسماً مستقلاً للوائح والأنظمة الصادرة عن مجلس شؤون
            الجامعات، يرتبط مباشرة بالمصدر الرسمي
            <a
              href="https://www.cua.gov.sa/regulations-and-regulations/"
              className="text-royal-700 hover:text-royal-900 mx-1 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              cua.gov.sa
            </a>
            لضمان الاطلاع على آخر نسخة معتمدة.
          </p>
        </div>
      </section>
    </div>
  );
}
