import React, { useEffect, useMemo, useState } from "react";
import { Car, Home, Plus, Loader2, X, Trash2, MapPin, Info, Sparkles } from "lucide-react";
import { Card, Field, TextInput, Select, TextArea, Button, EmptyState, money } from "./ui";
import { formatDate, todayStr, financialYearStart, financialYearLabel } from "../lib/dates";
import { geocode, roadEstimateKm } from "../lib/geo";

const CAP_KM = 5000; // ATO cents-per-km method is capped at 5,000 business km/year

function fmtKm(n) {
  const v = Number(n || 0);
  return `${v.toFixed(v % 1 === 0 ? 0 : 1)} km`;
}

// ---------------------------------------------------------------------------
// Home base modal
// ---------------------------------------------------------------------------
function HomeBaseModal({ settings, onCancel, onSave }) {
  const [address, setAddress] = useState(settings.home_base_address || "");
  const [rate, setRate] = useState(settings.mileage_rate_cents ?? 88);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const coords = address.trim() ? await geocode(address.trim()) : null;
      await onSave({
        home_base_address: address.trim() || null,
        home_base_lat: coords?.lat ?? null,
        home_base_lng: coords?.lng ?? null,
        mileage_rate_cents: Number(rate) || 88,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/30 px-4 py-6 overflow-y-auto" onClick={onCancel}>
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-lg text-slate-900">Home base &amp; rate</h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <Field label="Home base address">
            <TextInput value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Where you set off from, e.g. 5 Smith St, Newtown" autoFocus />
          </Field>
          <p className="text-xs text-slate-400 -mt-1">Used to auto-estimate the distance to each job. Set once.</p>
          <Field label="Cents per km rate">
            <TextInput type="number" step="1" inputMode="numeric" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="88" />
          </Field>
          <p className="text-xs text-slate-400 -mt-1">The ATO rate (88c for 2024-25). Update it here when it changes.</p>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : null} Save
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trip modal (handles both "from a job" and manual)
// ---------------------------------------------------------------------------
function emptyTrip() {
  return { trip_date: todayStr(), from_label: "", to_label: "", distance_km: "", round_trip: true, purpose: "", customer_id: "" };
}

function TripModal({ initial, customers, settings, lastTripByCustomer, onCancel, onSave, onDelete, onCacheCoords }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [estimateNote, setEstimateNote] = useState("");
  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const isEdit = !!form.id;
  const homeSet = settings.home_base_lat != null;

  const applyCustomer = async (customerId) => {
    const c = customers.find((x) => x.id === customerId);
    setForm((f) => ({
      ...f,
      customer_id: customerId,
      to_label: c ? c.name + (c.address ? ` — ${c.address}` : "") : f.to_label,
      from_label: settings.home_base_address || f.from_label,
    }));
    setEstimateNote("");
    if (!c) return;

    // 1. Reuse the last logged trip for this customer - reflects his own
    //    corrections, so it gets more accurate over time.
    const last = lastTripByCustomer[customerId];
    if (last) {
      setForm((f) => ({ ...f, distance_km: last.distance_km, round_trip: last.round_trip }));
      setEstimateNote("Filled from the last trip to this customer.");
      return;
    }
    // 2. Otherwise estimate from coordinates (geocoding the address if needed).
    if (!homeSet) {
      setEstimateNote("Set a home base to auto-estimate distances.");
      return;
    }
    setEstimating(true);
    try {
      let coords = c.lat != null ? { lat: c.lat, lng: c.lng } : null;
      if (!coords && c.address) {
        coords = await geocode(c.address);
        if (coords) onCacheCoords(c.id, coords.lat, coords.lng);
      }
      const oneWay = coords ? roadEstimateKm({ lat: settings.home_base_lat, lng: settings.home_base_lng }, coords) : null;
      if (oneWay != null) {
        setForm((f) => ({ ...f, distance_km: f.round_trip ? Math.round(oneWay * 2 * 10) / 10 : oneWay }));
        setEstimateNote("Estimated from the address — adjust if it's off.");
      } else {
        setEstimateNote("Couldn't estimate that address — enter the km yourself.");
      }
    } finally {
      setEstimating(false);
    }
  };

  const canSave = !!form.trip_date && Number(form.distance_km) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/30 px-4 py-6 overflow-y-auto" onClick={onCancel}>
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-lg text-slate-900">{isEdit ? "Edit trip" : "Log a trip"}</h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <Field label="Trip to a customer (optional)">
            <Select value={form.customer_id || ""} onChange={(e) => applyCustomer(e.target.value)}>
              <option value="">— not linked to a customer —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
          {estimating && <p className="text-xs text-blue-600 flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> Estimating…</p>}
          {estimateNote && !estimating && <p className="text-xs text-slate-500 flex items-center gap-1"><Sparkles size={11} className="text-blue-500" /> {estimateNote}</p>}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <TextInput type="date" value={form.trip_date} onChange={(e) => set("trip_date", e.target.value)} />
            </Field>
            <Field label="Distance (km)">
              <TextInput type="number" step="0.1" inputMode="decimal" value={form.distance_km ?? ""} onChange={(e) => set("distance_km", e.target.value)} placeholder="0.0" />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={form.round_trip}
              onChange={(e) => set("round_trip", e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            Round trip (there and back)
          </label>

          <Field label="From">
            <TextInput value={form.from_label || ""} onChange={(e) => set("from_label", e.target.value)} placeholder={settings.home_base_address || "Starting point"} />
          </Field>
          <Field label="To">
            <TextInput value={form.to_label || ""} onChange={(e) => set("to_label", e.target.value)} placeholder="Destination" />
          </Field>
          <Field label="Purpose (optional)">
            <TextArea rows={2} value={form.purpose || ""} onChange={(e) => set("purpose", e.target.value)} placeholder="e.g. Job, supply run, quote visit" />
          </Field>
        </div>
        <div className="flex items-center gap-3 px-5 py-4 border-t border-slate-100">
          {isEdit && onDelete && (
            <Button variant="danger" onClick={() => onDelete(form)} className="!px-3">
              <Trash2 size={14} /> Delete
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button
            onClick={async () => {
              setSaving(true);
              try {
                await onSave({ ...form, distance_km: Number(form.distance_km) || 0, customer_id: form.customer_id || null });
              } finally {
                setSaving(false);
              }
            }}
            disabled={!canSave || saving}
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : null} Save trip
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
export default function Mileage({ trips, customers, settings, onSaveTrip, onDeleteTrip, onSaveSettings, onCacheCoords }) {
  const [editingHome, setEditingHome] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);
  const [savingHome, setSavingHome] = useState(false);
  const [savingTrip, setSavingTrip] = useState(false);

  const rate = settings.mileage_rate_cents ?? 88;
  const homeSet = settings.home_base_lat != null || !!settings.home_base_address;

  const fyStart = financialYearStart();
  const thisMonth = todayStr().slice(0, 7);

  const fyTrips = useMemo(() => trips.filter((t) => t.trip_date >= fyStart), [trips, fyStart]);
  const fyKm = useMemo(() => fyTrips.reduce((s, t) => s + Number(t.distance_km || 0), 0), [fyTrips]);
  const monthKm = useMemo(
    () => trips.filter((t) => t.trip_date.slice(0, 7) === thisMonth).reduce((s, t) => s + Number(t.distance_km || 0), 0),
    [trips, thisMonth]
  );

  const claimableKm = Math.min(fyKm, CAP_KM);
  const dollarEstimate = (claimableKm * rate) / 100;
  const capPct = Math.min(100, (fyKm / CAP_KM) * 100);

  // Most recent trip per customer, for one-tap re-logging of a known route.
  const lastTripByCustomer = useMemo(() => {
    const map = {};
    // trips arrive newest-first, so the first one seen per customer is latest
    for (const t of trips) {
      if (t.customer_id && !map[t.customer_id]) map[t.customer_id] = t;
    }
    return map;
  }, [trips]);

  const sorted = useMemo(() => [...trips].sort((a, b) => b.trip_date.localeCompare(a.trip_date)), [trips]);

  const saveHome = async (payload) => {
    setSavingHome(true);
    try {
      await onSaveSettings(payload);
      setEditingHome(false);
    } finally {
      setSavingHome(false);
    }
  };

  const saveTrip = async (form) => {
    setSavingTrip(true);
    try {
      await onSaveTrip(form);
      setEditingTrip(null);
    } finally {
      setSavingTrip(false);
    }
  };

  const removeTrip = async (form) => {
    if (!confirm("Delete this trip?")) return;
    await onDeleteTrip(form.id);
    setEditingTrip(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Mileage</h1>
          <p className="text-sm text-slate-500 mt-1">Track work km for the cents-per-km deduction. Financial year {financialYearLabel()}.</p>
        </div>
        <Button variant="secondary" onClick={() => setEditingHome(true)} className="!text-sm">
          <Home size={15} /> {homeSet ? "Home base" : "Set home base"}
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Card className="p-4">
          <div className="text-xl font-semibold tabular-nums text-slate-900">{fmtKm(fyKm)}</div>
          <div className="text-xs text-slate-500">This financial year</div>
        </Card>
        <Card className="p-4">
          <div className="text-xl font-semibold tabular-nums text-slate-900">{fmtKm(monthKm)}</div>
          <div className="text-xs text-slate-500">This month</div>
        </Card>
        <Card className="p-4">
          <div className="text-xl font-semibold tabular-nums text-emerald-600">{money(dollarEstimate)}</div>
          <div className="text-xs text-slate-500">Est. deduction @ {rate}c/km</div>
        </Card>
        <Card className="p-4">
          <div className="text-xl font-semibold tabular-nums text-slate-900">{fmtKm(claimableKm)}<span className="text-sm text-slate-400"> / 5,000</span></div>
          <div className="text-xs text-slate-500">Claimable this year</div>
        </Card>
      </div>

      {/* Cap progress */}
      <div className="mb-5">
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className={`h-full rounded-full ${fyKm >= CAP_KM ? "bg-amber-500" : "bg-blue-600"}`} style={{ width: `${capPct}%` }} />
        </div>
        {fyKm >= CAP_KM && (
          <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
            <Info size={12} /> You've passed 5,000 km — the cents-per-km method caps there. A logbook may claim more.
          </p>
        )}
      </div>

      {!homeSet && (
        <Card className="p-4 mb-4 bg-blue-50/50 border-blue-100">
          <div className="flex items-start gap-3">
            <MapPin size={18} className="text-blue-600 mt-0.5 shrink-0" />
            <div className="text-sm text-slate-600">
              <span className="font-medium text-slate-900">Set your home base</span> to auto-estimate the distance to each job.
              You can still log trips manually without it.
            </div>
          </div>
        </Card>
      )}

      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-xs text-slate-400 flex items-center gap-1">
          <Info size={12} /> On days with several jobs, log one round trip and one-ways between, so the total stays honest.
        </p>
        <Button onClick={() => setEditingTrip(emptyTrip())} className="shrink-0">
          <Plus size={16} strokeWidth={2.5} /> Log a trip
        </Button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon={Car} title="No trips logged yet." subtitle="Log a trip to a customer and it'll remember the distance for next time." />
      ) : (
        <div className="space-y-2">
          {sorted.map((t) => (
            <Card key={t.id} className="px-4 py-3">
              <button onClick={() => setEditingTrip(t)} className="w-full flex items-center justify-between gap-3 text-left">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-medium text-slate-900">{fmtKm(t.distance_km)}</span>
                    {t.round_trip && <span className="text-xs text-slate-400">round trip</span>}
                    <span className="text-xs text-slate-400">{formatDate(t.trip_date)}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 truncate">
                    {[t.from_label, t.to_label].filter(Boolean).join(" → ") || t.purpose || "Trip"}
                  </div>
                </div>
              </button>
            </Card>
          ))}
        </div>
      )}

      <p className="text-center text-xs text-slate-400 mt-6 px-2">
        Estimates are a guide for the cents-per-km method — keep them realistic and check the current rate and rules with your accountant or the ATO.
      </p>

      {editingHome && (
        <HomeBaseModal settings={settings} onCancel={() => setEditingHome(false)} onSave={saveHome} />
      )}
      {editingTrip && (
        <TripModal
          initial={editingTrip}
          customers={customers}
          settings={settings}
          lastTripByCustomer={lastTripByCustomer}
          onCancel={() => setEditingTrip(null)}
          onSave={saveTrip}
          onDelete={editingTrip.id ? removeTrip : null}
          onCacheCoords={onCacheCoords}
        />
      )}
    </div>
  );
}
