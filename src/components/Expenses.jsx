import React, { useEffect, useMemo, useState } from "react";
import { Plus, Receipt, Loader2, X, Archive, Camera, Package, ImageIcon } from "lucide-react";
import { Card, Field, TextInput, Select, TextArea, Button, EmptyState, money } from "./ui";
import { formatDate, todayStr } from "../lib/dates";
import { uploadReceipt, receiptUrl } from "../lib/api";

const CATEGORIES = [
  { value: "fuel", label: "Fuel" },
  { value: "supplies", label: "Supplies" },
  { value: "equipment", label: "Equipment" },
  { value: "insurance", label: "Insurance" },
  { value: "vehicle", label: "Vehicle" },
  { value: "software", label: "Software" },
  { value: "other", label: "Other" },
];

function categoryLabel(value) {
  return CATEGORIES.find((c) => c.value === value)?.label || value;
}

function emptyExpense() {
  return { expense_date: todayStr(), category: "other", amount: "", note: "", receipt_path: null, gst_amount: "", is_asset: false };
}

// The receipt is the habit that turns a claim into a real one: the ATO wants
// written evidence once work expenses pass $300, and a photo counts. So the
// camera is the first thing on the form, not a field at the bottom.
function ReceiptField({ path, onChange }) {
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    if (path) receiptUrl(path).then((u) => live && setPreview(u)).catch(() => {});
    else setPreview(null);
    return () => { live = false; };
  }, [path]);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const p = await uploadReceipt(file);
      onChange(p);
    } catch (err) {
      setError("Couldn't upload that photo - try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <label className={`flex items-center justify-center gap-2 w-full border-2 border-dashed rounded-xl px-4 py-4 cursor-pointer transition-colors ${path ? "border-emerald-300 bg-emerald-50/50" : "border-slate-300 hover:border-blue-400 hover:bg-blue-50/40"}`}>
        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={pick} disabled={busy} />
        {busy ? <Loader2 size={18} className="animate-spin text-slate-500" /> : path ? <ImageIcon size={18} className="text-emerald-600" /> : <Camera size={18} className="text-slate-500" />}
        <span className={`text-sm font-medium ${path ? "text-emerald-700" : "text-slate-600"}`}>{busy ? "Uploading…" : path ? "Receipt attached - tap to replace" : "Snap the receipt"}</span>
      </label>
      {preview && <img src={preview} alt="Receipt" className="mt-2 max-h-40 rounded-lg border border-slate-200 mx-auto" />}
      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
    </div>
  );
}

function ExpenseForm({ initial, gstRegistered, onCancel, onSave, onDelete, saving }) {
  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial]);
  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const isEdit = !!form.id;
  const canSave = form.expense_date && Number(form.amount) > 0;

  // Once an amount is typed, a GST-registered business almost always wants
  // the GST component - work it out from the inclusive amount, editable.
  const suggestGst = () => {
    if (!gstRegistered || form.gst_amount !== "" || !Number(form.amount)) return;
    set("gst_amount", (Number(form.amount) / 11).toFixed(2));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/30 px-4 py-6 overflow-y-auto" onClick={onCancel}>
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-lg text-slate-900">{isEdit ? "Edit expense" : "New expense"}</h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <ReceiptField path={form.receipt_path} onChange={(p) => set("receipt_path", p)} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount" required>
              <TextInput type="number" step="0.01" inputMode="decimal" value={form.amount ?? ""} onChange={(e) => set("amount", e.target.value)} onBlur={suggestGst} placeholder="0.00" autoFocus />
            </Field>
            <Field label="Date" required>
              <TextInput type="date" value={form.expense_date} onChange={(e) => set("expense_date", e.target.value)} />
            </Field>
          </div>
          <div className={`grid gap-3 ${gstRegistered ? "grid-cols-2" : "grid-cols-1"}`}>
            <Field label="Category">
              <Select value={form.category} onChange={(e) => set("category", e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </Select>
            </Field>
            {gstRegistered && (
              <Field label="GST included">
                <TextInput type="number" step="0.01" inputMode="decimal" value={form.gst_amount ?? ""} onChange={(e) => set("gst_amount", e.target.value)} placeholder="0.00" />
              </Field>
            )}
          </div>
          <Field label="Note">
            <TextArea rows={2} value={form.note || ""} onChange={(e) => set("note", e.target.value)} placeholder="What was it for" />
          </Field>
          <label className="flex items-start gap-2.5 text-sm text-slate-700">
            <input type="checkbox" checked={!!form.is_asset} onChange={(e) => set("is_asset", e.target.checked)} className="w-4 h-4 accent-blue-600 mt-0.5" />
            <span>
              <span className="block">This is a piece of equipment I'll keep using</span>
              <span className="block text-xs text-slate-500">Flags it as an asset for the year-end pack - tools and gear under $20,000 can usually be written off in the year they're bought.</span>
            </span>
          </label>
        </div>
        <div className="flex items-center gap-3 px-5 py-4 border-t border-slate-100">
          {isEdit && onDelete && (
            <Button variant="danger" onClick={() => onDelete(form)} className="!px-3" title="Hides it. Kept on record - receipts are tax records.">
              <Archive size={14} /> Archive
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={!canSave || saving}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : null} Save
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Expenses({ expenses, settings = {}, onSave, onDelete }) {
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const sorted = useMemo(() => [...expenses].sort((a, b) => b.expense_date.localeCompare(a.expense_date)), [expenses]);

  const monthTotal = useMemo(() => {
    const thisMonth = todayStr().slice(0, 7);
    return sorted.filter((e) => e.expense_date.slice(0, 7) === thisMonth).reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [sorted]);

  const missingReceipts = useMemo(() => sorted.filter((e) => !e.receipt_path).length, [sorted]);

  const save = async (form) => {
    setSaving(true);
    try {
      await onSave({
        ...form,
        amount: form.amount === "" ? 0 : Number(form.amount),
        gst_amount: form.gst_amount === "" || form.gst_amount == null ? null : Number(form.gst_amount),
        is_asset: !!form.is_asset,
      });
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="text-sm text-slate-500">
          <span className="font-semibold text-slate-900">{money(monthTotal)}</span> spent this month
          {missingReceipts > 0 && <span className="text-amber-600"> · {missingReceipts} without a receipt</span>}
        </div>
        <div className="flex-1" />
        <Button onClick={() => setEditing(emptyExpense())} className="shrink-0">
          <Plus size={16} strokeWidth={2.5} /> New expense
        </Button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon={Receipt} title="No expenses logged yet." subtitle="Fuel, supplies, insurance, equipment - snap the receipt and it's on record for tax time." />
      ) : (
        <div className="space-y-2">
          {sorted.map((e) => (
            <Card key={e.id} className="px-4 py-3">
              <button onClick={() => setEditing(e)} className="w-full flex items-center justify-between gap-3 text-left">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-medium text-slate-900">{categoryLabel(e.category)}</span>
                    <span className="text-xs text-slate-400">{formatDate(e.expense_date)}</span>
                    {e.is_asset && <span className="flex items-center gap-1 text-[11px] text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5"><Package size={10} /> asset</span>}
                    {!e.receipt_path && <span className="text-[11px] text-amber-600">no receipt</span>}
                  </div>
                  {e.note && <div className="text-xs text-slate-500 mt-0.5 truncate">{e.note}</div>}
                </div>
                <div className="text-sm font-semibold tabular-nums text-slate-900 shrink-0">{money(e.amount)}</div>
              </button>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <ExpenseForm
          initial={editing}
          gstRegistered={!!settings.gst_registered}
          onCancel={() => setEditing(null)}
          onSave={save}
          onDelete={async (form) => {
            if (!confirm("Archive this expense? It leaves the list but stays on record.")) return;
            setSaving(true);
            try {
              await onDelete(form.id);
              setEditing(null);
            } finally {
              setSaving(false);
            }
          }}
          saving={saving}
        />
      )}
    </div>
  );
}
