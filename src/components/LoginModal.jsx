import React, { useState } from "react";
import { LogIn, Loader2 } from "lucide-react";
import { signIn } from "../lib/api";
import { Button, TextInput } from "./ui";

export default function LoginModal({ onClose, onSignedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      onSignedIn();
    } catch (e) {
      setError(e?.message || "Sign in failed. Check your email and password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={onClose}>
      <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-semibold text-xl text-slate-900 mb-1">Sign in</h2>
        <p className="text-sm text-slate-500 mb-4">Sign in to manage customers, jobs, quotes and invoices.</p>
        <div className="space-y-3">
          <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" autoFocus />
          <TextInput
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={submit} disabled={busy || !email || !password}>
              {busy ? <Loader2 size={15} className="animate-spin" /> : <LogIn size={15} />} Sign in
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
