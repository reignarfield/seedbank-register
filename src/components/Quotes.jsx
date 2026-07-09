import React, { useEffect, useMemo, useState } from "react";
import { Plus, FileText, Loader2, X, Trash2, Send, ThumbsUp, ThumbsDown, CalendarPlus } from "lucide-react";
import { Card, Field, TextInput, Select, TextArea, Button, StatusPill, EmptyState, money } from "./ui";
import { formatDate, todayStr } from "../lib/dates";

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

function QuoteForm({ initial, customers, onCancel, onSave, onDelete, saving }) {
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

export default function Quotes({ quotes, customers, onSave, onDelete, onScheduleFromQuote, draft, onDraftConsumed }) {
  const [filter, setFilter] = useState("all");
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
    const list = filter === "all" ? quotes : quotes.filter((q) => q.status === filter);
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

  const setStatus = async (quote, status) => {
    await onSave({ ...quote, status });
  };

  const FILTERS = ["all", "draft", "sent", "accepted", "declined"];

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
        <Button onClick={() => setEditing(emptyQuote())} className="shrink-0">
          <Plus size={16} strokeWidth={2.5} /> New quote
        </Button>
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={FileText} title="No quotes here yet." />
      ) : (
        <div className="space-y-2">
          {visible.map((q) => {
            const c = q.customer_id ? customerById(q.customer_id) : null;
            const name = c?.name || q.contact_name || "Unnamed contact";
            return (
              <Card key={q.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <button onClick={() => setEditing(q)} className="min-w-0 flex-1 text-left">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-medium text-slate-900 truncate">{name}</span>
                      <StatusPill status={q.status} />
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate">{q.description || "No description"}</div>
                  </button>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold tabular-nums text-slate-900">{money(q.amount)}</div>
                    {q.valid_until && <div className="text-xs text-slate-400">valid to {formatDate(q.valid_until)}</div>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {q.status === "draft" && (
                      <button title="Mark sent" onClick={() => setStatus(q, "sent")} className="p-2 rounded-lg text-blue-600 hover:bg-blue-50">
                        <Send size={15} />
                      </button>
                    )}
                    {q.status === "sent" && (
                      <>
                        <button title="Accepted" onClick={() => setStatus(q, "accepted")} className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50">
                          <ThumbsUp size={15} />
                        </button>
                        <button title="Declined" onClick={() => setStatus(q, "declined")} className="p-2 rounded-lg text-rose-500 hover:bg-rose-50">
                          <ThumbsDown size={15} />
                        </button>
                      </>
                    )}
                    {q.status === "accepted" && c && (
                      <button title="Schedule job" onClick={() => onScheduleFromQuote(c)} className="p-2 rounded-lg text-blue-600 hover:bg-blue-50">
                        <CalendarPlus size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {editing && (
        <QuoteForm
          initial={editing}
          customers={customers}
          onCancel={() => setEditing(null)}
          onSave={save}
          onDelete={async (q) => {
            if (!confirm("Delete this quote?")) return;
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
