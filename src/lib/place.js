// A glance at the building before quoting it. Two free sources, no keys:
//
//   - OpenStreetMap, via the Overpass API: what kind of building sits at the
//     address (house, apartments, shop...) and how many storeys, where
//     mappers have recorded it. Coverage in Australian suburbs is decent for
//     the building type, patchier for storeys - so anything missing is shown
//     as "not known", never guessed.
//   - Google Maps deep links to a satellite view and Street View of the
//     coordinates. No API, no billing - it just opens the Maps app.
//
// A paid option, if this proves useful: the Street View Static API returns an
// actual photo for about half a cent a look after a free monthly allowance.
// Worth it only once Tyson says he'd use it.

import { geocode } from "./geo";

const OVERPASS = "https://overpass-api.de/api/interpreter";

const TYPE_LABELS = {
  house: "House",
  detached: "Detached house",
  residential: "House",
  semidetached_house: "Semi-detached",
  terrace: "Terrace",
  bungalow: "Bungalow",
  apartments: "Apartments",
  flats: "Apartments",
  dormitory: "Apartments",
  commercial: "Commercial",
  retail: "Shop",
  office: "Office",
  industrial: "Industrial",
  warehouse: "Warehouse",
  school: "School",
  church: "Church",
  hotel: "Hotel",
  garage: "Garage",
  shed: "Shed",
  yes: null, // mapped as "a building" with no type - say nothing
};

function describe(tags) {
  const t = tags.building;
  const label = t in TYPE_LABELS ? TYPE_LABELS[t] : t ? t.replace(/_/g, " ") : null;
  const levels = Number(tags["building:levels"]);
  const roof = Number(tags["roof:levels"]);
  const storeys = Number.isFinite(levels) && levels > 0 ? levels : null;
  const name = tags.name || null;
  return { type: label, storeys, roofLevels: Number.isFinite(roof) ? roof : null, name, raw: tags };
}

// The nearest tagged building within ~25 m of the point.
export async function describeBuilding({ lat, lng }) {
  if (lat == null || lng == null) return null;
  const q = `[out:json][timeout:8];(way(around:25,${lat},${lng})["building"];relation(around:25,${lat},${lng})["building"];);out tags center 3;`;
  try {
    const res = await fetch(OVERPASS, { method: "POST", body: "data=" + encodeURIComponent(q), headers: { "Content-Type": "application/x-www-form-urlencoded" } });
    if (!res.ok) return null;
    const data = await res.json();
    const els = (data.elements || []).filter((e) => e.tags?.building);
    if (els.length === 0) return { type: null, storeys: null, roofLevels: null, name: null, raw: null, nothingMapped: true };
    // Prefer a typed building over a bare building=yes.
    els.sort((a, b) => (a.tags.building === "yes") - (b.tags.building === "yes"));
    return describe(els[0].tags);
  } catch {
    return null;
  }
}

// Resolve an address to coordinates (using cached ones if the caller has them)
// and describe the building there. Returns { coords, building }.
export async function lookupPlace({ address, lat, lng }) {
  const coords = lat != null && lng != null ? { lat, lng } : await geocode(address);
  if (!coords) return { coords: null, building: null };
  const building = await describeBuilding(coords);
  return { coords, building };
}

export function mapsLinks({ lat, lng, address }) {
  if (lat == null || lng == null) {
    const q = encodeURIComponent(address || "");
    return { satellite: `https://www.google.com/maps/search/?api=1&query=${q}`, streetview: null };
  }
  return {
    satellite: `https://www.google.com/maps/@?api=1&map_action=map&center=${lat},${lng}&zoom=19&basemap=satellite`,
    streetview: `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`,
  };
}

export function buildingSummary(b) {
  if (!b) return null;
  if (b.nothingMapped) return "Nothing mapped here yet";
  const parts = [];
  if (b.name) parts.push(b.name);
  if (b.type) parts.push(b.type);
  if (b.storeys) parts.push(`${b.storeys} storey${b.storeys === 1 ? "" : "s"}`);
  else parts.push("storeys not known");
  return parts.join(" · ");
}
