import React from "react";
import { Droplets, LayoutDashboard, Users, CalendarDays, Receipt, Inbox, Wrench, LogIn, LogOut } from "lucide-react";

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "customers", label: "Customers", icon: Users },
  { id: "schedule", label: "Schedule", icon: CalendarDays },
  { id: "billing", label: "Billing", icon: Receipt },
  { id: "leads", label: "Leads", icon: Inbox },
  { id: "dev", label: "Dev", icon: Wrench },
];

export default function NavBar({ view, setView, session, onLoginClick, onLogout, leadBadge }) {
  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
              <Droplets size={18} className="text-white" strokeWidth={2.25} />
            </div>
            <div className="leading-tight">
              <div className="font-semibold text-lg text-slate-900 tracking-tight">Clear View</div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400 -mt-0.5">Job Manager</div>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1 bg-slate-100 rounded-full p-1">
              {TABS.map((t) => {
                const Icon = t.icon;
                const active = view === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setView(t.id)}
                    className={`relative flex items-center gap-1.5 px-3 lg:px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      active ? "bg-blue-600 text-white" : "text-slate-500 hover:text-blue-700"
                    }`}
                  >
                    <Icon size={14} strokeWidth={2.25} />
                    <span className="hidden lg:inline">{t.label}</span>
                    {t.id === "leads" && leadBadge > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-semibold">
                        {leadBadge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {session ? (
              <button
                onClick={onLogout}
                title="Sign out"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-slate-500 hover:text-blue-700 transition-colors"
              >
                <LogOut size={14} strokeWidth={2.25} />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            ) : (
              <button
                onClick={onLoginClick}
                title="Sign in"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-slate-500 hover:text-blue-700 transition-colors"
              >
                <LogIn size={14} strokeWidth={2.25} />
                <span className="hidden sm:inline">Sign in</span>
              </button>
            )}
          </nav>
        </div>
        <div className="md:hidden flex items-center gap-1 bg-slate-100 rounded-full p-1 mb-3 overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = view === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setView(t.id)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors shrink-0 ${
                  active ? "bg-blue-600 text-white" : "text-slate-500"
                }`}
              >
                <Icon size={14} strokeWidth={2.25} />
                {t.label}
                {t.id === "leads" && leadBadge > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-semibold">
                    {leadBadge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
