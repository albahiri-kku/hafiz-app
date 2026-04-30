import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { IconLogo, IconMenu, IconClose } from './Icons';

const links = [
  { to: '/', label: 'الرئيسية', exact: true },
  { to: '/documents', label: 'الوثائق' },
  { to: '/regulations', label: 'اللوائح والأنظمة' },
  { to: '/about', label: 'عن الأمانة' },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-white border-b border-royal-100 sticky top-0 z-30 backdrop-blur bg-white/95">
      <div className="container-page">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3 group">
            <IconLogo size={40} />
            <div className="leading-tight">
              <div className="font-display text-lg text-royal-900">
                أرشيف أمانة مجلس الأمناء
              </div>
              <div className="text-[11px] text-ink-700/60 font-medium">
                Board of Trustees Secretariat — Document Archive
              </div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.exact}
                className={({ isActive }) =>
                  `px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-royal-700 text-white'
                      : 'text-ink-800 hover:bg-royal-50'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <button
            onClick={() => setOpen((v) => !v)}
            className="md:hidden p-2 rounded-lg hover:bg-royal-50 text-royal-800"
            aria-label="القائمة"
          >
            {open ? <IconClose /> : <IconMenu />}
          </button>
        </div>

        {open && (
          <nav className="md:hidden pb-4 flex flex-col gap-1 animate-fade-in">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.exact}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `px-3.5 py-2 rounded-lg text-sm font-medium ${
                    isActive
                      ? 'bg-royal-700 text-white'
                      : 'text-ink-800 hover:bg-royal-50'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
