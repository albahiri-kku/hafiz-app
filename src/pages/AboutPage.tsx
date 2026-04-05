import { Link } from 'react-router-dom'
import './LandingPage.css'   // reuses the same design tokens + nav styles

export default function AboutPage() {
  return (
    <div className="lp" dir="rtl">

      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <nav className="lp-nav">
        <Link to="/" className="lp-nav-logo">حافِظ</Link>
        <ul className="lp-nav-links">
          <li><Link to="/">الرئيسية</Link></li>
          <li><Link to="/app" className="lp-nav-cta">التطبيق</Link></li>
        </ul>
      </nav>

      {/* ── Hero strip ─────────────────────────────────────────────────── */}
      <section
        className="lp-hero"
        style={{ minHeight: 'auto', paddingTop: '80px', paddingBottom: '80px' }}
      >
        <h1 className="lp-hero-title" style={{ fontSize: 'clamp(2rem,6vw,3.5rem)' }}>
          عن حافِظ
        </h1>
        <p className="lp-hero-subtitle">
          مشروع مفتوح المصدر لمساعدة حافظي القرآن الكريم على مراجعة تلاوتهم.
        </p>
      </section>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <section className="lp-section lp-features">
        <div style={{ maxWidth: 760, margin: '0 auto', lineHeight: 1.85, fontSize: '1.05rem', color: '#2a3a2a' }}>

          <h2 style={{ color: 'var(--hafiz-green-dark)', marginBottom: 16 }}>ما هو حافِظ؟</h2>
          <p>
            حافِظ نظام ذكاء اصطناعي لتقييم جودة تلاوة القرآن الكريم. يجمع بين
            التعرف على الكلام (ASR) ومطابقة النصوص والتحليل الصوتي لأحكام التجويد
            في منظومة موحَّدة تعطي حكماً فورياً على كل آية.
          </p>

          <h2 style={{ color: 'var(--hafiz-green-dark)', margin: '32px 0 16px' }}>طبقات التقييم</h2>
          <ul style={{ paddingRight: '1.4em' }}>
            <li style={{ marginBottom: 8 }}>
              <strong>المطابقة النصية</strong> — مقارنة التلاوة بالنص العثماني المرجعي (٦٢٣٦ آية).
            </li>
            <li style={{ marginBottom: 8 }}>
              <strong>المد</strong> — قياس مدة المدود الواجبة والطبيعية بتحليل إشارة الصوت.
            </li>
            <li style={{ marginBottom: 8 }}>
              <strong>القلقلة</strong> — كشف حروف القلقلة بتحليل طاقة النهاية.
            </li>
            <li style={{ marginBottom: 8 }}>
              <strong>الغنة</strong> — تحليل نسبة الترددات الأنفية المنخفضة.
            </li>
            <li style={{ marginBottom: 8 }}>
              <strong>النون والميم الساكنة</strong> — مسابر صوتية متخصصة للمجموعة أ.
            </li>
            <li>
              <strong>أوجه الأداء</strong> — ٢١ وجهاً مقبولاً في رواية حفص عن عاصم.
            </li>
          </ul>

          <h2 style={{ color: 'var(--hafiz-green-dark)', margin: '32px 0 16px' }}>التقنيات المستخدمة</h2>
          <ul style={{ paddingRight: '1.4em' }}>
            <li style={{ marginBottom: 8 }}>Python · FastAPI · faster-whisper (Whisper small)</li>
            <li style={{ marginBottom: 8 }}>librosa للتحليل الصوتي</li>
            <li style={{ marginBottom: 8 }}>React 18 · TypeScript · Vite 5 · Tailwind CSS</li>
            <li>خط QCF (حفص) لعرض صفحات المصحف بالخط العثماني</li>
          </ul>

          <h2 style={{ color: 'var(--hafiz-green-dark)', margin: '32px 0 16px' }}>الدقة الحالية</h2>
          <p>
            ٢١١ / ٢١١ حالة اختبار قياسية تُقيَّم بنجاح (١٠٠٪) — آخر تحديث ٢٠٢٦-٠٤-٠٤.
          </p>

          <div style={{ marginTop: 48, textAlign: 'center' }}>
            <Link to="/app" className="lp-btn-primary">
              🎙 جرِّب التطبيق الآن
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="lp-footer">
        <p className="lp-footer-text">
          حافِظ — نظام تقييم التلاوة © {new Date().getFullYear()}
          &nbsp;·&nbsp;
          <Link to="/">الرئيسية</Link>
        </p>
      </footer>

    </div>
  )
}
