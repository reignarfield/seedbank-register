import React, { useEffect, useMemo, useState } from "react";
import { Search, Plus, Users, Loader2, Archive, X, History } from "lucide-react";
import { Card, Field, TextInput, Select, TextArea, Button, StatusPill, EmptyState } from "./ui";
import { dueStatus, formatDate, nextDueDate } from "../lib/dates";
import { customersLapsed } from "../lib/today";

const FREQUENCY_OPTIONS = [
  { value: "", label: "One-off (not recurring)" },
  { value: "4", label: "Every 4 weeks" },
  { value: "6", label: "Every 6 weeks" },
  { value: "8", label: "Every 8 weeks" },
  { value: "12", label: "Every 12 weeks" },
  { value: "26", label: "Every 6 months" },
  { value: "52", label: "Annually" },
];

function emptyCustomer() {
  return { name: "", phone: "", email: "", address: "", notes: "", access_notes: "", frequency_weeks: "", last_service_date: "", status: "active" };
}

function CustomerForm({ initial, notes, onCancel, onSave, onDelete, saving }) {
  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial]);
  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const canSave = (form.name || "").trim().length > 0;
  const isEdit = !!form.id;

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/30 px-4 py-6 overflow-y-auto" onClick={onCancel}>
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-lg text-slate-900">{isEdit ? "Edit customer" : "New customer"}</h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
          <Field label="Name" required>
            <TextInput value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Sarah Nguyen" autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone">
              <TextInput value={form.phone || ""} onChange={(e) => set("phone", e.target.value)} placeholder="04xx xxx xxx" />
            </Field>
            <Field label="Email">
              <TextInput type="email" value={form.email || ""} onChange={(e) => set("email", e.target.value)} placeholder="name@email.com" />
            </Field>
          </div>
          <Field label="Address">
            <TextInput value={form.address || ""} onChange={(e) => set("address", e.target.value)} placeholder="Street, suburb" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cleaning frequency">
              <Select value={form.frequency_weeks ?? ""} onChange={(e) => set("frequency_weeks", e.target.value)}>
                {FREQUENCY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Last service date">
              <TextInput type="date" value={form.last_service_date || ""} onChange={(e) => set("last_service_date", e.target.value)} />
            </Field>
          </div>
          <Field label="Status">
            <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
          <Field label="Access notes">
            <TextArea rows={2} value={form.access_notes || ""} onChange={(e) => set("access_notes", e.target.value)} placeholder="Gate code, pets, ladder access, hazards..." />
          </Field>
          <Field label="Notes">
            <TextArea rows={2} value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} placeholder="Anything else worth remembering" />
          </Field>
          {isEdit && notes && notes.length > 0 && (
            <Field label="Recent notes">
              <div className="space-y-1.5 max-h-40 overflow-y-auto border border-slate-100 rounded-lg p-2.5">
                {notes.map((n) => (
                  <div key={n.id} className="text-xs">
                    <span className="text-slate-400">{formatDate(n.created_at.slice(0, 10))} — </span>
                    <span className="text-slate-600">{n.note}</span>
                  </div>
                ))}
              </div>
            </Field>
          )}
        </div>
        <div className="flex items-center gap-3 px-5 py-4 border-t border-slate-100">
          {isEdit && onDelete && (
            <Button variant="danger" onClick={() => onDelete(form)} className="!px-3" title="Hides them from every list. Jobs and invoices are kept - they're records.">
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

export default function Customers({ customers, jobs, customerNotes = [], onSave, onDelete, draft, onDraftConsumed, lapsedDays = 180, dueSoonDays = 7 }) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showLapsed, setShowLapsed] = useState(false);

  const lapsed = useMemo(() => customersLapsed(customers, lapsedDays), [customers, lapsedDays]);

  useEffect(() => {
    if (draft) {
      setEditing(draft);
      onDraftConsumed();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const filtered = useMemo(() => {
    const base = showLapsed ? lapsed : customers;
    if (!query.trim()) return base;
    const q = query.toLowerCase();
    return base.filter((c) => [c.name, c.address, c.phone, c.email].filter(Boolean).some((v) => v.toLowerCase().includes(q)));
  }, [customers, lapsed, showLapsed, query]);

  const jobCountByCustomer = useMemo(() => {
    const m = new Map();
    jobs.forEach((j) => m.set(j.customer_id, (m.get(j.customer_id) || 0) + 1));
    return m;
  }, [jobs]);

  const save = async (form) => {
    setSaving(true);
    try {
      const payload = { ...form, frequency_weeks: form.frequency_weeks === "" ? null : Number(form.frequency_weeks), last_service_date: form.last_service_date || null };
      await onSave(payload);
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (form) => {
    if (!confirm(`Archive ${form.name}? They'll disappear from every list. Anything still booked is cancelled; their history and invoices are kept.`)) return;
    setSaving(true);
    try {
      await onDelete(form.id);
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, address, phone, email..." className="!pl-9" />
        </div>
        <Button onClick={() => setEditing(emptyCustomer())} className="shrink-0">
          <Plus size={16} strokeWidth={2.5} /> New customer
        </Button>
      </div>

      <div className="flex items-center gap-1 bg-slate-100 rounded-full p-1 mb-4 w-fit">
        <button
          onClick={() => setShowLapsed(false)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${!showLapsed ? "bg-blue-600 text-white" : "text-slate-500 hover:text-blue-700"}`}
        >
          All customers
        </button>
        <button
          onClick={() => setShowLapsed(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${showLapsed ? "bg-blue-600 text-white" : "text-slate-500 hover:text-blue-700"}`}
        >
          <History size={13} /> Reach out again {lapsed.length > 0 && `(${lapsed.length})`}
        </button>
      </div>

      {showLapsed && (
        <p className="text-xs text-slate-400 mb-3 px-1">
          Active, one-off customers not serviced in {Math.round(lapsedDays / 30)}+ months — worth a call to see if they want another one.
        </p>
      )}

      <div className="text-xs uppercase tracking-[0.14em] text-slate-400 mb-2 px-1">
        {filtered.length} {filtered.length === 1 ? "customer" : "customers"}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={showLapsed ? History : Users}
          title={showLapsed ? "Nobody's lapsed right now." : customers.length === 0 ? "No customers yet." : "No customers match your search."}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const status = dueStatus(c, { soonDays: dueSoonDays });
            const due = nextDueDate(c);
            return (
              <Card key={c.id} className="px-4 py-3 hover:border-blue-300 transition-colors cursor-pointer" >
                <button onClick={() => setEditing(c)} className="w-full flex items-center justify-between gap-3 text-left">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-medium text-slate-900 truncate">{c.name}</span>
                      <StatusPill status={c.status} />
                      {status && <StatusPill status={status} />}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate">{c.address || "No address on file"}</div>
                  </div>
                  <div className="hidden sm:block text-right shrink-0">
                    {showLapsed ? (
                      <div className="text-xs text-amber-600">Last clean {formatDate(c.last_service_date)}</div>
                    ) : (
                      <>
                        <div className="text-xs text-slate-400">{c.frequency_weeks ? `Every ${c.frequency_weeks}w` : "One-off"}</div>
                        <div className="text-xs text-slate-500">{due ? `Next due ${formatDate(due)}` : jobCountByCustomer.get(c.id) ? `${jobCountByCustomer.get(c.id)} jobs` : "No jobs yet"}</div>
                      </>
                    )}
                  </div>
                </button>
              </Card>
            );
          })}
        </div>
      )}

      {editing && (
        <CustomerForm
          initial={editing}
          notes={editing.id ? customerNotes.filter((n) => n.customer_id === editing.id).slice(0, 8) : []}
          onCancel={() => setEditing(null)}
          onSave={save}
          onDelete={remove}
          saving={saving}
        />
      )}
    </div>
  );
}
