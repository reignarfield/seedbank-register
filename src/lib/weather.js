// Today's rain chance near home base - free, no API key, same spirit as the
// geocoding/routing in geo.js. Best-effort: returns null on any failure so
// callers can just skip showing anything rather than handle an error.

export async function fetchRainChance(lat, lng) {
  if (lat == null || lng == null) return null;
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=precipitation_probability_max&timezone=auto&forecast_days=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const chance = data?.daily?.precipitation_probability_max?.[0];
    return typeof chance === "number" ? chance : null;
  } catch {
    return null;
  }
}
