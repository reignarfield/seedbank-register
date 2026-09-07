import React, { useState } from "react";
import { Phone, Check, Clock, Send, ChevronRight, ListTodo, Loader2 } from "lucide-react";
import { Card, Button } from "./ui";
import { SNOOZE_CHOICES, snoozeUntil } from "../lib/nudges";

// HANDOFF 2/4 - "worth doing" on the Today screen.
//
// The one screen Tyson lives on already tells him what's booked. This tells
// him what isn't: the lead nobody rang back, the regular who is a fortnight
// past due with nothing in the diary, the invoice three weeks late.
//
// Every item offers the same three answers, because a list you can't answer
// is a list you scroll past:
//
//   Call        - the phone number, one tap, no screen in between.
//   Did it      - gone, until the underlying facts change.
//   Not now     - gone until tomorrow / 3 days / next week / a month.
//
// Items that would send a customer an email have a fourth, "Send it", and
// that is the only way such an email ever goes out. Nothing here is on a
// timer and nothing leaves in his name that he didn't press.

const KIND_TONE = {
  lead: "border-blue-200 bg-blue-50/40",
  invoice: "border-amber-200 bg-amber-50/40",
  rebook: "",
  quote: "",
  lapsed: "",
};

function NudgeRow({ nudge, onDone, onSnooze, onSend, onOpen, busy }) {
  const [snoozing, setSnoozing] = useState(false);
  const approved = nudge.state?.approved_send_at;

  return (
    <div className={`rounded-xl border px-3.5 py-3 ${KIND_TONE[nudge.kind] || "border-slate-200 bg-white"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">{nudge.title}</div>
          <div className="text-xs text-slate-600 mt-0.5">{nudge.detail}</div>
        </div>
        {busy && <Loader2 size={14} className="animate-spin text-slate-400 shrink-0 mt-1" />}
      </div>

      {snoozing ? (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {SNOOZE_CHOICES.map((c) => (
            <button
              key={c.days}
              onClick={() => {
                setSnoozing(false);
                onSnooze(c.days);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:border-blue-300 hover:text-blue-700"
            >
              {c.label}
            </button>
          ))}
          <button onClick={() => setSnoozing(false)} className="px-2 py-1.5 text-xs text-slate-400 hover:text-slate-600">
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
          {nudge.phone && (
            <a
              href={`tel:${nudge.phone.replace(/\s+/g, "")}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
            >
              <Phone size={13} /> Call
            </a>
          )}
          {nudge.sendable && !approved && (
            <button
              onClick={onSend}
              disabled={busy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-white text-xs font-semibold text-blue-700 hover:border-blue-400 disabled:opacity-50"
              title={`Sends the ${nudge.sendable.what} to ${nudge.sendable.to}`}
            >
              <Send size={13} /> Send it
            </button>
          )}
          {approved && (
            <span className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-700">
              <Send size={12} /> {nudge.state?.sent_at ? "Sent" : "Sending tonight"}
            </span>
          )}
          <button
            onClick={onDone}
            disabled={busy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:border-slate-300 disabled:opacity-50"
          >
            <Check size={13} /> Did it
          </button>
          <button
            onClick={() => setSnoozing(true)}
            disabled={busy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-500 hover:border-slate-300 disabled:opacity-50"
          >
            <Clock size={13} /> Not now
          </button>
          {nudge.goto && (
            <button onClick={() => onOpen(nudge.goto)} className="ml-auto flex items-center gap-0.5 text-xs text-slate-400 hover:text-blue-700">
              Open <ChevronRight size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function TodoList({ nudges, onDone, onSnooze, onApproveSend, onOpen }) {
  const [busyKey, setBusyKey] = useState(null);

  if (!nudges.length) return null;

  // Every action is the same shape: write one row, let the parent reload.
  const run = async (key, fn) => {
    setBusyKey(key);
    try {
      await fn();
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 mb-2">
        <ListTodo size={13} /> Worth doing
      </div>
      <div className="space-y-2">
        {nudges.map((n) => (
          <NudgeRow
            key={n.key}
            nudge={n}
            busy={busyKey === n.key}
            onOpen={onOpen}
            onDone={() => run(n.key, () => onDone(n))}
            onSnooze={(days) => run(n.key, () => onSnooze(n, snoozeUntil(days)))}
            onSend={() => run(n.key, () => onApproveSend(n))}
          />
        ))}
      </div>
    </div>
  );
}
