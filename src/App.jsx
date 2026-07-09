import React, { useEffect, useState } from "react";
import { Loader2, AlertCircle, Droplets, LogIn } from "lucide-react";
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
} from "./lib/api";
import NavBar from "./components/NavBar";
import LoginModal from "./components/LoginModal";
import Dashboard from "./components/Dashboard";
import Customers from "./components/Customers";
import Schedule from "./components/Schedule";
import Billing from "./components/Billing";
import Leads from "./components/Leads";
import PublicQuoteForm from "./components/PublicQuoteForm";
import { Button } from "./components/ui";

function emptyCustomerDraft(overrides = {}) {
  return { name: "", phone: "", email: "", address: "", notes: "", access_notes: "", frequency_weeks: "", last_service_date: "", status: "active", ...overrides };
}

export default function App() {
  const [view, setView] = useState("dashboard");
  const [session, setSession] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [customers, setCustomers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [leads, setLeads] = useState([]);

  // Cross-module "hand off" drafts: e.g. accepting a quote should be able to
  // drop straight into scheduling that customer's first job.
  const [scheduleDraftCustomer, setScheduleDraftCustomer] = useState(null);
  const [customerDraft, setCustomerDraft] = useState(null);
  const [quoteDraft, setQuoteDraft] = useState(null);
  const [invoiceDraft, setInvoiceDraft] = useState(null);

  const reload = async () => {
    setError("");
    try {
      const [c, j, q, i, l] = await Promise.all([fetchCustomers(), fetchJobs(), fetchQuotes(), fetchInvoices(), fetchLeads()]);
      setCustomers(c);
      setJobs(j);
      setQuotes(q);
      setInvoices(i);
      setLeads(l);
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
    const unsub = onAuthChange(async (s) => {
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

  const newLeadCount = leads.filter((l) => l.status === "new").length;

  // Public, unauthenticated "request a quote" page - lives outside the app shell entirely.
  if (typeof window !== "undefined" && window.location.pathname.replace(/\/+$/, "") === "/request-quote") {
    return <PublicQuoteForm />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4">
            <Droplets size={26} className="text-white" strokeWidth={2.25} />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Clear View Job Manager</h1>
          <p className="text-sm text-slate-500 mt-1 mb-5">Sign in to manage customers, jobs, quotes and invoices.</p>
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
        <Dashboard customers={customers} jobs={jobs} invoices={invoices} leads={leads} setView={setView} onScheduleCustomer={scheduleForCustomer} onMarkPaid={markPaid} />
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
          customers={customers}
          jobs={jobs}
          onSaveQuote={saveQuote}
          onDeleteQuote={removeQuote}
          onSaveInvoice={saveInvoice}
          onDeleteInvoice={removeInvoice}
          onMarkInvoicePaid={markPaid}
          onScheduleFromQuote={scheduleForCustomer}
          quoteDraft={quoteDraft}
          onQuoteDraftConsumed={() => setQuoteDraft(null)}
          invoiceDraft={invoiceDraft}
          onInvoiceDraftConsumed={() => setInvoiceDraft(null)}
        />
      )}

      {view === "leads" && (
        <Leads leads={leads} onSetStatus={setLeadStatus} onDelete={removeLead} onConvertToCustomer={convertLeadToCustomer} onCreateQuote={createQuoteFromLead} />
      )}

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} onSignedIn={() => setShowLogin(false)} />}
    </div>
  );
}
