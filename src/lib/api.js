import { supabase } from "./supabaseClient";
import { todayStr, addDays } from "./dates";

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
export async function completeJob(job) {
  const jobUpdates = { status: "completed", completed_at: new Date().toISOString() };
  // A price supplied at completion time (e.g. via the "what's this worth?"
  // prompt when the job was booked with no price) is persisted onto the job
  // itself too, not just used to raise the invoice below.
  if (job.price != null && Number(job.price) > 0) jobUpdates.price = Number(job.price);

  const { data: updatedJob, error: jobError } = await supabase
    .from("jobs")
    .update(jobUpdates)
    .eq("id", job.id)
    .select()
    .single();
  if (jobError) throw jobError;

  const { error: custError } = await supabase
    .from("customers")
    .update({ last_service_date: job.scheduled_date })
    .eq("id", job.customer_id);
  if (custError) throw custError;

  if (job.price != null && Number(job.price) > 0) {
    const { error: invError } = await supabase.from("invoices").insert({
      customer_id: job.customer_id,
      job_id: job.id,
      description: `Window clean — ${job.scheduled_date}`,
      amount: Number(job.price),
      due_date: addDays(todayStr(), 14),
    });
    if (invError) throw invError;
  }

  return updatedJob;
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
export async function fetchSettings() {
  const { data, error } = await supabase.from("settings").select("*").eq("id", true).maybeSingle();
  if (error) throw error;
  return data || { id: true, home_base_address: null, home_base_lat: null, home_base_lng: null, mileage_rate_cents: 88 };
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
