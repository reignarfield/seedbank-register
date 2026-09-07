import React, { useEffect, useMemo, useState } from "react";
import { Plus, FileText, Loader2, X, Archive, ThumbsDown } from "lucide-react";
import { Card, Field, TextInput, Select, TextArea, Button, StatusPill, EmptyState, PrimaryBar, money } from "./ui";
import { formatDate } from "../lib/dates";

function emptyQuote(overrides = {}) {
  return {
    customer_id: "",
    lead_id: null,
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    description: "",
    amount: "",
    status: "draft",
    valid_until: "",
    ...overrides,
  };
}

// Declining and archiving live in here; the row keeps the one action that
// moves the quote forward.
function QuoteForm({ initial, customers, onCancel, onSave, onDelete, onDecline, saving }) {
  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial]);
  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const isEdit = !!form.id;
  const usingExisting = !!form.customer_id;
  const canSave = usingExisting || (form.contact_name || "").trim();

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/30 px-4 py-6 overflow-y-auto" onClick={onCancel}>
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-lg text-slate-900">{isEdit ? "Edit quote" : "New quote"}</h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <Field label="Existing customer">
            <Select value={form.customer_id || ""} onChange={(e) => set("customer_id", e.target.value)}>
              <option value="">— not an existing customer —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
          {!usingExisting && (
            <>
              <Field label="Contact name" required>
                <TextInput value={form.contact_name || ""} onChange={(e) => set("contact_name", e.target.value)} placeholder="Name" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone">
                  <TextInput value={form.contact_phone || ""} onChange={(e) => set("contact_phone", e.target.value)} />
                </Field>
                <Field label="Email">
                  <TextInput type="email" value={form.contact_email || ""} onChange={(e) => set("contact_email", e.target.value)} />
                </Field>
              </div>
            </>
          )}
          <Field label="Description">
            <TextArea rows={2} value={form.description || ""} onChange={(e) => set("description", e.target.value)} placeholder="e.g. Full exterior wash, 2-storey" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount">
              <TextInput type="number" step="0.01" inputMode="decimal" value={form.amount ?? ""} onChange={(e) => set("amount", e.target.value)} placeholder="0.00" />
            </Field>
            <Field label="Valid until">
              <TextInput type="date" value={form.valid_until || ""} onChange={(e) => set("valid_until", e.target.value)} />
            </Field>
          </div>
          {isEdit && (
            <div className="flex items-center gap-2 pt-1">
              {form.status === "sent" && (
                <Button variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={() => onDecline(form)}><ThumbsDown size={13} /> They declined</Button>
              )}
              <Button variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={() => onDelete(form)}><Archive size={13} /> Archive</Button>
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

export default function Quotes({ quotes, customers, onSave, onDelete, onScheduleFromQuote, onConvertAndSchedule, draft, onDraftConsumed }) {
  const [filter, setFilter] = useState("open");
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (draft) {
      setEditing(emptyQuote(draft));
      onDraftConsumed();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const customerById = (id) => customers.find((c) => c.id === id);

  const visible = useMemo(() => {
    let list = quotes;
    if (filter === "open") list = quotes.filter((q) => q.status === "draft" || q.status === "sent" || q.status === "accepted");
    if (filter === "closed") list = quotes.filter((q) => q.status === "declined");
    return [...list].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  }, [quotes, filter]);

  const save = async (form) => {
    setSaving(true);
    try {
      const payload = { ...form, amount: form.amount === "" ? 0 : Number(form.amount), valid_until: form.valid_until || null, customer_id: form.customer_id || null };
      await onSave(payload);
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (quote, status) => onSave({ ...quote, status });

  // The one thing that moves this quote forward, by where it is.
  const nextAction = (q, c) => {
    if (q.status === "draft") return { label: "Mark sent", onClick: () => setStatus(q, "sent"), primary: false };
    if (q.status === "sent") return { label: "Accepted", onClick: () => setStatus(q, "accepted"), primary: true };
    if (q.status === "accepted") return c ? { label: "Book it", onClick: () => onScheduleFromQuote(c, q), primary: true } : { label: "Add & book", onClick: () => onConvertAndSchedule(q), primary: true };
    return null;
  };

  const FILTERS = [
    { id: "open", label: "Open" },
    { id: "closed", label: "Declined" },
    { id: "all", label: "All" },
  ];

  return (
    <div>
      <div className="flex items-center gap-1 bg-slate-100 rounded-full p-1 mb-4 w-fit">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === f.id ? "bg-blue-600 text-white" : "text-slate-500 hover:text-blue-700"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={FileText} title="No quotes here yet." />
      ) : (
        <div className="space-y-2">
          {visible.map((q) => {
            const c = q.customer_id ? customerById(q.customer_id) : null;
            const name = c?.name || q.contact_name || "Unnamed contact";
            const a = nextAction(q, c);
            return (
              <Card key={q.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <button onClick={() => setEditing(q)} className="min-w-0 flex-1 text-left">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-medium text-slate-900 truncate">{name}</span>
                      <StatusPill status={q.status} />
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate">{q.description || "No description"}{q.valid_until ? ` · valid to ${formatDate(q.valid_until)}` : ""}</div>
                  </button>
                  <div className="text-sm font-semibold tabular-nums text-slate-900 shrink-0">{money(q.amount)}</div>
                  {a && (
                    <Button variant={a.primary ? "primary" : "secondary"} className="!px-3 !py-2 !text-xs shrink-0" onClick={a.onClick}>{a.label}</Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <PrimaryBar>
        <Button className="w-full md:w-auto !py-3 md:!py-2" onClick={() => setEditing(emptyQuote())}>
          <Plus size={16} strokeWidth={2.5} /> New quote
        </Button>
      </PrimaryBar>

      {editing && (
        <QuoteForm
          initial={editing}
          customers={customers}
          onCancel={() => setEditing(null)}
          onSave={save}
          onDecline={async (q) => { await setStatus(q, "declined"); setEditing(null); }}
          onDelete={async (q) => {
            if (!confirm("Archive this quote? It leaves the list but stays on record.")) return;
            setSaving(true);
            try {
              await onDelete(q.id);
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
