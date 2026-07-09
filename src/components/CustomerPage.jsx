import React from "react";
import { ExternalLink, Copy } from "lucide-react";
import { Button } from "./ui";

export default function CustomerPage() {
  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/` : "/";

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Customer page</h1>
          <p className="text-sm text-slate-500 mt-1">Exactly what someone sees when they land on the website and go to book.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            className="!text-xs !px-3 !py-1.5"
            onClick={() => navigator.clipboard?.writeText(publicUrl)}
          >
            <Copy size={13} /> Copy link
          </Button>
          <a href={publicUrl} target="_blank" rel="noreferrer">
            <Button className="!text-xs !px-3 !py-1.5">
              <ExternalLink size={13} /> Open in new tab
            </Button>
          </a>
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <iframe
          src={publicUrl}
          title="Public customer page"
          className="w-full border-0"
          style={{ height: "calc(100vh - 220px)", minHeight: 480 }}
        />
      </div>
    </div>
  );
}
