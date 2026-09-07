import { supabase } from "./supabaseClient";
import { todayStr, addDays } from "./dates";
import { geocode, drivingDistanceKm } from "./geo";
import { BUSINESS, cap } from "./business";

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthChange(cb) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => cb(session, event));
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

// Sends a "reset your password" email with a link back to /team, which logs
// the browser into a temporary recovery session (Supabase fires a
// PASSWORD_RECOVERY auth event) so updatePassword() can be called next.
export async function requestPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/team`,
  });
  if (error) throw error;
}

export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------
export async function fetchCustomers() {
  const { data, error } = await supabase.from("customers").select("*").order("name", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function upsertCustomer(customer) {
  const { data, error } = await supabase.from("customers").upsert(customer, { onConflict: "id" }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteCustomer(id) {
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------
export async function fetchJobs() {
  const { data, error } = await supabase.from("jobs").select("*").order("scheduled_date", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function upsertJob(job) {
  const { data, error } = await supabase.from("jobs").upsert(job, { onConflict: "id" }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteJob(id) {
  const { error } = await supabase.from("jobs").delete().eq("id", id);
  if (error) throw error;
}

// Mark a job complete and roll the customer's last_service_date forward so
// recurring due-dates stay accurate without a separate "generate next job" step.
// If the job has a price, an invoice is raised automatically so completing a
// job is the only manual step - no separate "now go invoice it" chore.
// One database call, all-or-nothing: see supabase/migrations/0010. A price
// supplied at completion (the "what's this worth?" prompt) is passed through
// and lands on the job as well as the invoice. The invoice wording comes from
// here, not the database, because only the app knows this trade's word for
// what it does - a job scheduled from an accepted quote carries the quote's
// description in job.notes and that wins.
export async function completeJob(job, { paidNow } = {}) {
  const price = job.price != null && Number(job.price) > 0 ? Number(job.price) : null;
  const { data, error } = await supabase.rpc("complete_job", {
    p_job_id: job.id,
    p_price: price,
    p_paid_now: !!paidNow,
    p_description: job.notes || `${cap(BUSINESS.vocab.service)} — ${job.scheduled_date}`,
    p_due_days: BUSINESS.invoiceDueDays,
  });
  if (error) throw error;
  return data;
}

// Best-effort: log one leg of today's route (wherever he actually last was
// -> this job's customer), reusing cached customer coordinates when
// available and geocoding once otherwise. Silently does nothing if either
// end can't be located - never blocks job completion.
export async function logAutoTrip(fromPos, customer, purpose) {
  if (!customer?.address || fromPos?.lat == null || fromPos?.lng == null) return;
  let toCoords = customer.lat != null && customer.lng != null ? { lat: customer.lat, lng: customer.lng } : await geocode(customer.address);
  if (!toCoords) return;
  if (customer.lat == null || customer.lng == null) {
    saveCustomerCoords(customer.id, toCoords.lat, toCoords.lng).catch(() => {});
  }
  const distance_km = await drivingDistanceKm({ lat: fromPos.lat, lng: fromPos.lng }, toCoords);
  if (distance_km == null) return;
  await upsertTrip({
    trip_date: todayStr(),
    from_label: fromPos.label || "Previous stop",
    to_label: `${customer.name}${customer.address ? " — " + customer.address : ""}`,
    distance_km,
    round_trip: false,
    purpose: purpose || "Job",
    customer_id: customer.id,
  });
}

// Best-effort: log the final leg of a loop back to home base, and hand back
// whether it actually logged anything (both ends need coordinates).
export async function logHeadingHome(fromPos, homeBase) {
  if (fromPos?.lat == null || homeBase?.lat == null || homeBase?.lng == null) return false;
  const distance_km = await drivingDistanceKm({ lat: fromPos.lat, lng: fromPos.lng }, { lat: homeBase.lat, lng: homeBase.lng });
  if (distance_km == null) return false;
  await upsertTrip({
    trip_date: todayStr(),
    from_label: fromPos.label || "Last stop",
    to_label: homeBase.label || "Home",
    distance_km,
    round_trip: false,
    purpose: "Heading home",
    customer_id: null,
  });
  return true;
}

// ---------------------------------------------------------------------------
// Quotes
// ---------------------------------------------------------------------------
export async function fetchQuotes() {
  const { data, error } = await supabase.from("quotes").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function upsertQuote(quote) {
  const { data, error } = await supabase.from("quotes").upsert(quote, { onConflict: "id" }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteQuote(id) {
  const { error } = await supabase.from("quotes").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------
export async function fetchInvoices() {
  const { data, error } = await supabase.from("invoices").select("*").order("due_date", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function upsertInvoice(invoice) {
  const { data, error } = await supabase.from("invoices").upsert(invoice, { onConflict: "id" }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteInvoice(id) {
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) throw error;
}

export async function markInvoicePaid(id) {
  const { data, error } = await supabase
    .from("invoices")
    .update({ status: "paid", paid_date: todayStr() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------
export async function fetchLeads() {
  const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function upsertLead(lead) {
  const { data, error } = await supabase.from("leads").upsert(lead, { onConflict: "id" }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteLead(id) {
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) throw error;
}

// Public submission from the unauthenticated "request a quote" page.
// Relies on the "public can submit a lead" insert-only RLS policy.
export async function submitPublicLead({ name, phone, email, address, message, source }) {
  const { error } = await supabase.from("leads").insert({ name, phone, email, address, message, source: source || "direct" });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------
export async function fetchExpenses() {
  const { data, error } = await supabase.from("expenses").select("*").order("expense_date", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function upsertExpense(expense) {
  const { data, error } = await supabase.from("expenses").upsert(expense, { onConflict: "id" }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteExpense(id) {
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Renewals
// ---------------------------------------------------------------------------
export async function fetchRenewals() {
  const { data, error } = await supabase.from("renewals").select("*").order("due_date", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function upsertRenewal(renewal) {
  const { data, error } = await supabase.from("renewals").upsert(renewal, { onConflict: "id" }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteRenewal(id) {
  const { error } = await supabase.from("renewals").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Settings (single row: home base + mileage rate)
// ---------------------------------------------------------------------------
const DEFAULT_CHECKLIST = ["Squeegees", "Extension pole", "Towels / cloths", "Screwdriver", "Bucket & soap"];

export async function fetchSettings() {
  const { data, error } = await supabase.from("settings").select("*").eq("id", true).maybeSingle();
  if (error) throw error;
  return (
    data || {
      id: true,
      home_base_address: null,
      home_base_lat: null,
      home_base_lng: null,
      mileage_rate_cents: 88,
      packing_checklist: DEFAULT_CHECKLIST,
    }
  );
}

export async function saveSettings(settings) {
  const { data, error } = await supabase.from("settings").upsert({ ...settings, id: true }, { onConflict: "id" }).select().single();
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Trips (mileage)
// ---------------------------------------------------------------------------
export async function fetchTrips() {
  const { data, error } = await supabase.from("trips").select("*").order("trip_date", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function upsertTrip(trip) {
  const { data, error } = await supabase.from("trips").upsert(trip, { onConflict: "id" }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteTrip(id) {
  const { error } = await supabase.from("trips").delete().eq("id", id);
  if (error) throw error;
}

// Cache a geocoded address's coordinates onto the customer so it's only ever
// geocoded once. Best-effort - a failure here shouldn't block anything.
export async function saveCustomerCoords(id, lat, lng) {
  const { error } = await supabase.from("customers").update({ lat, lng }).eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Customer notes - a fast running log of on-site jottings, separate from the
// permanent notes/access_notes fields customers edits deliberately.
// ---------------------------------------------------------------------------
export async function fetchCustomerNotes() {
  const { data, error } = await supabase.from("customer_notes").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addCustomerNote(customerId, note) {
  const { data, error } = await supabase.from("customer_notes").insert({ customer_id: customerId, note }).select().single();
  if (error) throw error;
  return data;
}
