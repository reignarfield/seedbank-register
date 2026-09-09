import React, { useState } from "react";
import { X, Send, Loader2, MessageSquare } from "lucide-react";
import { Button, TextInput, TextArea, Field } from "./ui";
import { sendEmail } from "../lib/api";

// Nothing leaves the building without being seen first. This is the seeing:
// who it's to, the subject, the words - all editable - then one Send. If
// email isn't connected yet the function says so and the fallback is a text.

export default function EmailPreview({ draft, onClose, onSent, smsHref }) {
  const [to, setTo] = useState(draft.to || "");
  const [subject, setSubject] = useState(draft.subject || "");
  const [body, setBody] = useState(draft.body || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) && subject.trim() && body.trim();

  const send = async () => {
    setError("");
    setBusy(true);
    try {
      const html = `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#1a2230;white-space:pre-wrap">${body.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</div>`;
      await sendEmail({ to: to.trim(), subject: subject.trim(), html, text: body });
      onSent?.({ to: to.trim(), subject: subject.trim() });
      onClose();
    } catch (e) {
      setError(e?.message || "Couldn't send that.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/30 px-4 py-6 overflow-y-auto" onClick={onClose}>
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-lg text-slate-900">Check it, then send</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <Field label="To"><TextInput type="email" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          <Field label="Subject"><TextInput value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
          <Field label="Message"><TextArea rows={7} value={body} onChange={(e) => setBody(e.target.value)} /></Field>
          {error && (
            <div className="text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
              {error}
              {smsHref && <div className="mt-1.5"><a href={smsHref} className="inline-flex items-center gap-1 text-blue-700 font-medium hover:underline" onClick={onClose}><MessageSquare size={13} /> Send it as a text instead</a></div>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 px-5 py-4 border-t border-slate-100">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Not now</Button>
          <Button className="flex-1" onClick={send} disabled={!ok || busy}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Send</Button>
        </div>
      </div>
    </div>
  );
}
