import React, { useMemo, useState } from "react";
import { Phone, Navigation, Check, LogOut, ArrowUpRight, CalendarCheck, Receipt, Inbox } from "lucide-react";
import { Card, Button, EmptyState } from "./ui";
import { todayStr } from "../lib/dates";
import MorningCheck from "./MorningCheck";
import { CompleteNoPricePrompt } from "./Schedule";

const cleanPhone = (p) => (p || "").replace(/[^0-9+]/g, "");
const mapsLink = (address) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

// The daily-use screen: today's jobs (call, navigate, mark done), the
// packing checklist / confirm-tomorrow card, and a couple of tappable
// counts for anything overdue - everything else lives behind "Full app".
export default function TodaySimple({ jobs, customers, checklist, onSaveChecklist, onComplete, invoices, leads, onLogout, onGoAdvanced }) {
  const [completingNoPrice, setCompletingNoPrice] = useState(null);
  const today = todayStr();
  const customerById = (id) => customers.find((c) => c.id === id);

  const todaysJobs = useMemo(
    () => jobs.filter((j) => j.status === "scheduled" && j.scheduled_date === today),
    [jobs, today]
  );

  const overdueInvoiceCount = useMemo(
    () => invoices.filter((i) => i.status === "unpaid" && i.due_date < today).length,
    [invoices, today]
  );
  const newLeadCount = useMemo(() => leads.filter((l) => l.status === "new").length, [leads]);

  const hasPrice = (j) => j.price != null && Number(j.price) > 0;
  const requestComplete = (j) => (hasPrice(j) ? onComplete(j) : setCompletingNoPrice(j));
  const confirmCompleteNoPrice = async (price) => {
    await onComplete({ ...completingNoPrice, price });
    setCompletingNoPrice(null);
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

        {todaysJobs.length === 0 ? (
          <EmptyState icon={CalendarCheck} title="Nothing on today - enjoy it." />
        ) : (
          <div className="space-y-2">
            {todaysJobs.map((j) => {
              const c = customerById(j.customer_id);
              return (
                <Card key={j.id} className="p-4">
                  <div className="font-medium text-slate-900">{c?.name || "Unknown customer"}</div>
                  <div className="text-sm text-slate-500 mt-0.5">{c?.address || "No address on file"}</div>
                  <div className="flex items-center gap-2 mt-3">
                    {c?.phone && (
                      <a
                        href={`tel:${cleanPhone(c.phone)}`}
                        className="flex items-center justify-center gap-1.5 flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-medium px-3 py-2.5 rounded-lg transition-colors"
                      >
                        <Phone size={15} /> Call
                      </a>
                    )}
                    {c?.address && (
                      <a
                        href={mapsLink(c.address)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-1.5 flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-medium px-3 py-2.5 rounded-lg transition-colors"
                      >
                        <Navigation size={15} /> Navigate
                      </a>
                    )}
                    <Button className="flex-[1.4] !py-2.5" onClick={() => requestComplete(j)}>
                      <Check size={16} strokeWidth={2.5} /> Mark done
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <MorningCheck jobs={jobs} customers={customers} checklist={checklist} onSaveChecklist={onSaveChecklist} />

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
    </div>
  );
}
