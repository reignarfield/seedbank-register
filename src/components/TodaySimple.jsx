import React, { useEffect, useMemo, useState } from "react";
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
  CloudRain,
  MapPin,
  PartyPopper,
  FlaskConical,
  KeyRound,
} from "lucide-react";
import { Card, Button, EmptyState, TextInput, TextArea, money } from "./ui";
import { todayStr, addDays, formatDate } from "../lib/dates";
import { fetchRainChance } from "../lib/weather";
import MorningCheck from "./MorningCheck";
import TodoList from "./TodoList";
import { ActivityTodayLine } from "./ActivityFeed";
import { jobsToday, jobsOverdue, jobsCompletedToday, invoicesOverdue, leadsNew } from "../lib/today";
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

// A one-tap "I'm on" moment before the normal screen underneath - not a
// gate, everything below is already visible, this is the ritual of
// explicitly starting rather than the app just always being on.
function StartDayCard({ homeBaseAddress, rainChance, onStart }) {
  return (
    <Card className="p-5 border-blue-200 bg-blue-50/50">
      <h2 className="font-semibold text-lg text-slate-900 mb-1">Ready to start your day?</h2>
      <p className="text-sm text-slate-600 mb-3">Here's today's route and kit below - have a look, then start when you're ready.</p>
      <div className="space-y-1.5 mb-4">
        {rainChance != null && (
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <CloudRain size={13} /> {rainChance >= 40 ? `Rain likely today (${rainChance}%)` : `Rain unlikely today (${rainChance}%)`}
          </p>
        )}
        <p className="text-xs text-slate-500 flex items-center gap-1.5">
          <MapPin size={13} /> Starting from: {homeBaseAddress || "home base (not set)"}
        </p>
      </div>
      <Button className="w-full" onClick={onStart}>Start my day</Button>
    </Card>
  );
}

// Everything a person needs to know standing at the gate lives on this card:
// the job's own notes, the customer's access notes (gate code, dog, ladder),
// and the most recent thing jotted about them. Each comes from exactly one
// place - job.notes, customer.access_notes, customer_notes - so what's shown
// here is what's stored there, never a copy that can drift.
function JobRow({ job, customer, latestNote, overdue, onComplete, onReschedule, order }) {
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
          {job.notes && <div className="text-sm text-slate-700 mt-1.5">{job.notes}</div>}
          {customer?.access_notes && (
            <div className="flex items-start gap-1.5 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 mt-2">
              <KeyRound size={14} className="shrink-0 mt-0.5" />
              <span>{customer.access_notes}</span>
            </div>
          )}
          {latestNote && (
            <div className="flex items-start gap-1.5 text-xs text-slate-500 mt-1.5">
              <StickyNote size={12} className="shrink-0 mt-0.5" />
              <span><span className="text-slate-400">{formatDate(latestNote.created_at.slice(0, 10))} — </span>{latestNote.note}</span>
            </div>
          )}
        </div>
        {order && (
          <div className="flex flex-col shrink-0 border border-slate-200 rounded-lg overflow-hidden">
            <button onClick={order.onUp} disabled={!order.canUp} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:bg-transparent">
              <ChevronUp size={16} />
            </button>
            <div className="border-t border-slate-200" />
            <button onClick={order.onDown} disabled={!order.canDown} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:bg-transparent">
              <ChevronDown size={16} />
            </button>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 mt-3">
        {customer?.phone && (
          <a
            href={`tel:${cleanPhone(customer.phone)}`}
            className="flex items-center justify-center gap-1.5 flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-medium px-2 py-2.5 rounded-lg transition-colors whitespace-nowrap"
          >
            <Phone size={15} /> Call
          </a>
        )}
        {customer?.address && (
          <a
            href={mapsLink(customer.address)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-medium px-2 py-2.5 rounded-lg transition-colors whitespace-nowrap"
          >
            <Navigation size={15} /> Navigate
          </a>
        )}
        <Button className="flex-[1.4] !py-2.5 !px-2 whitespace-nowrap" onClick={() => onComplete(priced ? paidNow : false)}>
          <Check size={16} strokeWidth={2.5} /> Mark done
        </Button>
      </div>
      <div className="flex items-center justify-between mt-2.5">
        <button onClick={onReschedule} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
          <Clock size={13} /> Can't do it today
        </button>
        {priced && (
          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            <input type="checkbox" checked={paidNow} onChange={(e) => setPaidNow(e.target.checked)} className="w-4 h-4 accent-blue-600" />
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
  // A stray tap outside the box shouldn't silently throw away a typed note.
  const dismiss = () => {
    if (note.trim() && !confirm("Discard this note?")) return;
    onCancel();
  };

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
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/30 px-4 py-6 overflow-y-auto" onClick={dismiss}>
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-lg text-slate-900">Add a note</h2>
          <button onClick={dismiss} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
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
  customerNotes = [],
  activity = [],
  onUndoActivity,
  checklist,
  typeChecklists = {},
  onSaveChecklist,
  onComplete,
  onSaveJob,
  onReschedule,
  onCancelJob,
  onHeadingHome,
  hasLoggedTripToday,
  todayTripKm = 0,
  onAddNote,
  homeBaseAddress,
  homeBaseLat,
  homeBaseLng,
  dayStartedToday,
  onStartDay,
  invoices,
  leads,
  nudges = [],
  onNudgeDone,
  onNudgeSnooze,
  onNudgeApproveSend,
  demoMode,
  onEnterDemo,
  onExitDemo,
  onLogout,
  onGoAdvanced,
}) {
  const [completingNoPrice, setCompletingNoPrice] = useState(null);
  const [reschedulingJob, setReschedulingJob] = useState(null);
  const [addingJob, setAddingJob] = useState(false);
  const [savingJob, setSavingJob] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [rainChance, setRainChance] = useState(null);
  const [weatherDismissed, setWeatherDismissed] = useState(false);
  const today = todayStr();
  const customerById = (id) => customers.find((c) => c.id === id);
  // customer_notes arrive newest-first, so the first hit per customer is the latest.
  const latestNoteFor = useMemo(() => {
    const m = new Map();
    for (const n of customerNotes) if (!m.has(n.customer_id)) m.set(n.customer_id, n);
    return m;
  }, [customerNotes]);

  useEffect(() => {
    if (homeBaseLat != null && homeBaseLng != null) {
      fetchRainChance(homeBaseLat, homeBaseLng).then(setRainChance);
    }
  }, [homeBaseLat, homeBaseLng]);

  // What "today", "overdue" and "done today" mean is defined once, in
  // lib/today.js, and shared with the Dashboard and the morning card.
  const todaysJobs = useMemo(() => jobsToday(jobs, today), [jobs, today]);
  const overdueJobs = useMemo(() => jobsOverdue(jobs, today), [jobs, today]);

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

  const overdueInvoiceCount = useMemo(() => invoicesOverdue(invoices, today).length, [invoices, today]);
  const newLeadCount = useMemo(() => leadsNew(leads).length, [leads]);

  const priorityIds = useMemo(() => new Set([...overdueJobs, ...todaysJobs].map((j) => j.customer_id)), [overdueJobs, todaysJobs]);

  // What actually got done today, regardless of which day it was originally
  // scheduled for - an overdue job finished today still counts as today's work.
  const completedTodayJobs = useMemo(() => jobsCompletedToday(jobs, today), [jobs, today]);
  const completedTodayTotal = useMemo(() => completedTodayJobs.reduce((s, j) => s + Number(j.price || 0), 0), [completedTodayJobs]);

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
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 overflow-hidden">
              <img src="/tydie-icon-48.png" alt="" width={36} height={36} className="w-full h-full object-cover" />
            </div>
            <div className="font-semibold text-lg text-slate-900 tracking-tight whitespace-nowrap truncate">Tydie Cleaning</div>
            {demoMode && (
              <button
                onClick={onExitDemo}
                title="Showing demo data - tap to go back to real data"
                className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold rounded-full px-2 py-0.5 transition-colors"
              >
                DEMO
              </button>
            )}
          </div>
          <div className="flex items-center gap-1">
            {!demoMode && (
              <button
                onClick={onEnterDemo}
                title="Switch to a sample business to explore or show the app - nothing real is touched"
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-full text-sm font-medium text-slate-400 hover:text-amber-600 transition-colors whitespace-nowrap shrink-0"
              >
                <FlaskConical size={14} strokeWidth={2.25} />
                <span className="hidden sm:inline">Demo</span>
              </button>
            )}
            <button
              onClick={() => onGoAdvanced()}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-full text-sm font-medium text-slate-500 hover:text-blue-700 transition-colors whitespace-nowrap shrink-0"
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

        {!dayStartedToday && (
          <StartDayCard homeBaseAddress={homeBaseAddress} rainChance={rainChance} onStart={onStartDay} />
        )}

        {dayStartedToday && rainChance != null && rainChance >= 40 && !weatherDismissed && (
          <div className="flex items-center justify-between gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-2.5 text-sm">
            <span className="flex items-center gap-2">
              <CloudRain size={15} /> Rain likely today ({rainChance}%) - some jobs might need moving.
            </span>
            <button onClick={() => setWeatherDismissed(true)} className="text-amber-600 hover:text-amber-800 shrink-0">
              <X size={15} />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button variant="secondary" className="flex-1 !py-1.5 !text-xs" onClick={() => setAddingNote(true)}>
            <StickyNote size={13} /> Add note
          </Button>
          <Button variant="secondary" className="flex-1 !py-1.5 !text-xs" onClick={() => setAddingJob(true)}>
            <Plus size={13} /> New job
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
                  latestNote={latestNoteFor.get(j.customer_id)}
                  overdue
                  onComplete={(paidNow) => requestComplete(j, paidNow)}
                  onReschedule={() => setReschedulingJob(j)}
                />
              ))}
            </div>
          </div>
        )}

        {todaysJobs.length === 0 && overdueJobs.length === 0 ? (
          completedTodayJobs.length > 0 ? (
            <Card className="p-5 text-center border-emerald-200 bg-emerald-50/50">
              <PartyPopper size={22} className="mx-auto text-emerald-600 mb-2" />
              <div className="text-base font-semibold text-slate-900">All done for today</div>
              <div className="text-sm text-slate-600 mt-1">
                {completedTodayJobs.length} job{completedTodayJobs.length === 1 ? "" : "s"} · {money(completedTodayTotal)} earned
                {todayTripKm > 0 && ` · ${todayTripKm.toFixed(todayTripKm % 1 === 0 ? 0 : 1)} km driven`}
              </div>
            </Card>
          ) : (
            <EmptyState icon={CalendarCheck} title="Nothing on today - enjoy it." />
          )
        ) : todaysJobs.length > 0 ? (
          <div>
            {overdueJobs.length > 0 && <div className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700 mb-2">Today</div>}
            <div className="space-y-2">
              {todaysJobs.map((j, i) => (
                <JobRow
                  key={j.id}
                  job={j}
                  customer={customerById(j.customer_id)}
                  latestNote={latestNoteFor.get(j.customer_id)}
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

        {/* What isn't booked but should be: leads nobody rang back, regulars
            past due, invoices gone quiet. Below today's jobs deliberately -
            the work in front of him comes first. */}
        <TodoList
          nudges={nudges}
          onDone={onNudgeDone}
          onSnooze={onNudgeSnooze}
          onApproveSend={onNudgeApproveSend}
          onOpen={onGoAdvanced}
        />

        <MorningCheck jobs={jobs} customers={customers} checklist={effectiveChecklist} baseChecklist={checklist} onSaveChecklist={onSaveChecklist} />

        <ActivityTodayLine activity={activity} onUndo={onUndoActivity} />

        {overdueInvoiceCount > 0 && newLeadCount > 0 ? (
          <button
            onClick={() => onGoAdvanced("billing")}
            className="flex items-center justify-between w-full bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm font-medium hover:bg-amber-100 transition-colors"
          >
            <span>
              {overdueInvoiceCount} overdue {overdueInvoiceCount === 1 ? "invoice" : "invoices"} · {newLeadCount} new {newLeadCount === 1 ? "lead" : "leads"} - need a look
            </span>
            <ArrowUpRight size={15} className="shrink-0" />
          </button>
        ) : overdueInvoiceCount > 0 ? (
          <button
            onClick={() => onGoAdvanced("billing")}
            className="flex items-center justify-between w-full bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm font-medium hover:bg-rose-100 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Receipt size={15} /> {overdueInvoiceCount} overdue {overdueInvoiceCount === 1 ? "invoice" : "invoices"}
            </span>
            <ArrowUpRight size={15} />
          </button>
        ) : newLeadCount > 0 ? (
          <button
            onClick={() => onGoAdvanced("leads")}
            className="flex items-center justify-between w-full bg-blue-50 border border-blue-200 text-blue-700 rounded-xl px-4 py-3 text-sm font-medium hover:bg-blue-100 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Inbox size={15} /> {newLeadCount} new {newLeadCount === 1 ? "lead" : "leads"} waiting
            </span>
            <ArrowUpRight size={15} />
          </button>
        ) : null}
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
