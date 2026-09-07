import React, { useMemo, useState } from "react";
import { ListChecks, AlarmClock, Check, ChevronDown, ChevronUp, X } from "lucide-react";
import { Card, Button } from "./ui";
import { SNOOZE, snoozeUntil } from "../lib/todo";
import { formatDate } from "../lib/dates";

// "Needs you" - the app's suggestions, each with one obvious action. The app
// never sends anything itself: "Text" opens his messages app with the words
// already written, and only after that tap does it note that he did it.
// Snooze is the same four choices every time.

const KIND_TONE = {
  chase: "text-rose-700",
  confirm: "text-blue-700",
  book_overdue: "text-amber-700",
  reply: "text-blue-700",
  invoice: "text-amber-700",
  book_quote: "text-slate-700",
  book_soon: "text-slate-700",
  reach: "text-slate-600",
  renewal: "text-slate-600",
};

function SnoozeMenu({ onPick, onDismiss, onClose }) {
  return (
    <div className="absolute right-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-lg w-44 py-1" onClick={(e) => e.stopPropagation()}>
      {SNOOZE.map((s) => (
        <button key={s.days} onClick={() => onPick(s.days)} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
          {s.label} <span className="text-xs text-slate-400">· {formatDate(snoozeUntil(s.days))}</span>
        </button>
      ))}
      <div className="border-t border-slate-100 my-1" />
      <button onClick={onDismiss} className="w-full text-left px-3 py-2 text-sm text-slate-500 hover:bg-slate-50">Don't remind me</button>
      <button onClick={onClose} className="w-full text-left px-3 py-2 text-xs text-slate-400 hover:bg-slate-50">Cancel</button>
    </div>
  );
}

function Row({ item, onAction, onSnooze, onDismiss, onDone }) {
  const [menu, setMenu] = useState(false);
  const p = item.primary;
  const s = item.secondary;

  const ActionEl = ({ a, primary }) => {
    if (!a) return null;
    const cls = primary
      ? "bg-blue-600 hover:bg-blue-700 text-white"
      : "bg-slate-100 hover:bg-slate-200 text-slate-700";
    const base = `text-xs font-medium px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${cls} ${a.disabled ? "opacity-50 pointer-events-none" : ""}`;
    if (a.href) {
      return (
        <a href={a.href} className={base} onClick={() => onDone(item, a)}>
          {a.label}
        </a>
      );
    }
    return (
      <button className={base} onClick={() => onAction(item, a)}>
        {a.label}
      </button>
    );
  };

  return (
    <div className="px-4 py-3 relative">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className={`text-sm font-medium ${KIND_TONE[item.kind] || "text-slate-800"}`}>{item.title}</div>
          <div className="text-xs text-slate-500 mt-0.5">{item.why}</div>
        </div>
        <div className="relative shrink-0">
          <button onClick={() => setMenu((m) => !m)} title="Snooze" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <AlarmClock size={15} />
          </button>
          {menu && <SnoozeMenu onPick={(d) => { setMenu(false); onSnooze(item, d); }} onDismiss={() => { setMenu(false); onDismiss(item); }} onClose={() => setMenu(false)} />}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2.5">
        <ActionEl a={p} primary />
        {s && <ActionEl a={s} />}
      </div>
    </div>
  );
}

export default function TodoList({ items, onAction, onSnooze, onDismiss, onDone, initial = 4 }) {
  const [showAll, setShowAll] = useState(false);
  if (items.length === 0) return null;
  const shown = showAll ? items : items.slice(0, initial);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700 flex items-center gap-1.5">
          <ListChecks size={13} /> Needs you · {items.length}
        </div>
        {items.length > initial && (
          <button onClick={() => setShowAll((s) => !s)} className="text-xs text-slate-500 hover:text-blue-700 flex items-center gap-1">
            {showAll ? <>Fewer <ChevronUp size={12} /></> : <>All {items.length} <ChevronDown size={12} /></>}
          </button>
        )}
      </div>
      <Card className="divide-y divide-slate-100">
        {shown.map((it) => (
          <Row key={it.key} item={it} onAction={onAction} onSnooze={onSnooze} onDismiss={onDismiss} onDone={onDone} />
        ))}
      </Card>
    </div>
  );
}
