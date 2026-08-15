import React from "react";
import { LayoutDashboard, Users, CalendarDays, Receipt, Inbox, Car, Globe, Wrench, LogOut, Zap } from "lucide-react";

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "customers", label: "Customers", icon: Users },
  { id: "schedule", label: "Schedule", icon: CalendarDays },
  { id: "billing", label: "Billing", icon: Receipt },
  { id: "mileage", label: "Mileage", icon: Car },
  { id: "leads", label: "Leads", icon: Inbox },
  { id: "customerpage", label: "Customer Page", icon: Globe },
  { id: "dev", label: "Dev", icon: Wrench },
];

export default function NavBar({ view, setView, onGoSimple, onLogout, leadBadge, demoMode, onExitDemo }) {
  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 overflow-hidden">
              <img src="/tydie-icon-48.png" alt="" width={36} height={36} className="w-full h-full object-cover" />
            </div>
            <div className="leading-tight whitespace-nowrap">
              <div className="font-semibold text-lg text-slate-900 tracking-tight">Tydie Cleaning</div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400 -mt-0.5">Job Manager</div>
            </div>
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
              {TABS.map((t) => {
                const Icon = t.icon;
                const active = view === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setView(t.id)}
                    className={`relative flex items-center gap-1.5 px-3 lg:px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
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
            <button
              onClick={onGoSimple}
              title="Back to Today"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-slate-500 hover:text-blue-700 transition-colors"
            >
              <Zap size={14} strokeWidth={2.25} />
              <span className="hidden sm:inline">Today</span>
            </button>
            <button
              onClick={onLogout}
              title="Sign out"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-slate-500 hover:text-blue-700 transition-colors"
            >
              <LogOut size={14} strokeWidth={2.25} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
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
