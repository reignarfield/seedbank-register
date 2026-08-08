import React, { useState } from "react";
import { X, Loader2, Plus, Trash2 } from "lucide-react";
import { Button, TextInput } from "./ui";

// Generic add/remove-item list editor, used for both the base "before you
// go" checklist and each job type's extra kit list.
export default function EditChecklistModal({ title = "Kit checklist", items, onCancel, onSave }) {
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
          <h2 className="font-semibold text-lg text-slate-900">{title}</h2>
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
