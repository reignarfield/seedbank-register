import React, { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { submitPublicLead } from "../lib/api";
import { Field, TextArea, Button } from "./ui";

// Bigger text and taller tap targets than the internal app - this page is for
// anyone, including people who aren't comfortable with forms or have trouble
// with small text/touch targets, so the bar for "easy to use" is higher here.
const bigInput =
  "w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500";

function BigTextInput(props) {
  return <input {...props} className={`${bigInput} ${props.className || ""}`} />;
}

// Which channel this visit came from (e.g. /?src=google from a Google
// Business Profile link), captured automatically - no extra field for the
// customer to fill in, but lets the Leads inbox show what's working.
function leadSource() {
  if (typeof window === "undefined") return "direct";
  const params = new URLSearchParams(window.location.search);
  return params.get("src") || params.get("source") || "direct";
}

export default function PublicQuoteForm() {
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const canSubmit = form.name.trim() && (form.phone.trim() || form.email.trim());

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      await submitPublicLead({ ...form, source: leadSource() });
      setDone(true);
    } catch (e) {
      setError(e?.message || "Something went wrong sending your request. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      {done ? (
        <div className="text-center py-6">
          <CheckCircle2 size={44} className="mx-auto text-emerald-500 mb-3" />
          <h2 className="font-semibold text-xl text-slate-900">Thanks, {form.name.split(" ")[0]}!</h2>
          <p className="text-base text-slate-500 mt-2">Your request has been received. We'll be in touch shortly with a quote.</p>
        </div>
      ) : (
        <>
          <h1 className="font-semibold text-xl text-slate-900 mb-1">Request a free quote</h1>
          <p className="text-base text-slate-500 mb-5">
            Just fill in your name and either a phone number or an email - that's all we need. Everything else below is optional.
          </p>
          <div className="space-y-4">
            <Field label="Your name" required>
              <BigTextInput value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Your name" autoFocus />
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
            <Field label="Anything you'd like to tell us? (optional)">
              <TextArea
                rows={3}
                value={form.message}
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
        </>
      )}
    </div>
  );
}
