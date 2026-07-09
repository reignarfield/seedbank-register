import React, { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { updatePassword } from "../lib/api";
import { Button, Field, TextInput } from "./ui";
import logo from "../assets/tydie-logo.png";

export default function PasswordRecovery({ onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const canSave = password.length >= 6 && password === confirm;

  const save = async () => {
    setError("");
    setBusy(true);
    try {
      await updatePassword(password);
      onDone();
    } catch (e) {
      setError(e?.message || "Couldn't set that password. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <img src={logo} alt="Tydie Cleaning" className="w-full max-w-[200px] mx-auto rounded-xl shadow-sm mb-6" />
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <KeyRound size={28} className="text-blue-600 mb-3" />
          <h1 className="text-xl font-semibold text-slate-900 mb-1">Set a new password</h1>
          <p className="text-sm text-slate-500 mb-4">Choose a new password for your account.</p>
          <div className="space-y-3">
            <Field label="New password">
              <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" autoFocus />
            </Field>
            <Field label="Confirm new password">
              <TextInput type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Retype it" onKeyDown={(e) => e.key === "Enter" && canSave && save()} />
            </Field>
            {confirm && password !== confirm && <p className="text-sm text-rose-600">Passwords don't match.</p>}
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <Button className="w-full" onClick={save} disabled={!canSave || busy}>
              {busy ? <Loader2 size={15} className="animate-spin" /> : null} Save new password
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
