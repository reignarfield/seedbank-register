import React, { useMemo, useState } from "react";
import { CheckSquare, Square, MessageCircle, Pencil } from "lucide-react";
import { Card } from "./ui";
import { todayStr, addDays, formatDate } from "../lib/dates";
import EditChecklistModal from "./EditChecklistModal";

const cleanPhone = (p) => (p || "").replace(/[^0-9+]/g, "");

// Ticks are day-scoped so they reset naturally each morning, but survive an
// accidental reload mid-morning (phone backgrounding, low memory) instead of
// silently losing progress he already made loading the van.
const checklistStorageKey = () => `tydie_checklist_${todayStr()}`;
function loadChecked() {
  try {
    const raw = localStorage.getItem(checklistStorageKey());
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

// One compact card covering the two things he actually does each morning/
// evening: check what he needs to pack, and confirm tomorrow's jobs by text.
// Only renders when there's something to show, and stays out of the way otherwise.
// `checklist` is what's displayed/ticked (may include today's job-type
// extras); `baseChecklist` (defaults to `checklist`) is what the pencil
// edits - always the permanent "always bring these" list, never today's
// temporary extras, so editing never accidentally saves job-specific items
// into the everyday list.
export default function MorningCheck({ jobs, customers, checklist, baseChecklist, onSaveChecklist }) {
  const [checked, setChecked] = useState(loadChecked);
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
      try {
        localStorage.setItem(checklistStorageKey(), JSON.stringify([...next]));
      } catch {
        // best-effort - a full/blocked localStorage shouldn't break ticking
      }
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

      {editing && <EditChecklistModal items={baseChecklist ?? checklist} onCancel={() => setEditing(false)} onSave={saveChecklist} />}
    </Card>
  );
}
