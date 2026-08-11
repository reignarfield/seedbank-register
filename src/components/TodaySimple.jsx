import React, { useMemo, useState } from "react";
import {
  Phone,
  Navigation,
  Check,
  LogOut,
  ArrowUpRight,
  CalendarCheck,
  Receipt,
  Inbox,
  AlertTriangle,
  Clock,
  ChevronUp,
  ChevronDown,
  X,
  Loader2,
  StickyNote,
  Plus,
  Home,
  Search,
} from "lucide-react";
import { Card, Button, EmptyState, TextInput, TextArea } from "./ui";
import { todayStr, addDays, formatDate } from "../lib/dates";
import MorningCheck from "./MorningCheck";
import { CompleteNoPricePrompt, JobForm } from "./Schedule";

const cleanPhone = (p) => (p || "").replace(/[^0-9+]/g, "");
const mapsLink = (address) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

function emptyTodayJob() {
  return { customer_id: "", scheduled_date: todayStr(), job_type: "", price: "", notes: "", status: "scheduled" };
}

// "Can't do it today" - a job that can't happen shouldn't just sit there
// looking forgotten; one tap gets it off today without losing it.
function RescheduleMenu({ job, onClose, onReschedule, onCancelJob }) {
  const [pickingDate, setPickingDate] = useState(false);
  const [date, setDate] = useState(addDays(todayStr(), 1));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={onClose}>
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg text-slate-900">Can't do it today?</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        {pickingDate ? (
          <div className="space-y-3">
            <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} autoFocus />
            <Button className="w-full" onClick={() => onReschedule(job, date)}>Move to {formatDate(date)}</Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Button variant="secondary" className="w-full !justify-start" onClick={() => onReschedule(job, addDays(todayStr(), 1))}>
              Move to tomorrow
            </Button>
            <Button variant="secondary" className="w-full !justify-start" onClick={() => setPickingDate(true)}>
              Pick another date
            </Button>
            <Button variant="danger" className="w-full !justify-start" onClick={() => onCancelJob(job)}>
              Cancel this job
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function JobRow({ job, customer, overdue, onComplete, onReschedule, order }) {
  const [paidNow, setPaidNow] = useState(false);
  const priced = job.price != null && Number(job.price) > 0;

  return (
    <Card className={`p-4 ${overdue ? "border-amber-300" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-medium text-slate-900">{customer?.name || "Unknown customer"}</span>
            {overdue && (
              <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                <AlertTriangle size={11} /> {formatDate(job.scheduled_date)}
              </span>
            )}
          </div>
          <div className="text-sm text-slate-500 mt-0.5">{customer?.address || "No address on file"}</div>
        </div>
        {order && (
          <div className="flex flex-col shrink-0 -mr-1 -mt-1">
            <button onClick={order.onUp} disabled={!order.canUp} className="p-1 text-slate-300 hover:text-slate-600 disabled:opacity-30 disabled:hover:text-slate-300">
              <ChevronUp size={16} />
            </button>
            <button onClick={order.onDown} disabled={!order.canDown} className="p-1 text-slate-300 hover:text-slate-600 disabled:opacity-30 disabled:hover:text-slate-300">
              <ChevronDown size={16} />
            </button>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 mt-3">
        {customer?.phone && (
          <a
            href={`tel:${cleanPhone(customer.phone)}`}
            className="flex items-center justify-center gap-1.5 flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-medium px-3 py-2.5 rounded-lg transition-colors"
          >
            <Phone size={15} /> Call
          </a>
        )}
        {customer?.address && (
          <a
            href={mapsLink(customer.address)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-medium px-3 py-2.5 rounded-lg transition-colors"
          >
            <Navigation size={15} /> Navigate
          </a>
        )}
        <Button className="flex-[1.4] !py-2.5" onClick={() => onComplete(priced ? paidNow : false)}>
          <Check size={16} strokeWidth={2.5} /> Mark done
        </Button>
      </div>
      <div className="flex items-center justify-between mt-2.5">
        <button onClick={onReschedule} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600">
          <Clock size={12} /> Can't do it today
        </button>
        {priced && (
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            <input type="checkbox" checked={paidNow} onChange={(e) => setPaidNow(e.target.checked)} className="w-3.5 h-3.5 accent-blue-600" />
            Paid on the spot
          </label>
        )}
      </div>
    </Card>
  );
}

// Pick a customer (search + today's/overdue's pinned to the top since
// they're the likely target), then a note. Not tied to today's jobs - any
// customer can get a note added at any time, not only in the moment.
function AddNoteModal({ customers, priorityIds, onCancel, onSave }) {
  const [customer, setCustomer] = useState(null);
  const [query, setQuery] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? customers.filter((c) => [c.name, c.address].filter(Boolean).some((v) => v.toLowerCase().includes(q))) : customers;
    const priority = filtered.filter((c) => priorityIds.has(c.id));
    const rest = filtered.filter((c) => !priorityIds.has(c.id));
    return [...priority, ...rest];
  }, [customers, query, priorityIds]);

  const save = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try {
      await onSave(customer.id, note.trim());
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/30 px-4 py-6 overflow-y-auto" onClick={onCancel}>
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-lg text-slate-900">Add a note</h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        {!customer ? (
          <div className="px-5 py-4">
            <div className="relative mb-3">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search customers..." className="!pl-9" autoFocus />
            </div>
            <div className="max-h-72 overflow-y-auto space-y-1">
              {list.map((c) => (
                <button key={c.id} onClick={() => setCustomer(c)} className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-50">
                  <div className="text-sm font-medium text-slate-900">{c.name}</div>
                  <div className="text-xs text-slate-500">{c.address || "No address on file"}</div>
                </button>
              ))}
              {list.length === 0 && <p className="text-sm text-slate-400 text-center py-6">No customers match.</p>}
            </div>
          </div>
        ) : (
          <div className="px-5 py-4 space-y-3">
            <button onClick={() => setCustomer(null)} className="text-xs text-blue-600 hover:underline">← Different customer</button>
            <div>
              <div className="text-sm font-medium text-slate-900">{customer.name}</div>
              <div className="text-xs text-slate-500">{customer.address || "No address on file"}</div>
            </div>
            <TextArea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Gate code, a pet, anything worth remembering..." autoFocus />
            <div className="flex items-center gap-2">
              <Button variant="secondary" className="flex-1" onClick={onCancel}>Cancel</Button>
              <Button className="flex-1" onClick={save} disabled={!note.trim() || saving}>
                {saving ? <Loader2 size={15} className="animate-spin" /> : null} Save note
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// The daily-use screen: today's (and any still-overdue) jobs with call/
// navigate/mark-done, the packing checklist / confirm-tomorrow card, and a
// couple of tappable counts for anything else overdue - everything else
// lives behind "Full app".
export default function TodaySimple({
  jobs,
  customers,
  checklist,
  typeChecklists = {},
  onSaveChecklist,
  onComplete,
  onSaveJob,
  onReschedule,
  onCancelJob,
  onHeadingHome,
  hasLoggedTripToday,
  onAddNote,
  invoices,
  leads,
  onLogout,
  onGoAdvanced,
}) {
  const [completingNoPrice, setCompletingNoPrice] = useState(null);
  const [reschedulingJob, setReschedulingJob] = useState(null);
  const [addingJob, setAddingJob] = useState(false);
  const [savingJob, setSavingJob] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const today = todayStr();
  const customerById = (id) => customers.find((c) => c.id === id);

  const todaysJobsRaw = useMemo(
    () => jobs.filter((j) => j.status === "scheduled" && j.scheduled_date === today),
    [jobs, today]
  );
  // Display order only - a planning aid. Falls back to the incoming order
  // (by scheduled_date/id) for jobs never manually reordered.
  const todaysJobs = useMemo(() => {
    return [...todaysJobsRaw].sort((a, b) => {
      const ao = a.route_order ?? Number.MAX_SAFE_INTEGER;
      const bo = b.route_order ?? Number.MAX_SAFE_INTEGER;
      return ao - bo;
    });
  }, [todaysJobsRaw]);

  // Jobs from before today that never got marked done - previously these
  // only surfaced as "Overdue to complete" in the full Schedule tab, easy
  // to lose track of since Today never mentioned them.
  const overdueJobs = useMemo(
    () => jobs.filter((j) => j.status === "scheduled" && j.scheduled_date < today).sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date)),
    [jobs, today]
  );

  const moveJob = async (index, direction) => {
    const list = [...todaysJobs];
    const j = index + direction;
    if (j < 0 || j >= list.length) return;
    [list[index], list[j]] = [list[j], list[index]];
    await Promise.all(list.map((job, i) => (job.route_order !== i ? onSaveJob({ ...job, route_order: i }) : null)));
  };

  const relevantTypes = useMemo(
    () => [...new Set([...overdueJobs, ...todaysJobs].map((j) => j.job_type).filter(Boolean))],
    [overdueJobs, todaysJobs]
  );
  const effectiveChecklist = useMemo(
    () => [...new Set([...checklist, ...relevantTypes.flatMap((t) => typeChecklists[t] || [])])],
    [checklist, typeChecklists, relevantTypes]
  );

  const overdueInvoiceCount = useMemo(
    () => invoices.filter((i) => i.status === "unpaid" && i.due_date < today).length,
    [invoices, today]
  );
  const newLeadCount = useMemo(() => leads.filter((l) => l.status === "new").length, [leads]);

  const priorityIds = useMemo(() => new Set([...overdueJobs, ...todaysJobs].map((j) => j.customer_id)), [overdueJobs, todaysJobs]);

  const hasPrice = (j) => j.price != null && Number(j.price) > 0;
  const requestComplete = (j, paidNow) => (hasPrice(j) ? onComplete(j, paidNow) : setCompletingNoPrice(j));
  const confirmCompleteNoPrice = async (price) => {
    await onComplete({ ...completingNoPrice, price });
    setCompletingNoPrice(null);
  };

  const saveNewJob = async (form) => {
    setSavingJob(true);
    try {
      await onSaveJob({ ...form, job_type: form.job_type || null, price: form.price === "" ? null : Number(form.price) });
      setAddingJob(false);
    } finally {
      setSavingJob(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 overflow-hidden">
              <img src="/tydie-icon-48.png" alt="" width={36} height={36} className="w-full h-full object-cover" />
            </div>
            <div className="font-semibold text-lg text-slate-900 tracking-tight">Tydie Cleaning</div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onGoAdvanced()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-slate-500 hover:text-blue-700 transition-colors"
            >
              Full app <ArrowUpRight size={14} strokeWidth={2.25} />
            </button>
            <button
              onClick={onLogout}
              title="Sign out"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-slate-500 hover:text-blue-700 transition-colors"
            >
              <LogOut size={14} strokeWidth={2.25} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Today</h1>
          <p className="text-sm text-slate-500 mt-1">
            {todaysJobs.length === 0 ? "No jobs today." : `${todaysJobs.length} job${todaysJobs.length === 1 ? "" : "s"} today.`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setAddingNote(true)}>
            <StickyNote size={15} /> Add note
          </Button>
          <Button variant="secondary" className="flex-1" onClick={() => setAddingJob(true)}>
            <Plus size={15} /> New job
          </Button>
        </div>

        {overdueJobs.length > 0 && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-600 mb-2">
              Overdue - not marked done
            </div>
            <div className="space-y-2">
              {overdueJobs.map((j) => (
                <JobRow
                  key={j.id}
                  job={j}
                  customer={customerById(j.customer_id)}
                  overdue
                  onComplete={(paidNow) => requestComplete(j, paidNow)}
                  onReschedule={() => setReschedulingJob(j)}
                />
              ))}
            </div>
          </div>
        )}

        {todaysJobs.length === 0 && overdueJobs.length === 0 ? (
          <EmptyState icon={CalendarCheck} title="Nothing on today - enjoy it." />
        ) : todaysJobs.length > 0 ? (
          <div>
            {overdueJobs.length > 0 && <div className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700 mb-2">Today</div>}
            <div className="space-y-2">
              {todaysJobs.map((j, i) => (
                <JobRow
                  key={j.id}
                  job={j}
                  customer={customerById(j.customer_id)}
                  onComplete={(paidNow) => requestComplete(j, paidNow)}
                  onReschedule={() => setReschedulingJob(j)}
                  order={
                    todaysJobs.length > 1
                      ? { onUp: () => moveJob(i, -1), onDown: () => moveJob(i, 1), canUp: i > 0, canDown: i < todaysJobs.length - 1 }
                      : null
                  }
                />
              ))}
            </div>
          </div>
        ) : null}

        {hasLoggedTripToday && (
          <button
            onClick={onHeadingHome}
            className="flex items-center justify-center gap-2 w-full text-sm font-medium text-slate-500 hover:text-blue-700 border border-slate-200 rounded-xl px-4 py-2.5 transition-colors"
          >
            <Home size={15} /> Heading home
          </button>
        )}

        <MorningCheck jobs={jobs} customers={customers} checklist={effectiveChecklist} baseChecklist={checklist} onSaveChecklist={onSaveChecklist} />

        {(overdueInvoiceCount > 0 || newLeadCount > 0) && (
          <div className="space-y-2">
            {overdueInvoiceCount > 0 && (
              <button
                onClick={() => onGoAdvanced("billing")}
                className="flex items-center justify-between w-full bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm font-medium hover:bg-rose-100 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Receipt size={15} /> {overdueInvoiceCount} overdue {overdueInvoiceCount === 1 ? "invoice" : "invoices"}
                </span>
                <ArrowUpRight size={15} />
              </button>
            )}
            {newLeadCount > 0 && (
              <button
                onClick={() => onGoAdvanced("leads")}
                className="flex items-center justify-between w-full bg-blue-50 border border-blue-200 text-blue-700 rounded-xl px-4 py-3 text-sm font-medium hover:bg-blue-100 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Inbox size={15} /> {newLeadCount} new {newLeadCount === 1 ? "lead" : "leads"} waiting
                </span>
                <ArrowUpRight size={15} />
              </button>
            )}
          </div>
        )}
      </div>

      {completingNoPrice && (
        <CompleteNoPricePrompt
          job={completingNoPrice}
          customerName={customerById(completingNoPrice.customer_id)?.name}
          onCancel={() => setCompletingNoPrice(null)}
          onConfirm={confirmCompleteNoPrice}
        />
      )}

      {reschedulingJob && (
        <RescheduleMenu
          job={reschedulingJob}
          onClose={() => setReschedulingJob(null)}
          onReschedule={(job, date) => {
            onReschedule(job, date);
            setReschedulingJob(null);
          }}
          onCancelJob={(job) => {
            onCancelJob(job);
            setReschedulingJob(null);
          }}
        />
      )}

      {addingJob && (
        <JobForm initial={emptyTodayJob()} customers={customers} onCancel={() => setAddingJob(false)} onSave={saveNewJob} saving={savingJob} />
      )}

      {addingNote && (
        <AddNoteModal
          customers={customers}
          priorityIds={priorityIds}
          onCancel={() => setAddingNote(false)}
          onSave={async (customerId, note) => {
            await onAddNote(customerId, note);
            setAddingNote(false);
          }}
        />
      )}
    </div>
  );
}
