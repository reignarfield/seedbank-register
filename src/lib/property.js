// HANDOFF 3/4 - what sort of building is this, from the address alone?
//
// The question behind it: a quote is a guess about a building, and people
// describe their own house badly. "Just a normal house, mate" turns out to be
// a rendered two-storey with a stairwell window over a pitched roof. The
// mistake is expensive in exactly one direction - the quote is already given.
//
// This doesn't try to be right. It tries to be right about when it doesn't
// know, so the only thing it ever says is "this one's worth eyeing off before
// you price it".
//
// Two signals, cheapest first:
//
//   1. The address text. "4/12 Smith St", "Unit 4", "Apt 2B", "Shop 3",
//      "Level 2" are written by the person booking, cost nothing, work
//      offline, and are the strongest single clue that this isn't a
//      free-standing house. This runs on every address, always.
//   2. OpenStreetMap (the same free Nominatim lookup the mileage estimate
//      already uses), which can carry the building type and its number of
//      storeys. Coverage in Australian suburbs is patchy - often nothing at
//      all - so this is asked for on request, one address at a time, never in
//      a loop over a list. Nominatim's fair-use terms don't allow the latter
//      and the answer usually isn't worth it.
//
// Open question for Tyson before this goes any further: does he drive past
// before quoting, or price off the phone call? If he always looks, this is
// clutter and should be deleted. If he prices off the call, the useful
// version is the opposite of a guess - a "get eyes on this one" flag, which
// is all this is.

// --- 1. What the person typed ---------------------------------------------

// "4/12 Smith St" - the slash form Australians use for units. It also matches
// the handful of streets written as fractions ("1/2 Acre Rd"), which is a
// wrong-but-harmless "looks like a unit" on a soft hint nobody prices off.
const SLASH_UNIT = /^\s*(?:unit\s*)?(\d+[a-z]?)\s*\/\s*\d+/i;

const TEXT_RULES = [
  { kind: "apartment", why: "the address has a level in it", re: /\b(?:level|lvl|floor)\s*\d+/i },
  { kind: "unit", why: "the address has a unit number", re: /\b(?:unit|apt|apartment|flat)\s*\.?\s*\d+/i },
  { kind: "commercial", why: "the address has a shop or suite number", re: /\b(?:shop|suite|ste|office|factory|warehouse|tenancy)\s*\.?\s*\d+/i },
  { kind: "townhouse", why: "the address names a villa or townhouse", re: /\b(?:townhouse|villa)\s*\.?\s*\d*/i },
];

export function describeFromText(address) {
  const a = (address || "").trim();
  if (!a) return null;
  for (const r of TEXT_RULES) if (r.re.test(a)) return { kind: r.kind, why: r.why, confidence: "likely", source: "address" };
  if (SLASH_UNIT.test(a)) return { kind: "unit", why: "the address is written as a unit number", confidence: "likely", source: "address" };
  return null;
}

// --- 2. What OpenStreetMap knows ------------------------------------------

// OSM building tags worth telling apart. Anything not listed is a building of
// some sort we have no opinion about, which is different from knowing it's a
// house - and is reported as such.
const OSM_BUILDING_KIND = {
  house: "house",
  detached: "house",
  residential: "house",
  bungalow: "house",
  semidetached_house: "house",
  terrace: "townhouse",
  apartments: "apartment",
  dormitory: "apartment",
  commercial: "commercial",
  retail: "commercial",
  office: "commercial",
  industrial: "commercial",
  warehouse: "commercial",
  school: "commercial",
  church: "commercial",
};

const cache = new Map();

/**
 * Ask OpenStreetMap about one address. Returns null for "no idea", which is
 * the common answer and must stay indistinguishable from a failed request -
 * neither is grounds for telling him anything.
 */
export async function lookupProperty(address) {
  const q = (address || "").trim();
  if (!q) return null;
  if (cache.has(q)) return cache.get(q);

  let result = null;
  try {
    const url =
      "https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&extratags=1&countrycodes=au&q=" +
      encodeURIComponent(q);
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (res.ok) {
      const hit = (await res.json())?.[0];
      if (hit) {
        const tags = hit.extratags || {};
        const levels = Number(tags["building:levels"]);
        const building = tags.building || (hit.class === "building" ? hit.type : null);
        const kind = OSM_BUILDING_KIND[building] || null;
        if (kind || Number.isFinite(levels)) {
          result = {
            kind,
            storeys: Number.isFinite(levels) && levels > 0 ? levels : null,
            why: "OpenStreetMap has this building mapped",
            confidence: "mapped",
            source: "osm",
          };
        }
      }
    }
  } catch {
    // Offline, rate-limited, or Nominatim having a day. Same as "no idea".
  }
  cache.set(q, result);
  return result;
}

// --- Putting it in words --------------------------------------------------

const KIND_WORDS = {
  house: "a house",
  townhouse: "a townhouse or terrace",
  unit: "a unit",
  apartment: "an apartment block",
  commercial: "a commercial place",
};

/**
 * One short line, or null when there's nothing honest to say. `needsEyes` is
 * the only part meant to change behaviour: anything with storeys above one, a
 * block of flats or a commercial job is a different ladder, a different
 * access conversation, and a different price.
 */
export function describe(hint) {
  if (!hint) return null;
  const parts = [];
  if (hint.kind) parts.push(`Looks like ${KIND_WORDS[hint.kind] || "a building"}`);
  if (hint.storeys) parts.push(`${hint.storeys} storey${hint.storeys === 1 ? "" : "s"}`);
  if (!parts.length) return null;
  return {
    text: parts.join(" · "),
    why: hint.why,
    needsEyes: hint.kind === "apartment" || hint.kind === "commercial" || (hint.storeys || 1) > 1,
  };
}

/** The free half: text only, no network, safe to call on every row. */
export function quickHint(address) {
  return describe(describeFromText(address));
}
