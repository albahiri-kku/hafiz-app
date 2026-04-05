import { Link } from 'react-router-dom'
import './LandingPage.css'

// ── Feature cards data ───────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: '🎙',
    title: 'تقييم فوري بالذكاء الاصطناعي',
    desc:  'يستمع حافِظ إلى تلاوتك ويحللها فور الانتهاء — دون انتظار.',
  },
  {
    icon: '📖',
    title: 'مصحف تفاعلي بخط QCF',
    desc:  'تصفَّح صفحات المصحف بخط العثماني القياسي مع تمييز كل كلمة وآية.',
  },
  {
    icon: '🔬',
    title: 'تحليل تجويد دقيق',
    desc:  'كشف المد والقلقلة والغنة والنون والميم الساكنة بتقنية صوتية متخصصة.',
  },
  {
    icon: '✅',
    title: 'رواية حفص كاملة',
    desc:  'يتعرف على ٢١ وجهاً مقبولاً في رواية حفص عن عاصم ولا يعتبرها أخطاءً.',
  },
  {
    icon: '🔊',
    title: 'كشف التلاوة التلقائي',
    desc:  'لا حاجة لتحديد الآية — يحدِّد حافِظ موضعك من المصحف تلقائياً.',
  },
  {
    icon: '📊',
    title: 'ملخص الجلسة',
    desc:  'تقرير مفصَّل بعدد الآيات الصحيحة والملاحظات في نهاية كل جلسة.',
  },
]

// ── Steps data ───────────────────────────────────────────────────────────────
const STEPS = [
  {
    num:   '١',
    title: 'ابدأ الجلسة',
    desc:  'اضغط "ابدأ الجلسة"، حدِّد الآية التي تريد المراجعة منها، ثم اضغط على الميكروفون.',
  },
  {
    num:   '٢',
    title: 'اتلُ بصوت عادي',
    desc:  'اتلُ الآية بصوتك الطبيعي — يكتشف حافِظ الصمت تلقائياً ويُرسل التسجيل.',
  },
  {
    num:   '٣',
    title: 'استقبل التغذية الراجعة',
    desc:  'يظهر حكم التلاوة فوراً: صحيحة ← تقدَّم ← خطأ تجويد ← راجع.',
  },
  {
    num:   '٤',
    title: 'راجع وتحسَّن',
    desc:  'عند الخطأ تُضاء الكلمات المعنية بالأحمر؛ أعد التلاوة حتى يمرَّ.',
  },
]

// ────────────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="lp" dir="rtl">

      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <nav className="lp-nav">
        <span className="lp-nav-logo">حافِظ</span>
        <ul className="lp-nav-links">
          <li><a href="#features">المزايا</a></li>
          <li><a href="#how">كيف يعمل</a></li>
          <li><Link to="/about">عن المشروع</Link></li>
          <li><Link to="/app" className="lp-nav-cta">ابدأ الآن</Link></li>
        </ul>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="lp-hero">
        <span className="lp-hero-badge">نظام تقييم التلاوة بالذكاء الاصطناعي</span>

        <h1 className="lp-hero-title">حافِظ</h1>

        <p className="lp-hero-subtitle">
          رفيقك في مراجعة القرآن الكريم — يستمع إلى تلاوتك، يُقيِّمها، ويرشدك
          إلى الكلمات التي تحتاج عنايةً أكبر.
        </p>

        <div className="lp-hero-actions">
          <Link to="/app" className="lp-btn-primary">
            🎙 ابدأ المراجعة
          </Link>
          <a href="#how" className="lp-btn-secondary">
            كيف يعمل؟ ↓
          </a>
        </div>

        <span className="lp-hero-scroll" aria-hidden>↓</span>
      </section>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <div className="lp-stats">
        <div className="lp-stats-inner">
          <div>
            <span className="lp-stat-num">٦٢٣٦</span>
            <span className="lp-stat-label">آية في قاعدة البيانات</span>
          </div>
          <div>
            <span className="lp-stat-num">١٠٠٪</span>
            <span className="lp-stat-label">دقة النتائج القياسية</span>
          </div>
          <div>
            <span className="lp-stat-num">٢١</span>
            <span className="lp-stat-label">وجهاً مقبولاً في حفص</span>
          </div>
          <div>
            <span className="lp-stat-num">٥</span>
            <span className="lp-stat-label">طبقات تجويد مستقلة</span>
          </div>
        </div>
      </div>

      {/* ── Features ───────────────────────────────────────────────────── */}
      <section id="features" className="lp-section lp-features">
        <p className="lp-section-label">المزايا</p>
        <h2 className="lp-section-title">لماذا حافِظ؟</h2>
        <p className="lp-section-desc">
          أداة شاملة تجمع دقة التحليل الصوتي مع سهولة الاستخدام اليومي
          في مراجعة حفظ القرآن الكريم.
        </p>
        <div className="lp-features-grid">
          {FEATURES.map(f => (
            <div key={f.title} className="lp-feature-card">
              <div className="lp-feature-icon">{f.icon}</div>
              <h3 className="lp-feature-title">{f.title}</h3>
              <p className="lp-feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Steps ──────────────────────────────────────────────────────── */}
      <section id="how" className="lp-section lp-steps">
        <p className="lp-section-label">كيف يعمل</p>
        <h2 className="lp-section-title">أربع خطوات فقط</h2>
        <p className="lp-section-desc">
          واجهة مبسَّطة تتيح لك التركيز على التلاوة — لا على التقنية.
        </p>
        <ol className="lp-steps-list">
          {STEPS.map(s => (
            <li key={s.num} className="lp-step">
              <span className="lp-step-num">{s.num}</span>
              <div className="lp-step-body">
                <p className="lp-step-title">{s.title}</p>
                <p className="lp-step-desc">{s.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <section className="lp-section lp-cta">
        <div className="lp-cta-box">
          <h2 className="lp-cta-title">ابدأ مراجعتك الآن</h2>
          <p className="lp-cta-desc">
            لا يلزمك تسجيل حساب — افتح التطبيق مباشرةً وابدأ تلاوتك.
          </p>
          <Link to="/app" className="lp-btn-primary">
            🎙 ادخل إلى التطبيق
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="lp-footer">
        <p className="lp-footer-text">
          حافِظ — نظام تقييم التلاوة © {new Date().getFullYear()}
          &nbsp;·&nbsp;
          <Link to="/about">عن المشروع</Link>
        </p>
      </footer>

    </div>
  )
}
