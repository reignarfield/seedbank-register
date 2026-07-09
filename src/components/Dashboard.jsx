import React, { useMemo } from "react";
import { AlertCircle, CalendarClock, CalendarDays, Inbox, Receipt, Users } from "lucide-react";
import { Card, SectionTitle, StatusPill, EmptyState, money, Button } from "./ui";
import { dueStatus, formatDate, todayStr, daysBetween } from "../lib/dates";

function StatCard({ icon: Icon, label, value, tone = "text-slate-900" }) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
        <Icon size={18} className="text-blue-600" />
      </div>
      <div>
        <div className={`text-xl font-semibold tabular-nums ${tone}`}>{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </Card>
  );
}

export default function Dashboard({ customers, jobs, invoices, leads, setView, onScheduleCustomer, onMarkPaid }) {
  const today = todayStr();

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

  const customerById = (id) => customers.find((c) => c.id === id);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">What needs your attention today.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={CalendarDays} label="Jobs this week" value={upcomingJobs.length} />
        <StatCard icon={CalendarClock} label="Due / overdue customers" value={attention.length} tone={attention.some((a) => a.status === "overdue") ? "text-rose-600" : "text-slate-900"} />
        <StatCard icon={Receipt} label="Unpaid invoices" value={money(unpaidTotal)} tone={overdueInvoices.length ? "text-rose-600" : "text-slate-900"} />
        <StatCard icon={Inbox} label="New leads" value={newLeads.length} tone={newLeads.length ? "text-blue-600" : "text-slate-900"} />
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
      </div>
    </div>
  );
}
