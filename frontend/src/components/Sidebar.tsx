import { useLocation, Link } from "react-router-dom";
import { logoutUser } from "../api/client";
import { useState, useEffect } from "react";

const navItems = [
  { path: "/", label: "Dashboard", icon: "📊" },
  { path: "/machines", label: "Stationen", icon: "⚙️" },
  { path: "/orders", label: "Aufträge", icon: "📋" },
  { path: "/carriers", label: "Werkstücktraeger", icon: "🏭" },
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
    <div className="sticky top-0 h-screen w-64 bg-white border-r border-neutral-200 flex flex-col">
      <div className="p-5 border-b border-neutral-100 flex items-center gap-3">
        <img src="/logo.jpg" alt="MES Logo" className="flex-shrink-0 w-28 object-contain" />
        <div>
          <h1 className="text-lg font-bold tracking-wide text-neutral-black"><span className="text-brand-primary">MES </span>Edge</h1>
          <p className="text-xs text-neutral-400 mt-1">Process Gateway</p>
        </div>
      </div>

      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-brand-primary text-white shadow-sm"
                  : "text-neutral-dark hover:bg-neutral-stroke hover:text-neutral-black"
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-neutral-100">
        <button onClick={() => { logoutUser(); window.location.href = "/auth/login"; }} className="w-full py-2 text-sm text-status-error hover:text-status-error-dark font-medium rounded-md hover:bg-status-error-bg transition-colors">Abmelden</button>
        <div className="flex items-center gap-2 text-xs text-neutral-400 mt-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" />
          Edge aktiv
        </div>
        <button onClick={toggleLang} className="w-full py-2 mt-2 text-xs font-mono border border-neutral-200 rounded-md text-neutral-500 hover:bg-neutral-50">
          {lang.toUpperCase()}
        </button>
      </div>
    </div>
  );
}
