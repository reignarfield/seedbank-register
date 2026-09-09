import { todayStr, addDays } from "./dates";
import { BUSINESS, cap } from "./business";

// A realistic sample book of business, held in memory. Mirrors the shapes the
// Supabase layer returns so every screen behaves exactly as it would with real
// records - jobs complete, invoices raise, mileage logs - without writing a
// single row to the real database. Resets on reload (or via resetDemoData).

const uid = (p) => `${p}_${Math.random().toString(36).slice(2, 9)}`;
const T = todayStr();

function seed() {
  const customers = [
    { id: "dc1", name: "Sarah Nguyen", phone: "0411 222 333", email: "sarah.n@example.com", address: "12 Marsh St, Armidale NSW 2350", notes: "Prefers mornings.", access_notes: "Side gate, code 4417. Small dog - friendly.", frequency_weeks: 8, last_service_date: addDays(T, -56), status: "active", lat: -30.5124, lng: 151.6672 },
    { id: "dc2", name: "Marcus Webb", phone: "0422 888 190", email: "m.webb@example.com", address: "7 Salisbury St, Uralla NSW 2358", notes: "", access_notes: "Ladder access tight on the east side.", frequency_weeks: 12, last_service_date: addDays(T, -88), status: "active", lat: -30.6412, lng: 151.5011 },
    { id: "dc3", name: "Priya Raman", phone: "0433 610 402", email: "priya.r@example.com", address: "2/9 Beardy St, Armidale NSW 2350", notes: "Apartment - book lift with building manager.", access_notes: "Intercom 204. Lift key from concierge.", frequency_weeks: 6, last_service_date: addDays(T, -5), status: "active", lat: -30.5140, lng: 151.6640 },
    { id: "dc4", name: "Dave Kowalski", phone: "0400 771 265", email: "", address: "31 Kentucky St, Armidale NSW 2350", notes: "Two-storey, lots of glass. Big job.", access_notes: "Park on the street, driveway is steep.", frequency_weeks: null, last_service_date: addDays(T, -212), status: "active", lat: -30.5178, lng: 151.6580 },
    { id: "dc5", name: "Helen Fraser", phone: "0417 305 118", email: "hfraser@example.com", address: "88 Bridge St, Uralla NSW 2358", notes: "", access_notes: "", frequency_weeks: null, last_service_date: addDays(T, -240), status: "active", lat: -30.6395, lng: 151.5040 },
    { id: "dc6", name: "Tom & Aleisha Brady", phone: "0466 019 774", email: "bradyhouse@example.com", address: "5 Garibaldi St, Armidale NSW 2350", notes: "Solar panels done at the same time.", access_notes: "Roof access via garage.", frequency_weeks: 26, last_service_date: addDays(T, -170), status: "active", lat: -30.5090, lng: 151.6700 },
    { id: "dc7", name: "Riverside Dental", phone: "02 9555 1180", email: "admin@example.com", address: "Shop 3/44 Rusden St, Armidale NSW 2350", notes: "Commercial - invoice monthly, pays by transfer.", access_notes: "Before 8am only.", frequency_weeks: 4, last_service_date: addDays(T, -30), status: "active", lat: -30.5135, lng: 151.6655 },
    { id: "dc8", name: "Greg Mullins", phone: "0428 447 902", email: "", address: "17 Hill St, Uralla NSW 2358", notes: "Paused while renovating.", access_notes: "", frequency_weeks: 8, last_service_date: addDays(T, -120), status: "paused", lat: -30.6430, lng: 151.4990 },
  ];

  const quotes = [
    { id: "dq1", customer_id: "dc4", lead_id: null, contact_name: "", contact_email: "", contact_phone: "", description: "Full exterior + interior window clean, two storey, 34 panes", amount: 480, status: "accepted", valid_until: addDays(T, 21), created_at: new Date(Date.parse(addDays(T, -9))).toISOString() },
    { id: "dq2", customer_id: null, lead_id: "dl1", contact_name: "Janine Cooper", contact_email: "janine.c@example.com", contact_phone: "0455 882 013", description: "Driveway + pathway pressure clean, approx 60m²", amount: 340, status: "sent", valid_until: addDays(T, 14), created_at: new Date(Date.parse(addDays(T, -3))).toISOString() },
    { id: "dq3", customer_id: "dc2", lead_id: null, contact_name: "", contact_email: "", contact_phone: "", description: "Add gutter clear to the regular window clean", amount: 160, status: "draft", valid_until: null, created_at: new Date(Date.parse(addDays(T, -1))).toISOString() },
    { id: "dq4", customer_id: "dc6", lead_id: null, contact_name: "", contact_email: "", contact_phone: "", description: "20 solar panels", amount: 150, status: "sent", valid_until: addDays(T, -4), created_at: new Date(Date.parse(addDays(T, -25))).toISOString() },
  ];

  const jobs = [
    // Today
    { id: "dj1", customer_id: "dc1", scheduled_date: T, status: "scheduled", price: 250, notes: "Standard 3 bedroom, inside and out", completed_at: null, job_type: "Window Cleaning", route_order: 0, quote_id: null },
    { id: "dj2", customer_id: "dc4", scheduled_date: T, status: "scheduled", price: 480, notes: "Full exterior + interior window clean, two storey, 34 panes", completed_at: null, job_type: "Window Cleaning", route_order: 1, quote_id: "dq1" },
    { id: "dj3", customer_id: "dc6", scheduled_date: T, status: "scheduled", price: null, notes: "", completed_at: null, job_type: "Solar Panel Cleaning", route_order: 2, quote_id: null },
    // Overdue - never marked done
    { id: "dj4", customer_id: "dc2", scheduled_date: addDays(T, -3), status: "scheduled", price: 300, notes: "Rained out", completed_at: null, job_type: "Pressure Cleaning", route_order: null, quote_id: null },
    // Upcoming
    { id: "dj5", customer_id: "dc3", scheduled_date: addDays(T, 1), status: "scheduled", price: 70, notes: "", completed_at: null, job_type: "Window Cleaning", route_order: null, quote_id: null },
    { id: "dj6", customer_id: "dc7", scheduled_date: addDays(T, 2), status: "scheduled", price: 180, notes: "Shopfront glass", completed_at: null, job_type: "Window Cleaning", route_order: null, quote_id: null },
    // History
    { id: "dj7", customer_id: "dc3", scheduled_date: addDays(T, -5), status: "completed", price: 70, notes: "", completed_at: new Date(Date.parse(addDays(T, -5))).toISOString(), job_type: "Window Cleaning", route_order: null, quote_id: null },
    { id: "dj8", customer_id: "dc7", scheduled_date: addDays(T, -30), status: "completed", price: 180, notes: "Shopfront glass", completed_at: new Date(Date.parse(addDays(T, -30))).toISOString(), job_type: "Window Cleaning", route_order: null, quote_id: null },
    { id: "dj9", customer_id: "dc1", scheduled_date: addDays(T, -56), status: "completed", price: 250, notes: "", completed_at: new Date(Date.parse(addDays(T, -56))).toISOString(), job_type: "Window Cleaning", route_order: null, quote_id: null },
    // Completed but price was skipped - no invoice raised
    { id: "dj10", customer_id: "dc5", scheduled_date: addDays(T, -8), status: "completed", price: null, notes: "Quick tidy-up, agreed to sort price later", completed_at: new Date(Date.parse(addDays(T, -8))).toISOString(), job_type: null, route_order: null, quote_id: null },
    { id: "dj11", customer_id: "dc2", scheduled_date: addDays(T, -14), status: "cancelled", price: 300, notes: "Customer away", completed_at: null, job_type: "Pressure Cleaning", route_order: null, quote_id: null },
  ];

  const invoices = [
    { id: "di1", customer_id: "dc7", job_id: "dj8", description: "Shopfront glass", amount: 180, status: "unpaid", issued_date: addDays(T, -30), due_date: addDays(T, -16), paid_date: null },
    { id: "di2", customer_id: "dc3", job_id: "dj7", description: "Window clean", amount: 70, status: "unpaid", issued_date: addDays(T, -5), due_date: addDays(T, 9), paid_date: null },
    { id: "di3", customer_id: "dc1", job_id: "dj9", description: "Window clean", amount: 250, status: "paid", issued_date: addDays(T, -56), due_date: addDays(T, -42), paid_date: addDays(T, -50) },
    { id: "di4", customer_id: "dc2", job_id: null, description: "Pressure clean - driveway", amount: 300, status: "paid", issued_date: addDays(T, -70), due_date: addDays(T, -56), paid_date: addDays(T, -60) },
  ];

  const leads = [
    { id: "dl1", name: "Janine Cooper", phone: "0455 882 013", email: "janine.c@example.com", address: "3 Faulkner St, Armidale NSW 2350", message: "After a quote for the driveway and front path.", status: "quoted", source: "google", created_at: new Date(Date.parse(addDays(T, -4))).toISOString() },
    { id: "dl2", name: "Ahmed Hassan", phone: "0432 118 776", email: "", address: "22 Queen St, Uralla NSW 2358", message: "Two storey house, windows inside and out. How much roughly?", status: "new", source: "direct", created_at: new Date(Date.parse(addDays(T, -1))).toISOString() },
    { id: "dl3", name: "Kelly Osborne", phone: "0407 992 335", email: "kelly@example.com", address: "", message: "Do you do bond cleans? Moving out end of month.", status: "new", source: "facebook", created_at: new Date().toISOString() },
  ];

  const expenses = [
    { id: "de1", expense_date: addDays(T, -2), category: "fuel", amount: 92.4, note: "Servo - Barney St" },
    { id: "de2", expense_date: addDays(T, -9), category: "supplies", amount: 47.9, note: "Squeegee rubbers + soap" },
    { id: "de3", expense_date: addDays(T, -21), category: "equipment", amount: 315, note: "Replacement water-fed pole section" },
    { id: "de4", expense_date: addDays(T, -34), category: "insurance", amount: 148.5, note: "Public liability - monthly" },
  ];

  const renewals = [
    { id: "dr1", name: "Public liability insurance", due_date: addDays(T, 18), notes: "Renew with the same broker" },
    { id: "dr2", name: "Vehicle registration", due_date: addDays(T, 74), notes: "" },
  ];

  const trips = [
    { id: "dt1", trip_date: addDays(T, -1), from_label: "14 East St, Uralla", to_label: "Priya Raman — 2/9 Beardy St, Armidale", distance_km: 8.4, round_trip: false, purpose: "Window Cleaning", customer_id: "dc3", created_at: new Date(Date.parse(addDays(T, -1))).toISOString() },
    { id: "dt2", trip_date: addDays(T, -1), from_label: "Priya Raman — 2/9 Beardy St, Armidale", to_label: "14 East St, Uralla", distance_km: 8.1, round_trip: false, purpose: "Heading home", customer_id: null, created_at: new Date(Date.parse(addDays(T, -1)) + 3600000).toISOString() },
    { id: "dt3", trip_date: addDays(T, -5), from_label: "14 East St, Uralla", to_label: "Riverside Dental — Shop 3/44 Rusden St, Armidale", distance_km: 12.2, round_trip: true, purpose: "Window Cleaning", customer_id: "dc7", created_at: new Date(Date.parse(addDays(T, -5))).toISOString() },
  ];

  const customerNotes = [
    { id: "dn1", customer_id: "dc1", note: "Gate code changed to 4417 - old one won't work.", created_at: new Date(Date.parse(addDays(T, -12))).toISOString() },
    { id: "dn2", customer_id: "dc4", note: "Gutter bracket on the north side looks loose - worth mentioning next visit.", created_at: new Date(Date.parse(addDays(T, -9))).toISOString() },
    { id: "dn3", customer_id: "dc7", note: "New practice manager is Rachel - she signs off the invoices now.", created_at: new Date(Date.parse(addDays(T, -30))).toISOString() },
  ];

  const settings = {
    id: true,
    home_base_address: "14 East St, Uralla NSW 2358",
    home_base_lat: -30.6405,
    home_base_lng: 151.5030,
    mileage_rate_cents: 88,
    packing_checklist: ["Squeegees", "Extension pole", "Towels / cloths", "Screwdriver", "Bucket & soap", "Ladder straps"],
    type_checklists: {
      "Pressure Cleaning": ["Pressure washer", "Surface cleaner attachment", "Extension hose"],
      "Solar Panel Cleaning": ["Soft brush head", "Deionised water tank"],
    },
    day_started_date: null,
    invoice_due_days: 14,
    gst_registered: false,
    abn: "55 202 207 046",
    lapsed_days: 180,
    renewal_lead_days: 30,
    due_soon_days: 7,
    reminders: { owner_digest: true, due_soon: false, invoice_overdue: false, job_confirmation: false, review_request: false },
  };

  // What the app did recently, so the feed has something to show.
  // Regular services - the same house can be on two cycles.
  const customerServices = [
    { id: "ds1", customer_id: "dc1", service: "Window Cleaning", frequency_weeks: 8, last_done: addDays(T, -56), price: 250, archived_at: null },
    { id: "ds2", customer_id: "dc2", service: "Pressure Cleaning", frequency_weeks: 12, last_done: addDays(T, -88), price: 300, archived_at: null },
    { id: "ds3", customer_id: "dc3", service: "Window Cleaning", frequency_weeks: 6, last_done: addDays(T, -5), price: 70, archived_at: null },
    { id: "ds4", customer_id: "dc6", service: "Window Cleaning", frequency_weeks: 26, last_done: addDays(T, -170), price: 300, archived_at: null },
    { id: "ds5", customer_id: "dc6", service: "Solar Panel Cleaning", frequency_weeks: 52, last_done: addDays(T, -370), price: 150, archived_at: null },
    { id: "ds6", customer_id: "dc7", service: "Window Cleaning", frequency_weeks: 4, last_done: addDays(T, -30), price: 180, archived_at: null },
    { id: "ds7", customer_id: "dc8", service: "Window Cleaning", frequency_weeks: 8, last_done: addDays(T, -120), price: 250, archived_at: null },
  ];

  const activity = [
    { id: "da1", occurred_at: new Date(Date.now() - 3600000 * 26).toISOString(), kind: "job_completed", summary: "Marked Priya Raman done and raised a $70.00 invoice, due in 14 days", actor: "app", customer_id: "dc3", ref_table: "jobs", ref_id: "dj7", undo: { invoice_id: "di2", prev_last_service_date: null, prev_status: "scheduled" }, undone_at: null },
    { id: "da2", occurred_at: new Date(Date.now() - 3600000 * 25).toISOString(), kind: "trip_logged", summary: "Logged 8.4 km to Priya Raman", actor: "app", customer_id: "dc3", ref_table: "trips", ref_id: "dt1", undo: null, undone_at: null },
  ];

  return { customers, jobs, quotes, invoices, leads, expenses, renewals, trips, customerNotes, settings, activity, customerServices };
}

let db = seed();

export function resetDemoData() {
  db = seed();
}


// ---- Customers ----
export const fetchCustomers = async () => [...db.customers].sort((a, b) => a.name.localeCompare(b.name));
export const upsertCustomer = async (c) => {
  if (c.id) {
    db.customers = db.customers.map((x) => (x.id === c.id ? { ...x, ...c } : x));
    return db.customers.find((x) => x.id === c.id);
  }
  const created = { ...c, id: uid("dc") };
  db.customers = [...db.customers, created];
  return created;
};
export const deleteCustomer = async (id) => {
  db.customers = db.customers.filter((c) => c.id !== id);
  db.jobs = db.jobs.filter((j) => j.customer_id !== id);
  db.invoices = db.invoices.filter((i) => i.customer_id !== id);
};
export const saveCustomerCoords = async (id, lat, lng) => {
  db.customers = db.customers.map((c) => (c.id === id ? { ...c, lat, lng } : c));
};

// ---- Jobs ----
export const fetchJobs = async () => [...db.jobs].sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
export const upsertJob = async (j) => {
  if (j.id) {
    db.jobs = db.jobs.map((x) => (x.id === j.id ? { ...x, ...j } : x));
    return db.jobs.find((x) => x.id === j.id);
  }
  const created = { ...j, id: uid("dj") };
  db.jobs = [...db.jobs, created];
  return created;
};
export const deleteJob = async (id) => {
  db.jobs = db.jobs.filter((j) => j.id !== id);
};
export const completeJob = async (job, { paidNow, dueDays } = {}) => {
  const due = dueDays ?? BUSINESS.invoiceDueDays;
  const prevLast = db.customers.find((c) => c.id === job.customer_id)?.last_service_date ?? null;
  let invoiceId = null;
  const price = job.price != null && Number(job.price) > 0 ? Number(job.price) : null;
  db.jobs = db.jobs.map((x) =>
    x.id === job.id ? { ...x, status: "completed", completed_at: new Date().toISOString(), ...(price != null ? { price } : {}) } : x
  );
  const updated = db.jobs.find((x) => x.id === job.id);
  db.customers = db.customers.map((c) => (c.id === job.customer_id ? { ...c, last_service_date: job.scheduled_date } : c));
  if (job.job_type) db.customerServices = db.customerServices.map((s) => (s.customer_id === job.customer_id && s.service === job.job_type ? { ...s, last_done: job.scheduled_date } : s));
  if (price != null) {
    invoiceId = uid("di");
    db.invoices = [
      ...db.invoices,
      {
        id: invoiceId,
        customer_id: job.customer_id,
        job_id: job.id,
        description: updated.notes || `${cap(BUSINESS.vocab.service)} — ${job.scheduled_date}`,
        amount: price,
        status: paidNow ? "paid" : "unpaid",
        issued_date: todayStr(),
        due_date: addDays(todayStr(), due),
        paid_date: paidNow ? todayStr() : null,
      },
    ];
  }
  // Mirrors what the real complete_job function writes, undo payload included.
  const cust = db.customers.find((c) => c.id === job.customer_id);
  db.activity = [
    {
      id: uid("da"),
      occurred_at: new Date().toISOString(),
      kind: "job_completed",
      actor: "app",
      customer_id: job.customer_id,
      ref_table: "jobs",
      ref_id: job.id,
      summary:
        `Marked ${cust?.name || "a job"} done` +
        (invoiceId ? ` and raised a $${price.toFixed(2)} invoice` + (paidNow ? ", paid on the spot" : `, due in ${due} days`) : " (no price, so no invoice)"),
      undo: { invoice_id: invoiceId, prev_last_service_date: prevLast, prev_status: "scheduled" },
      undone_at: null,
    },
    ...db.activity,
  ];
  return updated;
};

// ---- Mileage ----
export const fetchTrips = async () => [...db.trips].sort((a, b) => b.trip_date.localeCompare(a.trip_date));
export const upsertTrip = async (t) => {
  if (t.id) {
    db.trips = db.trips.map((x) => (x.id === t.id ? { ...x, ...t } : x));
    return db.trips.find((x) => x.id === t.id);
  }
  const created = { ...t, id: uid("dt"), created_at: new Date().toISOString() };
  db.trips = [...db.trips, created];
  return created;
};
export const deleteTrip = async (id) => {
  db.trips = db.trips.filter((t) => t.id !== id);
};
// Plausible distances without hitting the network, so demo mode works offline
// and never waits on geocoding.
const fakeKm = (a, b) => Math.round((6 + ((String(a).length + String(b).length) % 14)) * 10) / 10;
export const logAutoTrip = async (fromPos, customer, purpose) => {
  if (!customer?.address) return;
  await upsertTrip({
    trip_date: todayStr(),
    from_label: fromPos?.label || "Previous stop",
    to_label: `${customer.name} — ${customer.address}`,
    distance_km: fakeKm(fromPos?.label, customer.address),
    round_trip: false,
    purpose: purpose || "Job",
    customer_id: customer.id,
  });
};
export const logHeadingHome = async (fromPos, homeBase) => {
  await upsertTrip({
    trip_date: todayStr(),
    from_label: fromPos?.label || "Last stop",
    to_label: homeBase?.label || "Home",
    distance_km: fakeKm(fromPos?.label, homeBase?.label),
    round_trip: false,
    purpose: "Heading home",
    customer_id: null,
  });
  return true;
};

// ---- Quotes ----
export const fetchQuotes = async () => [...db.quotes].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
export const upsertQuote = async (q) => {
  if (q.id) {
    db.quotes = db.quotes.map((x) => (x.id === q.id ? { ...x, ...q } : x));
    return db.quotes.find((x) => x.id === q.id);
  }
  const created = { ...q, id: uid("dq"), created_at: new Date().toISOString() };
  db.quotes = [...db.quotes, created];
  return created;
};
export const deleteQuote = async (id) => {
  db.quotes = db.quotes.filter((q) => q.id !== id);
};

// ---- Invoices ----
export const fetchInvoices = async () => [...db.invoices].sort((a, b) => a.due_date.localeCompare(b.due_date));
export const upsertInvoice = async (i) => {
  if (i.id) {
    db.invoices = db.invoices.map((x) => (x.id === i.id ? { ...x, ...i } : x));
    return db.invoices.find((x) => x.id === i.id);
  }
  const created = { ...i, id: uid("di"), issued_date: todayStr(), status: i.status || "unpaid" };
  db.invoices = [...db.invoices, created];
  return created;
};
export const deleteInvoice = async (id) => {
  db.invoices = db.invoices.filter((i) => i.id !== id);
};
export const markInvoicePaid = async (id) => {
  db.invoices = db.invoices.map((i) => (i.id === id ? { ...i, status: "paid", paid_date: todayStr() } : i));
  return db.invoices.find((i) => i.id === id);
};

// ---- Leads ----
export const fetchLeads = async () => [...db.leads].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
export const upsertLead = async (l) => {
  if (l.id) {
    db.leads = db.leads.map((x) => (x.id === l.id ? { ...x, ...l } : x));
    return db.leads.find((x) => x.id === l.id);
  }
  const created = { ...l, id: uid("dl"), created_at: new Date().toISOString() };
  db.leads = [...db.leads, created];
  return created;
};
export const deleteLead = async (id) => {
  db.leads = db.leads.filter((l) => l.id !== id);
};

// ---- Expenses ----
export const fetchExpenses = async () => [...db.expenses].sort((a, b) => b.expense_date.localeCompare(a.expense_date));
export const upsertExpense = async (e) => {
  if (e.id) {
    db.expenses = db.expenses.map((x) => (x.id === e.id ? { ...x, ...e } : x));
    return db.expenses.find((x) => x.id === e.id);
  }
  const created = { ...e, id: uid("de") };
  db.expenses = [...db.expenses, created];
  return created;
};
export const deleteExpense = async (id) => {
  db.expenses = db.expenses.filter((e) => e.id !== id);
};

// ---- Renewals ----
export const fetchRenewals = async () => [...db.renewals].sort((a, b) => a.due_date.localeCompare(b.due_date));
export const upsertRenewal = async (r) => {
  if (r.id) {
    db.renewals = db.renewals.map((x) => (x.id === r.id ? { ...x, ...r } : x));
    return db.renewals.find((x) => x.id === r.id);
  }
  const created = { ...r, id: uid("dr") };
  db.renewals = [...db.renewals, created];
  return created;
};
export const deleteRenewal = async (id) => {
  db.renewals = db.renewals.filter((r) => r.id !== id);
};

// ---- Settings ----
export const fetchSettings = async () => ({ ...db.settings });
export const saveSettings = async (s) => {
  db.settings = { ...db.settings, ...s, id: true };
  return { ...db.settings };
};

// ---- Customer notes ----
export const fetchCustomerNotes = async () => [...db.customerNotes].sort((a, b) => b.created_at.localeCompare(a.created_at));
export const addCustomerNote = async (customerId, note) => {
  const created = { id: uid("dn"), customer_id: customerId, note, created_at: new Date().toISOString() };
  db.customerNotes = [created, ...db.customerNotes];
  return created;
};


// ---- Archive (never delete) ----
const archiveIn = (key, id) => { db[key] = db[key].map((r) => (r.id === id ? { ...r, archived_at: new Date().toISOString() } : r)); };
export const archiveJob = async (id) => archiveIn("jobs", id);
export const archiveQuote = async (id) => archiveIn("quotes", id);
export const archiveInvoice = async (id) => archiveIn("invoices", id);
export const archiveExpense = async (id) => archiveIn("expenses", id);
export const archiveTrip = async (id) => archiveIn("trips", id);
export const archiveCustomer = async (id) => {
  const now = new Date().toISOString();
  db.jobs = db.jobs.map((j) => (j.customer_id === id && j.status === "scheduled" && !j.archived_at ? { ...j, archived_at: now } : j));
  db.quotes = db.quotes.map((q) => (q.customer_id === id && ["draft", "sent"].includes(q.status) && !q.archived_at ? { ...q, archived_at: now } : q));
  archiveIn("customers", id);
};

// ---- Activity ----
export const fetchActivity = async () => [...db.activity].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
export const logActivity = async ({ kind, summary, customer_id = null, ref_table = null, ref_id = null, actor = "user", undo = null }) => {
  const created = { id: uid("da"), occurred_at: new Date().toISOString(), kind, summary, customer_id, ref_table, ref_id, actor, undo, undone_at: null };
  db.activity = [created, ...db.activity];
  return created;
};
export const undoActivity = async (id) => {
  const act = db.activity.find((a) => a.id === id);
  if (!act) throw new Error("activity not found");
  if (act.undone_at) throw new Error("already undone");
  if (!act.undo) throw new Error("this action cannot be undone");
  if (act.kind === "job_completed") {
    const inv = act.undo.invoice_id ? db.invoices.find((i) => i.id === act.undo.invoice_id) : null;
    if (inv && inv.status === "paid") throw new Error("That invoice has been marked paid - unmark it first if this really needs undoing.");
    if (inv) db.invoices = db.invoices.filter((i) => i.id !== inv.id);
    db.jobs = db.jobs.map((j) => (j.id === act.ref_id ? { ...j, status: "scheduled", completed_at: null } : j));
    db.customers = db.customers.map((c) => (c.id === act.customer_id ? { ...c, last_service_date: act.undo.prev_last_service_date } : c));
  } else {
    throw new Error("no undo handler for " + act.kind);
  }
  db.activity = db.activity.map((a) => (a.id === id ? { ...a, undone_at: new Date().toISOString() } : a));
  return db.activity.find((a) => a.id === id);
};

// ---- Receipts (held as object URLs for the life of the page) ----
const receiptStore = new Map();
export const uploadReceipt = async (file) => {
  const path = `demo/${uid("r")}`;
  receiptStore.set(path, URL.createObjectURL(file));
  return path;
};
export const receiptUrl = async (path) => (path ? receiptStore.get(path) || null : null);

// ---- Needs-you state (snoozes / dismissals) ----
let todoState = {};
export const fetchTodoState = async () => ({ ...todoState });
export const setTodoState = async (key, { snoozed_until = null, dismissed_at = null }) => {
  todoState = { ...todoState, [key]: { key, snoozed_until, dismissed_at, updated_at: new Date().toISOString() } };
};

// ---- Things the demo pretends about ----
export const markInvoiceSent = async (id, to) => {
  db.invoices = db.invoices.map((i) => (i.id === id ? { ...i, sent_at: new Date().toISOString(), sent_to: to } : i));
};

// ---- Photos (object URLs for the life of the page) ----
const photoStore = new Map();
let jobPhotos = [];
export const uploadJobPhoto = async (job, file) => {
  const path = `demo/${uid("p")}`;
  photoStore.set(path, URL.createObjectURL(file));
  const row = { id: uid("jp"), job_id: job.id, customer_id: job.customer_id, path, note: null, taken_at: new Date().toISOString(), archived_at: null };
  jobPhotos = [...jobPhotos, row];
  return row;
};
export const fetchJobPhotos = async (jobId) => jobPhotos.filter((p) => p.job_id === jobId);
export const fetchPhotoCounts = async () => {
  const m = {};
  for (const p of jobPhotos) m[p.job_id] = (m[p.job_id] || 0) + 1;
  return m;
};
export const photoUrl = async (path) => (path ? photoStore.get(path) || null : null);

// ---- Regular services ----
export const fetchCustomerServices = async () => db.customerServices.filter((s) => !s.archived_at);
export const upsertCustomerService = async (s) => {
  if (s.id) {
    db.customerServices = db.customerServices.map((x) => (x.id === s.id ? { ...x, ...s } : x));
    return db.customerServices.find((x) => x.id === s.id);
  }
  const created = { ...s, id: uid("ds"), archived_at: null };
  db.customerServices = [...db.customerServices, created];
  return created;
};
export const archiveCustomerService = async (id) => {
  db.customerServices = db.customerServices.map((x) => (x.id === id ? { ...x, archived_at: new Date().toISOString() } : x));
};
