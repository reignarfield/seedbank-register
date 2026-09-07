import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Clock, MousePointerClick, MessageSquare, Download, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { Card, Button, EmptyState, SectionTitle } from "./ui";
import { fetchUsageEvents, fetchFeedback } from "../lib/api";
import { downloadCsv } from "../lib/taxPack";

// For whoever's building the app, not for Tyson: every session as a timeline
// of screens (with how long) and taps (by their own label), plus his
// suggestions. This is where the personalised order of the app comes from.

function fmtMs(ms) {
  const s = Math.round((ms || 0) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m}m ${s % 60}s` : `${Math.floor(m / 60)}h ${m % 60}m`;
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", second: "2-digit" });
}
function fmtDay(iso) {
  return new Date(iso).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
}

function Session({ s, open, onToggle }) {
  const screens = useMemo(() => {
    const m = new Map();
    for (const e of s.events) if (e.kind === "screen") m.set(e.screen, (m.get(e.screen) || 0) + (e.duration_ms || 0));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [s.events]);
  const total = screens.reduce((a, [, ms]) => a + ms, 0) || 1;
  const taps = s.events.filter((e) => e.kind === "tap").length;
  const dev = s.events.find((e) => e.kind === "session_start")?.meta;

  return (
    <Card className="overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50">
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-900">{fmtDay(s.start)} · {fmtTime(s.start)}</div>
          <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
            <span className="flex items-center gap-1"><Clock size={11} /> {fmtMs(total)}</span>
            <span className="flex items-center gap-1"><MousePointerClick size={11} /> {taps} taps</span>
            {dev && <span>{dev.vw}×{dev.vh}{dev.standalone ? " · home screen" : ""}</span>}
          </div>
        </div>
        {open ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
      </button>

      {open && (
        <div className="border-t border-slate-100">
          {/* where the time went */}
          <div className="px-4 py-3 space-y-1.5">
            {screens.map(([name, ms]) => (
              <div key={name} className="flex items-center gap-2 text-xs">
                <span className="w-24 text-slate-700 truncate capitalize">{name}</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${Math.max(2, (ms / total) * 100)}%` }} /></div>
                <span className="w-14 text-right tabular-nums text-slate-500">{fmtMs(ms)}</span>
              </div>
            ))}
          </div>
          {/* the exact timeline */}
          <div className="border-t border-slate-100 divide-y divide-slate-50 max-h-96 overflow-y-auto">
            {s.events.map((e) => (
              <div key={e.id} className="flex items-start gap-3 px-4 py-1.5 text-xs">
                <span className="w-16 shrink-0 tabular-nums text-slate-400">{fmtTime(e.occurred_at)}</span>
                {e.kind === "screen" && <span className="text-slate-700"><span className="capitalize font-medium">{e.screen}</span> <span className="text-slate-400">for {fmtMs(e.duration_ms)}</span></span>}
                {e.kind === "tap" && <span className="text-slate-700"><span className="text-slate-400">tapped</span> “{e.label}”{e.meta?.checked != null ? (e.meta.checked ? " ✓" : " ✗") : ""}<span className="text-slate-300"> · {e.screen}</span></span>}
                {e.kind === "feedback" && <span className="text-blue-700 flex items-center gap-1"><MessageSquare size={11} /> left a suggestion on {e.screen}</span>}
                {e.kind === "session_start" && <span className="text-emerald-700">opened the app{e.meta?.path ? ` at ${e.meta.path}` : ""}{e.meta?.online === false ? " · offline" : ""}</span>}
                {e.kind === "session_end" && <span className="text-slate-400">put it away</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

export default function UsageTimeline({ onBack }) {
  const [events, setEvents] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    Promise.all([fetchUsageEvents(), fetchFeedback()])
      .then(([ev, fb]) => { setEvents(ev); setFeedback(fb); })
      .catch(() => { setEvents([]); });
  }, []);

  const sessions = useMemo(() => {
    if (!events) return [];
    const m = new Map();
    for (const e of [...events].sort((a, b) => a.occurred_at.localeCompare(b.occurred_at))) {
      if (!m.has(e.session_id)) m.set(e.session_id, { id: e.session_id, start: e.occurred_at, events: [] });
      m.get(e.session_id).events.push(e);
    }
    return [...m.values()].sort((a, b) => b.start.localeCompare(a.start));
  }, [events]);

  // Across every session: where does the time go, and what gets tapped most?
  const totals = useMemo(() => {
    const screen = new Map(), tap = new Map();
    for (const e of events || []) {
      if (e.kind === "screen") screen.set(e.screen, (screen.get(e.screen) || 0) + (e.duration_ms || 0));
      if (e.kind === "tap") tap.set(e.label, (tap.get(e.label) || 0) + 1);
    }
    const sortD = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]);
    return { screen: sortD(screen), tap: sortD(tap).slice(0, 12) };
  }, [events]);

  const exportCsv = () => {
    const rows = (events || []).map((e) => [e.occurred_at, e.session_id, e.kind, e.screen || "", e.label || "", e.duration_ms ?? "", JSON.stringify(e.meta || {})]);
    const csv = [["occurred_at", "session", "kind", "screen", "label", "duration_ms", "meta"], ...rows]
      .map((r) => r.map((v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v)).join(","))
      .join("\r\n");
    downloadCsv("usage-events.csv", csv);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <button onClick={onBack} className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-700 mb-1"><ArrowLeft size={12} /> Settings</button>
          <h1 className="text-2xl font-semibold text-slate-900">What he actually does</h1>
          <p className="text-sm text-slate-500 mt-1">Every screen, how long, every tap. The personalised order comes from here.</p>
        </div>
        <Button variant="secondary" className="!px-3 !py-1.5 !text-xs shrink-0" onClick={exportCsv} disabled={!events?.length}><Download size={13} /> CSV</Button>
      </div>

      {events == null ? (
        <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-blue-600" /></div>
      ) : events.length === 0 ? (
        <EmptyState icon={MousePointerClick} title="Nothing recorded yet." subtitle="Once the app's been opened and used, sessions show up here." />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card className="p-4">
              <SectionTitle>Where the time goes</SectionTitle>
              <div className="space-y-1.5">
                {totals.screen.map(([name, ms]) => {
                  const all = totals.screen.reduce((a, [, v]) => a + v, 0) || 1;
                  return (
                    <div key={name} className="flex items-center gap-2 text-xs">
                      <span className="w-20 capitalize text-slate-700 truncate">{name}</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${Math.max(2, (ms / all) * 100)}%` }} /></div>
                      <span className="w-14 text-right tabular-nums text-slate-500">{fmtMs(ms)}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
            <Card className="p-4">
              <SectionTitle>Most tapped</SectionTitle>
              <div className="space-y-1">
                {totals.tap.map(([label, n]) => (
                  <div key={label} className="flex items-center justify-between gap-2 text-xs"><span className="text-slate-700 truncate">“{label}”</span><span className="tabular-nums text-slate-500 shrink-0">{n}×</span></div>
                ))}
              </div>
            </Card>
          </div>

          {feedback.length > 0 && (
            <Card className="p-4">
              <SectionTitle>His suggestions</SectionTitle>
              <div className="divide-y divide-slate-100">
                {feedback.map((f) => (
                  <div key={f.id} className="py-2.5">
                    <div className="text-sm text-slate-800">{f.message}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{fmtDay(f.created_at)} {fmtTime(f.created_at)}{f.screen ? ` · on ${f.screen}` : ""}{f.trying_to ? ` · trying to: ${f.trying_to}` : ""}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div>
            <div className="text-xs uppercase tracking-[0.14em] text-slate-400 mb-2 px-1">{sessions.length} session{sessions.length === 1 ? "" : "s"}</div>
            <div className="space-y-2">
              {sessions.map((s) => <Session key={s.id} s={s} open={openId === s.id} onToggle={() => setOpenId(openId === s.id ? null : s.id)} />)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
