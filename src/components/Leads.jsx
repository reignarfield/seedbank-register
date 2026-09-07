import React, { useMemo, useState } from "react";
import { Inbox, UserPlus, FileText, Trash2, Phone, Mail, Eye, Building2, Loader2 } from "lucide-react";
import { Card, Select, Button, StatusPill, EmptyState } from "./ui";
import { formatDate } from "../lib/dates";
import { quickHint, lookupProperty, describe } from "../lib/property";

// HANDOFF 3/4 - what sort of building is this?
//
// A quote is a guess about a building, and people describe their own house
// badly. The unit number in the address is free and instant, so it shows on
// every lead. The map lookup costs a request and often knows nothing, so it
// happens when he asks - one address, one tap.
//
// The only thing this is allowed to conclude is "worth a look before you
// price it". It never suggests a price and never says a building is simple.
function PropertyHint({ address }) {
  const [looked, setLooked] = useState(null);
  const [looking, setLooking] = useState(false);
  const hint = looked || quickHint(address);

  const look = async () => {
    setLooking(true);
    try {
      const found = describe(await lookupProperty(address));
      // "Nothing on the map" is a real answer and has to be shown as one,
      // or he taps it again tomorrow expecting something different.
      setLooked(found || { text: "Nothing on the map for this address", why: "", needsEyes: false, empty: true });
    } finally {
      setLooking(false);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap mt-1">
      {hint && (
        <span
          title={hint.why}
          className={`inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 border ${
            hint.needsEyes ? "border-amber-300 bg-amber-50 text-amber-800" : "border-slate-200 text-slate-500"
          }`}
        >
          <Building2 size={11} /> {hint.text}
          {hint.needsEyes && <span className="font-medium">· worth a look first</span>}
        </span>
      )}
      {!looked && (
        <button
          onClick={look}
          disabled={looking}
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-blue-700 disabled:opacity-50"
        >
          {looking ? <Loader2 size={11} className="animate-spin" /> : <Eye size={11} />} Check the map
        </button>
      )}
    </div>
  );
}

export default function Leads({ leads, onSetStatus, onDelete, onConvertToCustomer, onCreateQuote }) {
  const [filter, setFilter] = useState("all");

  const visible = useMemo(() => {
    const list = filter === "all" ? leads : leads.filter((l) => l.status === filter);
    return [...list].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  }, [leads, filter]);

  const FILTERS = ["all", "new", "contacted", "quoted", "won", "lost"];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-slate-900">Leads</h1>
        <p className="text-sm text-slate-500 mt-1">Requests from the public "request a quote" page land here first.</p>
      </div>

      <div className="flex items-center gap-1 bg-slate-100 rounded-full p-1 mb-5 w-fit overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize whitespace-nowrap transition-colors ${filter === f ? "bg-blue-600 text-white" : "text-slate-500 hover:text-blue-700"}`}
          >
            {f}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={Inbox} title="No leads here yet." subtitle="Share your quote-request page link to start collecting leads." />
      ) : (
        <div className="space-y-2">
          {visible.map((l) => (
            <Card key={l.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-medium text-slate-900">{l.name}</span>
                    <StatusPill status={l.status} />
                    {l.source && l.source !== "direct" && (
                      <span className="text-xs text-slate-400 border border-slate-200 rounded-full px-2 py-0.5">via {l.source}</span>
                    )}
                    <span className="text-xs text-slate-400">{formatDate((l.created_at || "").slice(0, 10))}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                    {l.phone && <span className="flex items-center gap-1"><Phone size={11} /> {l.phone}</span>}
                    {l.email && <span className="flex items-center gap-1"><Mail size={11} /> {l.email}</span>}
                  </div>
                  {l.address && (
                    <div className="mt-0.5">
                      <div className="text-xs text-slate-500">{l.address}</div>
                      <PropertyHint address={l.address} />
                    </div>
                  )}
                  {l.message && <p className="text-sm text-slate-600 mt-2">{l.message}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Select value={l.status} onChange={(e) => onSetStatus(l, e.target.value)} className="!w-auto !py-1.5 !text-xs">
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="quoted">Quoted</option>
                    <option value="won">Won</option>
                    <option value="lost">Lost</option>
                  </Select>
                  <Button variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={() => onCreateQuote(l)}>
                    <FileText size={13} /> Quote
                  </Button>
                  <Button variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={() => onConvertToCustomer(l)}>
                    <UserPlus size={13} /> Convert
                  </Button>
                  <button title="Delete" onClick={() => confirm("Delete this lead?") && onDelete(l.id)} className="p-2 rounded-lg text-rose-500 hover:bg-rose-50">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
