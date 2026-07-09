import React from "react";
import { Phone } from "lucide-react";
import { PRICE_GROUPS, MINIMUM_SERVICE_FEE } from "../lib/pricing";

const BUSINESS_PHONE = import.meta.env.VITE_BUSINESS_PHONE || "";

export default function PublicPricing() {
  return (
    <div className="space-y-5">
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-900">
        <strong>${MINIMUM_SERVICE_FEE} minimum service fee.</strong> Prices below are a guide - for a fixed price,{" "}
        {BUSINESS_PHONE ? (
          <a href={`tel:${BUSINESS_PHONE.replace(/[^0-9+]/g, "")}`} className="underline font-medium">
            give Tyson a call
          </a>
        ) : (
          "contact Tyson"
        )}{" "}
        for a free quote.
      </div>

      {PRICE_GROUPS.map((group) => (
        <div key={group.title} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-4 sm:px-5 pt-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-blue-700">{group.title}</h2>
            {group.note && <p className="text-xs text-slate-500 mt-1 mb-1">{group.note}</p>}
          </div>
          <div className="divide-y divide-slate-100 mt-2">
            {group.items.map((item) => (
              <div key={item.name} className="flex items-center justify-between gap-3 px-4 sm:px-5 py-2.5">
                <span className="text-sm text-slate-700">{item.name}</span>
                <span className="text-right shrink-0">
                  <span className="text-sm font-semibold text-slate-900 tabular-nums">{item.price}</span>
                  {item.extra && <span className="block text-xs text-slate-400">{item.extra}</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="text-center text-xs text-slate-400 px-2">
        Payments accepted: cash, bank transfer, invoice, cheque, or card (1.8% surcharge). NDIS-funded services available.
        Prices are a guide only and may change - contact Tyson to confirm before booking.
      </div>
    </div>
  );
}
