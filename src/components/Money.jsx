import React, { useMemo, useState } from "react";
import { Download, ChevronRight } from "lucide-react";
import { Card, money } from "./ui";
import { todayStr } from "../lib/dates";
import { invoicesOverdue, invoicesUnpaid } from "../lib/today";
import Quotes from "./Quotes";
import Invoices from "./Invoices";
import Expenses from "./Expenses";
import Mileage from "./Mileage";
import TaxPack from "./TaxPack";

// Everything to do with money, in one place: what's owed, what's late, what
// went out, what was driven for the tax claim, and the year-end pack. The
// two numbers at the top are the ones he'd otherwise open the app to find.

const SEGMENTS = [
  { id: "invoices", label: "Invoices" },
  { id: "quotes", label: "Quotes" },
  { id: "expenses", label: "Expenses" },
  { id: "km", label: "Km" },
];

export default function Money({
  tab,
  onTab,
  quotes,
  invoices,
  expenses,
  trips,
  customers,
  jobs,
  settings,
  allInvoices,
  allExpenses,
  allTrips,
  allCustomers,
  onSaveQuote,
  onDeleteQuote,
  onSaveInvoice,
  onDeleteInvoice,
  onMarkInvoicePaid,
  onEmailInvoice,
  onSaveExpense,
  onDeleteExpense,
  onSaveTrip,
  onDeleteTrip,
  onCacheCoords,
  onOpenSettings,
  onScheduleFromQuote,
  onConvertQuoteAndSchedule,
  quoteDraft,
  onQuoteDraftConsumed,
  invoiceDraft,
  onInvoiceDraftConsumed,
}) {
  const [showTaxPack, setShowTaxPack] = useState(false);
  const today = todayStr();

  const owed = useMemo(() => invoicesUnpaid(invoices).reduce((s, i) => s + Number(i.amount || 0), 0), [invoices]);
  const overdue = useMemo(() => invoicesOverdue(invoices, today).reduce((s, i) => s + Number(i.amount || 0), 0), [invoices, today]);
  const thisMonth = today.slice(0, 7);
  const net = useMemo(() => {
    const income = invoices.filter((i) => i.status === "paid" && (i.paid_date || "").slice(0, 7) === thisMonth).reduce((s, i) => s + Number(i.amount || 0), 0);
    const spent = expenses.filter((e) => e.expense_date.slice(0, 7) === thisMonth).reduce((s, e) => s + Number(e.amount || 0), 0);
    return income - spent;
  }, [invoices, expenses, thisMonth]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-32 md:pb-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-slate-900">Money</h1>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5">
        <Card className="p-3 sm:p-4">
          <div className="text-lg sm:text-xl font-semibold tabular-nums text-slate-900">{money(owed)}</div>
          <div className="text-xs text-slate-500">owed to you</div>
        </Card>
        <Card className={`p-3 sm:p-4 ${overdue > 0 ? "border-rose-200" : ""}`}>
          <div className={`text-lg sm:text-xl font-semibold tabular-nums ${overdue > 0 ? "text-rose-600" : "text-slate-900"}`}>{money(overdue)}</div>
          <div className="text-xs text-slate-500">overdue</div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className={`text-lg sm:text-xl font-semibold tabular-nums ${net < 0 ? "text-rose-600" : "text-emerald-600"}`}>{money(net)}</div>
          <div className="text-xs text-slate-500">this month, after costs</div>
        </Card>
      </div>

      <div className="flex items-center gap-1 bg-slate-100 rounded-full p-1 mb-5 w-fit max-w-full overflow-x-auto">
        {SEGMENTS.map((s) => (
          <button
            key={s.id}
            onClick={() => onTab(s.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${tab === s.id ? "bg-blue-600 text-white" : "text-slate-500 hover:text-blue-700"}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {tab === "invoices" && (
        <Invoices invoices={invoices} customers={customers} jobs={jobs} settings={settings} onSave={onSaveInvoice} onDelete={onDeleteInvoice} onMarkPaid={onMarkInvoicePaid} onEmail={onEmailInvoice} draft={invoiceDraft} onDraftConsumed={onInvoiceDraftConsumed} />
      )}
      {tab === "quotes" && (
        <Quotes quotes={quotes} customers={customers} onSave={onSaveQuote} onDelete={onDeleteQuote} onScheduleFromQuote={onScheduleFromQuote} onConvertAndSchedule={onConvertQuoteAndSchedule} draft={quoteDraft} onDraftConsumed={onQuoteDraftConsumed} />
      )}
      {tab === "expenses" && <Expenses expenses={expenses} settings={settings} onSave={onSaveExpense} onDelete={onDeleteExpense} />}
      {tab === "km" && (
        <Mileage trips={trips} customers={customers} settings={settings} onSaveTrip={onSaveTrip} onDeleteTrip={onDeleteTrip} onOpenSettings={onOpenSettings} onCacheCoords={onCacheCoords} embedded />
      )}

      <button
        onClick={() => setShowTaxPack(true)}
        className="mt-8 flex items-center justify-between w-full text-sm text-slate-600 hover:text-blue-700 border border-slate-200 rounded-xl px-4 py-3 transition-colors"
      >
        <span className="flex items-center gap-2"><Download size={15} /> Tax pack - a year's records for the accountant</span>
        <ChevronRight size={15} />
      </button>

      {showTaxPack && <TaxPack invoices={allInvoices} customers={allCustomers} expenses={allExpenses} trips={allTrips} settings={settings} onClose={() => setShowTaxPack(false)} />}
    </div>
  );
}
