import React, { useEffect, useMemo, useState } from "react";
import { Search, Plus, Users, Loader2, Archive, X, History } from "lucide-react";
import { Card, Field, TextInput, Select, TextArea, Button, StatusPill, EmptyState, PrimaryBar } from "./ui";
import { dueStatus, formatDate, nextDueDate } from "../lib/dates";
import { customersLapsed } from "../lib/today";
import PlaceGlance from "./PlaceGlance";
import Leads from "./Leads";

// People. Three segments: the customers he serves, the enquiries he hasn't
// served yet (they become customers here, so they live here), and the
// one-offs worth a call. Search is always visible - it's a list of people.

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
            <PlaceGlance address={form.address} lat={form.lat} lng={form.lng} onCoords={(lat, lng) => setForm((f) => ({ ...f, lat, lng }))} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="How often">
              <Select value={form.frequency_weeks ?? ""} onChange={(e) => set("frequency_weeks", e.target.value)}>
                {FREQUENCY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Last visit">
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
          {isEdit && onDelete && (
            <div className="pt-1">
              <Button variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={() => onDelete(form)} title="Hides them from every list. Jobs and invoices are kept - they're records.">
                <Archive size={13} /> Archive customer
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 px-5 py-4 border-t border-slate-100">
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

export default function Customers({
  tab,
  onTab,
  customers,
  jobs,
  customerNotes = [],
  onSave,
  onDelete,
  draft,
  onDraftConsumed,
  lapsedDays = 180,
  dueSoonDays = 7,
  leads = [],
  onSetLeadStatus,
  onDeleteLead,
  onConvertLead,
  onCreateQuote,
}) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const lapsed = useMemo(() => customersLapsed(customers, lapsedDays), [customers, lapsedDays]);
  const newEnquiries = useMemo(() => leads.filter((l) => l.status === "new").length, [leads]);

  useEffect(() => {
    if (draft) {
      setEditing(draft);
      onTab("customers");
      onDraftConsumed();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const filtered = useMemo(() => {
    const base = tab === "reach" ? lapsed : customers;
    if (!query.trim()) return base;
    const q = query.toLowerCase();
    return base.filter((c) => [c.name, c.address, c.phone, c.email].filter(Boolean).some((v) => v.toLowerCase().includes(q)));
  }, [customers, lapsed, tab, query]);

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

  const SEGMENTS = [
    { id: "customers", label: "Customers" },
    { id: "enquiries", label: newEnquiries > 0 ? `Enquiries · ${newEnquiries}` : "Enquiries" },
    { id: "reach", label: lapsed.length > 0 ? `Reach out · ${lapsed.length}` : "Reach out" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-32 md:pb-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-slate-900">Customers</h1>
      </div>

      <div className="flex items-center gap-1 bg-slate-100 rounded-full p-1 mb-4 w-fit max-w-full overflow-x-auto">
        {SEGMENTS.map((s) => (
          <button
            key={s.id}
            onClick={() => onTab(s.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${tab === s.id ? "bg-blue-600 text-white" : "text-slate-500 hover:text-blue-700"}`}
          >
            {s.id === "reach" && <History size={13} />}
            {s.label}
          </button>
        ))}
      </div>

      {tab === "enquiries" ? (
        <Leads embedded leads={leads} onSetStatus={onSetLeadStatus} onDelete={onDeleteLead} onConvertToCustomer={onConvertLead} onCreateQuote={onCreateQuote} />
      ) : (
        <>
          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, address, phone" className="!pl-9" />
          </div>

          {tab === "reach" && (
            <p className="text-xs text-slate-400 mb-3 px-1">
              Active, one-off customers not seen in {Math.round(lapsedDays / 30)}+ months — worth a call to see if they want another one.
            </p>
          )}

          {filtered.length === 0 ? (
            <EmptyState
              icon={tab === "reach" ? History : Users}
              title={tab === "reach" ? "Nobody's lapsed right now." : customers.length === 0 ? "No customers yet - tap New customer." : "No customers match your search."}
            />
          ) : (
            <div className="space-y-2">
              {filtered.map((c) => {
                const status = dueStatus(c, { soonDays: dueSoonDays });
                const due = nextDueDate(c);
                return (
                  <Card key={c.id} className="px-4 py-3 hover:border-blue-300 transition-colors">
                    <button onClick={() => setEditing(c)} className="w-full flex items-center justify-between gap-3 text-left">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-medium text-slate-900 truncate">{c.name}</span>
                          {c.status !== "active" && <StatusPill status={c.status} />}
                          {status && status !== "scheduled" && <StatusPill status={status} />}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 truncate">
                          {[c.address, tab === "reach" ? `last visit ${formatDate(c.last_service_date)}` : c.frequency_weeks ? `every ${c.frequency_weeks}w${due ? ` · next ${formatDate(due)}` : ""}` : jobCountByCustomer.get(c.id) ? `${jobCountByCustomer.get(c.id)} jobs` : "one-off"].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                    </button>
                  </Card>
                );
              })}
            </div>
          )}

          <PrimaryBar>
            <Button className="w-full md:w-auto !py-3 md:!py-2" onClick={() => setEditing(emptyCustomer())}>
              <Plus size={16} strokeWidth={2.5} /> New customer
            </Button>
          </PrimaryBar>
        </>
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
