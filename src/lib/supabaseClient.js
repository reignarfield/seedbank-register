import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Whether this build has a database to talk to at all. The app checks this
// before rendering anything that needs data, and shows setup instructions
// instead of failing - see components/SetupNeeded.jsx.
export const isConfigured = Boolean(url && key);

// createClient throws on a missing or malformed URL, and it runs at import
// time - so an unconfigured checkout used to die before React mounted, leaving
// a blank white page and an error only visible in the console. Handing it a
// well-formed address in the reserved `.invalid` TLD (RFC 2606, guaranteed
// never to resolve) keeps the import safe. Nothing ever calls through it,
// because isConfigured gates the app first.
export const supabase = createClient(
  isConfigured ? url : "https://unconfigured.invalid",
  isConfigured ? key : "unconfigured"
);
