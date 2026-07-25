import { useLocation, Link } from "react-router-dom";
import { logoutUser } from "../api/client";
import { useState, useEffect } from "react";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: "📊" },
  { path: "/orders", label: "Aufträge", icon: "📋" },
  { path: "/control", label: "Produktionssteuerung", icon: "🏭" },
  { path: "/machines", label: "Stationen", icon: "⚙️" },
  { path: "/carriers", label: "Werkstückträger", icon: "🏭" },
  { path: "/alarms", label: "Alarme", icon: "🔔" },
  { path: "/traces", label: "Traces", icon: "📈" },
  { path: "/edge", label: "Edge Gateway", icon: "🌐" },
];

declare global {
  var i18n: any;
}

export default function Sidebar() {
  const location = useLocation();
  const [lang, setLang] = useState(localStorage.getItem('lang') || 'en');

  useEffect(() => {
    const handler = () => setLang(localStorage.getItem('lang') || 'en');
    window.addEventListener('lang-change', handler);
    return () => window.removeEventListener('lang-change', handler);
  }, []);

  function toggleLang() {
    const next = lang === 'en' ? 'de' : 'en';
    localStorage.setItem('lang', next);
    setLang(next);
    window.dispatchEvent(new Event('lang-change'));
    if (typeof globalThis !== 'undefined' && globalThis.i18n) globalThis.i18n.changeLanguage(next);
  }

  return (
    <div className="sticky top-0 h-screen w-[var(--sidebar-width)] bg-neutral-black flex flex-col">
      <div className="p-5 border-b border-[rgba(255,255,255,0.1)] flex items-center gap-3">
        <div>
          <h1 className="text-lg font-bold tracking-wide text-neutral-black">Wara <span className="text-brand-primary">MES</span></h1>
          <p className="text-xs text-neutral-light mt-1">Smart Production</p>
        </div>
        <img src="/logo.jpg" alt="MES Logo" className="flex-shrink-0 w-28 object-contain" />
      </div>

      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors duration-150 ${
                isActive
                  ? "bg-brand-primary text-white"
                  : "text-neutral-dark hover:bg-neutral-stroke hover:text-neutral-black transition-colors duration-150"
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-[rgba(255,255,255,0.1)]">
        <button onClick={() => { logoutUser(); window.location.href = "/"; }} className="w-full py-2 text-sm text-status-error hover:text-status-error-dark font-medium rounded-md hover:bg-status-error-bg transition-colors">Abmelden</button>
        <button onClick={toggleLang} className="w-full py-2 text-xs font-mono border border-[rgba(255,255,255,0.1)] rounded-md text-neutral-light hover:bg-neutral-stroke">
          {lang.toUpperCase()}
        </button>
      </div>
    </div>
  );
}
