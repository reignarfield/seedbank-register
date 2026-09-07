import React, { useEffect, useMemo, useState } from "react";
import { Plus, Receipt, Loader2, X, Archive, CheckCircle2, Eye } from "lucide-react";
import { Card, Field, TextInput, Select, TextArea, Button, StatusPill, EmptyState, money } from "./ui";
import { formatDate, todayStr, addDays } from "../lib/dates";
import InvoiceView from "./InvoiceView";

function emptyInvoice(dueDays, overrides = {}) {
  return { customer_id: "", job_id: "", description: "", amount: "", issued_date: todayStr(), due_date: addDays(todayStr(), dueDays), status: "unpaid", ...overrides };
}

function InvoiceForm({ initial, customers, jobs, onCancel, onSave, onDelete, saving }) {
  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial]);
  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const isEdit = !!form.id;
  const canSave = !!form.customer_id && !!form.due_date;
  const customerJobs = jobs.filter((j) => j.customer_id === form.customer_id);

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/30 px-4 py-6 overflow-y-auto" onClick={onCancel}>
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-lg text-slate-900">{isEdit ? "Edit invoice" : "New invoice"}</h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <Field label="Customer" required>
            <Select value={form.customer_id} onChange={(e) => set("customer_id", e.target.value)} disabled={isEdit}>
              <option value="">— select a customer —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
          {form.customer_id && customerJobs.length > 0 && (
            <Field label="Link to a job (optional)">
              <Select value={form.job_id || ""} onChange={(e) => set("job_id", e.target.value)}>
                <option value="">— no linked job —</option>
                {customerJobs.map((j) => (
                  <option key={j.id} value={j.id}>{formatDate(j.scheduled_date)} · {j.status}</option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Description">
            <TextArea rows={2} value={form.description || ""} onChange={(e) => set("description", e.target.value)} placeholder="What's being invoiced" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount" required>
              <TextInput type="number" step="0.01" inputMode="decimal" value={form.amount ?? ""} onChange={(e) => set("amount", e.target.value)} placeholder="0.00" />
            </Field>
            <Field label="Due date" required>
              <TextInput type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} />
            </Field>
          </div>
        </div>
        <div className="flex items-center gap-3 px-5 py-4 border-t border-slate-100">
          {isEdit && onDelete && (
            <Button variant="danger" onClick={() => onDelete(form)} className="!px-3" title="Hides it. The record is kept - invoices are tax records.">
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

export default function Invoices({ invoices, customers, jobs, settings = {}, onSave, onDelete, onMarkPaid, draft, onDraftConsumed }) {
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [saving, setSaving] = useState(false);
  const today = todayStr();
  const dueDays = settings.invoice_due_days ?? 14;

  useEffect(() => {
    if (draft) {
      setEditing(emptyInvoice(dueDays, draft));
      onDraftConsumed();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const customerById = (id) => customers.find((c) => c.id === id);

  const visible = useMemo(() => {
    let list = invoices;
    if (filter === "unpaid") list = invoices.filter((i) => i.status === "unpaid");
    if (filter === "overdue") list = invoices.filter((i) => i.status === "unpaid" && i.due_date < today);
    if (filter === "paid") list = invoices.filter((i) => i.status === "paid");
    return [...list].sort((a, b) => a.due_date.localeCompare(b.due_date));
  }, [invoices, filter, today]);

  const save = async (form) => {
    setSaving(true);
    try {
      const payload = { ...form, amount: form.amount === "" ? 0 : Number(form.amount), job_id: form.job_id || null };
      await onSave(payload);
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const FILTERS = ["all", "unpaid", "overdue", "paid"];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="flex items-center gap-1 bg-slate-100 rounded-full p-1 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize whitespace-nowrap transition-colors ${filter === f ? "bg-blue-600 text-white" : "text-slate-500 hover:text-blue-700"}`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <Button onClick={() => setEditing(emptyInvoice(dueDays))} className="shrink-0" disabled={customers.length === 0}>
          <Plus size={16} strokeWidth={2.5} /> New invoice
        </Button>
      </div>

      {!settings.abn && invoices.length > 0 && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3">
          No ABN set - every invoice needs one. Add it under Settings → Business.
        </p>
      )}

      {visible.length === 0 ? (
        <EmptyState icon={Receipt} title="No invoices here yet." />
      ) : (
        <div className="space-y-2">
          {visible.map((inv) => {
            const c = customerById(inv.customer_id);
            const overdue = inv.status === "unpaid" && inv.due_date < today;
            return (
              <Card key={inv.id} className={`px-4 py-3 ${overdue ? "border-rose-200" : ""}`}>
                <div className="flex items-center justify-between gap-3">
                  <button onClick={() => setEditing(inv)} className="min-w-0 flex-1 text-left">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-medium text-slate-900 truncate">{c?.name || "Unknown customer"}</span>
                      <StatusPill status={overdue ? "overdue" : inv.status} />
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate">{inv.description || "No description"} · due {formatDate(inv.due_date)}</div>
                  </button>
                  <div className="text-sm font-semibold tabular-nums text-slate-900 shrink-0">{money(inv.amount)}</div>
                  <button title="View / print" onClick={() => setViewing(inv)} className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 shrink-0">
                    <Eye size={17} />
                  </button>
                  {inv.status === "unpaid" && (
                    <button title="Mark paid" onClick={() => onMarkPaid(inv)} className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 shrink-0">
                      <CheckCircle2 size={17} />
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {editing && (
        <InvoiceForm
          initial={editing}
          customers={customers}
          jobs={jobs}
          onCancel={() => setEditing(null)}
          onSave={save}
          onDelete={async (inv) => {
            if (!confirm("Archive this invoice? It leaves the list but stays on record.")) return;
            setSaving(true);
            try {
              await onDelete(inv.id);
              setEditing(null);
            } finally {
              setSaving(false);
            }
          }}
          saving={saving}
        />
      )}

      {viewing && <InvoiceView invoice={viewing} customer={customerById(viewing.customer_id)} settings={settings} onClose={() => setViewing(null)} />}
    </div>
  );
}
