import React, { useMemo, useState } from "react";
import { AlertCircle, CalendarClock, CalendarDays, Car, Inbox, Receipt, ShieldAlert, TrendingUp, Users, Plus, Loader2 } from "lucide-react";
import { Card, SectionTitle, StatusPill, EmptyState, money, Button, TextInput, Field } from "./ui";
import { dueStatus, formatDate, todayStr, daysBetween, financialYearStart } from "../lib/dates";
import MorningCheck from "./MorningCheck";

const RENEWAL_LEAD_DAYS = 30;

function RenewalQuickAdd({ onSave, onCancel }) {
  const [name, setName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const canSave = name.trim() && dueDate;

  const save = async () => {
    setSaving(true);
    try {
      await onSave({ name: name.trim(), due_date: dueDate });
      onCancel();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-slate-200 rounded-lg p-3 space-y-2 mb-2">
      <div className="grid grid-cols-2 gap-2">
        <Field label="What">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Public liability insurance" />
        </Field>
        <Field label="Due">
          <TextInput type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={onCancel}>Cancel</Button>
        <Button className="!px-3 !py-1.5 !text-xs" onClick={save} disabled={!canSave || saving}>
          {saving ? <Loader2 size={13} className="animate-spin" /> : null} Add
        </Button>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone = "text-slate-900", onClick }) {
  const inner = (
    <>
      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
        <Icon size={18} className="text-blue-600" />
      </div>
      <div>
        <div className={`text-xl font-semibold tabular-nums ${tone}`}>{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </>
  );
  if (onClick) {
    return (
      <button onClick={onClick} className="text-left">
        <Card className="p-4 flex items-center gap-3 h-full hover:border-blue-300 transition-colors">{inner}</Card>
      </button>
    );
  }
  return <Card className="p-4 flex items-center gap-3">{inner}</Card>;
}

export default function Dashboard({
  customers,
  jobs,
  invoices,
  leads,
  expenses,
  renewals,
  trips,
  checklist,
  setView,
  onScheduleCustomer,
  onMarkPaid,
  onSaveRenewal,
  onDeleteRenewal,
  onSaveChecklist,
}) {
  const today = todayStr();
  const [addingRenewal, setAddingRenewal] = useState(false);

  const attention = useMemo(() => {
    return customers
      .filter((c) => c.status === "active")
      .map((c) => ({ customer: c, status: dueStatus(c) }))
      .filter((x) => x.status === "overdue" || x.status === "due_soon")
      .sort((a, b) => (a.status === b.status ? 0 : a.status === "overdue" ? -1 : 1));
  }, [customers]);

  const upcomingJobs = useMemo(
    () =>
      jobs
        .filter((j) => j.status === "scheduled" && daysBetween(today, j.scheduled_date) >= 0 && daysBetween(today, j.scheduled_date) <= 7)
        .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date)),
    [jobs, today]
  );

  const overdueInvoices = useMemo(
    () => invoices.filter((i) => i.status === "unpaid" && i.due_date < today).sort((a, b) => a.due_date.localeCompare(b.due_date)),
    [invoices, today]
  );

  const unpaidTotal = useMemo(() => invoices.filter((i) => i.status === "unpaid").reduce((sum, i) => sum + Number(i.amount || 0), 0), [invoices]);

  const newLeads = useMemo(() => leads.filter((l) => l.status === "new"), [leads]);

  const thisMonth = today.slice(0, 7);
  const profitThisMonth = useMemo(() => {
    const income = invoices.filter((i) => i.status === "paid" && (i.paid_date || "").slice(0, 7) === thisMonth).reduce((sum, i) => sum + Number(i.amount || 0), 0);
    const spent = expenses.filter((e) => e.expense_date.slice(0, 7) === thisMonth).reduce((sum, e) => sum + Number(e.amount || 0), 0);
    return { income, spent, net: income - spent };
  }, [invoices, expenses, thisMonth]);

  const upcomingRenewals = useMemo(
    () => [...renewals].filter((r) => daysBetween(today, r.due_date) <= RENEWAL_LEAD_DAYS).sort((a, b) => a.due_date.localeCompare(b.due_date)),
    [renewals, today]
  );

  const fyKm = useMemo(() => {
    const fyStart = financialYearStart();
    return (trips || []).filter((t) => t.trip_date >= fyStart).reduce((sum, t) => sum + Number(t.distance_km || 0), 0);
  }, [trips]);

  const customerById = (id) => customers.find((c) => c.id === id);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">What needs your attention today.</p>
      </div>

      <MorningCheck jobs={jobs} customers={customers} checklist={checklist} onSaveChecklist={onSaveChecklist} />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard icon={CalendarDays} label="Jobs this week" value={upcomingJobs.length} />
        <StatCard icon={CalendarClock} label="Due / overdue customers" value={attention.length} tone={attention.some((a) => a.status === "overdue") ? "text-rose-600" : "text-slate-900"} />
        <StatCard icon={Receipt} label="Unpaid invoices" value={money(unpaidTotal)} tone={overdueInvoices.length ? "text-rose-600" : "text-slate-900"} />
        <StatCard icon={Inbox} label="New leads" value={newLeads.length} tone={newLeads.length ? "text-blue-600" : "text-slate-900"} />
        <StatCard icon={TrendingUp} label="Profit this month" value={money(profitThisMonth.net)} tone={profitThisMonth.net < 0 ? "text-rose-600" : "text-emerald-600"} />
        <StatCard icon={Car} label="Work km this year" value={`${fyKm.toFixed(fyKm % 1 === 0 ? 0 : 1)} km`} onClick={() => setView("mileage")} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4 sm:p-5">
          <SectionTitle action={<button onClick={() => setView("customers")} className="text-xs font-medium text-blue-600 hover:underline">View all</button>}>
            Needs scheduling
          </SectionTitle>
          {attention.length === 0 ? (
            <EmptyState icon={Users} title="Nobody's due right now." subtitle="Recurring customers will show up here as their next clean approaches." />
          ) : (
            <div className="space-y-2">
              {attention.slice(0, 8).map(({ customer, status }) => (
                <div key={customer.id} className="flex items-center justify-between gap-3 border border-slate-100 rounded-lg px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{customer.name}</div>
                    <div className="text-xs text-slate-500 truncate">{customer.address || "No address on file"}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusPill status={status} />
                    <Button variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={() => onScheduleCustomer(customer)}>
                      Schedule
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4 sm:p-5">
          <SectionTitle action={<button onClick={() => setView("schedule")} className="text-xs font-medium text-blue-600 hover:underline">View schedule</button>}>
            Next 7 days
          </SectionTitle>
          {upcomingJobs.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Nothing booked in the next 7 days." />
          ) : (
            <div className="space-y-2">
              {upcomingJobs.slice(0, 8).map((j) => {
                const c = customerById(j.customer_id);
                return (
                  <div key={j.id} className="flex items-center justify-between gap-3 border border-slate-100 rounded-lg px-3 py-2.5">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">{c?.name || "Unknown customer"}</div>
                      <div className="text-xs text-slate-500 truncate">{c?.address || ""}</div>
                    </div>
                    <div className="text-xs font-medium text-slate-600 shrink-0">{formatDate(j.scheduled_date)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-4 sm:p-5">
          <SectionTitle action={<button onClick={() => setView("billing")} className="text-xs font-medium text-blue-600 hover:underline">View billing</button>}>
            Overdue invoices
          </SectionTitle>
          {overdueInvoices.length === 0 ? (
            <EmptyState icon={Receipt} title="No overdue invoices." />
          ) : (
            <div className="space-y-2">
              {overdueInvoices.slice(0, 8).map((inv) => {
                const c = customerById(inv.customer_id);
                return (
                  <div key={inv.id} className="flex items-center justify-between gap-3 border border-rose-100 bg-rose-50/40 rounded-lg px-3 py-2.5">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">{c?.name || "Unknown customer"}</div>
                      <div className="text-xs text-rose-600 flex items-center gap-1"><AlertCircle size={11} /> Due {formatDate(inv.due_date)}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold tabular-nums text-slate-900">{money(inv.amount)}</span>
                      <Button variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={() => onMarkPaid(inv)}>
                        Mark paid
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-4 sm:p-5">
          <SectionTitle action={<button onClick={() => setView("leads")} className="text-xs font-medium text-blue-600 hover:underline">View leads</button>}>
            New leads
          </SectionTitle>
          {newLeads.length === 0 ? (
            <EmptyState icon={Inbox} title="No new leads waiting." />
          ) : (
            <div className="space-y-2">
              {newLeads.slice(0, 8).map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-3 border border-blue-100 bg-blue-50/40 rounded-lg px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{l.name}</div>
                    <div className="text-xs text-slate-500 truncate">{l.phone || l.email || "No contact info"}</div>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">{formatDate(l.created_at.slice(0, 10))}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4 sm:p-5">
          <SectionTitle
            action={
              !addingRenewal && (
                <button onClick={() => setAddingRenewal(true)} className="text-xs font-medium text-blue-600 hover:underline flex items-center gap-1">
                  <Plus size={12} /> Add
                </button>
              )
            }
          >
            Upcoming renewals
          </SectionTitle>
          {addingRenewal && <RenewalQuickAdd onSave={onSaveRenewal} onCancel={() => setAddingRenewal(false)} />}
          {upcomingRenewals.length === 0 ? (
            <EmptyState icon={ShieldAlert} title="Nothing due in the next 30 days." subtitle="Insurance, licences, anything with a renewal date." />
          ) : (
            <div className="space-y-2">
              {upcomingRenewals.map((r) => {
                const overdue = r.due_date < today;
                return (
                  <div key={r.id} className={`flex items-center justify-between gap-3 border rounded-lg px-3 py-2.5 ${overdue ? "border-rose-100 bg-rose-50/40" : "border-slate-100"}`}>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">{r.name}</div>
                      <div className={`text-xs flex items-center gap-1 ${overdue ? "text-rose-600" : "text-slate-500"}`}>
                        {overdue && <AlertCircle size={11} />} {overdue ? "Overdue since" : "Due"} {formatDate(r.due_date)}
                      </div>
                    </div>
                    <button onClick={() => onDeleteRenewal(r.id)} className="text-xs text-slate-400 hover:text-rose-600 shrink-0">
                      Done
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
