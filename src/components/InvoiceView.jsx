import React from "react";
import { Printer, X } from "lucide-react";
import { Button, money } from "./ui";
import { formatDateLong } from "../lib/dates";
import { BUSINESS } from "../lib/business";

// A real invoice - the thing the customer is actually owed a copy of.
// Wording follows the ATO's rules and flips on one setting: registered for
// GST means "TAX INVOICE" with the GST shown; not registered means "INVOICE"
// with no GST line at all. The ABN appears either way.
//
// Prices in this app are GST-inclusive (that's how a tradesperson quotes),
// so the GST component is amount / 11.

function short(id) {
  return String(id || "").replace(/-/g, "").slice(0, 8).toUpperCase();
}

export function invoiceHtml({ invoice, customer, settings }) {
  const gst = !!settings?.gst_registered;
  const amount = Number(invoice.amount || 0);
  const gstPart = gst ? amount / 11 : 0;
  const exGst = amount - gstPart;
  const title = gst ? "TAX INVOICE" : "INVOICE";
  const abn = settings?.abn || "";
  const paid = invoice.status === "paid";

  return `<!doctype html><html><head><meta charset="utf-8"><title>${title} ${short(invoice.id)}</title>
<style>
  body{font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1a2230;margin:0;padding:40px;max-width:720px}
  h1{font-size:22px;letter-spacing:.08em;margin:0 0 4px}
  .muted{color:#5b6675;font-size:13px}
  .row{display:flex;justify-content:space-between;gap:24px;margin-top:28px}
  .row>div{flex:1}
  .label{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#5b6675;margin-bottom:4px}
  table{width:100%;border-collapse:collapse;margin-top:28px;font-size:14px}
  th{text-align:left;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#5b6675;border-bottom:2px solid #1a2230;padding:8px 0}
  td{padding:10px 0;border-bottom:1px solid #dce1e8;vertical-align:top}
  td.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
  .totals{margin-top:12px;margin-left:auto;width:260px;font-size:14px}
  .totals div{display:flex;justify-content:space-between;padding:5px 0}
  .totals .total{border-top:2px solid #1a2230;font-weight:600;font-size:16px;margin-top:4px;padding-top:8px}
  .stamp{display:inline-block;border:2px solid ${paid ? "#2f7d5b" : "#b8741a"};color:${paid ? "#2f7d5b" : "#b8741a"};padding:4px 10px;font-size:12px;letter-spacing:.1em;font-weight:700;border-radius:4px}
  .terms{margin-top:36px;font-size:13px;color:#5b6675;line-height:1.5}
  @media print{body{padding:0}}
</style></head><body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div>
      <h1>${title}</h1>
      <div class="muted">${BUSINESS.name}${abn ? ` · ABN ${abn}` : ""}</div>
      ${BUSINESS.phone ? `<div class="muted">${BUSINESS.phone}${BUSINESS.email ? ` · ${BUSINESS.email}` : ""}</div>` : BUSINESS.email ? `<div class="muted">${BUSINESS.email}</div>` : ""}
    </div>
    <div style="text-align:right">
      <div class="label">Invoice no.</div>
      <div style="font-size:18px;font-weight:600">${short(invoice.id)}</div>
      <div style="margin-top:8px"><span class="stamp">${paid ? "PAID" : "DUE " + formatDateLong(invoice.due_date).toUpperCase()}</span></div>
    </div>
  </div>
  <div class="row">
    <div><div class="label">Bill to</div><div style="font-weight:600">${customer?.name || ""}</div><div class="muted">${customer?.address || ""}</div><div class="muted">${customer?.email || customer?.phone || ""}</div></div>
    <div><div class="label">Issued</div><div>${formatDateLong(invoice.issued_date)}</div>
      <div class="label" style="margin-top:10px">Due</div><div>${formatDateLong(invoice.due_date)}</div>
      ${paid && invoice.paid_date ? `<div class="label" style="margin-top:10px">Paid</div><div>${formatDateLong(invoice.paid_date)}</div>` : ""}
    </div>
  </div>
  <table><thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
  <tbody><tr><td>${invoice.description || "Services"}</td><td class="n">${money(gst ? exGst : amount)}</td></tr></tbody></table>
  <div class="totals">
    ${gst ? `<div><span>Subtotal (ex GST)</span><span>${money(exGst)}</span></div><div><span>GST 10%</span><span>${money(gstPart)}</span></div>` : ""}
    <div class="total"><span>Total${gst ? " (inc GST)" : ""}</span><span>${money(amount)}</span></div>
    ${!gst ? `<div class="muted" style="font-size:12px">No GST has been charged.</div>` : ""}
  </div>
  <div class="terms">
    ${paid ? "Thank you - this invoice has been paid." : `Please pay by ${formatDateLong(invoice.due_date)}. Bank transfer or cash accepted - quote invoice no. ${short(invoice.id)} as the reference.`}
  </div>
</body></html>`;
}

export function printInvoice(args) {
  const w = window.open("", "_blank", "width=800,height=900");
  if (!w) return;
  w.document.open();
  w.document.write(invoiceHtml(args));
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 250);
}

export default function InvoiceView({ invoice, customer, settings, onClose }) {
  const gst = !!settings?.gst_registered;
  const amount = Number(invoice.amount || 0);
  const gstPart = gst ? amount / 11 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/30 px-4 py-6 overflow-y-auto" onClick={onClose}>
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-semibold text-lg text-slate-900 tracking-wide">{gst ? "Tax invoice" : "Invoice"} {short(invoice.id)}</h2>
            <div className="text-xs text-slate-500">{BUSINESS.name}{settings?.abn ? ` · ABN ${settings.abn}` : ""}</div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="px-5 py-4 space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div><div className="text-xs uppercase tracking-wide text-slate-400 mb-0.5">Bill to</div><div className="font-medium text-slate-900">{customer?.name}</div><div className="text-slate-500 text-xs">{customer?.address}</div></div>
            <div><div className="text-xs uppercase tracking-wide text-slate-400 mb-0.5">Issued</div><div>{formatDateLong(invoice.issued_date)}</div><div className="text-xs uppercase tracking-wide text-slate-400 mb-0.5 mt-2">Due</div><div>{formatDateLong(invoice.due_date)}</div></div>
          </div>
          <div className="border-t border-slate-100 pt-3">
            <div className="flex justify-between gap-3"><span className="text-slate-700">{invoice.description || "Services"}</span><span className="tabular-nums">{money(gst ? amount - gstPart : amount)}</span></div>
            {gst && <div className="flex justify-between text-slate-500 mt-1"><span>GST 10%</span><span className="tabular-nums">{money(gstPart)}</span></div>}
            <div className="flex justify-between font-semibold text-slate-900 border-t border-slate-200 mt-2 pt-2"><span>Total{gst ? " (inc GST)" : ""}</span><span className="tabular-nums">{money(amount)}</span></div>
            {!gst && <div className="text-xs text-slate-400 mt-1">No GST charged - not registered.</div>}
          </div>
          {!settings?.abn && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">No ABN set - an invoice needs one. Add it in Settings.</p>}
        </div>
        <div className="flex items-center gap-2 px-5 py-4 border-t border-slate-100">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Close</Button>
          <Button className="flex-1" onClick={() => printInvoice({ invoice, customer, settings })}><Printer size={15} /> Print / save PDF</Button>
        </div>
      </div>
    </div>
  );
}
