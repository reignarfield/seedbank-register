import React, { useMemo, useState } from "react";
import { Download, X, FileSpreadsheet } from "lucide-react";
import { Button, Select, Field, money } from "./ui";
import { todayStr, addDays } from "../lib/dates";
import { fyRange, incomeCsv, outstandingCsv, expensesCsv, assetsCsv, tripsCsv, summaryCsv, downloadCsv } from "../lib/taxPack";

// Pick a financial year, see the headline numbers, download each file.
// Archived rows are included: they left the screen, not the books.

export default function TaxPack({ invoices, customers, expenses, trips, settings, onClose }) {
  // This FY and the previous three - a sole trader rarely needs more on hand.
  const options = useMemo(() => {
    const out = [];
    let anchor = todayStr();
    for (let i = 0; i < 4; i++) {
      out.push(fyRange(anchor));
      anchor = addDays(out[i].start, -1);
    }
    return out;
  }, []);
  const [fyLabel, setFyLabel] = useState(options[0].label);
  const range = options.find((o) => o.label === fyLabel) || options[0];
  const rate = settings.mileage_rate_cents ?? 88;

  const stats = useMemo(() => {
    const inR = (d) => d && d >= range.start && d <= range.end;
    const income = invoices.filter((i) => i.status === "paid" && inR(i.paid_date)).reduce((s, i) => s + Number(i.amount), 0);
    const spent = expenses.filter((e) => inR(e.expense_date)).reduce((s, e) => s + Number(e.amount), 0);
    const km = trips.filter((t) => inR(t.trip_date)).reduce((s, t) => s + Number(t.distance_km), 0);
    const receipts = expenses.filter((e) => inR(e.expense_date)).length;
    const withPhoto = expenses.filter((e) => inR(e.expense_date) && e.receipt_path).length;
    return { income, spent, km, receipts, withPhoto };
  }, [invoices, expenses, trips, range]);

  const file = (name, text) => downloadCsv(`${name}-FY${range.label}.csv`, text);
  const rows = [
    ["Summary", "The headline numbers on one sheet.", () => file("summary", summaryCsv({ invoices, expenses, trips }, range, rate))],
    ["Income received", "Every paid invoice, by the date it was paid.", () => file("income", incomeCsv(invoices, customers, range))],
    ["Still outstanding", "Unpaid invoices issued this year.", () => file("outstanding", outstandingCsv(invoices, customers, range))],
    ["Expenses", "By date and category, with GST and whether a receipt's on file.", () => file("expenses", expensesCsv(expenses, range))],
    ["Assets bought", "Anything flagged as an asset - instant write-off candidates.", () => file("assets", assetsCsv(expenses, range))],
    ["Kilometres", "The full trip log with the cents-per-km estimate at the bottom.", () => file("kilometres", tripsCsv(trips, range, rate))],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/30 px-4 py-6 overflow-y-auto" onClick={onClose}>
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-lg text-slate-900">Tax pack</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <Field label="Financial year">
            <Select value={fyLabel} onChange={(e) => setFyLabel(e.target.value)}>
              {options.map((o) => <option key={o.label} value={o.label}>{o.label} (1 Jul – 30 Jun)</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-50 rounded-lg p-2"><div className="text-sm font-semibold tabular-nums text-emerald-700">{money(stats.income)}</div><div className="text-[11px] text-slate-500">received</div></div>
            <div className="bg-slate-50 rounded-lg p-2"><div className="text-sm font-semibold tabular-nums text-slate-900">{money(stats.spent)}</div><div className="text-[11px] text-slate-500">spent</div></div>
            <div className="bg-slate-50 rounded-lg p-2"><div className="text-sm font-semibold tabular-nums text-slate-900">{stats.km.toFixed(0)} km</div><div className="text-[11px] text-slate-500">driven</div></div>
          </div>
          {stats.receipts > 0 && stats.withPhoto < stats.receipts && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              {stats.receipts - stats.withPhoto} of {stats.receipts} expenses have no receipt photo. The ATO needs written evidence once claims pass $300.
            </p>
          )}
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
            {rows.map(([name, blurb, go]) => (
              <button key={name} onClick={go} className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-slate-50 first:rounded-t-xl last:rounded-b-xl">
                <FileSpreadsheet size={16} className="text-emerald-600 shrink-0" />
                <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-slate-900">{name}</span><span className="block text-xs text-slate-500">{blurb}</span></span>
                <Download size={15} className="text-slate-400 shrink-0" />
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-400">Records only. Nothing here is tax advice - hand the files to your accountant.</p>
        </div>
        <div className="px-5 pb-4">
          <Button variant="secondary" className="w-full" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
