import React, { useState } from "react";
import { Building2, Loader2, Satellite, Eye } from "lucide-react";
import { lookupPlace, mapsLinks, buildingSummary } from "../lib/place";

// "What am I quoting?" - one tap to find out what's at the address: the kind
// of building and how many storeys where OpenStreetMap knows, plus a
// satellite and Street View link. On demand, not automatic, so the free
// services aren't hammered on every keystroke and nothing happens for an
// address he already knows.

export default function PlaceGlance({ address, lat, lng, onCoords }) {
  const [state, setState] = useState({ busy: false, building: undefined, coords: lat != null ? { lat, lng } : null });

  const look = async () => {
    if (!address?.trim() && state.coords == null) return;
    setState((s) => ({ ...s, busy: true }));
    const { coords, building } = await lookupPlace({ address, lat: state.coords?.lat, lng: state.coords?.lng });
    if (coords && lat == null && onCoords) onCoords(coords.lat, coords.lng);
    setState({ busy: false, building: building ?? null, coords });
  };

  const links = mapsLinks({ ...(state.coords || {}), address });
  const summary = buildingSummary(state.building);

  if (!address?.trim()) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs mt-1.5">
      {state.building === undefined ? (
        <button type="button" onClick={look} disabled={state.busy} className="flex items-center gap-1.5 text-blue-600 hover:underline disabled:opacity-60">
          {state.busy ? <Loader2 size={12} className="animate-spin" /> : <Building2 size={12} />} What's at this address?
        </button>
      ) : (
        <span className="flex items-center gap-1.5 text-slate-600">
          <Building2 size={12} className="text-slate-400" /> {summary || "Couldn't look that up right now"}
        </span>
      )}
      <a href={links.satellite} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-slate-500 hover:text-blue-700">
        <Satellite size={12} /> Satellite
      </a>
      {links.streetview && (
        <a href={links.streetview} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-slate-500 hover:text-blue-700">
          <Eye size={12} /> Street View
        </a>
      )}
    </div>
  );
}
