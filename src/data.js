import { supabase } from "./supabaseClient";

// App uses camelCase keys; database uses snake_case. Most replicate keys are
// identical (e.g. weight100_r1) so they pass straight through. Only the few
// that differ are mapped explicitly here.
const APP_TO_DB = {
  totalDeposit: "total_deposit",
  testType: "test_type",
  startDate: "start_date",
  endDate: "end_date",
  germRange: "germ_range",
  dormancyClass: "dormancy_class",
  dormancyPct: "dormancy_pct",
  set: "set_tech",
  tempRegime: "temp_regime",
};
const DB_TO_APP = Object.fromEntries(Object.entries(APP_TO_DB).map(([a, b]) => [b, a]));

// keys that are stored identically in both
const PASS_THROUGH = [
  "id", "sl", "species", "collector", "storage", "notes",
  "weight100_r1", "weight100_r2", "weight100_r3",
  "purity_r1", "purity_r2", "purity_r3",
  "germ_r1", "germ_r2", "germ_r3",
  "via_r1", "via_r2", "via_r3",
];

function appToRow(rec) {
  const row = {};
  PASS_THROUGH.forEach((k) => { if (rec[k] !== undefined) row[k] = rec[k] === "" ? null : rec[k]; });
  Object.entries(APP_TO_DB).forEach(([appKey, dbKey]) => {
    if (rec[appKey] !== undefined) row[dbKey] = rec[appKey] === "" ? null : rec[appKey];
  });
  return row;
}

function rowToApp(row) {
  const rec = {};
  PASS_THROUGH.forEach((k) => { rec[k] = row[k] ?? ""; });
  Object.entries(DB_TO_APP).forEach(([dbKey, appKey]) => { rec[appKey] = row[dbKey] ?? ""; });
  return rec;
}

export async function fetchSeedlots() {
  const { data, error } = await supabase.from("seedlots").select("*").order("species", { ascending: true });
  if (error) throw error;
  return (data || []).map(rowToApp);
}

export async function upsertSeedlot(record) {
  const row = appToRow(record);
  row.updated_at = new Date().toISOString();
  const { error } = await supabase.from("seedlots").upsert(row, { onConflict: "id" });
  if (error) throw error;
}

export async function deleteSeedlot(id) {
  const { error } = await supabase.from("seedlots").delete().eq("id", id);
  if (error) throw error;
}

// ---- auth ----
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthChange(cb) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session));
  return () => data.subscription.unsubscribe();
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  await supabase.auth.signOut();
}
