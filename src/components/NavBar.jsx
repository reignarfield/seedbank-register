import React from "react";
import { Zap, CalendarDays, Users, Wallet, Settings as SettingsIcon, FlaskConical } from "lucide-react";
import { BUSINESS } from "../lib/business";

// One app, five destinations. On a phone they sit along the bottom, in the
// thumb zone, where Apple's and Google's guidelines both put primary
// navigation; on a desktop the same five sit in the top bar. Nothing else is
// a tab: the builder tools live under Settings, sign-out is the last row
// there, and the Today screen is simply the first tab rather than a separate
// "mode".

export const TABS = [
  { id: "today", label: "Today", icon: Zap },
  { id: "schedule", label: "Schedule", icon: CalendarDays },
  { id: "customers", label: "Customers", icon: Users },
  { id: "money", label: "Money", icon: Wallet },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

// Screens reached from Settings highlight the Settings tab.
const PARENT = { usage: "settings", dev: "settings", customerpage: "settings" };

export default function NavBar({ view, setView, demoMode, onEnterDemo, onExitDemo, enquiryBadge = 0 }) {
  const active = PARENT[view] || view;

  const Tab = ({ t, bottom }) => {
    const Icon = t.icon;
    const on = active === t.id;
    const badge = t.id === "customers" && enquiryBadge > 0 ? enquiryBadge : 0;
    return (
      <button
        onClick={() => setView(t.id)}
        aria-label={t.label}
        aria-current={on ? "page" : undefined}
        className={
          bottom
            ? `relative flex flex-col items-center justify-center gap-0.5 min-h-[56px] flex-1 text-[11px] font-semibold transition-colors ${on ? "text-blue-700" : "text-slate-500"}`
            : `relative flex items-center gap-1.5 px-3 lg:px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${on ? "bg-blue-600 text-white" : "text-slate-500 hover:text-blue-700"}`
        }
      >
        <Icon size={bottom ? 22 : 14} strokeWidth={bottom ? (on ? 2.5 : 2) : 2.25} />
        <span className={bottom ? "" : "hidden lg:inline"}>{t.label}</span>
        {badge > 0 && (
          <span className={`absolute ${bottom ? "top-1.5 right-[22%]" : "-top-1 -right-1"} min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-semibold`}>
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <>
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 md:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 overflow-hidden">
              <img src="/tydie-icon-48.png" alt="" width={36} height={36} className="w-full h-full object-cover" />
            </div>
            <div className="font-semibold text-lg text-slate-900 tracking-tight whitespace-nowrap truncate">{BUSINESS.name}</div>
            {demoMode && (
              <button
                onClick={onExitDemo}
                title="Showing demo data - tap to go back to real data"
                className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold rounded-full px-2 py-0.5 transition-colors"
              >
                DEMO
              </button>
            )}
          </div>
          <nav className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1 bg-slate-100 rounded-full p-1">
              {TABS.map((t) => <Tab key={t.id} t={t} />)}
            </div>
            {!demoMode && (
              <button
                onClick={onEnterDemo}
                title="Switch to a sample business to explore or show the app - nothing real is touched"
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-full text-sm font-medium text-slate-400 hover:text-amber-600 transition-colors"
              >
                <FlaskConical size={14} strokeWidth={2.25} />
                <span className="hidden sm:inline">Demo</span>
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* The bottom bar: phones only. Safe-area padding for phones with a home indicator. */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 pb-[env(safe-area-inset-bottom)]" aria-label="Main">
        <div className="flex">
          {TABS.map((t) => <Tab key={t.id} t={t} bottom />)}
        </div>
      </nav>
    </>
  );
}
