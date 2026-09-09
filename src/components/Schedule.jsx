import React, { useEffect, useMemo, useState } from "react";
import { Plus, CalendarDays, Loader2, X, AlertTriangle, Archive, Ban } from "lucide-react";
import { Card, Field, TextInput, Select, TextArea, Button, StatusPill, EmptyState, PrimaryBar, money } from "./ui";
import { formatDate, formatTime, todayStr, addDays, nextDueDate } from "../lib/dates";
import { servicesDue } from "../lib/today";
import { PRICE_GROUPS } from "../lib/pricing";
import { PhotoStrip } from "./JobPhotos";
import MonthView from "./MonthView";

// A quote here (scheduling straight off an accepted quote) pre-fills price
// and description from what was actually quoted - still fully editable in
// the form, just a sane starting point instead of a blank one to remember.
function emptyJob(customerId = "", date = todayStr(), quote = null, service = null) {
  return {
    customer_id: customerId,
    scheduled_date: date,
    scheduled_time: "",
    job_type: service?.service || "",
    price: quote?.amount ?? service?.price ?? "",
    notes: quote?.description || "",
    status: "scheduled",
    quote_id: quote?.id || null,
  };
}

// A rough "what does this usually cost" note next to the price field once a
// job type is picked - a reference only, not an autofill.
function priceGuide(jobType) {
  const group = PRICE_GROUPS.find((g) => g.title === jobType);
  if (!group) return null;
  const nums = group.items.map((i) => i.price).filter((p) => /^\$[\d,]+$/.test(p)).map((p) => Number(p.replace(/[$,]/g, "")));
  if (nums.length === 0) return null;
  const min = Math.min(...nums), max = Math.max(...nums);
  return min === max ? `Guide: $${min}` : `Guide: $${min} - $${max}`;
}

// Everything that isn't the one main action on a row lives in here: cancel
// and archive for a booked job. The row itself stays to one labelled button.
export function JobForm({ initial, customers, onCancel, onSave, saving, onCancelJob, onArchive, onSomeoneNew }) {
  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial]);
  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const canSave = !!form.customer_id && !!form.scheduled_date;
  const isEdit = !!form.id;
  const isDirty = JSON.stringify(form) !== JSON.stringify(initial);
  const dismiss = () => {
    if (isDirty && !confirm("Discard this job?")) return;
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/30 px-4 py-6 overflow-y-auto" onClick={dismiss}>
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-lg text-slate-900">{isEdit ? "Edit job" : "New job"}</h2>
          <button onClick={dismiss} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <Field label="Customer" required>
            <Select value={form.customer_id} onChange={(e) => set("customer_id", e.target.value)} disabled={isEdit}>
              <option value="">— select a customer —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            {!isEdit && onSomeoneNew && (
              <button type="button" onClick={onSomeoneNew} className="text-xs text-blue-600 hover:underline mt-1">Someone new? Add them in three fields</button>
            )}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date" required>
              <TextInput type="date" value={form.scheduled_date} onChange={(e) => set("scheduled_date", e.target.value)} />
            </Field>
            <Field label="Time (optional)">
              <TextInput type="time" value={(form.scheduled_time || "").slice(0, 5)} onChange={(e) => set("scheduled_time", e.target.value)} />
            </Field>
          </div>
          <Field label="Job type">
            <Select value={form.job_type || ""} onChange={(e) => set("job_type", e.target.value)}>
              <option value="">— general —</option>
              {PRICE_GROUPS.map((g) => (
                <option key={g.title} value={g.title}>{g.title}</option>
              ))}
            </Select>
          </Field>
          <Field label="Price">
            <TextInput type="number" step="0.01" inputMode="decimal" value={form.price ?? ""} onChange={(e) => set("price", e.target.value)} placeholder="0.00" />
            {priceGuide(form.job_type) && <p className="text-xs text-slate-400 mt-1">{priceGuide(form.job_type)}</p>}
          </Field>
          <Field label="Notes">
            <TextArea rows={2} value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} placeholder="Anything the job needs" />
          </Field>
          {isEdit && <PhotoStrip job={form} />}
          {isEdit && (onCancelJob || onArchive) && (
            <div className="flex items-center gap-2 pt-1">
              {form.status === "scheduled" && onCancelJob && (
                <Button variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={() => { if (confirm("Cancel this job? It stays on record as cancelled.")) onCancelJob(form); }}>
                  <Ban size={13} /> Cancel job
                </Button>
              )}
              {onArchive && (
                <Button variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={() => { if (confirm("Archive this job? It leaves the list but stays in the records.")) onArchive(form); }} title="Hides it, keeps the record">
                  <Archive size={13} /> Archive
                </Button>
              )}
            </div>
          )}
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
          <TextInput type="number" step="0.01" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" autoFocus />
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

function dayLabel(dateStr, today) {
  if (dateStr === today) return "Today";
  if (dateStr === addDays(today, 1)) return "Tomorrow";
  if (dateStr < today) return `${formatDate(dateStr)} · overdue`;
  return formatDate(dateStr);
}

export default function Schedule({
  customers,
  jobs,
  quotes = [],
  services = [],
  settings = {},
  onSave,
  onComplete,
  onCancelJob,
  onDelete,
  onRaiseInvoice,
  onConvertAndSchedule,
  draftCustomer,
  draftQuote,
  draftService,
  onDraftConsumed,
}) {
  const [filter, setFilter] = useState("upcoming");
  const [layout, setLayout] = useState("list"); // "list" | "month"
  const [pickedDay, setPickedDay] = useState(null);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [completingNoPrice, setCompletingNoPrice] = useState(null);
  const today = todayStr();

  useEffect(() => {
    if (draftCustomer) {
      const svcDue = draftService?.last_done ? addDays(draftService.last_done, draftService.frequency_weeks * 7) : null;
      const due = svcDue && svcDue >= todayStr() ? svcDue : nextDueDate(draftCustomer) || todayStr();
      setEditing(emptyJob(draftCustomer.id, due, draftQuote, draftService));
      onDraftConsumed();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftCustomer]);

  const customerById = (id) => customers.find((c) => c.id === id);

  // Grouped by day so the list reads as a diary, not a spreadsheet.
  const groups = useMemo(() => {
    let list = jobs;
    if (filter === "upcoming") list = jobs.filter((j) => j.status === "scheduled");
    if (filter === "done") list = jobs.filter((j) => j.status === "completed");
    const sorted = [...list].sort((a, b) => (filter === "done" ? b.scheduled_date.localeCompare(a.scheduled_date) : a.scheduled_date.localeCompare(b.scheduled_date)));
    const m = new Map();
    for (const j of sorted) {
      if (!m.has(j.scheduled_date)) m.set(j.scheduled_date, []);
      m.get(j.scheduled_date).push(j);
    }
    return [...m.entries()];
  }, [jobs, filter]);

  // Work that should be booked but isn't: recurring customers who are due
  // with nothing in the diary, and accepted quotes with no job against them.
  const needsBooking = useMemo(() => {
    const booked = new Set(jobs.filter((j) => j.status === "scheduled" && j.scheduled_date >= today).map((j) => `${j.customer_id}|${j.job_type || ""}`));
    const due = servicesDue(customers, services, settings.due_soon_days ?? 7, today).filter(({ customer, service }) => !booked.has(`${customer.id}|${service.service}`));
    const quoted = quotes.filter((q) => q.status === "accepted" && !jobs.some((j) => j.quote_id === q.id));
    return { due, quoted };
  }, [customers, jobs, quotes, services, settings.due_soon_days, today]);

  const save = async (form) => {
    setSaving(true);
    try {
      const payload = { ...form, job_type: form.job_type || null, scheduled_time: form.scheduled_time || null, price: form.price === "" ? null : Number(form.price) };
      await onSave(payload);
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const hasPrice = (j) => j.price != null && Number(j.price) > 0;
  const requestComplete = (j) => (hasPrice(j) ? onComplete(j) : setCompletingNoPrice(j));
  const confirmCompleteNoPrice = async (price) => {
    await onComplete({ ...completingNoPrice, price });
    setCompletingNoPrice(null);
  };

  const FILTERS = [
    { id: "upcoming", label: "Upcoming" },
    { id: "done", label: "Done" },
    { id: "all", label: "All" },
  ];

  const hasNeeds = needsBooking.due.length + needsBooking.quoted.length > 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-32 md:pb-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-semibold text-slate-900">Schedule</h1>
        <div className="flex items-center gap-1 bg-slate-100 rounded-full p-1">
          <button onClick={() => setLayout(layout === "list" ? "month" : "list")} className="px-3 py-1.5 rounded-full text-sm font-medium text-slate-500 hover:text-blue-700">{layout === "list" ? "Month" : "List"}</button>
          {layout === "list" && FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === f.id ? "bg-blue-600 text-white" : "text-slate-500 hover:text-blue-700"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {layout === "month" ? (
        <MonthView jobs={jobs} customers={customers} selected={pickedDay} onSelect={setPickedDay} onBook={(d) => setEditing(emptyJob("", d))} />
      ) : groups.length === 0 ? (
        <EmptyState icon={CalendarDays} title={customers.length === 0 ? "Add a customer first, then book their first job." : "Nothing booked. Tap New job."} />
      ) : (
        <div className="space-y-5">
          {groups.map(([date, list]) => (
            <div key={date}>
              <div className={`text-xs font-semibold uppercase tracking-[0.14em] mb-2 px-1 ${date < today && filter !== "done" ? "text-amber-600" : "text-slate-400"}`}>{dayLabel(date, today)}</div>
              <div className="space-y-2">
                {list.map((j) => {
                  const c = customerById(j.customer_id);
                  const isPast = j.status === "scheduled" && j.scheduled_date < today;
                  return (
                    <Card key={j.id} className={`px-4 py-3 ${isPast ? "border-amber-200" : ""}`}>
                      <div className="flex items-center justify-between gap-3">
                        <button onClick={() => setEditing(j)} className="min-w-0 flex-1 text-left">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="font-medium text-slate-900 truncate">{c?.name || "Unknown customer"}</span>
                            {j.status !== "scheduled" && <StatusPill status={j.status} />}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 truncate">
                            {[j.scheduled_time ? formatTime(j.scheduled_time) : null, j.job_type, c?.address].filter(Boolean).join(" · ") || "—"}
                          </div>
                        </button>
                        <div className="text-right shrink-0">
                          {hasPrice(j) ? (
                            <div className="text-sm font-semibold tabular-nums text-slate-900">{money(j.price)}</div>
                          ) : j.status === "scheduled" ? (
                            <div className="text-xs text-amber-600">No price</div>
                          ) : null}
                        </div>
                        {j.status === "scheduled" && (
                          <Button className="!px-3 !py-2 !text-xs shrink-0" onClick={() => requestComplete(j)}>Mark done</Button>
                        )}
                        {j.status === "completed" && !hasPrice(j) && (
                          <Button variant="secondary" className="!px-3 !py-2 !text-xs shrink-0" onClick={() => onRaiseInvoice(j)}>Invoice it</Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {layout === "list" && filter !== "done" && hasNeeds && (
        <div className="mt-8">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700 mb-2 px-1">Needs booking</div>
          <div className="space-y-2">
            {needsBooking.due.map(({ customer: c, service: s, due, status }) => {
              return (
                <Card key={s.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-medium text-slate-900 truncate">{c.name}</span>
                        <span className="text-xs text-slate-500">{s.service}</span>
                        <StatusPill status={status} />
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{status === "overdue" ? "Was due" : "Due"} {formatDate(due)} · every {s.frequency_weeks} weeks{s.price != null ? ` · usually ${money(s.price)}` : ""}</div>
                    </div>
                    <Button className="!px-3 !py-2 !text-xs shrink-0" onClick={() => setEditing(emptyJob(c.id, due >= today ? due : today, null, s))}>Book it</Button>
                  </div>
                </Card>
              );
            })}
            {needsBooking.quoted.map((q) => {
              const c = q.customer_id ? customerById(q.customer_id) : null;
              return (
                <Card key={q.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-medium text-slate-900 truncate">{c?.name || q.contact_name || "Unnamed contact"}</span>
                        <StatusPill status="accepted" />
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate">{money(q.amount)} quote accepted{q.description ? ` · ${q.description}` : ""}</div>
                    </div>
                    {c ? (
                      <Button className="!px-3 !py-2 !text-xs shrink-0" onClick={() => setEditing(emptyJob(c.id, today, q))}>Book it</Button>
                    ) : (
                      <Button className="!px-3 !py-2 !text-xs shrink-0" onClick={() => onConvertAndSchedule?.(q)}>Add & book</Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <PrimaryBar>
        <Button className="w-full md:w-auto !py-3 md:!py-2" onClick={() => setEditing(emptyJob())} disabled={customers.length === 0}>
          <Plus size={16} strokeWidth={2.5} /> New job
        </Button>
      </PrimaryBar>

      {editing && (
        <JobForm
          initial={editing}
          customers={customers}
          onCancel={() => setEditing(null)}
          onSave={save}
          saving={saving}
          onCancelJob={async (j) => { await onCancelJob(j); setEditing(null); }}
          onArchive={async (j) => { await onDelete(j.id); setEditing(null); }}
        />
      )}

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
