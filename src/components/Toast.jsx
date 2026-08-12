import React, { useEffect } from "react";
import { AlertCircle, X } from "lucide-react";

// A visible place for things to go wrong - especially for the Today screen,
// which previously had no error surface at all. Auto-dismisses so it never
// piles up, but stays long enough to actually read on a slow connection.
export default function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] w-full max-w-sm px-4">
      <div className="flex items-center gap-2 bg-rose-600 text-white text-sm rounded-xl shadow-lg px-4 py-3">
        <AlertCircle size={16} className="shrink-0" />
        <span className="flex-1">{toast.message}</span>
        <button onClick={onDismiss} className="text-white/80 hover:text-white shrink-0">
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
