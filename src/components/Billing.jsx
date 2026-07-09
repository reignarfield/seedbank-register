import React, { useState } from "react";
import Quotes from "./Quotes";
import Invoices from "./Invoices";
import Expenses from "./Expenses";

export default function Billing({
  quotes,
  invoices,
  expenses,
  customers,
  jobs,
  onSaveQuote,
  onDeleteQuote,
  onSaveInvoice,
  onDeleteInvoice,
  onMarkInvoicePaid,
  onSaveExpense,
  onDeleteExpense,
  onScheduleFromQuote,
  onConvertQuoteAndSchedule,
  quoteDraft,
  onQuoteDraftConsumed,
  invoiceDraft,
  onInvoiceDraftConsumed,
}) {
  const [tab, setTab] = useState(quoteDraft ? "quotes" : invoiceDraft ? "invoices" : "quotes");

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-slate-900">Billing</h1>
        <p className="text-sm text-slate-500 mt-1">Quote new work, invoice and track what's been paid, and log expenses for tax time.</p>
      </div>
      <div className="flex items-center gap-1 bg-slate-100 rounded-full p-1 mb-5 w-fit">
        <button
          onClick={() => setTab("quotes")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${tab === "quotes" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-blue-700"}`}
        >
          Quotes
        </button>
        <button
          onClick={() => setTab("invoices")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${tab === "invoices" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-blue-700"}`}
        >
          Invoices
        </button>
        <button
          onClick={() => setTab("expenses")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${tab === "expenses" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-blue-700"}`}
        >
          Expenses
        </button>
      </div>

      {tab === "quotes" && (
        <Quotes
          quotes={quotes}
          customers={customers}
          onSave={onSaveQuote}
          onDelete={onDeleteQuote}
          onScheduleFromQuote={onScheduleFromQuote}
          onConvertAndSchedule={onConvertQuoteAndSchedule}
          draft={quoteDraft}
          onDraftConsumed={onQuoteDraftConsumed}
        />
      )}
      {tab === "invoices" && (
        <Invoices
          invoices={invoices}
          customers={customers}
          jobs={jobs}
          onSave={onSaveInvoice}
          onDelete={onDeleteInvoice}
          onMarkPaid={onMarkInvoicePaid}
          draft={invoiceDraft}
          onDraftConsumed={onInvoiceDraftConsumed}
        />
      )}
      {tab === "expenses" && <Expenses expenses={expenses} onSave={onSaveExpense} onDelete={onDeleteExpense} />}
    </div>
  );
}
