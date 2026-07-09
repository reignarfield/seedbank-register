import React, { useEffect, useMemo, useState } from "react";
import { Plus, Receipt, Loader2, X, Trash2 } from "lucide-react";
import { Card, Field, TextInput, Select, TextArea, Button, EmptyState, money } from "./ui";
import { formatDate, todayStr } from "../lib/dates";

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
  return { expense_date: todayStr(), category: "other", amount: "", note: "" };
}

function ExpenseForm({ initial, onCancel, onSave, onDelete, saving }) {
  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial]);
  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const isEdit = !!form.id;
  const canSave = form.expense_date && Number(form.amount) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/30 px-4 py-6 overflow-y-auto" onClick={onCancel}>
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-lg text-slate-900">{isEdit ? "Edit expense" : "New expense"}</h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date" required>
              <TextInput type="date" value={form.expense_date} onChange={(e) => set("expense_date", e.target.value)} />
            </Field>
            <Field label="Category">
              <Select value={form.category} onChange={(e) => set("category", e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Amount" required>
            <TextInput type="number" step="0.01" inputMode="decimal" value={form.amount ?? ""} onChange={(e) => set("amount", e.target.value)} placeholder="0.00" />
          </Field>
          <Field label="Note">
            <TextArea rows={2} value={form.note || ""} onChange={(e) => set("note", e.target.value)} placeholder="What was it for" />
          </Field>
        </div>
        <div className="flex items-center gap-3 px-5 py-4 border-t border-slate-100">
          {isEdit && onDelete && (
            <Button variant="danger" onClick={() => onDelete(form)} className="!px-3">
              <Trash2 size={14} /> Delete
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

export default function Expenses({ expenses, onSave, onDelete }) {
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const sorted = useMemo(() => [...expenses].sort((a, b) => b.expense_date.localeCompare(a.expense_date)), [expenses]);

  const monthTotal = useMemo(() => {
    const thisMonth = todayStr().slice(0, 7);
    return sorted.filter((e) => e.expense_date.slice(0, 7) === thisMonth).reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [sorted]);

  const save = async (form) => {
    setSaving(true);
    try {
      await onSave({ ...form, amount: form.amount === "" ? 0 : Number(form.amount) });
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
        </div>
        <div className="flex-1" />
        <Button onClick={() => setEditing(emptyExpense())} className="shrink-0">
          <Plus size={16} strokeWidth={2.5} /> New expense
        </Button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon={Receipt} title="No expenses logged yet." subtitle="Fuel, supplies, insurance, equipment - anything worth having a record of for tax time." />
      ) : (
        <div className="space-y-2">
          {sorted.map((e) => (
            <Card key={e.id} className="px-4 py-3">
              <button onClick={() => setEditing(e)} className="w-full flex items-center justify-between gap-3 text-left">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-medium text-slate-900">{categoryLabel(e.category)}</span>
                    <span className="text-xs text-slate-400">{formatDate(e.expense_date)}</span>
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
          onCancel={() => setEditing(null)}
          onSave={save}
          onDelete={async (form) => {
            if (!confirm("Delete this expense?")) return;
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
