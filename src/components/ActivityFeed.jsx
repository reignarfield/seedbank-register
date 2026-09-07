import React, { useMemo, useState } from "react";
import { Check, Receipt, Car, CalendarClock, StickyNote, Ban, Undo2, X, Sparkles, ChevronRight } from "lucide-react";
import { Card, Button, EmptyState } from "./ui";
import { todayStr } from "../lib/dates";

// Everything the app did on its own, in one list, newest first, each
// reversible where it safely can be. This is the trust mechanism: automation
// you can see and undo is automation that stays switched on.

const ICONS = {
  job_completed: Check,
  invoice_raised: Receipt,
  trip_logged: Car,
  job_rescheduled: CalendarClock,
  job_cancelled: Ban,
  note_added: StickyNote,
};

function timeAgo(iso) {
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function Row({ item, onUndo }) {
  const Icon = ICONS[item.kind] || Sparkles;
  const [busy, setBusy] = useState(false);
  const undone = !!item.undone_at;
  const canUndo = !!item.undo && !undone && onUndo;

  const undo = async () => {
    if (!confirm("Undo this? It'll be put back the way it was.")) return;
    setBusy(true);
    try {
      await onUndo(item);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`flex items-start gap-3 px-4 py-3 ${undone ? "opacity-50" : ""}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.actor === "app" ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500"}`}>
        <Icon size={15} />
      </div>
      <div className="min-w-0 flex-1">
        <div className={`text-sm text-slate-800 ${undone ? "line-through" : ""}`}>{item.summary}</div>
        <div className="text-xs text-slate-400 mt-0.5">
          {timeAgo(item.occurred_at)}
          {item.actor === "app" ? " · automatic" : ""}
          {undone ? " · undone" : ""}
        </div>
      </div>
      {canUndo && (
        <button onClick={undo} disabled={busy} className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-blue-700 shrink-0 disabled:opacity-50">
          <Undo2 size={13} /> Undo
        </button>
      )}
    </div>
  );
}

export default function ActivityFeed({ activity, onUndo, limit }) {
  const items = limit ? activity.slice(0, limit) : activity;
  if (items.length === 0) {
    return <EmptyState icon={Sparkles} title="Nothing yet." subtitle="When the app does something on its own - raises an invoice, logs a drive - it shows up here." />;
  }
  return (
    <Card className="divide-y divide-slate-100">
      {items.map((a) => (
        <Row key={a.id} item={a} onUndo={onUndo} />
      ))}
    </Card>
  );
}

// The quiet line on Today: "3 things happened today" - tap to see them.
export function ActivityTodayLine({ activity, onUndo }) {
  const [open, setOpen] = useState(false);
  const todays = useMemo(() => activity.filter((a) => a.occurred_at.slice(0, 10) === todayStr()), [activity]);
  if (todays.length === 0) return null;
  const auto = todays.filter((a) => a.actor === "app" && !a.undone_at).length;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-between w-full text-sm text-slate-500 hover:text-blue-700 border border-slate-200 rounded-xl px-4 py-2.5 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Sparkles size={14} className="text-blue-500" />
          {auto === 0 ? `${todays.length} thing${todays.length === 1 ? "" : "s"} happened today` : `The app did ${auto} thing${auto === 1 ? "" : "s"} for you today`}
        </span>
        <ChevronRight size={15} />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/30 px-4 py-6 overflow-y-auto" onClick={() => setOpen(false)}>
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-lg text-slate-900">Today's activity</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="p-3">
              <ActivityFeed activity={todays} onUndo={onUndo} />
            </div>
            <div className="px-5 pb-4">
              <Button variant="secondary" className="w-full" onClick={() => setOpen(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
