import React, { useState } from "react";
import { Plus, Trash2, Repeat } from "lucide-react";
import { Button, Field, TextInput, Select } from "./ui";
import { PRICE_GROUPS } from "../lib/pricing";
import { formatDate, addWeeks } from "../lib/dates";

// The regular services one customer has - each on its own cycle with its
// own last-done date and usual price. Lives inside the customer record.

const FREQ = [
  { value: 2, label: "Every 2 weeks" },
  { value: 4, label: "Every 4 weeks" },
  { value: 6, label: "Every 6 weeks" },
  { value: 8, label: "Every 8 weeks" },
  { value: 12, label: "Every 12 weeks" },
  { value: 26, label: "Every 6 months" },
  { value: 52, label: "Once a year" },
];

export default function ServicesEditor({ customerId, services, onSave, onRemove }) {
  const [adding, setAdding] = useState(null); // { service, frequency_weeks, last_done, price }
  const mine = services.filter((s) => s.customer_id === customerId && !s.archived_at);

  const save = async () => {
    if (!adding?.service || !adding.frequency_weeks) return;
    await onSave({
      customer_id: customerId,
      service: adding.service,
      frequency_weeks: Number(adding.frequency_weeks),
      last_done: adding.last_done || null,
      price: adding.price === "" || adding.price == null ? null : Number(adding.price),
    });
    setAdding(null);
  };

  return (
    <div>
      <div className="text-sm text-slate-600 mb-1 flex items-center gap-1.5"><Repeat size={13} /> Regular services</div>
      {mine.length === 0 && !adding && <p className="text-xs text-slate-400 mb-1">None yet - a one-off customer. Add one to be reminded when they're due.</p>}
      <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
        {mine.map((s) => {
          const due = s.last_done ? addWeeks(s.last_done, s.frequency_weeks) : null;
          return (
            <div key={s.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <div className="text-sm text-slate-800">{s.service}{s.price != null ? <span className="text-slate-400"> · ${Number(s.price).toFixed(0)}</span> : null}</div>
                <div className="text-xs text-slate-500">{FREQ.find((f) => f.value === s.frequency_weeks)?.label || `Every ${s.frequency_weeks} weeks`}{due ? ` · next ${formatDate(due)}` : " · never done yet"}</div>
              </div>
              <button type="button" onClick={() => onRemove(s)} className="text-slate-300 hover:text-rose-600 shrink-0" title="Stop this regular service"><Trash2 size={14} /></button>
            </div>
          );
        })}
      </div>
      {adding ? (
        <div className="mt-2 border border-blue-100 bg-blue-50/50 rounded-lg p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Service">
              <Select value={adding.service} onChange={(e) => setAdding({ ...adding, service: e.target.value })}>
                <option value="">— pick —</option>
                {PRICE_GROUPS.map((g) => <option key={g.title} value={g.title}>{g.title}</option>)}
              </Select>
            </Field>
            <Field label="How often">
              <Select value={adding.frequency_weeks} onChange={(e) => setAdding({ ...adding, frequency_weeks: e.target.value })}>
                {FREQ.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </Select>
            </Field>
            <Field label="Last done">
              <TextInput type="date" value={adding.last_done} onChange={(e) => setAdding({ ...adding, last_done: e.target.value })} />
            </Field>
            <Field label="Usual price">
              <TextInput type="number" inputMode="decimal" value={adding.price} onChange={(e) => setAdding({ ...adding, price: e.target.value })} placeholder="0" />
            </Field>
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={() => setAdding(null)}>Cancel</Button>
            <Button type="button" className="!px-3 !py-1.5 !text-xs" onClick={save} disabled={!adding.service}>Add</Button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding({ service: "", frequency_weeks: 8, last_done: "", price: "" })} className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline mt-2">
          <Plus size={12} /> Add a regular service
        </button>
      )}
    </div>
  );
}
