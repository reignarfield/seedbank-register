import React, { useEffect, useState } from "react";
import { Loader2, AlertCircle, LogIn } from "lucide-react";
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
} from "./lib/api";
import NavBar from "./components/NavBar";
import LoginModal from "./components/LoginModal";
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
import { Button } from "./components/ui";
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

export default function App() {
  const [view, setView] = useState("dashboard");
  const [session, setSession] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recovering, setRecovering] = useState(false);

  const [customers, setCustomers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [leads, setLeads] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [renewals, setRenewals] = useState([]);
  const [trips, setTrips] = useState([]);
  const [settings, setSettings] = useState({ home_base_address: null, home_base_lat: null, home_base_lng: null, mileage_rate_cents: 88 });

  // Cross-module "hand off" drafts: e.g. accepting a quote should be able to
  // drop straight into scheduling that customer's first job.
  const [scheduleDraftCustomer, setScheduleDraftCustomer] = useState(null);
  const [customerDraft, setCustomerDraft] = useState(null);
  const [quoteDraft, setQuoteDraft] = useState(null);
  const [invoiceDraft, setInvoiceDraft] = useState(null);

  const reload = async () => {
    setError("");
    try {
      const [c, j, q, i, l, ex, re, tr, st] = await Promise.all([
        fetchCustomers(),
        fetchJobs(),
        fetchQuotes(),
        fetchInvoices(),
        fetchLeads(),
        fetchExpenses(),
        fetchRenewals(),
        fetchTrips(),
        fetchSettings(),
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
    } catch (e) {
      setError("Could not load data: " + (e?.message || "unknown error"));
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
    setView("dashboard");
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
    await upsertJob(j);
    await reload();
  };
  const completeJobAndReload = async (j) => {
    await completeJob(j);
    await reload();
  };
  const cancelJob = async (j) => {
    await upsertJob({ ...j, status: "cancelled" });
    await reload();
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
    const saved = await saveSettings({ ...settings, ...s });
    setSettings(saved);
  };
  // Best-effort geocode cache - update local state immediately, persist quietly.
  const cacheCustomerCoords = (id, lat, lng) => {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, lat, lng } : c)));
    saveCustomerCoords(id, lat, lng).catch(() => {});
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
  const scheduleForCustomer = (customer) => {
    setScheduleDraftCustomer(customer);
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
    scheduleForCustomer(customer);
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center">
          <img src={logo} alt="Tydie Cleaning" className="w-full max-w-[220px] mx-auto rounded-xl shadow-sm mb-5" />
          <h1 className="text-xl font-semibold text-slate-900">Job Manager</h1>
          <p className="text-sm text-slate-500 mt-1 mb-5">Staff area. Sign in to manage customers, jobs, quotes and invoices.</p>
          <Button onClick={() => setShowLogin(true)} className="mx-auto">
            <LogIn size={15} /> Sign in
          </Button>
        </div>
        {showLogin && <LoginModal onClose={() => setShowLogin(false)} onSignedIn={() => setShowLogin(false)} />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <NavBar view={view} setView={setView} session={session} onLoginClick={() => setShowLogin(true)} onLogout={handleLogout} leadBadge={newLeadCount} />
      {error && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4">
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-4 py-2.5 flex items-center gap-2">
            <AlertCircle size={15} /> {error}
          </div>
        </div>
      )}

      {view === "dashboard" && (
        <Dashboard
          customers={customers}
          jobs={jobs}
          invoices={invoices}
          leads={leads}
          expenses={expenses}
          renewals={renewals}
          setView={setView}
          onScheduleCustomer={scheduleForCustomer}
          onMarkPaid={markPaid}
          onSaveRenewal={saveRenewal}
          onDeleteRenewal={removeRenewal}
        />
      )}

      {view === "customers" && (
        <Customers
          customers={customers}
          jobs={jobs}
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
          draftCustomer={scheduleDraftCustomer}
          onDraftConsumed={() => setScheduleDraftCustomer(null)}
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

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} onSignedIn={() => setShowLogin(false)} />}
    </div>
  );
}
