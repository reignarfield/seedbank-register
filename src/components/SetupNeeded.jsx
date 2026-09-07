import React, { useState } from "react";
import { Check, Copy, ExternalLink, Database, KeyRound, Play } from "lucide-react";
import { BUSINESS } from "../lib/business";

// Shown instead of the app when there's no database configured. Half of the
// people who bounce off software like this bounce during setup, so a missing
// .env has to read as "here's the next thing to do", not as a broken app.

function Step({ n, icon: Icon, title, children }) {
  return (
    <li className="flex gap-4">
      <div className="flex-none">
        <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center">
          <Icon size={16} className="text-blue-700" />
        </div>
        {n < 3 && <div className="w-px h-full mx-auto bg-slate-200 my-1" />}
      </div>
      <div className="pb-7 min-w-0 flex-1">
        <h3 className="font-medium text-slate-900 mb-1">{title}</h3>
        <div className="text-sm text-slate-600 space-y-2">{children}</div>
      </div>
    </li>
  );
}

function CopyBox({ text, label }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard is blocked in some contexts - the text is on screen anyway.
    }
  };
  return (
    <div className="relative">
      <pre className="bg-slate-900 text-slate-100 rounded-lg p-3 pr-11 text-xs overflow-x-auto font-mono leading-relaxed">
        {text}
      </pre>
      <button
        onClick={copy}
        aria-label={`Copy ${label}`}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-slate-700/70 hover:bg-slate-600 text-slate-200 transition-colors"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  );
}

export default function SetupNeeded() {
  const missing = [
    !import.meta.env.VITE_SUPABASE_URL && "VITE_SUPABASE_URL",
    !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY && "VITE_SUPABASE_PUBLISHABLE_KEY",
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="w-full max-w-xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Almost there</h1>
          <p className="text-slate-600 mt-1">
            {BUSINESS.name} needs a database before it can store anything. This takes about five
            minutes and you only do it once.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <ol className="list-none">
            <Step n={1} icon={Database} title="Create a free Supabase project">
              <p>
                Sign up at{" "}
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-700 hover:underline inline-flex items-center gap-1"
                >
                  supabase.com <ExternalLink size={12} />
                </a>{" "}
                and create a new project. Any region near you, any name. The free tier is plenty for
                one business.
              </p>
            </Step>

            <Step n={2} icon={Play} title="Set up the tables">
              <p>
                In your new project, open <strong>SQL Editor</strong>, paste in the contents of{" "}
                <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                  supabase/schema.sql
                </code>{" "}
                from this folder, and hit Run. It's safe to run more than once.
              </p>
            </Step>

            <Step n={3} icon={KeyRound} title="Add your keys">
              <p>
                In Supabase go to <strong>Project Settings → API</strong>. Copy the Project URL and
                the publishable key into a file called{" "}
                <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">.env</code>{" "}
                in this folder:
              </p>
              <CopyBox
                label="env file contents"
                text={"VITE_SUPABASE_URL=https://your-project-id.supabase.co\nVITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxx"}
              />
              <p>Then stop the server and run it again so it picks them up.</p>
            </Step>
          </ol>

          <div className="border-t border-slate-200 pt-4 mt-1">
            <p className="text-sm text-slate-500">
              {missing.length === 2
                ? "Currently missing both keys."
                : `Currently missing: ${missing.join(", ")}.`}{" "}
              Run{" "}
              <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                npm run doctor
              </code>{" "}
              any time to check what's left.
            </p>
          </div>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Deploying to Netlify instead? Add the same two variables under Site configuration →
          Environment variables.
        </p>
      </div>
    </div>
  );
}
