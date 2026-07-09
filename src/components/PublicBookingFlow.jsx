import React, { useState } from "react";
import { ChevronDown, CheckCircle2, Loader2, X, ClipboardList } from "lucide-react";
import { submitPublicLead } from "../lib/api";
import { Field, TextArea, Button } from "./ui";
import { PRICE_GROUPS, MINIMUM_SERVICE_FEE } from "../lib/pricing";

const BUSINESS_PHONE = import.meta.env.VITE_BUSINESS_PHONE || "";

// Bigger text and taller tap targets than the internal app - this page is
// for anyone, including people who aren't comfortable with forms or have
// trouble with small text/touch targets, so the bar for "easy" is higher.
const bigInput =
  "w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500";

function BigTextInput(props) {
  return <input {...props} className={`${bigInput} ${props.className || ""}`} />;
}

function leadSource() {
  if (typeof window === "undefined") return "direct";
  const params = new URLSearchParams(window.location.search);
  return params.get("src") || params.get("source") || "direct";
}

function messageFromServices(services) {
  if (!services || services.length === 0) return "";
  return `I'd like a quote for:\n${services.map((s) => `- ${s}`).join("\n")}`;
}

export default function PublicBookingFlow() {
  const [openGroups, setOpenGroups] = useState(() => new Set());
  const [selected, setSelected] = useState([]); // "Group - Item" strings, in the order picked
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", message: "" });
  const [messageTouched, setMessageTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const toggleGroup = (title) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(title) ? next.delete(title) : next.add(title);
      return next;
    });
  };

  const toggleService = (label) => {
    setSelected((prev) => (prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]));
  };

  const set = (key, val) => {
    if (key === "message") setMessageTouched(true);
    setForm((f) => ({ ...f, [key]: val }));
  };

  // The message field auto-fills from ticked services unless the person has
  // typed their own words in it - never overwrite something they wrote.
  const effectiveMessage = messageTouched ? form.message : messageFromServices(selected) || form.message;

  const canSubmit = form.name.trim() && (form.phone.trim() || form.email.trim());

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      await submitPublicLead({ ...form, message: effectiveMessage, source: leadSource() });
      setDone(true);
    } catch (e) {
      setError(e?.message || "Something went wrong sending your request. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-center py-10">
        <CheckCircle2 size={44} className="mx-auto text-emerald-500 mb-3" />
        <h2 className="font-semibold text-xl text-slate-900">Thanks, {form.name.split(" ")[0]}!</h2>
        <p className="text-base text-slate-500 mt-2">Your request has been received. We'll be in touch shortly with a quote.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-900">
        <strong>${MINIMUM_SERVICE_FEE} minimum service fee.</strong> Tap a category to see prices and tick anything
        you're after - or skip straight to the form below and we'll call to ask.
      </div>

      <div className="space-y-2.5">
        {PRICE_GROUPS.map((group) => {
          const open = openGroups.has(group.title);
          const groupSelectedCount = group.items.filter((item) => selected.includes(`${group.title} - ${item.name}`)).length;
          return (
            <div key={group.title} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <button
                onClick={() => toggleGroup(group.title)}
                className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 text-left"
              >
                <span className="flex items-center gap-2">
                  <span className="text-sm font-semibold uppercase tracking-wide text-blue-700">{group.title}</span>
                  {groupSelectedCount > 0 && (
                    <span className="w-5 h-5 flex items-center justify-center rounded-full bg-blue-600 text-white text-[11px] font-semibold">
                      {groupSelectedCount}
                    </span>
                  )}
                </span>
                <ChevronDown size={18} className={`text-slate-400 transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
              </button>
              {open && (
                <div>
                  {group.note && <p className="text-xs text-slate-500 px-4 sm:px-5 pb-2">{group.note}</p>}
                  <div className="divide-y divide-slate-100 border-t border-slate-100">
                    {group.items.map((item) => {
                      const key = `${group.title} - ${item.name}`;
                      const checked = selected.includes(key);
                      return (
                        <label
                          key={item.name}
                          className={`flex items-center justify-between gap-3 px-4 sm:px-5 py-3 cursor-pointer transition-colors ${checked ? "bg-blue-50/60" : "hover:bg-slate-50"}`}
                        >
                          <span className="flex items-center gap-3 min-w-0">
                            <input type="checkbox" checked={checked} onChange={() => toggleService(key)} className="w-4 h-4 accent-blue-600 shrink-0" />
                            <span className="text-sm text-slate-700">{item.name}</span>
                          </span>
                          <span className="text-right shrink-0">
                            <span className="text-sm font-semibold text-slate-900 tabular-nums">{item.price}</span>
                            {item.extra && <span className="block text-xs text-slate-400">{item.extra}</span>}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selected.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList size={16} className="text-blue-600" />
            <h2 className="text-sm font-semibold text-slate-900">Your request so far</h2>
          </div>
          <div className="space-y-1.5">
            {selected.map((label) => (
              <div key={label} className="flex items-center justify-between gap-2 text-sm text-slate-600">
                <span className="truncate">{label}</span>
                <button onClick={() => toggleService(label)} title="Remove" className="text-slate-300 hover:text-rose-500 shrink-0">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h1 className="font-semibold text-xl text-slate-900 mb-1">Your details</h1>
        <p className="text-base text-slate-500 mb-5">
          Just your name and either a phone number or an email - that's all we need to get back to you.
        </p>
        <div className="space-y-4">
          <Field label="Your name" required>
            <BigTextInput value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Your name" />
          </Field>
          <Field label="Phone number">
            <BigTextInput type="tel" inputMode="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="04xx xxx xxx" />
          </Field>
          <Field label="Email">
            <BigTextInput type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@email.com" />
          </Field>
          <p className="text-sm text-slate-400 -mt-2">You only need to fill in one of phone or email - whichever's easiest for you.</p>
          <Field label="Property address (optional)">
            <BigTextInput value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Street, suburb" />
          </Field>
          <Field label="Anything else? (optional)">
            <TextArea
              rows={3}
              value={effectiveMessage}
              onChange={(e) => set("message", e.target.value)}
              placeholder="e.g. Single-storey, 12 windows, first clean - or leave blank and we'll call to ask"
              className="!text-base !py-3.5"
            />
          </Field>
          {error && <p className="text-base text-rose-600">{error}</p>}
          <Button className="w-full !text-lg !py-4" onClick={submit} disabled={!canSubmit || busy}>
            {busy ? <Loader2 size={18} className="animate-spin" /> : null} Send request
          </Button>
          {!canSubmit && <p className="text-sm text-slate-400 text-center pt-1">Add your name and a phone number or email to send.</p>}
        </div>
      </div>

      <div className="text-center text-xs text-slate-400 px-2">
        Payments accepted: cash, bank transfer, invoice, cheque, or card (1.8% surcharge). NDIS-funded services available.
        Prices are a guide only and may change -{" "}
        {BUSINESS_PHONE ? <a href={`tel:${BUSINESS_PHONE.replace(/[^0-9+]/g, "")}`} className="underline">call Tyson</a> : "contact Tyson"} to confirm before booking.
      </div>
    </div>
  );
}
