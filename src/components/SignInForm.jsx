import React, { useState } from "react";
import { LogIn, Loader2, Mail } from "lucide-react";
import { signIn, requestPasswordReset } from "../lib/api";
import { Button, TextInput } from "./ui";

// The actual sign-in/reset-password form. App renders it directly as the
// /team page itself so there's no extra tap to get to it.
export default function SignInForm({ onSignedIn, onCancel }) {
  const [mode, setMode] = useState("signin"); // "signin" | "reset" | "reset-sent"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submitSignIn = async () => {
    setError("");
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      onSignedIn?.();
    } catch (e) {
      setError(e?.message || "Sign in failed. Check your email and password.");
    } finally {
      setBusy(false);
    }
  };

  const submitReset = async () => {
    setError("");
    setBusy(true);
    try {
      await requestPasswordReset(email.trim());
      setMode("reset-sent");
    } catch (e) {
      setError(e?.message || "Couldn't send that. Check the email address and try again.");
    } finally {
      setBusy(false);
    }
  };

  if (mode === "reset-sent") {
    return (
      <>
        <Mail size={32} className="text-blue-600 mb-3" />
        <h2 className="font-semibold text-xl text-slate-900 mb-1">Check your email</h2>
        <p className="text-sm text-slate-500 mb-4">
          If an account exists for <strong>{email}</strong>, a reset link is on its way. Open it on this device to set a new password.
        </p>
        <Button variant="secondary" className="w-full" onClick={() => setMode("signin")}>
          Back to sign in
        </Button>
      </>
    );
  }

  if (mode === "reset") {
    return (
      <>
        <h2 className="font-semibold text-xl text-slate-900 mb-1">Reset your password</h2>
        <p className="text-sm text-slate-500 mb-4">Enter your email and we'll send you a link to set a new one.</p>
        <div className="space-y-3">
          <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" autoFocus onKeyDown={(e) => e.key === "Enter" && submitReset()} />
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => { setMode("signin"); setError(""); }}>
              Back
            </Button>
            <Button className="flex-1" onClick={submitReset} disabled={busy || !email}>
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />} Send link
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <h2 className="font-semibold text-xl text-slate-900 mb-1">Sign in</h2>
      <p className="text-sm text-slate-500 mb-4">Sign in to manage customers, jobs, quotes and invoices.</p>
      <div className="space-y-3">
        <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" autoFocus />
        <TextInput
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          onKeyDown={(e) => e.key === "Enter" && submitSignIn()}
        />
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button type="button" onClick={() => { setMode("reset"); setError(""); }} className="text-xs text-blue-600 hover:underline">
          Forgot password?
        </button>
        <div className="flex gap-2 pt-1">
          {onCancel && (
            <Button variant="secondary" className="flex-1" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button className="flex-1" onClick={submitSignIn} disabled={busy || !email || !password}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <LogIn size={15} />} Sign in
          </Button>
        </div>
      </div>
    </>
  );
}
