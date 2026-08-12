import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { todayStr, addDays } from "./lib/dates";
import {
  getSession,
  onAuthChange,
  signOut,
  fetchCustomers,
  upsertCustomer,
  deleteCustomer,
  fetchJobs,
  upsertJob,
  deleteJob,
  completeJob,
  fetchQuotes,
  upsertQuote,
  deleteQuote,
  fetchInvoices,
  upsertInvoice,
  deleteInvoice,
  markInvoicePaid as apiMarkInvoicePaid,
  fetchLeads,
  upsertLead,
  deleteLead,
  fetchExpenses,
  upsertExpense,
  deleteExpense,
  fetchRenewals,
  upsertRenewal,
  deleteRenewal,
  fetchSettings,
  saveSettings,
  fetchTrips,
  upsertTrip,
  deleteTrip,
  saveCustomerCoords,
  logAutoTrip,
  logHeadingHome,
  fetchCustomerNotes,
  addCustomerNote,
} from "./lib/api";
import NavBar from "./components/NavBar";
import TodaySimple from "./components/TodaySimple";
import Dashboard from "./components/Dashboard";
import Customers from "./components/Customers";
import Schedule from "./components/Schedule";
import Billing from "./components/Billing";
import Leads from "./components/Leads";
import Dev from "./components/Dev";
import Mileage from "./components/Mileage";
import CustomerPage from "./components/CustomerPage";
import PublicSite from "./components/PublicSite";
import PasswordRecovery from "./components/PasswordRecovery";
import SignInForm from "./components/SignInForm";
import Toast from "./components/Toast";
import logo from "./assets/tydie-logo.png";

// Everything under /team is the staff-only admin app (sign-in required).
// Every other path - the homepage, /request-quote, anything else someone
// types - is the public booking page. Staff access isn't a secret path for
// security (Supabase auth + RLS is what actually protects the data) - it's
// just so a casual visitor never lands on a sign-in wall instead of a way
// to book.
const STAFF_PATH_PREFIX = "/team";

function emptyCustomerDraft(overrides = {}) {
  return { name: "", phone: "", email: "", address: "", notes: "", access_notes: "", frequency_weeks: "", last_service_date: "", status: "active", ...overrides };
}

// Where he actually last was, for chaining today's mileage legs: the
// destination of today's most recently logged trip, or home base if
// nothing's been logged yet today. A trip with no customer_id (the
// "Heading home" leg) means he was last at home.
function currentPosition(trips, customers, settings) {
  const today = todayStr();
  const todaysTrips = trips.filter((t) => t.trip_date === today);
  const last = todaysTrips.length
    ? todaysTrips.reduce((a, b) => ((a.created_at || "") > (b.created_at || "") ? a : b))
    : null;
  if (!last || !last.customer_id) {
    return { label: settings.home_base_address, lat: settings.home_base_lat, lng: settings.home_base_lng };
  }
  const c = customers.find((x) => x.id === last.customer_id);
  return { label: last.to_label, lat: c?.lat, lng: c?.lng };
}

export default function App() {
  const [view, setView] = useState("dashboard");
  const [mode, setMode] = useState("simple"); // "simple" (Today, one-tap) | "advanced" (full app)
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [recovering, setRecovering] = useState(false);

  const [customers, setCustomers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [leads, setLeads] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [renewals, setRenewals] = useState([]);
  const [trips, setTrips] = useState([]);
  const [customerNotes, setCustomerNotes] = useState([]);
  const [settings, setSettings] = useState({
    home_base_address: null,
    home_base_lat: null,
    home_base_lng: null,
    mileage_rate_cents: 88,
    packing_checklist: ["Squeegees", "Extension pole", "Towels / cloths", "Screwdriver", "Bucket & soap"],
    type_checklists: {},
    day_started_date: null,
  });

  // Cross-module "hand off" drafts: e.g. accepting a quote should be able to
  // drop straight into scheduling that customer's first job.
  const [scheduleDraftCustomer, setScheduleDraftCustomer] = useState(null);
  const [scheduleDraftQuote, setScheduleDraftQuote] = useState(null);
  const [customerDraft, setCustomerDraft] = useState(null);
  const [quoteDraft, setQuoteDraft] = useState(null);
  const [invoiceDraft, setInvoiceDraft] = useState(null);

  // Shown on both Today and the full app - previously a failed write just
  // did nothing visible, especially on Today which had no error surface
  // at all. Callers still throw after calling this, so their own
  // try/finally (spinners, "only close on success") keeps working exactly
  // as before - this only adds visibility.
  const notifyError = (message) => setToast({ message });

  const reload = async () => {
    try {
      const [c, j, q, i, l, ex, re, tr, st, cn] = await Promise.all([
        fetchCustomers(),
        fetchJobs(),
        fetchQuotes(),
        fetchInvoices(),
        fetchLeads(),
        fetchExpenses(),
        fetchRenewals(),
        fetchTrips(),
        fetchSettings(),
        fetchCustomerNotes(),
      ]);
      setCustomers(c);
      setJobs(j);
      setQuotes(q);
      setInvoices(i);
      setLeads(l);
      setExpenses(ex);
      setRenewals(re);
      setTrips(tr);
      setSettings(st);
      setCustomerNotes(cn);
    } catch (e) {
      notifyError("Could not load data: " + (e?.message || "unknown error"));
    }
  };

  useEffect(() => {
    (async () => {
      const s = await getSession();
      setSession(s);
      if (s) await reload();
      setLoading(false);
    })();
    const unsub = onAuthChange(async (s, event) => {
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      setSession(s);
      if (s) await reload();
    });
    return unsub;
  }, []);

  const handleLogout = async () => {
    await signOut();
    setSession(null);
    setCustomers([]);
    setJobs([]);
    setQuotes([]);
    setInvoices([]);
    setLeads([]);
    setExpenses([]);
    setRenewals([]);
    setTrips([]);
    setCustomerNotes([]);
    setView("dashboard");
    setMode("simple");
  };

  // ---- Customers ----
  const saveCustomer = async (c) => {
    await upsertCustomer(c);
    await reload();
  };
  const removeCustomer = async (id) => {
    await deleteCustomer(id);
    await reload();
  };

  // ---- Jobs ----
  const saveJob = async (j) => {
    try {
      await upsertJob(j);
      await reload();
    } catch (e) {
      notifyError("Couldn't save that job - check your connection and try again.");
      throw e;
    }
  };
  const completeJobAndReload = async (j, paidNow) => {
    try {
      const pos = currentPosition(trips, customers, settings);
      await completeJob(j, { paidNow });
      const customer = customers.find((c) => c.id === j.customer_id);
      if (customer) logAutoTrip(pos, customer, j.job_type).catch(() => {});
      await reload();
    } catch (e) {
      notifyError("Couldn't mark that job done - check your connection and try again.");
      throw e;
    }
  };
  // "I'm heading home now" - closes a loop by logging the final leg back to
  // base, so the next job completed (even much later, a second loop) starts
  // fresh from home instead of chaining off wherever the last job was.
  const headingHome = async () => {
    try {
      const pos = currentPosition(trips, customers, settings);
      await logHeadingHome(pos, { label: settings.home_base_address, lat: settings.home_base_lat, lng: settings.home_base_lng }).catch(() => {});
      await reload();
    } catch (e) {
      notifyError("Couldn't log that - check your connection and try again.");
      throw e;
    }
  };
  const cancelJob = async (j) => {
    try {
      await upsertJob({ ...j, status: "cancelled" });
      await reload();
    } catch (e) {
      notifyError("Couldn't cancel that job - check your connection and try again.");
      throw e;
    }
  };
  const removeJob = async (id) => {
    await deleteJob(id);
    await reload();
  };

  // ---- Quotes ----
  const saveQuote = async (q) => {
    await upsertQuote(q);
    await reload();
  };
  const removeQuote = async (id) => {
    await deleteQuote(id);
    await reload();
  };

  // ---- Invoices ----
  const saveInvoice = async (inv) => {
    await upsertInvoice(inv);
    await reload();
  };
  const removeInvoice = async (id) => {
    await deleteInvoice(id);
    await reload();
  };
  const markPaid = async (inv) => {
    await apiMarkInvoicePaid(inv.id);
    await reload();
  };

  // ---- Expenses ----
  const saveExpense = async (ex) => {
    await upsertExpense(ex);
    await reload();
  };
  const removeExpense = async (id) => {
    await deleteExpense(id);
    await reload();
  };

  // ---- Renewals ----
  const saveRenewal = async (r) => {
    await upsertRenewal(r);
    await reload();
  };
  const removeRenewal = async (id) => {
    await deleteRenewal(id);
    await reload();
  };

  // ---- Mileage ----
  const saveTrip = async (t) => {
    await upsertTrip(t);
    await reload();
  };
  const removeTrip = async (id) => {
    await deleteTrip(id);
    await reload();
  };
  const saveMileageSettings = async (s) => {
    try {
      const saved = await saveSettings({ ...settings, ...s });
      setSettings(saved);
    } catch (e) {
      notifyError("Couldn't save that - check your connection and try again.");
      throw e;
    }
  };
  // Best-effort geocode cache - update local state immediately, persist quietly.
  const cacheCustomerCoords = (id, lat, lng) => {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, lat, lng } : c)));
    saveCustomerCoords(id, lat, lng).catch(() => {});
  };

  // ---- Customer notes ----
  const addNote = async (customerId, note) => {
    try {
      await addCustomerNote(customerId, note);
      await reload();
    } catch (e) {
      notifyError("Couldn't save that note - check your connection and try again.");
      throw e;
    }
  };

  // ---- Leads ----
  const setLeadStatus = async (lead, status) => {
    await upsertLead({ ...lead, status });
    await reload();
  };
  const removeLead = async (id) => {
    await deleteLead(id);
    await reload();
  };
  const convertLeadToCustomer = async (lead) => {
    setCustomerDraft(emptyCustomerDraft({ name: lead.name, phone: lead.phone || "", email: lead.email || "", address: lead.address || "", notes: lead.message || "" }));
    await setLeadStatus(lead, "won");
    setView("customers");
  };
  const createQuoteFromLead = async (lead) => {
    setQuoteDraft({ lead_id: lead.id, contact_name: lead.name, contact_email: lead.email || "", contact_phone: lead.phone || "", description: lead.message || "" });
    if (lead.status === "new") await setLeadStatus(lead, "quoted");
    setView("billing");
  };

  // ---- Cross-module handoffs ----
  // A quote passed in here (accepting a quote) pre-fills the resulting
  // job's price/description straight from what was actually quoted, so
  // there's nothing to remember or re-enter before the invoice raises.
  const scheduleForCustomer = (customer, quote) => {
    setScheduleDraftCustomer(customer);
    setScheduleDraftQuote(quote || null);
    setView("schedule");
  };

  // An accepted quote that came straight from a lead (no customer_id) has no
  // "Schedule job" button, because there's no customer to schedule against
  // yet - this closes that gap in one action instead of requiring him to
  // separately remember to convert the lead first.
  const convertQuoteToCustomerAndSchedule = async (quote) => {
    const customer = await upsertCustomer(
      emptyCustomerDraft({
        name: quote.contact_name || "New customer",
        phone: quote.contact_phone || "",
        email: quote.contact_email || "",
        notes: quote.description || "",
      })
    );
    await upsertQuote({ ...quote, customer_id: customer.id });
    if (quote.lead_id) {
      const lead = leads.find((l) => l.id === quote.lead_id);
      if (lead) await setLeadStatus(lead, "won");
    }
    await reload();
    scheduleForCustomer(customer, quote);
  };

  // A completed job that skipped the price prompt never gets an invoice
  // raised automatically - this is the way back, reusing the invoiceDraft
  // hand-off already built for Billing rather than a new flow.
  const raiseInvoiceForJob = (job) => {
    setInvoiceDraft({
      customer_id: job.customer_id,
      job_id: job.id,
      description: job.notes || "",
      due_date: addDays(todayStr(), 14),
    });
    setView("billing");
  };

  const newLeadCount = leads.filter((l) => l.status === "new").length;

  // Public booking page - this is the default for every path except /team,
  // so the homepage itself is the "just let me book something" experience.
  const pathname = typeof window !== "undefined" ? window.location.pathname.replace(/\/+$/, "") || "/" : "/";
  const isStaffRoute = pathname === STAFF_PATH_PREFIX || pathname.startsWith(`${STAFF_PATH_PREFIX}/`);
  if (!isStaffRoute) {
    return <PublicSite />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (recovering) {
    return <PasswordRecovery onDone={() => setRecovering(false)} />;
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <img src={logo} alt="Tydie Cleaning" className="w-full max-w-[220px] mx-auto rounded-xl shadow-sm mb-6" />
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <SignInForm />
          </div>
        </div>
      </div>
    );
  }

  if (mode === "simple") {
    return (
      <>
        <TodaySimple
          jobs={jobs}
        customers={customers}
        checklist={settings.packing_checklist || []}
        typeChecklists={settings.type_checklists || {}}
        onSaveChecklist={(items) => saveMileageSettings({ packing_checklist: items })}
        onComplete={completeJobAndReload}
        onSaveJob={saveJob}
        onReschedule={(job, date) => saveJob({ ...job, scheduled_date: date })}
        onCancelJob={cancelJob}
        onHeadingHome={headingHome}
        hasLoggedTripToday={trips.some((t) => t.trip_date === todayStr())}
        todayTripKm={trips.filter((t) => t.trip_date === todayStr()).reduce((s, t) => s + Number(t.distance_km || 0), 0)}
        onAddNote={addNote}
        homeBaseAddress={settings.home_base_address}
        homeBaseLat={settings.home_base_lat}
        homeBaseLng={settings.home_base_lng}
        dayStartedToday={settings.day_started_date === todayStr()}
        onStartDay={() => saveMileageSettings({ day_started_date: todayStr() })}
        invoices={invoices}
        leads={leads}
        onLogout={handleLogout}
        onGoAdvanced={(tab) => {
          setMode("advanced");
          if (tab) setView(tab);
        }}
      />
      <Toast toast={toast} onDismiss={() => setToast(null)} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <NavBar view={view} setView={setView} onGoSimple={() => setMode("simple")} onLogout={handleLogout} leadBadge={newLeadCount} />

      {view === "dashboard" && (
        <Dashboard
          customers={customers}
          jobs={jobs}
          invoices={invoices}
          leads={leads}
          expenses={expenses}
          renewals={renewals}
          trips={trips}
          setView={setView}
          onScheduleCustomer={scheduleForCustomer}
          onMarkPaid={markPaid}
          onSaveRenewal={saveRenewal}
          onDeleteRenewal={removeRenewal}
          typeChecklists={settings.type_checklists || {}}
          onSaveTypeChecklist={(type, items) => saveMileageSettings({ type_checklists: { ...settings.type_checklists, [type]: items } })}
        />
      )}

      {view === "customers" && (
        <Customers
          customers={customers}
          jobs={jobs}
          customerNotes={customerNotes}
          onSave={saveCustomer}
          onDelete={removeCustomer}
          draft={customerDraft}
          onDraftConsumed={() => setCustomerDraft(null)}
        />
      )}

      {view === "schedule" && (
        <Schedule
          customers={customers}
          jobs={jobs}
          onSave={saveJob}
          onComplete={completeJobAndReload}
          onCancelJob={cancelJob}
          onDelete={removeJob}
          onRaiseInvoice={raiseInvoiceForJob}
          draftCustomer={scheduleDraftCustomer}
          draftQuote={scheduleDraftQuote}
          onDraftConsumed={() => {
            setScheduleDraftCustomer(null);
            setScheduleDraftQuote(null);
          }}
        />
      )}

      {view === "billing" && (
        <Billing
          quotes={quotes}
          invoices={invoices}
          expenses={expenses}
          customers={customers}
          jobs={jobs}
          onSaveQuote={saveQuote}
          onDeleteQuote={removeQuote}
          onSaveInvoice={saveInvoice}
          onDeleteInvoice={removeInvoice}
          onMarkInvoicePaid={markPaid}
          onSaveExpense={saveExpense}
          onDeleteExpense={removeExpense}
          onScheduleFromQuote={scheduleForCustomer}
          onConvertQuoteAndSchedule={convertQuoteToCustomerAndSchedule}
          quoteDraft={quoteDraft}
          onQuoteDraftConsumed={() => setQuoteDraft(null)}
          invoiceDraft={invoiceDraft}
          onInvoiceDraftConsumed={() => setInvoiceDraft(null)}
        />
      )}

      {view === "leads" && (
        <Leads leads={leads} onSetStatus={setLeadStatus} onDelete={removeLead} onConvertToCustomer={convertLeadToCustomer} onCreateQuote={createQuoteFromLead} />
      )}

      {view === "mileage" && (
        <Mileage
          trips={trips}
          customers={customers}
          settings={settings}
          onSaveTrip={saveTrip}
          onDeleteTrip={removeTrip}
          onSaveSettings={saveMileageSettings}
          onCacheCoords={cacheCustomerCoords}
        />
      )}

      {view === "customerpage" && <CustomerPage />}

      {view === "dev" && <Dev />}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
