import React, { useState } from "react";
import { Phone, Mail } from "lucide-react";
import PublicQuoteForm from "./PublicQuoteForm";
import PublicPricing from "./PublicPricing";
import logo from "../assets/tydie-logo.png";

const BUSINESS_PHONE = import.meta.env.VITE_BUSINESS_PHONE || "";
const BUSINESS_EMAIL = import.meta.env.VITE_BUSINESS_EMAIL || "";

export default function PublicSite() {
  const [tab, setTab] = useState("book");
  const [selected, setSelected] = useState([]); // array of "Group - Item" strings, in the order picked

  const toggleService = (label) => {
    setSelected((prev) => (prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]));
  };

  const requestQuoteForSelected = () => setTab("book");

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md mx-auto">
        <img src={logo} alt="Tydie Cleaning" className="w-full max-w-[280px] mx-auto rounded-xl shadow-sm mb-5" />

        <div className="flex items-center justify-center gap-x-4 gap-y-1 flex-wrap mb-6 text-sm text-slate-500">
          <span>Fully insured</span>
          <span className="text-slate-300">·</span>
          <span>Free quotes</span>
          <span className="text-slate-300">·</span>
          <span>Flexible scheduling</span>
        </div>

        {BUSINESS_PHONE && (
          <a
            href={`tel:${BUSINESS_PHONE.replace(/[^0-9+]/g, "")}`}
            className="flex items-center justify-center gap-2.5 w-full bg-white border-2 border-blue-600 text-blue-700 rounded-xl px-5 py-4 mb-4 text-lg font-semibold shadow-sm hover:bg-blue-50 transition-colors"
          >
            <Phone size={20} /> Prefer to call? Tap to dial {BUSINESS_PHONE}
          </a>
        )}

        <div className="flex items-center gap-1 bg-slate-100 rounded-full p-1 mb-5 w-fit mx-auto">
          <button
            onClick={() => setTab("book")}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${tab === "book" ? "bg-blue-600 text-white" : "text-slate-500"}`}
          >
            Book a clean
          </button>
          <button
            onClick={() => setTab("pricing")}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-colors relative ${tab === "pricing" ? "bg-blue-600 text-white" : "text-slate-500"}`}
          >
            Pricing
            {selected.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-semibold">
                {selected.length}
              </span>
            )}
          </button>
        </div>

        {tab === "book" ? (
          <PublicQuoteForm initialServices={selected} />
        ) : (
          <PublicPricing selected={selected} onToggle={toggleService} onRequestQuote={requestQuoteForSelected} />
        )}

        {(BUSINESS_PHONE || BUSINESS_EMAIL) && (
          <div className="flex items-center justify-center gap-5 mt-5 text-sm text-slate-500">
            {BUSINESS_PHONE && (
              <a href={`tel:${BUSINESS_PHONE.replace(/[^0-9+]/g, "")}`} className="flex items-center gap-1.5 hover:text-blue-700">
                <Phone size={14} /> {BUSINESS_PHONE}
              </a>
            )}
            {BUSINESS_EMAIL && (
              <a href={`mailto:${BUSINESS_EMAIL}`} className="flex items-center gap-1.5 hover:text-blue-700">
                <Mail size={14} /> {BUSINESS_EMAIL}
              </a>
            )}
          </div>
        )}

        <div className="text-center mt-8">
          <div className="text-xs text-slate-300">Tydie Cleaning · ABN 55 202 207 046</div>
        </div>
      </div>
    </div>
  );
}
