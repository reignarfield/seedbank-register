import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { todayStr, addDays, formatDate } from "../lib/dates";

// A month at a glance, for "which Thursday is free". Each day shows how
// many jobs it holds; tapping a day lists them below and offers to book on
// that day. It's a picker, not a second schedule.

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function monthStart(dateStr) {
  return dateStr.slice(0, 8) + "01";
}
function addMonths(dateStr, n) {
  const [y, m] = dateStr.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function monthLabel(dateStr) {
  const [y, m] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}

export default function MonthView({ jobs, customers, selected, onSelect, onBook }) {
  const today = todayStr();
  const [cursor, setCursor] = useState(monthStart(selected || today));

  const cells = useMemo(() => {
    const [y, m] = cursor.split("-").map(Number);
    const first = new Date(y, m - 1, 1);
    const lead = (first.getDay() + 6) % 7; // Monday-first
    const days = new Date(y, m, 0).getDate();
    const out = [];
    for (let i = 0; i < lead; i++) out.push(null);
    for (let d = 1; d <= days; d++) out.push(`${cursor.slice(0, 8)}${String(d).padStart(2, "0")}`);
    while (out.length % 7) out.push(null);
    return out;
  }, [cursor]);

  const countByDay = useMemo(() => {
    const m = new Map();
    for (const j of jobs) if (j.status === "scheduled") m.set(j.scheduled_date, (m.get(j.scheduled_date) || 0) + 1);
    return m;
  }, [jobs]);

  const dayJobs = useMemo(() => (selected ? jobs.filter((j) => j.status === "scheduled" && j.scheduled_date === selected) : []), [jobs, selected]);
  const nameOf = (id) => customers.find((c) => c.id === id)?.name || "Unknown";

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setCursor(addMonths(cursor, -1))} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Previous month"><ChevronLeft size={18} /></button>
        <div className="font-semibold text-slate-900">{monthLabel(cursor)}</div>
        <button onClick={() => setCursor(addMonths(cursor, 1))} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Next month"><ChevronRight size={18} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {DOW.map((d) => <div key={d} className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 py-1">{d}</div>)}
        {cells.map((d, i) =>
          d ? (
            <button
              key={d}
              onClick={() => onSelect(d === selected ? null : d)}
              className={`relative aspect-square rounded-lg text-sm flex flex-col items-center justify-center border transition-colors ${
                d === selected ? "bg-blue-600 text-white border-blue-600" : d === today ? "border-blue-300 text-slate-900 bg-white" : d < today ? "border-transparent text-slate-400" : "border-slate-200 bg-white text-slate-800 hover:border-blue-300"
              }`}
            >
              <span className="tabular-nums">{Number(d.slice(8))}</span>
              {countByDay.get(d) > 0 && (
                <span className={`mt-0.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-semibold flex items-center justify-center ${d === selected ? "bg-white/25 text-white" : "bg-blue-100 text-blue-700"}`}>{countByDay.get(d)}</span>
              )}
            </button>
          ) : (
            <div key={`e${i}`} />
          )
        )}
      </div>

      {selected && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{selected === today ? "Today" : selected === addDays(today, 1) ? "Tomorrow" : formatDate(selected)}</div>
            <button onClick={() => onBook(selected)} className="text-xs font-medium text-blue-600 hover:underline">+ Book on this day</button>
          </div>
          {dayJobs.length === 0 ? (
            <p className="text-sm text-slate-400">Nothing booked.</p>
          ) : (
            <ul className="space-y-1">
              {dayJobs.map((j) => (
                <li key={j.id} className="text-sm text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 flex justify-between gap-2">
                  <span className="truncate">{nameOf(j.customer_id)}</span>
                  <span className="text-slate-400 shrink-0">{j.scheduled_time ? String(j.scheduled_time).slice(0, 5) : ""}{j.job_type ? ` · ${j.job_type}` : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
