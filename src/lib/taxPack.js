// The year-end pack: what the accountant gets. Plain CSVs built from what was
// captured along the way - nothing here calculates tax, it lays the records
// out so someone qualified can. Archived rows are included on purpose:
// archiving hides a record from the screen, never from the books.

import { financialYearStart, financialYearLabel, addDays } from "./dates";

function csvEscape(v) {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(headers, rows) {
  return [headers, ...rows].map((r) => r.map(csvEscape).join(",")).join("\r\n") + "\r\n";
}

// The FY containing `anchorDate`, as [start, endInclusive].
export function fyRange(anchorDate) {
  const start = financialYearStart(anchorDate);
  const end = addDays(`${Number(start.slice(0, 4)) + 1}-07-01`, -1);
  return { start, end, label: financialYearLabel(anchorDate) };
}

const inRange = (d, { start, end }) => d && d >= start && d <= end;

// Income is recognised when paid - the cash basis most sole traders report on.
export function incomeCsv(invoices, customers, range) {
  const byId = new Map(customers.map((c) => [c.id, c]));
  const rows = invoices
    .filter((i) => i.status === "paid" && inRange(i.paid_date, range))
    .sort((a, b) => a.paid_date.localeCompare(b.paid_date))
    .map((i) => [i.paid_date, i.issued_date, byId.get(i.customer_id)?.name || "", i.description || "", Number(i.amount).toFixed(2), i.id]);
  return toCsv(["paid_date", "issued_date", "customer", "description", "amount", "invoice_id"], rows);
}

// Unpaid at year end - still worth listing, so nothing is forgotten.
export function outstandingCsv(invoices, customers, range) {
  const byId = new Map(customers.map((c) => [c.id, c]));
  const rows = invoices
    .filter((i) => i.status === "unpaid" && inRange(i.issued_date, range))
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .map((i) => [i.issued_date, i.due_date, byId.get(i.customer_id)?.name || "", i.description || "", Number(i.amount).toFixed(2), i.id]);
  return toCsv(["issued_date", "due_date", "customer", "description", "amount", "invoice_id"], rows);
}

export function expensesCsv(expenses, range) {
  const rows = expenses
    .filter((e) => inRange(e.expense_date, range))
    .sort((a, b) => a.expense_date.localeCompare(b.expense_date))
    .map((e) => [
      e.expense_date,
      e.category,
      Number(e.amount).toFixed(2),
      e.gst_amount != null ? Number(e.gst_amount).toFixed(2) : "",
      e.is_asset ? "yes" : "",
      e.receipt_path ? "yes" : "",
      e.note || "",
      e.id,
    ]);
  return toCsv(["date", "category", "amount", "gst_amount", "asset", "receipt_on_file", "note", "expense_id"], rows);
}

// Everything flagged as an asset - candidates for the instant write-off.
export function assetsCsv(expenses, range) {
  const rows = expenses
    .filter((e) => e.is_asset && inRange(e.expense_date, range))
    .sort((a, b) => a.expense_date.localeCompare(b.expense_date))
    .map((e) => [e.expense_date, Number(e.amount).toFixed(2), e.note || "", e.receipt_path ? "yes" : "", e.id]);
  return toCsv(["date", "cost", "description", "receipt_on_file", "expense_id"], rows);
}

// The km log, with the cents-per-km figure worked out but clearly an estimate.
export function tripsCsv(trips, range, rateCents) {
  const rows = trips
    .filter((t) => inRange(t.trip_date, range))
    .sort((a, b) => a.trip_date.localeCompare(b.trip_date))
    .map((t) => [t.trip_date, t.from_label || "", t.to_label || "", Number(t.distance_km).toFixed(1), t.round_trip ? "yes" : "", t.purpose || "", t.id]);
  const totalKm = rows.reduce((s, r) => s + Number(r[3]), 0);
  const claimable = Math.min(totalKm, 5000);
  const summary = [
    [],
    ["total_km", totalKm.toFixed(1)],
    ["claimable_km (capped at 5,000)", claimable.toFixed(1)],
    ["rate_cents_per_km", rateCents],
    ["estimated_deduction", ((claimable * rateCents) / 100).toFixed(2)],
    ["note", "Estimate only. Confirm the rate and method with your accountant."],
  ];
  return toCsv(["date", "from", "to", "km", "round_trip", "purpose", "trip_id"], [...rows, ...summary]);
}

export function summaryCsv({ invoices, expenses, trips }, range, rateCents) {
  const income = invoices.filter((i) => i.status === "paid" && inRange(i.paid_date, range)).reduce((s, i) => s + Number(i.amount), 0);
  const spent = expenses.filter((e) => inRange(e.expense_date, range)).reduce((s, e) => s + Number(e.amount), 0);
  const gstPaid = expenses.filter((e) => inRange(e.expense_date, range)).reduce((s, e) => s + Number(e.gst_amount || 0), 0);
  const assets = expenses.filter((e) => e.is_asset && inRange(e.expense_date, range)).reduce((s, e) => s + Number(e.amount), 0);
  const km = trips.filter((t) => inRange(t.trip_date, range)).reduce((s, t) => s + Number(t.distance_km), 0);
  const kmDeduction = (Math.min(km, 5000) * rateCents) / 100;
  return toCsv(
    ["item", "value"],
    [
      ["financial_year", range.label],
      ["income_received", income.toFixed(2)],
      ["expenses_total", spent.toFixed(2)],
      ["  of_which_assets", assets.toFixed(2)],
      ["  gst_on_expenses (if registered)", gstPaid.toFixed(2)],
      ["business_km", km.toFixed(1)],
      ["km_deduction_estimate", kmDeduction.toFixed(2)],
      ["net_before_tax_estimate", (income - spent - kmDeduction).toFixed(2)],
      ["note", "Records only. Not tax advice; confirm everything with your accountant."],
    ]
  );
}

export function downloadCsv(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
