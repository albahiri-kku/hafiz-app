import { Link } from 'react-router-dom';
import { IconLogo } from './Icons';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-royal-900 text-royal-100 mt-20">
      <div className="container-page py-12">
        <div className="grid md:grid-cols-3 gap-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <IconLogo size={48} />
              <div>
                <div className="font-display text-lg text-white">
                  أمانة مجلس الأمناء
                </div>
                <div className="text-[11px] text-royal-200">
                  أرشيف الوثائق الرسمية
                </div>
              </div>
            </div>
            <p className="text-sm text-royal-100/80 leading-relaxed">
              مكتبة رقمية موحّدة لجميع وثائق المجلس وقراراته ومحاضره وسياساته،
              مع اللوائح والأنظمة الجامعية الصادرة عن مجلس شؤون الجامعات.
            </p>
          </div>

          <div>
            <h4 className="text-white font-display text-base mb-4">روابط سريعة</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/documents" className="hover:text-gold-300">جميع الوثائق</Link></li>
              <li><Link to="/regulations" className="hover:text-gold-300">اللوائح والأنظمة</Link></li>
              <li><Link to="/about" className="hover:text-gold-300">عن الأمانة</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-display text-base mb-4">المصادر الرسمية</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://www.cua.gov.sa/regulations-and-regulations/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gold-300"
                >
                  مجلس شؤون الجامعات
                </a>
              </li>
              <li>
                <a
                  href="https://www.cua.gov.sa/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gold-300"
                >
                  الموقع الرسمي للمجلس
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-royal-800 mt-10 pt-6 text-xs text-royal-200/70 flex flex-col sm:flex-row gap-2 justify-between">
          <span>© {year} — أمانة مجلس الأمناء. جميع الحقوق محفوظة.</span>
          <span>وثائق مصنّفة وفق سياسة الأرشفة المعتمدة.</span>
        </div>
      </div>
    </footer>
  );
}
