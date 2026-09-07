import React, { useState } from "react";
import { MessageSquarePlus, X, Loader2, Check } from "lucide-react";
import { Button, TextArea, TextInput, Field } from "./ui";
import { submitFeedback } from "../lib/api";
import { currentScreen, currentSessionId, trackFeedback, trackedUser } from "../lib/track";

// A small button in the corner, always there, never in the way. It records
// which screen it was pressed on so a suggestion arrives with its context.

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [tryingTo, setTryingTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const close = () => {
    setOpen(false);
    setSent(false);
    setMessage("");
    setTryingTo("");
  };

  const send = async () => {
    if (!message.trim()) return;
    setBusy(true);
    try {
      const screen = currentScreen();
      await submitFeedback({ message: message.trim(), trying_to: tryingTo.trim() || null, screen, session_id: currentSessionId(), user_email: trackedUser().email });
      trackFeedback(screen);
      setSent(true);
      setTimeout(close, 1400);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Send a suggestion"
        title="Got a suggestion? Tell us"
        className="fixed bottom-4 right-4 z-40 w-12 h-12 rounded-full bg-slate-900 text-white shadow-lg hover:bg-slate-700 flex items-center justify-center transition-colors"
      >
        <MessageSquarePlus size={20} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 px-4 py-6" onClick={close}>
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-lg text-slate-900">What would make this better?</h2>
              <button onClick={close} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            {sent ? (
              <div className="px-5 py-8 text-center">
                <Check size={28} className="mx-auto text-emerald-600 mb-2" />
                <div className="font-medium text-slate-900">Got it - thanks.</div>
              </div>
            ) : (
              <div className="px-5 py-4 space-y-3">
                <Field label="Your suggestion" required>
                  <TextArea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Anything - a button in the wrong spot, something missing, something annoying." autoFocus />
                </Field>
                <Field label="What were you trying to do? (optional)">
                  <TextInput value={tryingTo} onChange={(e) => setTryingTo(e.target.value)} placeholder="e.g. find a customer's gate code" />
                </Field>
                <div className="flex gap-2 pt-1">
                  <Button variant="secondary" className="flex-1" onClick={close}>Cancel</Button>
                  <Button className="flex-1" onClick={send} disabled={!message.trim() || busy}>
                    {busy ? <Loader2 size={15} className="animate-spin" /> : null} Send
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
