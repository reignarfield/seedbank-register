import React, { useEffect, useMemo, useState } from "react";
import { Plus, CalendarDays, Loader2, X, Check, Ban, Trash2, AlertTriangle } from "lucide-react";
import { Card, Field, TextInput, Select, TextArea, Button, StatusPill, EmptyState, money } from "./ui";
import { formatDate, todayStr, nextDueDate } from "../lib/dates";

function emptyJob(customerId = "", date = todayStr()) {
  return { customer_id: customerId, scheduled_date: date, price: "", notes: "", status: "scheduled" };
}

function JobForm({ initial, customers, onCancel, onSave, saving }) {
  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial]);
  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const canSave = !!form.customer_id && !!form.scheduled_date;
  const isEdit = !!form.id;

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/30 px-4 py-6 overflow-y-auto" onClick={onCancel}>
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-lg text-slate-900">{isEdit ? "Edit job" : "New job"}</h2>
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
          <Field label="Date" required>
            <TextInput type="date" value={form.scheduled_date} onChange={(e) => set("scheduled_date", e.target.value)} />
          </Field>
          <Field label="Price">
            <TextInput type="number" step="0.01" inputMode="decimal" value={form.price ?? ""} onChange={(e) => set("price", e.target.value)} placeholder="0.00" />
          </Field>
          <Field label="Notes">
            <TextArea rows={2} value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} placeholder="Anything the job needs" />
          </Field>
        </div>
        <div className="flex items-center gap-3 px-5 py-4 border-t border-slate-100">
          <div className="flex-1" />
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={!canSave || saving}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : null} Save job
          </Button>
        </div>
      </div>
    </div>
  );
}

// Shown instead of completing immediately when a job has no price set, so
// he's asked once at the moment it matters rather than the invoice silently
// never getting created.
export function CompleteNoPricePrompt({ job, customerName, onCancel, onConfirm }) {
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);

  const finish = async (withPrice) => {
    setSaving(true);
    try {
      await onConfirm(withPrice ? Number(price) : null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={onCancel}>
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
        <AlertTriangle size={24} className="text-amber-500 mb-2" />
        <h2 className="font-semibold text-lg text-slate-900 mb-1">No price on this job</h2>
        <p className="text-sm text-slate-500 mb-4">
          {customerName ? `${customerName}'s job` : "This job"} has no price, so completing it won't raise an invoice.
          Add one now, or skip and invoice it later yourself.
        </p>
        <Field label="Price (optional)">
          <TextInput
            type="number"
            step="0.01"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            autoFocus
          />
        </Field>
        <div className="flex items-center gap-2 mt-4">
          <Button variant="secondary" className="flex-1" onClick={() => finish(false)} disabled={saving}>
            Skip - complete without invoicing
          </Button>
          <Button className="flex-1" onClick={() => finish(true)} disabled={saving || !price}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : null} Save price & complete
          </Button>
        </div>
        <button onClick={onCancel} className="text-xs text-slate-400 hover:text-slate-600 mt-3">
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function Schedule({ customers, jobs, onSave, onComplete, onCancelJob, onDelete, draftCustomer, onDraftConsumed }) {
  const [filter, setFilter] = useState("upcoming");
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [completingNoPrice, setCompletingNoPrice] = useState(null);

  useEffect(() => {
    if (draftCustomer) {
      const due = nextDueDate(draftCustomer) || todayStr();
      setEditing(emptyJob(draftCustomer.id, due));
      onDraftConsumed();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftCustomer]);

  const customerById = (id) => customers.find((c) => c.id === id);
  const today = todayStr();

  const visible = useMemo(() => {
    let list = jobs;
    if (filter === "upcoming") list = jobs.filter((j) => j.status === "scheduled");
    if (filter === "completed") list = jobs.filter((j) => j.status === "completed");
    if (filter === "cancelled") list = jobs.filter((j) => j.status === "cancelled");
    return [...list].sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
  }, [jobs, filter]);

  const save = async (form) => {
    setSaving(true);
    try {
      const payload = { ...form, price: form.price === "" ? null : Number(form.price) };
      await onSave(payload);
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const hasPrice = (j) => j.price != null && Number(j.price) > 0;

  const requestComplete = (j) => {
    if (hasPrice(j)) {
      onComplete(j);
    } else {
      setCompletingNoPrice(j);
    }
  };

  const confirmCompleteNoPrice = async (price) => {
    await onComplete({ ...completingNoPrice, price });
    setCompletingNoPrice(null);
  };

  const FILTERS = [
    { id: "upcoming", label: "Upcoming" },
    { id: "completed", label: "Completed" },
    { id: "cancelled", label: "Cancelled" },
    { id: "all", label: "All" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="flex items-center gap-1 bg-slate-100 rounded-full p-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === f.id ? "bg-blue-600 text-white" : "text-slate-500 hover:text-blue-700"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <Button onClick={() => setEditing(emptyJob())} className="shrink-0" disabled={customers.length === 0}>
          <Plus size={16} strokeWidth={2.5} /> New job
        </Button>
      </div>
      {customers.length === 0 && <p className="text-xs text-slate-400 mb-3">Add a customer first before scheduling a job.</p>}

      {visible.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No jobs here yet." />
      ) : (
        <div className="space-y-2">
          {visible.map((j) => {
            const c = customerById(j.customer_id);
            const isPast = j.status === "scheduled" && j.scheduled_date < today;
            return (
              <Card key={j.id} className={`px-4 py-3 ${isPast ? "border-amber-200" : ""}`}>
                <div className="flex items-center justify-between gap-3">
                  <button onClick={() => setEditing(j)} className="min-w-0 flex-1 text-left">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-medium text-slate-900 truncate">{c?.name || "Unknown customer"}</span>
                      <StatusPill status={j.status} />
                      {isPast && <span className="text-xs text-amber-600 font-medium">Overdue to complete</span>}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate">{c?.address || ""}</div>
                  </button>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-medium text-slate-700">{formatDate(j.scheduled_date)}</div>
                    {hasPrice(j) ? (
                      <div className="text-xs text-slate-400 tabular-nums">{money(j.price)}</div>
                    ) : (
                      j.status === "scheduled" && <div className="text-xs text-amber-600">No price set</div>
                    )}
                  </div>
                  {j.status === "scheduled" && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button title="Mark complete" onClick={() => requestComplete(j)} className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50">
                        <Check size={16} />
                      </button>
                      <button title="Cancel job" onClick={() => onCancelJob(j)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100">
                        <Ban size={16} />
                      </button>
                    </div>
                  )}
                  {j.status !== "scheduled" && (
                    <button title="Delete" onClick={() => confirm("Delete this job?") && onDelete(j.id)} className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 shrink-0">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {editing && <JobForm initial={editing} customers={customers} onCancel={() => setEditing(null)} onSave={save} saving={saving} />}

      {completingNoPrice && (
        <CompleteNoPricePrompt
          job={completingNoPrice}
          customerName={customerById(completingNoPrice.customer_id)?.name}
          onCancel={() => setCompletingNoPrice(null)}
          onConfirm={confirmCompleteNoPrice}
        />
      )}
    </div>
  );
}
