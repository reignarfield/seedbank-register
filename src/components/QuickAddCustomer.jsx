import React, { useState } from "react";
import { X, Loader2, UserPlus } from "lucide-react";
import { Button, Field, TextInput } from "./ui";
import { BUSINESS } from "../lib/business";

// Someone new rings while he's in the van. Three fields, done. Everything
// else about them - frequency, access notes, email - can be filled in later
// from the Customers tab, at a desk. Optionally hands straight on to booking
// their first job so the call ends with a date in the diary.

export default function QuickAddCustomer({ onCancel, onSave, thenBook = true, title }) {
  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const [book, setBook] = useState(thenBook);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSave = form.name.trim().length > 0;

  const save = async () => {
    setSaving(true);
    try {
      await onSave({ name: form.name.trim(), phone: form.phone.trim(), address: form.address.trim(), email: "", notes: "", access_notes: "", frequency_weeks: null, last_service_date: null, status: "active" }, { book });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 px-4 py-6" onClick={onCancel}>
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-lg text-slate-900 flex items-center gap-2"><UserPlus size={18} className="text-blue-600" /> {title || "Someone new"}</h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <Field label="Name" required>
            <TextInput value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Who is it?" autoFocus className="!text-base !py-3" />
          </Field>
          <Field label="Phone">
            <TextInput type="tel" inputMode="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="04xx xxx xxx" className="!text-base !py-3" />
          </Field>
          <Field label="Address">
            <TextInput value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Street, suburb" className="!text-base !py-3" />
          </Field>
          <label className="flex items-center gap-2.5 text-sm text-slate-700 pt-1">
            <input type="checkbox" checked={book} onChange={(e) => setBook(e.target.checked)} className="w-4 h-4 accent-blue-600" />
            Book their first {BUSINESS.vocab.job} now
          </label>
          <p className="text-xs text-slate-400">Everything else - how often, gate codes, email - can be added later from Customers.</p>
        </div>
        <div className="flex items-center gap-2 px-5 py-4 border-t border-slate-100">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>Cancel</Button>
          <Button className="flex-1 !py-3" onClick={save} disabled={!canSave || saving}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : null} {book ? "Add & book" : "Add"}
          </Button>
        </div>
      </div>
    </div>
  );
}
