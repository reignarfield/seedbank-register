import React, { useState, useEffect, useMemo } from "react";
import { Leaf, Plus, Search, FileText, Database, Sprout, Save, ChevronRight, AlertCircle, Loader2, LogIn, LogOut } from "lucide-react";
import { fetchSeedlots, upsertSeedlot, deleteSeedlot, getSession, onAuthChange, signIn, signOut } from "./data";

const TEMP_REGIMES = [
  { value: "", label: "— select —" },
  { value: "15/5", label: "15 / 5 °C" },
  { value: "25/15", label: "25 / 15 °C" },
  { value: "35/25", label: "35 / 25 °C" },
];

const REPLICATE_MEASURES = {
  weight100: { label: "Weight / 100 seeds (g)", decimals: 3, percent: false, quality: false },
  purity: { label: "Purity (%)", decimals: 1, percent: true, quality: true },
  germ: { label: "Germination (%)", decimals: 1, percent: true, quality: true },
  via: { label: "Viability (%)", decimals: 1, percent: true, quality: true },
};

const SIMPLE_GROUPS = [
  {
    title: "Identification",
    fields: [
      { key: "sl", label: "Seedlot No.", type: "text", required: true, hint: "e.g. 6771" },
      { key: "species", label: "Species", type: "text", required: true, hint: "e.g. Acacia conferta" },
      { key: "collector", label: "Collector / Company", type: "text" },
      { key: "storage", label: "Storage location", type: "text", hint: "e.g. BF, CR" },
      { key: "totalDeposit", label: "Total deposit (g)", type: "number" },
    ],
  },
  {
    title: "Germination test details",
    fields: [
      { key: "testType", label: "Test type", type: "text", hint: "e.g. Germination, Cut" },
      { key: "treatment", label: "Treatment", type: "text", hint: "e.g. Physical, Sc, GA" },
      { key: "startDate", label: "Start date", type: "date" },
      { key: "endDate", label: "End date", type: "date" },
      { key: "germRange", label: "Germination range (days)", type: "number" },
    ],
  },
];

const DORMANCY_GROUP = {
  title: "Dormancy & enhancement",
  fields: [
    { key: "dormancyClass", label: "Dormancy class", type: "text", hint: "e.g. Physical, Physiological" },
    { key: "dormancyPct", label: "Dormancy (%) — no treatment", type: "number", step: "0.1", max: 100 },
    { key: "set", label: "Seed enhancement (SET)", type: "text" },
  ],
};

const repKeys = (m) => [`${m}_r1`, `${m}_r2`, `${m}_r3`];
const ALL_SIMPLE_KEYS = [...SIMPLE_GROUPS.flatMap((g) => g.fields.map((f) => f.key)), ...DORMANCY_GROUP.fields.map((f) => f.key), "tempRegime", "notes"];

function emptyRecord() {
  const rec = { id: `seed-${Date.now()}-${Math.random().toString(36).slice(2, 9)}` };
  ALL_SIMPLE_KEYS.forEach((k) => (rec[k] = ""));
  Object.keys(REPLICATE_MEASURES).forEach((m) => repKeys(m).forEach((rk) => (rec[rk] = "")));
  return rec;
}

function replicateStats(record, measure) {
  const def = REPLICATE_MEASURES[measure];
  const raw = repKeys(measure).map((rk) => record[rk]);
  const invalid = [];
  const valid = [];
  raw.forEach((v, i) => {
    if (v === "" || v === null || v === undefined) return;
    const num = parseFloat(v);
    if (isNaN(num)) { invalid.push(i); return; }
    if (def.percent && (num < 0 || num > 100)) { invalid.push(i); return; }
    if (!def.percent && num < 0) { invalid.push(i); return; }
    valid.push(num);
  });
  const n = valid.length;
  const mean = n ? valid.reduce((a, b) => a + b, 0) / n : null;
  return { mean, n, complete: n === 3, invalid };
}

function seedsPerGram(record) {
  const { mean } = replicateStats(record, "weight100");
  if (!mean || mean <= 0) return null;
  return 100 / mean;
}

function roundTo(n, decimals) {
  if (n === null || n === undefined || isNaN(n)) return null;
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

function fmtMean(mean, decimals, suffix = "") {
  const r = roundTo(mean, decimals);
  if (r === null) return "—";
  return `${r.toFixed(decimals)}${suffix}`;
}

function fmtVal(v, decimals = 1, suffix = "") {
  if (v === null || v === undefined || v === "") return "—";
  const num = typeof v === "number" ? v : parseFloat(v);
  if (isNaN(num)) return "—";
  return `${roundTo(num, decimals)}${suffix}`;
}

function qualityColor(pct) {
  if (pct === null || pct === undefined || isNaN(pct)) return null;
  const p = Math.max(0, Math.min(100, pct)) / 100;
  const hue = 8 + p * 112; // muted red → amber → muted green
  return `hsl(${hue}, 38%, 38%)`;
}


// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------
function Badge({ children, style }) {
  return (
    <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-stone-100 text-stone-600 border-stone-200" style={style}>
      {children}
    </span>
  );
}

function NavBar({ view, setView, session, onLoginClick, onLogout }) {
  const allTabs = [
    { id: "entry", label: "Add", icon: Sprout, auth: true },
    { id: "library", label: "Library", icon: Database, auth: false },
    { id: "report", label: "Report", icon: FileText, auth: false },
  ];
  const tabs = allTabs.filter((t) => !t.auth || session);
  return (
    <header className="sticky top-0 z-20 bg-[#f6f3ec] border-b border-[#e4ddc9]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#3f5a44] flex items-center justify-center shrink-0">
              <Leaf size={18} className="text-[#f6f3ec]" strokeWidth={2.25} />
            </div>
            <div className="leading-tight">
              <div className="font-serif text-lg text-[#2b2a26] tracking-tight">Seedbank Register</div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-[#9a9382] -mt-0.5">2025 / 2026</div>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-[#ece6d6] rounded-full p-1">
              {tabs.map((t) => {
                const Icon = t.icon;
                const active = view === t.id || (t.id === "entry" && view === "edit");
                return (
                  <button key={t.id} onClick={() => setView(t.id)}
                    className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${active ? "bg-[#3f5a44] text-[#f6f3ec]" : "text-[#6b6555] hover:text-[#3f5a44]"}`}>
                    <Icon size={14} strokeWidth={2.25} />
                    <span className="hidden sm:inline">{t.label}</span>
                  </button>
                );
              })}
            </div>
            {session ? (
              <button onClick={onLogout} title="Sign out"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-[#6b6555] hover:text-[#3f5a44] transition-colors">
                <LogOut size={14} strokeWidth={2.25} />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            ) : (
              <button onClick={onLoginClick} title="Sign in to edit"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-[#6b6555] hover:text-[#3f5a44] transition-colors">
                <LogIn size={14} strokeWidth={2.25} />
                <span className="hidden sm:inline">Sign in</span>
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

function ReplicateInput({ record, setRecord, measure }) {
  const def = REPLICATE_MEASURES[measure];
  const stats = replicateStats(record, measure);
  const keys = repKeys(measure);
  const handle = (rk, val) => setRecord((prev) => ({ ...prev, [rk]: val }));
  const suffix = def.percent ? "%" : "";
  const liveMean = stats.mean !== null ? fmtMean(stats.mean, def.decimals, suffix) : "—";
  const finalColor = def.quality && def.percent && stats.complete ? qualityColor(stats.mean) : "#2b2a26";

  return (
    <div className="bg-[#fbfaf6] border border-[#e4ddc9] rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-[#4a4639]">{def.label}</span>
        {stats.invalid.length > 0 && (
          <span className="text-[11px] text-[#b5704f] flex items-center gap-1"><AlertCircle size={12} /> rep out of range</span>
        )}
      </div>
      <div className="flex items-stretch gap-2">
        <div className="flex gap-1.5 flex-1">
          {keys.map((rk, i) => {
            const bad = stats.invalid.includes(i);
            return (
              <input key={rk} type="number" inputMode="decimal" step={def.decimals === 3 ? "0.001" : "0.1"}
                value={record[rk] ?? ""} onChange={(e) => handle(rk, e.target.value)} placeholder={`R${i + 1}`}
                className={`w-full min-w-0 bg-white border rounded-md px-2 py-2 text-sm text-center text-[#2b2a26] placeholder:text-[#c9c2ae] focus:outline-none focus:ring-2 focus:ring-[#3f5a44]/30 ${bad ? "border-[#b5704f] ring-1 ring-[#b5704f]/40" : "border-[#e4ddc9] focus:border-[#3f5a44]"}`} />
            );
          })}
        </div>
        <div className="flex flex-col items-end justify-center px-3 border-l border-[#e4ddc9] min-w-[92px]">
          <span className="text-[10px] uppercase tracking-wider text-[#b3ac99] leading-none">
            {stats.complete ? "Mean" : stats.n > 0 ? `Mean · n=${stats.n}` : "Mean"}
          </span>
          <span className="text-xs text-[#a39b87] tabular-nums leading-tight mt-0.5">{liveMean}</span>
          <span className="text-xl font-semibold tabular-nums leading-tight" style={{ color: finalColor, opacity: stats.complete ? 1 : 0.25 }}>
            {stats.complete ? fmtMean(stats.mean, def.decimals, suffix) : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}

function EntryView({ record, setRecord, onSave, onDelete, saving, isEdit }) {
  const handleChange = (key, value) => setRecord((prev) => ({ ...prev, [key]: value }));
  const spg = seedsPerGram(record);
  const canSave = (record.sl || "").trim() || (record.species || "").trim();
  const tempLabel = TEMP_REGIMES.find((t) => t.value === record.tempRegime)?.label || "selected regime";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-28">
      <div className="mb-6">
        <h1 className="font-serif text-2xl text-[#2b2a26]">{isEdit ? "Edit seedlot record" : "Add seedlot record"}</h1>
        <p className="text-sm text-[#9a9382] mt-1">Enter three replicates for each measured value — the mean is calculated automatically and locks in once all three are filled.</p>
      </div>

      <div className="space-y-6">
        {SIMPLE_GROUPS.map((group) => (
          <section key={group.title} className="bg-white border border-[#e4ddc9] rounded-xl p-4 sm:p-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#3f5a44] mb-3">{group.title}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {group.fields.map((f) => (
                <div key={f.key}>
                  <label className="block text-sm text-[#4a4639] mb-1">{f.label}{f.required && <span className="text-[#b5704f]"> *</span>}</label>
                  <input type={f.type} step={f.step} value={record[f.key] ?? ""} onChange={(e) => handleChange(f.key, e.target.value)} placeholder={f.hint}
                    className="w-full bg-[#fbfaf6] border border-[#e4ddc9] rounded-lg px-3 py-2 text-sm text-[#2b2a26] placeholder:text-[#c9c2ae] focus:outline-none focus:ring-2 focus:ring-[#3f5a44]/30 focus:border-[#3f5a44]" />
                </div>
              ))}
            </div>
          </section>
        ))}

        <section className="bg-white border border-[#e4ddc9] rounded-xl p-4 sm:p-5">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#3f5a44] mb-3">Seed lot — measured values</h2>
          <div className="space-y-3">
            <ReplicateInput record={record} setRecord={setRecord} measure="weight100" />
            <div className="flex items-center justify-between bg-[#f3f0e6] border border-[#e4ddc9] rounded-lg px-3 py-2.5">
              <span className="text-sm text-[#4a4639]">Seeds per gram <span className="text-[#9a9382]">(derived)</span></span>
              <span className="text-base font-semibold tabular-nums text-[#2b2a26]">{spg !== null ? roundTo(spg, 0) : "—"}</span>
            </div>
            <ReplicateInput record={record} setRecord={setRecord} measure="purity" />
          </div>
        </section>

        <section className="bg-white border border-[#e4ddc9] rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#3f5a44]">Germination & viability</h2>
            <div className="flex items-center gap-2">
              <label className="text-xs text-[#9a9382]">Temperature regime</label>
              <select value={record.tempRegime ?? ""} onChange={(e) => handleChange("tempRegime", e.target.value)}
                className="bg-[#fbfaf6] border border-[#e4ddc9] rounded-lg px-2.5 py-1.5 text-sm text-[#2b2a26] focus:outline-none focus:ring-2 focus:ring-[#3f5a44]/30 focus:border-[#3f5a44]">
                {TEMP_REGIMES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
              </select>
            </div>
          </div>
          <p className="text-xs text-[#9a9382] mb-3">Recorded at {tempLabel}.</p>
          <div className="space-y-3">
            <ReplicateInput record={record} setRecord={setRecord} measure="germ" />
            <ReplicateInput record={record} setRecord={setRecord} measure="via" />
          </div>
        </section>

        <section className="bg-white border border-[#e4ddc9] rounded-xl p-4 sm:p-5">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#3f5a44] mb-3">{DORMANCY_GROUP.title}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DORMANCY_GROUP.fields.map((f) => (
              <div key={f.key}>
                <label className="block text-sm text-[#4a4639] mb-1">{f.label}</label>
                <input type={f.type} step={f.step} value={record[f.key] ?? ""} onChange={(e) => handleChange(f.key, e.target.value)} placeholder={f.hint}
                  className="w-full bg-[#fbfaf6] border border-[#e4ddc9] rounded-lg px-3 py-2 text-sm text-[#2b2a26] placeholder:text-[#c9c2ae] focus:outline-none focus:ring-2 focus:ring-[#3f5a44]/30 focus:border-[#3f5a44]" />
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-[#e4ddc9] rounded-xl p-4 sm:p-5">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#3f5a44] mb-3">Notes</h2>
          <textarea value={record.notes ?? ""} onChange={(e) => handleChange("notes", e.target.value)} rows={3}
            className="w-full bg-[#fbfaf6] border border-[#e4ddc9] rounded-lg px-3 py-2 text-sm text-[#2b2a26] focus:outline-none focus:ring-2 focus:ring-[#3f5a44]/30 focus:border-[#3f5a44] resize-none" />
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-[#f6f3ec]/95 backdrop-blur border-t border-[#e4ddc9]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          {onDelete && <button onClick={onDelete} className="text-sm text-[#b5704f] font-medium px-4 py-2.5 rounded-lg hover:bg-[#b5704f]/10 transition-colors">Delete</button>}
          <div className="flex-1" />
          {!canSave && <span className="text-xs text-[#9a9382] flex items-center gap-1 mr-1"><AlertCircle size={13} /> Add a seedlot no. and species</span>}
          <button onClick={onSave} disabled={saving || !canSave}
            className="flex items-center gap-1.5 bg-[#3f5a44] text-[#f6f3ec] text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-[#354c3a] transition-colors disabled:opacity-50">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save record
          </button>
        </div>
      </div>
    </div>
  );
}

function LibraryView({ records, onSelect, onNew, session }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    if (!query.trim()) return records;
    const q = query.toLowerCase();
    return records.filter((r) =>
      (r.species || "").toLowerCase().includes(q) ||
      (r.sl || "").toLowerCase().includes(q) ||
      (r.collector || "").toLowerCase().includes(q) ||
      (r.storage || "").toLowerCase().includes(q));
  }, [records, query]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9a9382]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by species, seedlot no., collector, storage..."
            className="w-full bg-white border border-[#e4ddc9] rounded-lg pl-9 pr-3 py-2.5 text-sm text-[#2b2a26] placeholder:text-[#b3ac99] focus:outline-none focus:ring-2 focus:ring-[#3f5a44]/30 focus:border-[#3f5a44]" />
        </div>
        {session && (
          <button onClick={onNew} className="flex items-center justify-center gap-1.5 bg-[#3f5a44] text-[#f6f3ec] text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-[#354c3a] transition-colors shrink-0">
            <Plus size={16} strokeWidth={2.5} /> New record
          </button>
        )}
      </div>

      <div className="flex items-center justify-between mb-2 px-1">
        <div className="text-xs uppercase tracking-[0.14em] text-[#9a9382]">{filtered.length} {filtered.length === 1 ? "seedlot" : "seedlots"}</div>
        {!session && <span className="text-xs text-[#9a9382]">Sign in to add or edit records</span>}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[#e4ddc9] rounded-xl bg-white/50">
          <Sprout size={28} className="mx-auto text-[#c9c2ae] mb-3" />
          <p className="text-sm text-[#6b6555]">{records.length === 0 ? "No seedlots yet." : "No records match your search."}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const germ = replicateStats(r, "germ");
            const via = replicateStats(r, "via");
            return (
              <button key={r.id} onClick={() => onSelect(r)}
                className="w-full flex items-center justify-between gap-3 bg-white border border-[#e4ddc9] rounded-lg px-4 py-3 text-left hover:border-[#3f5a44]/40 hover:shadow-sm transition-all">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-serif text-base text-[#2b2a26] italic truncate">{r.species || "Unnamed species"}</span>
                    <span className="text-xs font-mono text-[#9a9382]">#{r.sl || "—"}</span>
                  </div>
                  <div className="text-xs text-[#9a9382] mt-0.5 truncate">{[r.collector, r.storage].filter(Boolean).join(" · ") || "No collector / storage recorded"}</div>
                </div>
                <div className="hidden sm:flex items-center gap-2 shrink-0">
                  {germ.mean !== null && <Badge style={germ.complete ? { color: qualityColor(germ.mean), borderColor: "currentColor", background: "transparent" } : undefined}>Germ {fmtVal(germ.mean, 1, "%")}</Badge>}
                  {via.mean !== null && <Badge style={via.complete ? { color: qualityColor(via.mean), borderColor: "currentColor", background: "transparent" } : undefined}>Via {fmtVal(via.mean, 1, "%")}</Badge>}
                </div>
                <ChevronRight size={16} className="text-[#c9c2ae] shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ReportStat({ label, value, color }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.12em] text-[#9a9382]">{label}</dt>
      <dd className="font-medium" style={{ color: color || "#2b2a26" }}>{value}</dd>
    </div>
  );
}

function ReportView({ records }) {
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [mode, setMode] = useState("select");
  const toggle = (id) => setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const selectAll = () => setSelectedIds(new Set(records.map((r) => r.id)));
  const clearAll = () => setSelectedIds(new Set());
  const selected = records.filter((r) => selectedIds.has(r.id));

  if (mode === "report") {
    const today = new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 print:py-0">
        <div className="flex items-center justify-between mb-6 print:hidden">
          <button onClick={() => setMode("select")} className="text-sm text-[#6b6555] font-medium px-3 py-1.5 rounded-lg hover:bg-[#ece6d6] transition-colors">← Back to selection</button>
          <button onClick={() => window.print()} className="flex items-center gap-1.5 bg-[#3f5a44] text-[#f6f3ec] text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#354c3a] transition-colors"><FileText size={15} /> Print / save as PDF</button>
        </div>
        <div className="bg-white border border-[#e4ddc9] rounded-xl p-6 sm:p-10 print:border-0 print:p-0">
          <div className="flex items-start justify-between border-b border-[#e4ddc9] pb-4 mb-6">
            <div>
              <h1 className="font-serif text-2xl text-[#2b2a26]">Seedlot Report</h1>
              <p className="text-sm text-[#9a9382] mt-1">2025 / 2026 Seedbank Register · Generated {today}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#3f5a44] flex items-center justify-center shrink-0"><Leaf size={20} className="text-[#f6f3ec]" /></div>
          </div>
          <div className="space-y-8">
            {selected.map((r) => {
              const w = replicateStats(r, "weight100");
              const pur = replicateStats(r, "purity");
              const germ = replicateStats(r, "germ");
              const via = replicateStats(r, "via");
              const spg = seedsPerGram(r);
              const regime = TEMP_REGIMES.find((t) => t.value === r.tempRegime)?.label || "—";
              return (
                <article key={r.id} className="break-inside-avoid">
                  <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
                    <h2 className="font-serif text-xl italic text-[#2b2a26]">{r.species || "Unnamed species"}</h2>
                    <span className="text-xs font-mono text-[#9a9382]">Seedlot #{r.sl || "—"}</span>
                  </div>
                  <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-3">
                    <ReportStat label="Collector" value={r.collector || "—"} />
                    <ReportStat label="Storage" value={r.storage || "—"} />
                    <ReportStat label="Total deposit" value={fmtVal(r.totalDeposit, 0, " g")} />
                    <ReportStat label="Purity" value={pur.mean !== null ? fmtMean(pur.mean, 1, "%") : "—"} color={pur.complete ? qualityColor(pur.mean) : null} />
                    <ReportStat label="Wt / 100 seeds" value={w.mean !== null ? fmtMean(w.mean, 3, " g") : "—"} />
                    <ReportStat label="Seeds / g" value={spg !== null ? roundTo(spg, 0) : "—"} />
                    <ReportStat label={`Germination (${regime})`} value={germ.mean !== null ? fmtMean(germ.mean, 1, "%") : "—"} color={germ.complete ? qualityColor(germ.mean) : null} />
                    <ReportStat label={`Viability (${regime})`} value={via.mean !== null ? fmtMean(via.mean, 1, "%") : "—"} color={via.complete ? qualityColor(via.mean) : null} />
                  </dl>
                  <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <ReportStat label="Test type" value={r.testType || "—"} />
                    <ReportStat label="Treatment" value={r.treatment || "—"} />
                    <ReportStat label="Dormancy class" value={r.dormancyClass || "—"} />
                    <ReportStat label="Dormancy %" value={r.dormancyPct !== "" && r.dormancyPct != null ? fmtVal(r.dormancyPct, 1, "%") : "—"} />
                  </dl>
                  {r.notes && <p className="text-sm text-[#6b6555] mt-3 border-t border-[#f0ebdd] pt-3">{r.notes}</p>}
                </article>
              );
            })}
          </div>
          {selected.length === 0 && <p className="text-sm text-[#9a9382] text-center py-12">No seedlots selected.</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-5">
        <h1 className="font-serif text-2xl text-[#2b2a26]">Build a report</h1>
        <p className="text-sm text-[#9a9382] mt-1">Select the seedlots to include, then generate a shareable summary.</p>
      </div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={selectAll} className="text-sm font-medium text-[#3f5a44] px-3 py-1.5 rounded-lg hover:bg-[#ece6d6] transition-colors">Select all</button>
        <button onClick={clearAll} className="text-sm font-medium text-[#6b6555] px-3 py-1.5 rounded-lg hover:bg-[#ece6d6] transition-colors">Clear</button>
        <div className="flex-1" />
        <span className="text-xs text-[#9a9382]">{selectedIds.size} selected</span>
      </div>
      {records.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[#e4ddc9] rounded-xl bg-white/50">
          <FileText size={28} className="mx-auto text-[#c9c2ae] mb-3" />
          <p className="text-sm text-[#6b6555]">No records to report on yet.</p>
        </div>
      ) : (
        <div className="space-y-2 mb-24">
          {records.map((r) => (
            <label key={r.id} className="flex items-center gap-3 bg-white border border-[#e4ddc9] rounded-lg px-4 py-3 cursor-pointer hover:border-[#3f5a44]/40 transition-colors">
              <input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggle(r.id)} className="w-4 h-4 accent-[#3f5a44]" />
              <div className="min-w-0 flex-1">
                <span className="font-serif italic text-[#2b2a26]">{r.species || "Unnamed species"}</span>
                <span className="text-xs font-mono text-[#9a9382] ml-2">#{r.sl || "—"}</span>
              </div>
            </label>
          ))}
        </div>
      )}
      <div className="fixed bottom-0 left-0 right-0 bg-[#f6f3ec]/95 backdrop-blur border-t border-[#e4ddc9]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex justify-end">
          <button onClick={() => setMode("report")} disabled={selectedIds.size === 0} className="flex items-center gap-1.5 bg-[#3f5a44] text-[#f6f3ec] text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-[#354c3a] transition-colors disabled:opacity-50">
            <FileText size={15} /> Generate report
          </button>
        </div>
      </div>
    </div>
  );
}


// ---------------------------------------------------------------------------
// Login modal
// ---------------------------------------------------------------------------
function LoginModal({ onClose, onSignedIn }) {
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
      <div className="bg-[#f6f3ec] border border-[#e4ddc9] rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-serif text-xl text-[#2b2a26] mb-1">Sign in</h2>
        <p className="text-sm text-[#9a9382] mb-4">Editing requires an account. Viewing is open to everyone.</p>
        <div className="space-y-3">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email"
            className="w-full bg-white border border-[#e4ddc9] rounded-lg px-3 py-2.5 text-sm text-[#2b2a26] focus:outline-none focus:ring-2 focus:ring-[#3f5a44]/30 focus:border-[#3f5a44]" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password"
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="w-full bg-white border border-[#e4ddc9] rounded-lg px-3 py-2.5 text-sm text-[#2b2a26] focus:outline-none focus:ring-2 focus:ring-[#3f5a44]/30 focus:border-[#3f5a44]" />
          {error && <p className="text-sm text-[#b5704f]">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 text-sm font-medium text-[#6b6555] px-4 py-2.5 rounded-lg hover:bg-[#ece6d6] transition-colors">Cancel</button>
            <button onClick={submit} disabled={busy || !email || !password}
              className="flex-1 flex items-center justify-center gap-1.5 bg-[#3f5a44] text-[#f6f3ec] text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-[#354c3a] transition-colors disabled:opacity-50">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <LogIn size={15} />} Sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------
export default function App() {
  const [view, setView] = useState("library");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeRecord, setActiveRecord] = useState(null);
  const [saving, setSaving] = useState(false);
  const [session, setSession] = useState(null);
  const [showLogin, setShowLogin] = useState(false);

  const reload = async () => {
    setError("");
    try {
      const data = await fetchSeedlots();
      setRecords(data);
    } catch (e) {
      setError("Could not load records: " + (e?.message || "unknown error"));
    }
  };

  useEffect(() => {
    (async () => {
      setSession(await getSession());
      await reload();
      setLoading(false);
    })();
    const unsub = onAuthChange((s) => setSession(s));
    return unsub;
  }, []);

  const openRecord = (record) => {
    if (!session) { setShowLogin(true); return; }
    setActiveRecord({ ...record });
    setView("edit");
  };
  const openNew = () => { setActiveRecord(emptyRecord()); setView("entry"); };

  useEffect(() => {
    if (view === "entry") {
      if (!activeRecord || records.some((r) => r.id === activeRecord.id)) setActiveRecord(emptyRecord());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // If logged out while on an edit/add screen, bounce back to library
  useEffect(() => {
    if (!session && (view === "entry" || view === "edit")) setView("library");
  }, [session, view]);

  const saveRecord = async () => {
    if (!activeRecord || !session) return;
    setSaving(true);
    setError("");
    try {
      await upsertSeedlot(activeRecord);
      await reload();
      setView("library");
      setActiveRecord(null);
    } catch (e) {
      setError("Save failed: " + (e?.message || "unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const removeRecord = async () => {
    if (!activeRecord || !session) return;
    setSaving(true);
    setError("");
    try {
      await deleteSeedlot(activeRecord.id);
      await reload();
      setView("library");
      setActiveRecord(null);
    } catch (e) {
      setError("Delete failed: " + (e?.message || "unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    setSession(null);
    setView("library");
  };

  if (loading) {
    return <div className="min-h-screen bg-[#f6f3ec] flex items-center justify-center"><Loader2 size={24} className="animate-spin text-[#3f5a44]" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#f6f3ec] font-sans">
      <style>{`@media print { .print\\:hidden { display: none !important; } body { background: white !important; } }`}</style>
      <NavBar view={view} setView={setView} session={session} onLoginClick={() => setShowLogin(true)} onLogout={handleLogout} />
      {error && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4">
          <div className="bg-[#fbeae3] border border-[#e6c4b4] text-[#8a4a30] text-sm rounded-lg px-4 py-2.5 flex items-center gap-2">
            <AlertCircle size={15} /> {error}
          </div>
        </div>
      )}
      {view === "library" && <LibraryView records={records} onSelect={openRecord} onNew={openNew} session={session} />}
      {(view === "entry" || view === "edit") && activeRecord && session && (
        <EntryView record={activeRecord} setRecord={setActiveRecord} onSave={saveRecord} onDelete={view === "edit" ? removeRecord : null} saving={saving} isEdit={view === "edit"} />
      )}
      {view === "report" && <ReportView records={records} />}
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} onSignedIn={() => setShowLogin(false)} />}
    </div>
  );
}
