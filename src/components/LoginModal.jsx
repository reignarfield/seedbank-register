import React from "react";
import SignInForm from "./SignInForm";

export default function LoginModal({ onClose, onSignedIn }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={onClose}>
      <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
        <SignInForm onSignedIn={onSignedIn} onCancel={onClose} />
      </div>
    </div>
  );
}
