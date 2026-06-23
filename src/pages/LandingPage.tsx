import { useEffect } from 'react'
import './LandingPage.css'

type Props = {
  onStart: () => void
  onSignIn?: () => void
}

export default function LandingPage({ onStart, onSignIn }: Props) {
  useEffect(() => {
    const prev = document.body.style.background
    document.body.style.background = '#0B1410'
    return () => { document.body.style.background = prev }
  }, [])

  return (
    <div className="hafiz-landing">
      <SiteHeader onStart={onStart} onSignIn={onSignIn} />
      <main>
        <Hero onStart={onStart} />
        <HowItWorks />
        <Features />
        <Showcase />
        <Pricing onStart={onStart} />
        <CTABand onStart={onStart} />
      </main>
      <Footer />
    </div>
  )
}

/* ══════════════════════════════════════════════════════════ */
/* Header                                                     */
/* ══════════════════════════════════════════════════════════ */
function SiteHeader({ onStart, onSignIn }: { onStart: () => void; onSignIn?: () => void }) {
  return (
    <header className="site-header">
      <div className="wrap header-inner">
        <a className="brand" onClick={onStart}>
          <BrandMark />
          <div className="brand-text">
            <div className="brand-name t-display">حافِظ</div>
            <div className="brand-sub">Hafiz · AI</div>
          </div>
        </a>
        <nav className="nav">
          <a className="active">الرئيسية</a>
          <a onClick={onStart}>التلاوة</a>
          <a href="#how">كيف يعمل</a>
          <a href="#pricing">الباقات</a>
          <a href="#features">عن حافظ</a>
        </nav>
        <div className="header-actions">
          <button className="btn btn-ghost btn-sm" onClick={onSignIn}>تسجيل الدخول</button>
          <button className="btn btn-primary btn-sm" onClick={onStart}>
            ابدأ التلاوة <ArrowLeft />
          </button>
        </div>
      </div>
    </header>
  )
}

function BrandMark() {
  return (
    <img
      className="brand-mark"
      src="/icons/hafiz-logo-white.png"
      alt="حافِظ"
    />
  )
}

function ArrowLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M9 3L4 7l5 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
      <path d="M3 2l9 5-9 5V2z" />
    </svg>
  )
}

/* ══════════════════════════════════════════════════════════ */
/* Hero                                                       */
/* ══════════════════════════════════════════════════════════ */
function Hero({ onStart }: { onStart: () => void }) {
  return (
    <section className="hero">
      <div className="hero-ornament hero-ornament-1"><Mihrab /></div>
      <div className="hero-ornament hero-ornament-2"><GeoStar /></div>
      <div className="wrap hero-grid">
        <div className="hero-copy fade-up">
          <div className="t-eyebrow">منصة ذكية لتقييم التلاوة</div>
          <h1 className="hero-title">
            <span className="t-display hero-title-xl">تِلاوتُك</span>
            <span className="t-display gold-text hero-title-md">بَيْنَ يَدَيْ مُعَلِّمٍ</span>
            <span className="t-display hero-title-xl">لا يَنام</span>
          </h1>
          <p className="hero-lede">
            حافِظ يُنصِت إلى تلاوتك آيةً آية، يُصحِّح التلاوة وأحكام التجويد،
            ويرسم لك خريطة حفظٍ ذكيّة — بدقّة الذكاء الاصطناعي وروح المعلِّم.
          </p>
          <div className="hero-cta">
            <button className="btn btn-primary" onClick={onStart}>
              ابدأ تلاوتك الآن <ArrowLeft />
            </button>
            <button className="btn btn-ghost">
              <PlayIcon /> شاهِد كيف يعمل
            </button>
          </div>
          <div className="hero-stats">
            <Stat n="٩٧٪" label="دقّة التعرّف على التجويد" />
            <Stat n="٦٠+" label="حُكم تجويدي مُكتشَف" />
            <Stat n="١٢٤ك" label="حافظ يستخدمون المنصّة" />
          </div>
        </div>
        <div className="hero-visual fade-up" style={{ animationDelay: '0.2s' }}>
          <RecitationCard />
        </div>
      </div>
      <ScrollHint />
    </section>
  )
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div className="stat">
      <div className="stat-n t-display">{n}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

function Mihrab() {
  return (
    <svg viewBox="0 0 200 320" fill="none" aria-hidden>
      <defs>
        <linearGradient id="hl-mihrab-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C9A961" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#C9A961" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M20 320 L20 120 Q20 20 100 20 Q180 20 180 120 L180 320" stroke="url(#hl-mihrab-g)" strokeWidth="1" fill="none" />
      <path d="M40 320 L40 130 Q40 40 100 40 Q160 40 160 130 L160 320" stroke="url(#hl-mihrab-g)" strokeWidth="1" fill="none" />
      <path d="M60 320 L60 140 Q60 60 100 60 Q140 60 140 140 L140 320" stroke="url(#hl-mihrab-g)" strokeWidth="1" fill="none" />
    </svg>
  )
}

function GeoStar() {
  return (
    <svg viewBox="0 0 200 200" fill="none" aria-hidden>
      <g stroke="#C9A961" strokeOpacity="0.18" strokeWidth="0.8" fill="none" transform="translate(100 100)">
        {Array.from({ length: 12 }).map((_, i) => (
          <rect key={i} x="-60" y="-60" width="120" height="120" transform={`rotate(${i * 15})`} />
        ))}
        <circle r="60" />
        <circle r="30" />
      </g>
    </svg>
  )
}

function ScrollHint() {
  return (
    <div className="scroll-hint">
      <span>اِسْتَكْشِف</span>
      <svg width="12" height="32" viewBox="0 0 12 32" fill="none" aria-hidden>
        <path d="M6 0v28M2 24l4 4 4-4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      </svg>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════ */
/* Recitation Card (hero demo)                                */
/* ══════════════════════════════════════════════════════════ */
function RecitationCard() {
  return (
    <div className="rec-card">
      <div className="rec-card-header">
        <div className="rec-meta">
          <span className="rec-surah">سورة الإسراء</span>
          <span>·</span>
          <span>آية ٨٢</span>
        </div>
        <div className="rec-status">
          <span className="rec-pulse" />
          الذكاء الاصطناعي يستمع
        </div>
      </div>
      <div className="rec-ayah-frame">
        <span className="ornament-corner tl"><Corner /></span>
        <span className="ornament-corner tr"><Corner /></span>
        <span className="ornament-corner bl"><Corner /></span>
        <span className="ornament-corner br"><Corner /></span>
        <p className="rec-ayah t-quran">
          <span className="word">وَنُنَزِّلُ</span>{' '}
          <span className="word">مِنَ</span>{' '}
          <span className="word">الْقُرْآنِ</span>{' '}
          <span className="word" data-tip="مدّ طبيعي: حركتان">مَا</span>{' '}
          <span className="word">هُوَ</span>{' '}
          <span className="word good" data-tip="مدّ واجب متصل: ٤–٥ حركات">شِفَاءٌ</span>{' '}
          <span className="word warn" data-tip="إدغام بغير غنّة: تنوين الضمّ مع اللام">وَرَحْمَةٌ</span>{' '}
          <span className="word err" data-tip="مدّ عارض للسكون عند الوقف: ٢ / ٤ / ٦ حركات">لِّلْمُؤْمِنِينَ</span>
          <span className="ayah-mark">۸۲</span>
        </p>
      </div>
      <div className="rec-wave">
        {Array.from({ length: 48 }).map((_, i) => (
          <span
            key={i}
            className="wave-bar"
            style={{
              animationDelay: `${i * 0.04}s`,
              height: `${20 + Math.sin(i * 0.7) * 16 + (i % 3) * 8}%`,
            }}
          />
        ))}
      </div>
      <div className="rec-chips">
        <Chip kind="good" icon="✓" label="مدّ واجب متصل" value="شِفَاءٌ" />
        <Chip kind="warn" icon="◐" label="إدغام بغير غنّة" value="رَحْمَةٌ لِّـ" />
        <Chip kind="err" icon="!" label="مدّ عارض للسكون" value="للمؤمنين" />
      </div>
      <div className="rec-controls">
        <button className="rec-btn rec-btn-mic" aria-label="تشغيل"><MicIcon /></button>
        <div className="rec-progress">
          <div className="rec-progress-track">
            <div className="rec-progress-fill" style={{ width: '64%' }} />
          </div>
          <div className="rec-time">٠٠:١٢ / ٠٠:١٩</div>
        </div>
        <button className="rec-btn rec-btn-ghost" aria-label="إعادة"><RestartIcon /></button>
      </div>
    </div>
  )
}

function Corner() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M0 24V8Q0 0 8 0H24" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <circle cx="8" cy="8" r="2" fill="currentColor" />
    </svg>
  )
}

function Chip({ kind, icon, label, value }: { kind: 'good' | 'warn' | 'err'; icon: string; label: string; value: string }) {
  return (
    <div className={`chip chip-${kind}`}>
      <span className="chip-icon">{icon}</span>
      <span className="chip-label">{label}</span>
      <span className="chip-value">{value}</span>
    </div>
  )
}

function MicIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <rect x="8" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 10v1a6 6 0 0012 0v-1M11 17v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function RestartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M2 9a7 7 0 117 7M2 9l3-3M2 9l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ══════════════════════════════════════════════════════════ */
/* Sections                                                   */
/* ══════════════════════════════════════════════════════════ */
const STEPS = [
  { n: '٠١', t: 'اِختَر السُّورة', d: 'انتقل إلى السورة والآيات التي تريد قراءتها أو مراجعتها من المصحف الكامل.' },
  { n: '٠٢', t: 'اِبدأ التِّلاوة', d: 'اِقرأ بصوتك وأذن الذكاء الاصطناعي تنصت إلى كل حرف ومخرج وحُكم.' },
  { n: '٠٣', t: 'تَلَقَّ التَّصحيح', d: 'تظهر الأخطاء فورياً على الآية، مع شرح حُكم التجويد والقراءة الصحيحة.' },
  { n: '٠٤', t: 'تَتَبَّع تَقَدُّمَك', d: 'خطّة حفظ ذكية، مراجعة مجدولة، ولوحة تتبّع لرحلتك مع كتاب الله.' },
]

function HowItWorks() {
  return (
    <section className="section how" id="how">
      <div className="wrap">
        <div className="section-head">
          <div className="t-eyebrow">كَيْفَ يَعْمَلُ حَافِظ</div>
          <h2 className="section-title t-display">أربع خطوات تفصلك عن تلاوةٍ مُتقَنة</h2>
        </div>
        <div className="steps-grid">
          {STEPS.map((s, i) => (
            <div key={i} className="step-card">
              <div className="step-num t-display">{s.n}</div>
              <h3 className="step-title">{s.t}</h3>
              <p className="step-desc">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const FEATURES = [
  { t: 'كَشْف أخطاء النُّطق', d: 'تحليل دقيق لمخارج الحروف وصفاتها، يُلاحِظ ما قد يفوت الأذن البشرية.' },
  { t: 'أَحْكَام التَّجويد', d: 'يُقَيِّم أكثر من ٦٠ حُكماً: المدّ، الإخفاء، الإدغام، الإقلاب، الغُنّة، التفخيم...' },
  { t: 'رَصْد أخطاء الحفظ', d: 'يلتقط الكلمات المنسيّة والمقلوبة والمتداخلة فوراً، ويُذكّرك بالصواب.' },
  { t: 'خُطَّة حِفْظ ذَكِيَّة', d: 'جدول مراجعة شخصي يعتمد على نقاط ضعفك، لا على وقتٍ ثابت.' },
  { t: 'مُقارنة بالقُرَّاء', d: 'قارن نَبْرَ تلاوتك بأكابر القرّاء: الحُصري، المنشاوي، السديس وغيرهم.' },
  { t: 'إجازات رقميَّة', d: 'وثّق إتقانك بشهادات مُوقَّعة من معلمين معتمدين عبر المنصّة.' },
]

const FEATURE_ICONS = [
  <svg viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.2"/><path d="M10 16h12M16 10v12" stroke="currentColor" strokeWidth="1.2"/><circle cx="16" cy="16" r="3" fill="currentColor"/></svg>,
  <svg viewBox="0 0 32 32" fill="none"><path d="M4 16q3-8 12-8t12 8q-3 8-12 8t-12-8z" stroke="currentColor" strokeWidth="1.2"/><circle cx="16" cy="16" r="4" stroke="currentColor" strokeWidth="1.2"/></svg>,
  <svg viewBox="0 0 32 32" fill="none"><rect x="6" y="4" width="20" height="24" rx="2" stroke="currentColor" strokeWidth="1.2"/><path d="M11 10h10M11 14h10M11 18h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><circle cx="22" cy="20" r="3" fill="currentColor"/></svg>,
  <svg viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="1.2"/><path d="M16 8v8l5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  <svg viewBox="0 0 32 32" fill="none"><path d="M4 12v8M9 8v16M14 11v10M19 7v18M24 10v12M28 13v6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  <svg viewBox="0 0 32 32" fill="none"><circle cx="16" cy="13" r="6" stroke="currentColor" strokeWidth="1.2"/><path d="M11 18l-2 10 7-3 7 3-2-10" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>,
]

function Features() {
  return (
    <section className="section features" id="features">
      <div className="wrap">
        <div className="section-head">
          <div className="t-eyebrow">المُمَيِّزات</div>
          <h2 className="section-title t-display">كُلّ ما يَحتاجُهُ الحَافِظُ في مَكانٍ واحِد</h2>
        </div>
        <div className="features-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className="feature-card">
              <div className="feature-icon">{FEATURE_ICONS[i]}</div>
              <h3 className="feature-title">{f.t}</h3>
              <p className="feature-desc">{f.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Showcase() {
  return (
    <section className="showcase">
      <div className="showcase-bg">
        <svg viewBox="0 0 800 400" preserveAspectRatio="xMidYMid slice" aria-hidden>
          <defs>
            <pattern id="hl-islamic-geo" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
              <g stroke="#C9A961" strokeOpacity="0.12" fill="none" strokeWidth="0.7">
                <circle cx="40" cy="40" r="30" />
                <rect x="10" y="10" width="60" height="60" />
                <rect x="10" y="10" width="60" height="60" transform="rotate(45 40 40)" />
              </g>
            </pattern>
          </defs>
          <rect width="800" height="400" fill="url(#hl-islamic-geo)" />
        </svg>
      </div>
      <div className="wrap-narrow showcase-inner">
        <div className="ornament-divider"><DiamondOrn /></div>
        <p className="showcase-verse t-quran">إِنَّ هَٰذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ</p>
        <p className="showcase-meta">سورة الإسراء — ٩</p>
        <div className="ornament-divider"><DiamondOrn /></div>
      </div>
    </section>
  )
}

function DiamondOrn() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
      <g transform="translate(16 16)">
        <rect x="-8" y="-8" width="16" height="16" stroke="currentColor" strokeWidth="1" fill="none" />
        <rect x="-8" y="-8" width="16" height="16" stroke="currentColor" strokeWidth="1" fill="none" transform="rotate(45)" />
        <circle r="2" fill="currentColor" />
      </g>
    </svg>
  )
}

const PLANS = [
  { n: 'الباقة الأساسية', p: 'مجَّاني', desc: 'لِمَن يبدأ رحلته', features: ['تقييم ٥ تلاوات يومياً', 'المصحف كاملاً', 'تتبّع الأخطاء الأساسية'], cta: 'ابدأ الآن', hl: false },
  { n: 'باقة الحَافِظ', p: '٤٩ ر.س / شهرياً', desc: 'الأكثر اختياراً', features: ['تلاوات لا محدودة', 'تحليل تفصيلي للتجويد', 'خُطَّة حفظ ذكية', 'مقارنة بكبار القرّاء', 'مراجعة مجدولة'], cta: 'اشترك الآن', hl: true },
  { n: 'باقة المَدارِس', p: 'تواصَل معنا', desc: 'للحلقات والمُؤسَّسات', features: ['حسابات للطلاب والمعلمين', 'لوحة تحكم للحلقة', 'تقارير دورية', 'إجازات رقمية موثَّقة', 'دعم مخصَّص'], cta: 'اطلب عرضاً', hl: false },
]

function Pricing({ onStart }: { onStart: () => void }) {
  return (
    <section className="section pricing" id="pricing">
      <div className="wrap">
        <div className="section-head">
          <div className="t-eyebrow">الباقات</div>
          <h2 className="section-title t-display">اِختَر ما يُناسب رِحْلَتَك</h2>
        </div>
        <div className="pricing-grid">
          {PLANS.map((p, i) => (
            <div key={i} className={`plan-card ${p.hl ? 'plan-hl' : ''}`}>
              {p.hl && <div className="plan-badge">الأكثر شُيوعاً</div>}
              <h3 className="plan-name">{p.n}</h3>
              <div className="plan-desc">{p.desc}</div>
              <div className="plan-price t-display">{p.p}</div>
              <ul className="plan-features">
                {p.features.map((f, j) => (
                  <li key={j}><CheckMark /> {f}</li>
                ))}
              </ul>
              <button className={`btn ${p.hl ? 'btn-primary' : 'btn-ghost'} plan-cta`} onClick={onStart}>
                {p.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CheckMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M2 7l3 3 7-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CTABand({ onStart }: { onStart: () => void }) {
  return (
    <section className="cta-band">
      <div className="wrap-narrow cta-inner">
        <div className="cta-orn-l"><GeoStar /></div>
        <div className="cta-orn-r"><GeoStar /></div>
        <h2 className="cta-title t-display">اِبْدَأْ تِلاوَتَكَ اليَوم</h2>
        <p className="cta-sub">انضم إلى أكثر من ١٢٤ ألف حافظ يستخدمون حافظ يوميّاً لتطوير تلاوتهم.</p>
        <button className="btn btn-primary btn-lg" onClick={onStart}>
          اِبدأ مَجَّاناً <ArrowLeft />
        </button>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer-inner">
        <div className="footer-brand">
          <BrandMark />
          <div>
            <div className="brand-name t-display" style={{ fontSize: '22px', color: 'rgb(218, 220, 154)' }}>حافِظ</div>
            <p className="footer-tag">معلِّم تلاوتك الذي لا ينام، يُصاحبك في رحلتك مع كتاب الله.</p>
          </div>
        </div>
        <div className="footer-cols">
          <div>
            <h4>المنتج</h4>
            <a>المُميّزات</a><a>الباقات</a><a>التطبيق</a><a>للمدارس</a>
          </div>
          <div>
            <h4>الموارد</h4>
            <a>كيف يعمل</a><a>دليل المستخدم</a><a>المدوَّنة</a><a>الأسئلة الشائعة</a>
          </div>
          <div>
            <h4>تواصَل</h4>
            <a>عَن حافظ</a><a>اتَّصِل بنا</a><a>الشَّراكات</a><a>الوظائف</a>
          </div>
        </div>
      </div>
      <div className="wrap footer-bottom">
        <span>© ٢٠٢٦ حافِظ — جَمِيع الحُقوق محفوظة</span>
        <span className="footer-aya">﴿ وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ ﴾</span>
      </div>
    </footer>
  )
}
