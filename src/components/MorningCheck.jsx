import React, { useMemo, useState } from "react";
import { CheckSquare, Square, MessageCircle, Pencil, X, Loader2, Plus, Trash2 } from "lucide-react";
import { Card, Button, TextInput } from "./ui";
import { todayStr, addDays, formatDate } from "../lib/dates";

const cleanPhone = (p) => (p || "").replace(/[^0-9+]/g, "");

function EditChecklistModal({ items, onCancel, onSave }) {
  const [list, setList] = useState(items.length ? items : [""]);
  const [saving, setSaving] = useState(false);

  const setItem = (i, val) => setList((prev) => prev.map((x, idx) => (idx === i ? val : x)));
  const removeItem = (i) => setList((prev) => prev.filter((_, idx) => idx !== i));
  const addItem = () => setList((prev) => [...prev, ""]);

  const save = async () => {
    setSaving(true);
    try {
      await onSave(list.map((x) => x.trim()).filter(Boolean));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/30 px-4 py-6 overflow-y-auto" onClick={onCancel}>
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-lg text-slate-900">Kit checklist</h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="px-5 py-4 space-y-2">
          {list.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <TextInput value={item} onChange={(e) => setItem(i, e.target.value)} placeholder="e.g. Squeegees" />
              <button onClick={() => removeItem(i)} className="text-slate-300 hover:text-rose-500 shrink-0"><Trash2 size={16} /></button>
            </div>
          ))}
          <button onClick={addItem} className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline pt-1">
            <Plus size={14} /> Add item
          </button>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : null} Save
          </Button>
        </div>
      </div>
    </div>
  );
}

// One compact card covering the two things he actually does each morning/
// evening: check what he needs to pack, and confirm tomorrow's jobs by text.
// Only renders when there's something to show, and stays out of the way otherwise.
export default function MorningCheck({ jobs, customers, checklist, onSaveChecklist }) {
  const [checked, setChecked] = useState(() => new Set());
  const [editing, setEditing] = useState(false);

  const today = todayStr();
  const tomorrow = addDays(today, 1);
  const customerById = (id) => customers.find((c) => c.id === id);

  const todaysJobs = useMemo(() => jobs.filter((j) => j.status === "scheduled" && j.scheduled_date === today), [jobs, today]);
  const tomorrowsJobs = useMemo(() => jobs.filter((j) => j.status === "scheduled" && j.scheduled_date === tomorrow), [jobs, tomorrow]);

  const toggle = (item) =>
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(item) ? next.delete(item) : next.add(item);
      return next;
    });

  const saveChecklist = async (items) => {
    await onSaveChecklist(items);
    setEditing(false);
  };

  if (todaysJobs.length === 0 && tomorrowsJobs.length === 0) return null;

  return (
    <Card className="p-4 sm:p-5 mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {todaysJobs.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Before you go</span>
              <button onClick={() => setEditing(true)} title="Edit checklist" className="text-slate-300 hover:text-slate-500">
                <Pencil size={13} />
              </button>
            </div>
            {checklist.length === 0 ? (
              <p className="text-sm text-slate-400">No checklist set — tap the pencil to add items.</p>
            ) : (
              <div className="space-y-1.5">
                {checklist.map((item) => {
                  const done = checked.has(item);
                  return (
                    <button key={item} onClick={() => toggle(item)} className="flex items-center gap-2 text-sm w-full text-left">
                      {done ? <CheckSquare size={16} className="text-emerald-600 shrink-0" /> : <Square size={16} className="text-slate-300 shrink-0" />}
                      <span className={done ? "text-slate-400 line-through" : "text-slate-700"}>{item}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tomorrowsJobs.length > 0 && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700 mb-2">Confirm tomorrow</div>
            <div className="space-y-1.5">
              {tomorrowsJobs.map((j) => {
                const c = customerById(j.customer_id);
                if (!c) return null;
                return (
                  <div key={j.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-slate-700 truncate">{c.name}</span>
                    {c.phone ? (
                      <a href={`sms:${cleanPhone(c.phone)}`} className="flex items-center gap-1 text-blue-600 shrink-0 text-xs font-medium">
                        <MessageCircle size={13} /> Text
                      </a>
                    ) : (
                      <span className="text-xs text-slate-300 shrink-0">No phone</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {editing && <EditChecklistModal items={checklist} onCancel={() => setEditing(false)} onSave={saveChecklist} />}
    </Card>
  );
}
