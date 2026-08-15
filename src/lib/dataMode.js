// Demo mode swaps the *data* layer for a realistic in-memory sample set, so
// the app can be shown or explored without touching (or polluting) the real
// business records. Auth is deliberately NOT part of this - signing in always
// goes to real Supabase, so demo mode can never become a way past the login.

const KEY = "tydie_demo_mode";

export function isDemoMode() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setDemoMode(on) {
  try {
    if (on) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {
    // best-effort - a blocked localStorage just means the toggle won't stick
  }
}
