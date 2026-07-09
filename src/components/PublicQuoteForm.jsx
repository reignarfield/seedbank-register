import React, { useState } from "react";
import { Droplets, Loader2, CheckCircle2, Phone, Mail } from "lucide-react";
import { submitPublicLead } from "../lib/api";
import { Field, TextInput, TextArea, Button } from "./ui";

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
      await submitPublicLead(form);
      setDone(true);
    } catch (e) {
      setError(e?.message || "Something went wrong sending your request. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2.5 justify-center mb-6">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
            <Droplets size={20} className="text-white" strokeWidth={2.25} />
          </div>
          <div className="font-semibold text-xl text-slate-900">Clear View Window Cleaning</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          {done ? (
            <div className="text-center py-6">
              <CheckCircle2 size={40} className="mx-auto text-emerald-500 mb-3" />
              <h2 className="font-semibold text-lg text-slate-900">Thanks, {form.name.split(" ")[0]}!</h2>
              <p className="text-sm text-slate-500 mt-1">Your request has been received. We'll be in touch shortly with a quote.</p>
            </div>
          ) : (
            <>
              <h1 className="font-semibold text-lg text-slate-900 mb-1">Request a free quote</h1>
              <p className="text-sm text-slate-500 mb-5">Tell us a bit about your property and we'll get back to you.</p>
              <div className="space-y-3">
                <Field label="Name" required>
                  <TextInput value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Your name" autoFocus />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Phone">
                    <TextInput value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="04xx xxx xxx" />
                  </Field>
                  <Field label="Email">
                    <TextInput type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@email.com" />
                  </Field>
                </div>
                <Field label="Property address">
                  <TextInput value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Street, suburb" />
                </Field>
                <Field label="What do you need?">
                  <TextArea rows={3} value={form.message} onChange={(e) => set("message", e.target.value)} placeholder="e.g. Single-storey, 12 windows, first clean" />
                </Field>
                {error && <p className="text-sm text-rose-600">{error}</p>}
                <Button className="w-full" onClick={submit} disabled={!canSubmit || busy}>
                  {busy ? <Loader2 size={15} className="animate-spin" /> : null} Send request
                </Button>
                <p className="text-xs text-slate-400 text-center pt-1">Please provide a phone number or email so we can reach you.</p>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-center gap-4 mt-5 text-xs text-slate-400">
          <span className="flex items-center gap-1"><Phone size={12} /> Call anytime</span>
          <span className="flex items-center gap-1"><Mail size={12} /> Or email us</span>
        </div>
      </div>
    </div>
  );
}
