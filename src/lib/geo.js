// Turning street addresses into a driving-distance estimate, with zero setup:
// geocoding uses OpenStreetMap's free Nominatim service (no API key, no
// billing). Results are rough by design - a straight-line distance scaled up
// by a road factor - so every number the app derives from this is presented
// as an editable estimate, never a fixed fact.

const ROAD_FACTOR = 1.3; // straight-line km -> rough driving km
const EARTH_RADIUS_KM = 6371;

const toRad = (deg) => (deg * Math.PI) / 180;

// Great-circle distance between two {lat, lng} points, in km.
export function haversineKm(a, b) {
  if (!a || !b || a.lat == null || b.lat == null) return null;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

// A one-way driving-distance estimate between two coordinate points, rounded
// to 0.1 km. Returns null if either point is missing.
export function roadEstimateKm(a, b) {
  const straight = haversineKm(a, b);
  if (straight == null) return null;
  return Math.round(straight * ROAD_FACTOR * 10) / 10;
}

// Geocode a free-text address to {lat, lng} via Nominatim. Returns null on
// no match or any network/error - callers always fall back to manual entry.
// Biased to Australia since that's where the business operates.
export async function geocode(address) {
  const q = (address || "").trim();
  if (!q) return null;
  try {
    const url =
      "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=au&q=" +
      encodeURIComponent(q);
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}
