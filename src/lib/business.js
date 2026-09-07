// ---------------------------------------------------------------------------
// The one file you edit to make this app someone else's business.
//
// Everything here is presentation and vocabulary - names, wording, contact
// details, which optional features are switched on. None of it affects the
// database schema, which is deliberately generic: customers, jobs, quotes,
// invoices, expenses. A window cleaner, a mobile mechanic and a dog groomer
// all do the same thing to that schema; only the words change.
//
// Anything secret (API keys, URLs) belongs in .env, not here - this file is
// bundled into the browser build and is public.
// ---------------------------------------------------------------------------

// Values that differ per deployment come from .env so one codebase can serve
// several businesses without a code change. The fallbacks are Tydie's, so an
// unconfigured checkout still runs and looks like something.
const env = import.meta.env;

export const BUSINESS = {
  // --- Identity -----------------------------------------------------------
  name: env.VITE_BUSINESS_NAME || "Tydie Cleaning",
  // Short line under the name on the public page. One sentence, no full stop.
  tagline: env.VITE_BUSINESS_TAGLINE || "Window, pressure and solar panel cleaning",
  // Used in the browser tab, meta description, and reminder emails.
  description:
    env.VITE_BUSINESS_DESCRIPTION ||
    "Window cleaning, pressure cleaning, and more. Request a free quote online.",

  // --- Contact ------------------------------------------------------------
  // Leave phone unset to hide the tap-to-call button entirely.
  phone: env.VITE_BUSINESS_PHONE || "",
  email: env.VITE_BUSINESS_EMAIL || "",

  // --- Money --------------------------------------------------------------
  currency: env.VITE_CURRENCY || "AUD",
  currencySymbol: env.VITE_CURRENCY_SYMBOL || "$",
  // Cents per kilometre for mileage claims. ATO rate for 2025-26 is 88c.
  // UK equivalent would be pence per mile - change `distanceUnit` too.
  mileageRateCents: Number(env.VITE_MILEAGE_RATE_CENTS || 88),
  distanceUnit: env.VITE_DISTANCE_UNIT || "km",
  // Days from issue to due on an automatically raised invoice. Was hardcoded
  // as 14 in three places; the kind of number that gets changed once and then
  // has to be found again.
  invoiceDueDays: Number(env.VITE_INVOICE_DUE_DAYS || 14),

  // --- Vocabulary ---------------------------------------------------------
  // What this trade calls the thing it does at a customer's address. A cleaner
  // does a "clean", a sparky does a "job", a groomer does an "appointment".
  // Used in headings, buttons and confirmation messages throughout the app.
  vocab: {
    job: env.VITE_WORD_JOB || "job",
    jobPlural: env.VITE_WORD_JOB_PLURAL || "jobs",
    // The verb form: "Book a clean", "Mark this clean complete"
    service: env.VITE_WORD_SERVICE || "clean",
    servicePlural: env.VITE_WORD_SERVICE_PLURAL || "cleans",
    customer: env.VITE_WORD_CUSTOMER || "customer",
    customerPlural: env.VITE_WORD_CUSTOMER_PLURAL || "customers",
  },

  // --- Optional features --------------------------------------------------
  // Switch off what a given trade doesn't need. Each flag hides a whole tab or
  // screen rather than leaving a half-useful empty one - the fastest way to
  // make software feel simple is to remove what the person will never open.
  features: {
    mileage: env.VITE_FEATURE_MILEAGE !== "off",
    quotes: env.VITE_FEATURE_QUOTES !== "off",
    expenses: env.VITE_FEATURE_EXPENSES !== "off",
    leads: env.VITE_FEATURE_LEADS !== "off",
    // Recurring "you're due for another one" scheduling. A bond cleaner or a
    // one-off removalist would switch this off; a window cleaner lives on it.
    recurring: env.VITE_FEATURE_RECURRING !== "off",
    // The weather nudge on the Today screen - only useful outdoors.
    weather: env.VITE_FEATURE_WEATHER !== "off",
    publicBooking: env.VITE_FEATURE_PUBLIC_BOOKING !== "off",
  },
};

// A capitalised form for the start of a sentence, so callers don't sprinkle
// CSS capitalisation over words that might legitimately be lowercase mid-line.
export function cap(word) {
  return word ? word.charAt(0).toUpperCase() + word.slice(1) : word;
}
