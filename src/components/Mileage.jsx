import React, { useMemo, useState } from "react";
import { Car, Settings, Plus, Loader2, X, Archive, Sparkles, Calculator } from "lucide-react";
import { Card, Field, TextInput, Select, TextArea, Button, EmptyState, money } from "./ui";
import { formatDate, todayStr, financialYearStart, financialYearLabel } from "../lib/dates";
import { geocode, drivingDistanceKm } from "../lib/geo";
import { BUSINESS } from "../lib/business";

const CAP_KM = 5000; // ATO cents-per-km method caps at 5,000 business km/year
const RECENT_SHOWN = 5;

function fmtKm(n) {
  const v = Number(n || 0);
  return `${v.toFixed(v % 1 === 0 ? 0 : 1)} km`;
}

// ---------------------------------------------------------------------------
// Trip modal
// ---------------------------------------------------------------------------
function emptyTrip(settings) {
  return { trip_date: todayStr(), from_label: settings.home_base_address || "", to_label: "", distance_km: "", round_trip: true, purpose: "", customer_id: "" };
}

function TripModal({ initial, customers, settings, lastTripByCustomer, onCancel, onSave, onDelete, onCacheCoords }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [calcing, setCalcing] = useState(false);
  const [note, setNote] = useState("");
  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const isEdit = !!form.id;

  // Resolve an address to coordinates: use the home base's cached coords when
  // the text matches it, a customer's cached coords, else geocode fresh.
  const coordsFor = async (label, customer) => {
    if (customer && customer.lat != null) return { lat: customer.lat, lng: customer.lng };
    if (settings.home_base_lat != null && label && label.trim() === (settings.home_base_address || "").trim()) {
      return { lat: settings.home_base_lat, lng: settings.home_base_lng };
    }
    const c = await geocode(label);
    if (c && customer) onCacheCoords(customer.id, c.lat, c.lng);
    return c;
  };

  const calcDistance = async () => {
    const customer = customers.find((x) => x.id === form.customer_id);
    if (!form.from_label?.trim() && !customer && !form.to_label?.trim()) {
      setNote("Add a From and To address first.");
      return;
    }
    setCalcing(true);
    setNote("");
    try {
      const [from, to] = await Promise.all([coordsFor(form.from_label, null), coordsFor(form.to_label, customer)]);
      const oneWay = await drivingDistanceKm(from, to);
      if (oneWay != null) {
        setForm((f) => ({ ...f, distance_km: f.round_trip ? Math.round(oneWay * 2 * 10) / 10 : oneWay }));
        setNote("Calculated from the addresses — adjust if it's off.");
      } else {
        setNote("Couldn't work out that route — type the km in yourself.");
      }
    } finally {
      setCalcing(false);
    }
  };

  const applyCustomer = async (customerId) => {
    const c = customers.find((x) => x.id === customerId);
    setForm((f) => ({
      ...f,
      customer_id: customerId,
      to_label: c ? c.name + (c.address ? ` — ${c.address}` : "") : f.to_label,
      from_label: settings.home_base_address || f.from_label,
    }));
    setNote("");
    if (!c) return;
    // Reuse the last logged distance for this customer - reflects his own
    // corrections, so repeat trips are one tap and get more accurate.
    const last = lastTripByCustomer[customerId];
    if (last) {
      setForm((f) => ({ ...f, distance_km: last.distance_km, round_trip: last.round_trip }));
      setNote("Filled from your last trip to this customer.");
      return;
    }
    if (settings.home_base_lat == null) {
      setNote("Set a home base (⚙) to auto-calculate distances.");
      return;
    }
    // Auto-calculate from home base -> customer address.
    setCalcing(true);
    try {
      const to = c.lat != null ? { lat: c.lat, lng: c.lng } : await geocode(c.address);
      if (to && c.lat == null) onCacheCoords(c.id, to.lat, to.lng);
      const oneWay = to ? await drivingDistanceKm({ lat: settings.home_base_lat, lng: settings.home_base_lng }, to) : null;
      if (oneWay != null) {
        setForm((f) => ({ ...f, distance_km: f.round_trip ? Math.round(oneWay * 2 * 10) / 10 : oneWay }));
        setNote("Calculated from the address — adjust if it's off.");
      } else {
        setNote("Couldn't work out that address — type the km in yourself.");
      }
    } finally {
      setCalcing(false);
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
          <Field label="Trip to a customer">
            <Select value={form.customer_id || ""} onChange={(e) => applyCustomer(e.target.value)}>
              <option value="">— not a customer trip —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>

          <Field label="From">
            <TextInput value={form.from_label || ""} onChange={(e) => set("from_label", e.target.value)} placeholder={settings.home_base_address || "Starting address"} />
          </Field>
          <Field label="To">
            <TextInput value={form.to_label || ""} onChange={(e) => set("to_label", e.target.value)} placeholder="Destination address" />
          </Field>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={form.round_trip} onChange={(e) => set("round_trip", e.target.checked)} className="w-4 h-4 accent-blue-600" />
            Round trip (there and back)
          </label>

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Field label="Distance (km)">
                <TextInput type="number" step="0.1" inputMode="decimal" value={form.distance_km ?? ""} onChange={(e) => set("distance_km", e.target.value)} placeholder="0.0" />
              </Field>
            </div>
            <Button variant="secondary" onClick={calcDistance} disabled={calcing} className="!py-2 shrink-0" title="Work out the distance from the addresses">
              {calcing ? <Loader2 size={15} className="animate-spin" /> : <Calculator size={15} />} Calculate
            </Button>
          </div>
          {note && <p className="text-xs text-slate-500 flex items-center gap-1"><Sparkles size={11} className="text-blue-500 shrink-0" /> {note}</p>}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <TextInput type="date" value={form.trip_date} onChange={(e) => set("trip_date", e.target.value)} />
            </Field>
            <Field label="Purpose (optional)">
              <TextInput value={form.purpose || ""} onChange={(e) => set("purpose", e.target.value)} placeholder="e.g. Job, supply run" />
            </Field>
          </div>
        </div>
        <div className="flex items-center gap-3 px-5 py-4 border-t border-slate-100">
          {isEdit && onDelete && (
            <Button variant="danger" onClick={() => onDelete(form)} className="!px-3">
              <Archive size={14} /> Archive
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
            {saving ? <Loader2 size={15} className="animate-spin" /> : null} Save
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
export default function Mileage({ trips, customers, settings, onSaveTrip, onDeleteTrip, onOpenSettings, onCacheCoords }) {
  const [editingTrip, setEditingTrip] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const rate = settings.mileage_rate_cents ?? BUSINESS.mileageRateCents;
  const homeSet = settings.home_base_lat != null || !!settings.home_base_address;

  const fyStart = financialYearStart();
  const thisMonth = todayStr().slice(0, 7);
  const fyKm = useMemo(() => trips.filter((t) => t.trip_date >= fyStart).reduce((s, t) => s + Number(t.distance_km || 0), 0), [trips, fyStart]);
  const monthKm = useMemo(() => trips.filter((t) => t.trip_date.slice(0, 7) === thisMonth).reduce((s, t) => s + Number(t.distance_km || 0), 0), [trips, thisMonth]);
  const dollarEstimate = (Math.min(fyKm, CAP_KM) * rate) / 100;

  const lastTripByCustomer = useMemo(() => {
    const map = {};
    for (const t of trips) if (t.customer_id && !map[t.customer_id]) map[t.customer_id] = t;
    return map;
  }, [trips]);

  const sorted = useMemo(() => [...trips].sort((a, b) => b.trip_date.localeCompare(a.trip_date)), [trips]);
  const shown = showAll ? sorted : sorted.slice(0, RECENT_SHOWN);

  const saveTrip = async (form) => {
    await onSaveTrip(form);
    setEditingTrip(null);
  };
  const removeTrip = async (form) => {
    if (!confirm("Archive this trip? It leaves the list but stays in the km log.")) return;
    await onDeleteTrip(form.id);
    setEditingTrip(null);
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-slate-900">Mileage</h1>
        <button onClick={onOpenSettings} title="Home base & rate live in Settings" className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
          <Settings size={18} />
        </button>
      </div>

      {/* Glance */}
      <Card className="p-5 text-center mb-4">
        <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">This financial year ({financialYearLabel()})</div>
        <div className="text-4xl font-semibold tabular-nums text-slate-900 mt-1">{fmtKm(fyKm)}</div>
        <div className="text-sm text-slate-500 mt-1">
          ≈ <span className="font-medium text-emerald-600">{money(dollarEstimate)}</span> deduction · {fmtKm(monthKm)} this month
        </div>
        {fyKm >= CAP_KM && (
          <div className="text-xs text-amber-600 mt-2">Past the 5,000 km cap for the cents-per-km method.</div>
        )}
      </Card>

      {/* The one big action */}
      <Button onClick={() => setEditingTrip(emptyTrip(settings))} className="w-full !py-5 !text-lg mb-2">
        <Plus size={20} strokeWidth={2.5} /> Log a trip
      </Button>
      {!homeSet && (
        <button onClick={onOpenSettings} className="w-full text-center text-xs text-blue-600 hover:underline mb-4">
          Set your home base for auto distances
        </button>
      )}
      <div className={homeSet ? "mb-5" : "mb-2"} />

      {/* Recent, kept short */}
      {sorted.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Recent trips</span>
            {sorted.length > RECENT_SHOWN && (
              <button onClick={() => setShowAll((s) => !s)} className="text-xs font-medium text-blue-600 hover:underline">
                {showAll ? "Show less" : `View all ${sorted.length}`}
              </button>
            )}
          </div>
          <Card className="divide-y divide-slate-100">
            {shown.map((t) => (
              <button key={t.id} onClick={() => setEditingTrip(t)} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 first:rounded-t-xl last:rounded-b-xl">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900">
                    {fmtKm(t.distance_km)} {t.round_trip && <span className="text-xs font-normal text-slate-400">round trip</span>}
                  </div>
                  <div className="text-xs text-slate-500 truncate">{t.to_label || t.purpose || "Trip"}</div>
                </div>
                <div className="text-xs text-slate-400 shrink-0">{formatDate(t.trip_date)}</div>
              </button>
            ))}
          </Card>
        </>
      )}
      {sorted.length === 0 && (
        <EmptyState icon={Car} title="No trips yet." subtitle="Log your first trip — it remembers the distance for next time." />
      )}

      <p className="text-center text-[11px] text-slate-400 mt-5 px-2">Estimates only — confirm the rate and rules with your accountant.</p>

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
