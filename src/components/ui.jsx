import React from "react";

export function Card({ children, className = "" }) {
  return <div className={`bg-white border border-slate-200 rounded-xl ${className}`}>{children}</div>;
}

export function SectionTitle({ children, action }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">{children}</h2>
      {action}
    </div>
  );
}

export function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm text-slate-600 mb-1">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </label>
      {children}
    </div>
  );
}

const inputBase =
  "w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500";

export function TextInput(props) {
  return <input {...props} className={`${inputBase} ${props.className || ""}`} />;
}

export function Select(props) {
  return <select {...props} className={`${inputBase} ${props.className || ""}`} />;
}

export function TextArea(props) {
  return <textarea {...props} className={`${inputBase} resize-none ${props.className || ""}`} />;
}

export function Button({ variant = "primary", className = "", ...props }) {
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50",
    secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200",
    ghost: "text-slate-600 hover:bg-slate-100",
    danger: "text-rose-600 hover:bg-rose-50",
  };
  return (
    <button
      {...props}
      className={`flex items-center justify-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    />
  );
}

const STATUS_STYLES = {
  // job / general
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-slate-100 text-slate-500 border-slate-200",
  // customer
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  paused: "bg-amber-50 text-amber-700 border-amber-200",
  inactive: "bg-slate-100 text-slate-500 border-slate-200",
  // due status
  overdue: "bg-rose-50 text-rose-700 border-rose-200",
  due_soon: "bg-amber-50 text-amber-700 border-amber-200",
  // quotes
  draft: "bg-slate-100 text-slate-600 border-slate-200",
  sent: "bg-blue-50 text-blue-700 border-blue-200",
  accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  declined: "bg-rose-50 text-rose-700 border-rose-200",
  // invoices
  unpaid: "bg-amber-50 text-amber-700 border-amber-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  // leads
  new: "bg-blue-50 text-blue-700 border-blue-200",
  contacted: "bg-amber-50 text-amber-700 border-amber-200",
  quoted: "bg-violet-50 text-violet-700 border-violet-200",
  won: "bg-emerald-50 text-emerald-700 border-emerald-200",
  lost: "bg-slate-100 text-slate-500 border-slate-200",
};

const STATUS_LABELS = {
  due_soon: "Due soon",
};

export function StatusPill({ status }) {
  if (!status) return null;
  const style = STATUS_STYLES[status] || "bg-slate-100 text-slate-600 border-slate-200";
  const label = STATUS_LABELS[status] || status.charAt(0).toUpperCase() + status.slice(1);
  return <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${style}`}>{label}</span>;
}

export function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="text-center py-16 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
      {Icon && <Icon size={28} className="mx-auto text-slate-300 mb-3" />}
      <p className="text-sm text-slate-500">{title}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
    </div>
  );
}

// The one primary action of a screen. On a phone it's pinned just above the
// tab bar, in the thumb zone; on a desktop it sits in the flow, right-aligned.
export function PrimaryBar({ children }) {
  return (
    <div className="fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] z-20 px-4 pb-3 pt-6 bg-gradient-to-t from-slate-50 via-slate-50/90 to-transparent pointer-events-none md:static md:p-0 md:bg-none md:mt-5">
      <div className="max-w-6xl mx-auto pointer-events-auto md:flex md:justify-end">{children}</div>
    </div>
  );
}

export function money(amount) {
  const n = typeof amount === "number" ? amount : parseFloat(amount);
  if (isNaN(n)) return "$0.00";
  return n.toLocaleString("en-AU", { style: "currency", currency: "AUD" });
}
