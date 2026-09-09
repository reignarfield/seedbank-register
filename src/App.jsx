import React, { useEffect, useState } from "react";
import { Loader2, ArrowLeft } from "lucide-react";
import { todayStr, addDays, formatDate } from "./lib/dates";
import { liveRows } from "./lib/today";
import { isDemoMode, setDemoMode } from "./lib/dataMode";
import {
  getSession,
  onAuthChange,
  signOut,
  fetchCustomers,
  upsertCustomer,
  archiveCustomer,
  fetchJobs,
  upsertJob,
  archiveJob,
  completeJob,
  fetchQuotes,
  upsertQuote,
  archiveQuote,
  fetchInvoices,
  upsertInvoice,
  archiveInvoice,
  markInvoicePaid as apiMarkInvoicePaid,
  fetchLeads,
  upsertLead,
  deleteLead,
  fetchExpenses,
  upsertExpense,
  archiveExpense,
  fetchRenewals,
  upsertRenewal,
  deleteRenewal,
  fetchSettings,
  saveSettings,
  fetchTrips,
  upsertTrip,
  archiveTrip,
  saveCustomerCoords,
  logAutoTrip,
  logHeadingHome,
  fetchCustomerNotes,
  addCustomerNote,
  fetchActivity,
  logActivity,
  undoActivity,
  fetchTodoState,
  setTodoState,
  fetchCustomerServices,
  upsertCustomerService,
  archiveCustomerService,
  fetchPhotoCounts,
  sendEmail,
  markInvoiceSent,
} from "./lib/api";
import NavBar from "./components/NavBar";
import TodaySimple from "./components/TodaySimple";
import Customers from "./components/Customers";
import Schedule from "./components/Schedule";
import Money from "./components/Money";
import Dev from "./components/Dev";
import Settings from "./components/Settings";
import UsageTimeline from "./components/UsageTimeline";
import FeedbackButton from "./components/FeedbackButton";
import EmailPreview from "./components/EmailPreview";
import { startSession, trackScreen, attachTapListener, flush as flushTracking, setTrackedUser } from "./lib/track";
import { snoozeUntil } from "./lib/todo";
import { enqueue, drain, attachDrain, onQueueChange, pending, isNetworkFailure } from "./lib/offline";
import { registerServiceWorker } from "./lib/push";
import { BUSINESS as BIZ } from "./lib/business";
import CustomerPage from "./components/CustomerPage";
import PublicSite from "./components/PublicSite";
import PasswordRecovery from "./components/PasswordRecovery";
import SignInForm from "./components/SignInForm";
import SetupNeeded from "./components/SetupNeeded";
import Toast from "./components/Toast";
import { isConfigured } from "./lib/supabaseClient";
import { BUSINESS } from "./lib/business";
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
  // One app, five tabs. Today is the first and the default; the builder
  // screens (usage, dev, customerpage) sit under Settings.
  // The tab lives in the address (#/money/quotes), so a refresh comes back to
  // the same place and the phone's back gesture goes back a tab instead of
  // leaving the app.
  const readHash = () => {
    const h = (typeof window !== "undefined" ? window.location.hash : "").replace(/^#\/?/, "");
    const [v, sub] = h.split("/");
    return { view: v || "today", sub: sub || null };
  };
  const initial = readHash();
  const [view, setViewState] = useState(initial.view);
  const [moneyTab, setMoneyTabState] = useState(initial.view === "money" && initial.sub ? initial.sub : "invoices");
  const [customersTab, setCustomersTabState] = useState(initial.view === "customers" && initial.sub ? initial.sub : "customers");
  const fromPop = React.useRef(false);
  const pushHash = (v, m, c) => {
    const sub = v === "money" ? m : v === "customers" ? c : null;
    const next = `#/${v}${sub ? "/" + sub : ""}`;
    if (window.location.hash !== next) window.history.pushState(null, "", next);
  };
  const setView = (v) => { setViewState(v); pushHash(v, moneyTab, customersTab); };
  const setMoneyTab = (t) => { setMoneyTabState(t); pushHash("money", t, customersTab); };
  const setCustomersTab = (t) => { setCustomersTabState(t); pushHash("customers", moneyTab, t); };
  useEffect(() => {
    const onPop = () => {
      const h = readHash();
      fromPop.current = true;
      setViewState(h.view);
      if (h.view === "money" && h.sub) setMoneyTabState(h.sub);
      if (h.view === "customers" && h.sub) setCustomersTabState(h.sub);
    };
    window.addEventListener("popstate", onPop);
    if (!window.location.hash) window.history.replaceState(null, "", "#/today");
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const [pendingOffline, setPendingOffline] = useState(() => pending().length);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  // /team?demo switches the sample business on before anything renders, so
  // a bookmarked link is all it takes to walk someone through the app. It
  // only touches which data set is shown - signing in is still required.
  const [demoMode, setDemoModeState] = useState(() => {
    const wantsDemo = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("demo");
    if (wantsDemo) setDemoMode(true);
    return wantsDemo || isDemoMode();
  });
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
  const [activity, setActivity] = useState([]);
  const [todoState, setTodoStateLocal] = useState({});
  const [photoCounts, setPhotoCounts] = useState({});
  const [services, setServices] = useState([]);
  const [emailDraft, setEmailDraft] = useState(null); // { item, draft, smsHref }
  const [scheduleDraftService, setScheduleDraftService] = useState(null);
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

  // Each table and the state it lands in, so a write can refresh just what it
  // touched. Marking a job done from a driveway used to re-download all ten
  // tables; now it's the three that changed. Sit-down admin actions on Wi-Fi
  // still refresh everything - the cost there is invisible and it keeps every
  // derived number (dashboard totals, due lists) trivially consistent.
  const TABLES = {
    customers: [fetchCustomers, setCustomers],
    jobs: [fetchJobs, setJobs],
    quotes: [fetchQuotes, setQuotes],
    invoices: [fetchInvoices, setInvoices],
    leads: [fetchLeads, setLeads],
    expenses: [fetchExpenses, setExpenses],
    renewals: [fetchRenewals, setRenewals],
    trips: [fetchTrips, setTrips],
    settings: [fetchSettings, setSettings],
    customerNotes: [fetchCustomerNotes, setCustomerNotes],
    activity: [fetchActivity, setActivity],
    todoState: [fetchTodoState, setTodoStateLocal],
    photoCounts: [fetchPhotoCounts, setPhotoCounts],
    services: [fetchCustomerServices, setServices],
  };

  const reload = async (only) => {
    const names = only || Object.keys(TABLES);
    try {
      const results = await Promise.all(names.map((n) => TABLES[n][0]()));
      results.forEach((data, idx) => TABLES[names[idx]][1](data));
    } catch (e) {
      notifyError("Could not load data: " + (e?.message || "unknown error"));
    }
  };

  useEffect(() => {
    // With no database configured there is nothing to ask for a session, and
    // trying would only produce network errors behind the setup screen.
    if (!isConfigured) {
      setLoading(false);
      return;
    }
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

  // Usage tracking: a session per app-open, the current screen with dwell
  // time, and every tap by its label. Only while signed in.
  // Offline queue: anything saved on the phone while out of range sends
  // itself when the signal comes back. Also readies the service worker for
  // push (nothing is sent yet).
  useEffect(() => {
    if (!session) return;
    registerServiceWorker();
    const off = onQueueChange((q) => setPendingOffline(q.length));
    const perform = async (action, args) => {
      if (action === "completeJob") await completeJob(args.job, args.opts);
      else if (action === "upsertJob") await upsertJob(args.job);
      else if (action === "addCustomerNote") await addCustomerNote(args.customerId, args.note);
      else if (action === "upsertExpense") await upsertExpense(args.expense);
      else throw new Error("unknown queued action " + action);
    };
    const report = (item) => notifyError(`Couldn't send "${item.describe}" - the server refused it. Check it in the app.`);
    const run = async () => {
      if (pending().length === 0) return;
      await drain(perform, report);
      if (pending().length === 0) reload(["jobs", "customers", "invoices", "activity", "customerNotes", "expenses"]);
    };
    const detach = attachDrain(run);
    return () => { off(); detach(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    if (!session) return;
    setTrackedUser(session.user);
    startSession();
    const detach = attachTapListener();
    return () => {
      detach();
      flushTracking();
    };
  }, [session]);
  useEffect(() => {
    if (!session) return;
    trackScreen(view === "money" ? `money/${moneyTab}` : view === "customers" ? `customers/${customersTab}` : view);
  }, [session, view, moneyTab, customersTab]);

  const handleLogout = async () => {
    await flushTracking();
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
    setActivity([]);
    setView("today");
  };

  // Flip the whole data layer between the real database and the in-memory
  // demo set. Auth is untouched either way, so this can't be used to get in.
  const toggleDemoMode = async (on) => {
    setDemoMode(on);
    setDemoModeState(on);
    setView("today");
    await reload();
  };

  // ---- Customers ----
  const saveCustomer = async (c) => {
    await upsertCustomer(c);
    await reload();
  };
  // Archive, never delete - records leave the screen, not the books.
  const removeCustomer = async (id) => {
    await archiveCustomer(id);
    await reload(["customers", "jobs", "quotes"]);
  };

  // ---- Jobs ----
  const saveJob = async (j) => {
    try {
      await upsertJob(j);
      await reload(["jobs"]);
    } catch (e) {
      notifyError("Couldn't save that job - check your connection and try again.");
      throw e;
    }
  };
  const completeJobAndReload = async (j, paidNow) => {
    const customer = customers.find((c) => c.id === j.customer_id);
    try {
      const pos = currentPosition(trips, customers, settings);
      await completeJob(j, { paidNow, dueDays: settings.invoice_due_days });
      // The trip logs in the background; trips refresh once it's had a chance
      // to land rather than racing it.
      if (customer) logAutoTrip(pos, customer, j.job_type).then(() => reload(["trips"])).catch(() => {});
      await reload(["jobs", "customers", "invoices", "activity"]);
    } catch (e) {
      if (isNetworkFailure(e)) {
        enqueue("completeJob", { job: j, opts: { paidNow, dueDays: settings.invoice_due_days } }, `Mark ${customer?.name || "a job"} done`);
        setJobs((prev) => prev.map((x) => (x.id === j.id ? { ...x, status: "completed", completed_at: new Date().toISOString(), price: j.price ?? x.price } : x)));
        setToast({ message: "No signal - saved on the phone. It'll send when you're back in range." });
        return;
      }
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
      await reload(["trips"]);
    } catch (e) {
      notifyError("Couldn't log that - check your connection and try again.");
      throw e;
    }
  };
  const cancelJob = async (j) => {
    try {
      await upsertJob({ ...j, status: "cancelled" });
      const c = customers.find((x) => x.id === j.customer_id);
      await logActivity({ kind: "job_cancelled", summary: `Cancelled ${c?.name || "a"} job for ${formatDate(j.scheduled_date)}`, customer_id: j.customer_id, ref_table: "jobs", ref_id: j.id }).catch(() => {});
      await reload(["jobs", "activity"]);
    } catch (e) {
      if (isNetworkFailure(e)) {
        const c = customers.find((x) => x.id === j.customer_id);
        enqueue("upsertJob", { job: { ...j, status: "cancelled" } }, `Cancel ${c?.name || "a"} job`);
        setJobs((prev) => prev.map((x) => (x.id === j.id ? { ...x, status: "cancelled" } : x)));
        setToast({ message: "No signal - saved on the phone. It'll send when you're back in range." });
        return;
      }
      notifyError("Couldn't cancel that job - check your connection and try again.");
      throw e;
    }
  };
  const rescheduleJob = async (j, date) => {
    try {
      await upsertJob({ ...j, scheduled_date: date, route_order: null });
      const c = customers.find((x) => x.id === j.customer_id);
      await logActivity({ kind: "job_rescheduled", summary: `Moved ${c?.name || "a"} job to ${formatDate(date)}`, customer_id: j.customer_id, ref_table: "jobs", ref_id: j.id }).catch(() => {});
      await reload(["jobs", "activity"]);
    } catch (e) {
      if (isNetworkFailure(e)) {
        const c = customers.find((x) => x.id === j.customer_id);
        enqueue("upsertJob", { job: { ...j, scheduled_date: date, route_order: null } }, `Move ${c?.name || "a"} job to ${formatDate(date)}`);
        setJobs((prev) => prev.map((x) => (x.id === j.id ? { ...x, scheduled_date: date, route_order: null } : x)));
        setToast({ message: "No signal - saved on the phone. It'll send when you're back in range." });
        return;
      }
      notifyError("Couldn't move that job - check your connection and try again.");
      throw e;
    }
  };
  // "Needs you" - the app suggests, he decides. Snooze and dismiss are the
  // only things stored; the list itself is rebuilt from live data each time.
  const snoozeTodo = async (item, days) => {
    const until = snoozeUntil(days);
    setTodoStateLocal((s) => ({ ...s, [item.key]: { key: item.key, snoozed_until: until, dismissed_at: null } }));
    await setTodoState(item.key, { snoozed_until: until }).catch(() => notifyError("Couldn't snooze that."));
  };
  const dismissTodo = async (item) => {
    const at = new Date().toISOString();
    setTodoStateLocal((s) => ({ ...s, [item.key]: { key: item.key, snoozed_until: null, dismissed_at: at } }));
    await setTodoState(item.key, { dismissed_at: at }).catch(() => notifyError("Couldn't dismiss that."));
  };
  // A tap on a Text / Call link: he's about to send it himself, so note that
  // and treat the item as handled (it comes back naturally if still needed).
  const doneTodo = async (item, action) => {
    if (action?.logs) {
      await logActivity({ kind: "contacted", summary: action.logs, actor: "user", customer_id: item.customer?.id || null }).catch(() => {});
      await reload(["activity"]);
    }
    if (item.kind === "confirm" || item.kind === "chase" || item.kind === "reach" || item.kind === "reply") await dismissTodo(item);
  };
  const todoAction = async (item, action) => {
    switch (action.action) {
      case "schedule":
        scheduleForCustomer(item.customer, null, item.service || null);
        break;
      case "email":
        if (item.primary?.action === "email" || action.action === "email") {
          const sms = item.customer?.phone ? (action.href || null) : null;
          setEmailDraft({ item, action, draft: action.draft, smsHref: sms });
        }
        break;
      case "scheduleQuote":
        scheduleForCustomer(item.customer, item.ref);
        break;
      case "convertQuote":
        await convertQuoteToCustomerAndSchedule(item.ref);
        break;
      case "raiseInvoice":
        raiseInvoiceForJob(item.ref);
        break;
      case "invoice":
        setMoneyTab("invoices");
        setView("money");
        break;
      case "leads":
        setCustomersTab("enquiries");
        setView("customers");
        break;
      case "markPaid":
        await markPaid(item.ref);
        break;
      case "makeRegular":
        await upsertCustomerService({ customer_id: item.customer.id, service: item.ref.job_type, frequency_weeks: action.weeks, last_done: item.ref.scheduled_date, price: item.ref.price ?? null });
        await dismissTodo(item);
        await reload(["services"]);
        setToast({ message: `${item.ref.job_type} is now every ${action.weeks} weeks for ${item.customer.name}.` });
        break;
      case "renewalDone":
        await removeRenewal(item.ref.id);
        break;
      default:
        break;
    }
  };

  const undoActivityItem = async (item) => {
    try {
      await undoActivity(item.id);
      await reload(["jobs", "customers", "invoices", "activity"]);
    } catch (e) {
      notifyError(e?.message || "Couldn't undo that.");
    }
  };
  const removeJob = async (id) => {
    await archiveJob(id);
    await reload(["jobs"]);
  };

  // ---- Quotes ----
  const saveQuote = async (q) => {
    await upsertQuote(q);
    await reload();
  };
  const removeQuote = async (id) => {
    await archiveQuote(id);
    await reload(["quotes"]);
  };

  // ---- Invoices ----
  const saveInvoice = async (inv) => {
    await upsertInvoice(inv);
    await reload();
  };
  const removeInvoice = async (id) => {
    await archiveInvoice(id);
    await reload(["invoices"]);
  };
  const markPaid = async (inv) => {
    await apiMarkInvoicePaid(inv.id);
    await reload(["invoices"]);
  };

  // ---- Expenses ----
  const saveExpense = async (ex) => {
    try {
      await upsertExpense(ex);
      await reload(["expenses"]);
    } catch (e) {
      if (isNetworkFailure(e)) {
        enqueue("upsertExpense", { expense: { ...ex, receipt_path: ex.receipt_path || null } }, `Expense ${Number(ex.amount || 0).toFixed(2)}`);
        setExpenses((prev) => [{ ...ex, id: ex.id || `local-${Date.now()}` }, ...prev.filter((x) => x.id !== ex.id)]);
        setToast({ message: "No signal - saved on the phone. It'll send when you're back in range." });
        return;
      }
      notifyError("Couldn't save that expense - check your connection and try again.");
      throw e;
    }
  };
  const removeExpense = async (id) => {
    await archiveExpense(id);
    await reload(["expenses"]);
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
    await archiveTrip(id);
    await reload(["trips"]);
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
      await reload(["customerNotes"]);
    } catch (e) {
      if (isNetworkFailure(e)) {
        const c = customers.find((x) => x.id === customerId);
        enqueue("addCustomerNote", { customerId, note }, `Note on ${c?.name || "a customer"}`);
        setCustomerNotes((prev) => [{ id: `local-${Date.now()}`, customer_id: customerId, note, created_at: new Date().toISOString() }, ...prev]);
        setToast({ message: "No signal - saved on the phone. It'll send when you're back in range." });
        return;
      }
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
    setCustomersTab("customers");
    setView("customers");
  };
  const createQuoteFromLead = async (lead) => {
    setQuoteDraft({ lead_id: lead.id, contact_name: lead.name, contact_email: lead.email || "", contact_phone: lead.phone || "", description: lead.message || "" });
    if (lead.status === "new") await setLeadStatus(lead, "quoted");
    setMoneyTab("quotes");
    setView("money");
  };

  // Three fields from the van; the rest later, at a desk.
  const quickAddCustomer = async (form) => {
    try {
      const created = await upsertCustomer(form);
      await reload(["customers"]);
      return created;
    } catch (e) {
      notifyError("Couldn't add them - check your connection and try again.");
      throw e;
    }
  };

  // Email an invoice: the app composes it, the send-email function holds the
  // key. A 503 means email isn't set up yet, and that message is shown as-is.
  const emailInvoice = async (inv, to, html) => {
    const c = customers.find((x) => x.id === inv.customer_id);
    const short = String(inv.id).replace(/-/g, "").slice(0, 8).toUpperCase();
    await sendEmail({ to, subject: `${settings.gst_registered ? "Tax invoice" : "Invoice"} ${short} from ${BIZ.name}`, html, reply_to: BIZ.email || undefined });
    await markInvoiceSent(inv.id, to);
    await logActivity({ kind: "invoice_sent", summary: `Emailed invoice ${short} to ${c?.name || to}`, actor: "user", customer_id: inv.customer_id, ref_table: "invoices", ref_id: inv.id }).catch(() => {});
    await reload(["invoices", "activity"]);
  };

  // ---- Cross-module handoffs ----
  // A quote passed in here (accepting a quote) pre-fills the resulting
  // job's price/description straight from what was actually quoted, so
  // there's nothing to remember or re-enter before the invoice raises.
  const scheduleForCustomer = (customer, quote, service) => {
    setScheduleDraftCustomer(customer);
    setScheduleDraftQuote(quote || null);
    setScheduleDraftService(service || null);
    setView("schedule");
  };

  // Regular services on a customer
  const saveService = async (s) => {
    await upsertCustomerService(s);
    await reload(["services"]);
  };
  const removeService = async (s) => {
    if (!confirm(`Stop the regular ${s.service.toLowerCase()} for this customer? Past jobs are kept.`)) return;
    await archiveCustomerService(s.id);
    await reload(["services"]);
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
      due_date: addDays(todayStr(), settings.invoice_due_days ?? 14),
    });
    setMoneyTab("invoices");
    setView("money");
  };

  const newLeadCount = leads.filter((l) => l.status === "new").length;

  // Screens see only live rows. The raw arrays - archived included - go to
  // Settings for the tax pack: archiving hides a record from the screen and
  // never from the books.
  const liveCustomers = liveRows(customers);
  const liveJobs = liveRows(jobs);
  const liveQuotes = liveRows(quotes);
  const liveInvoices = liveRows(invoices);
  const liveExpenses = liveRows(expenses);
  const liveTrips = liveRows(trips);

  // Public booking page - this is the default for every path except /team,
  // so the homepage itself is the "just let me book something" experience.
  const pathname = typeof window !== "undefined" ? window.location.pathname.replace(/\/+$/, "") || "/" : "/";
  const isStaffRoute = pathname === STAFF_PATH_PREFIX || pathname.startsWith(`${STAFF_PATH_PREFIX}/`);

  // Before anything else: a build with no database can't sign anyone in or
  // take a booking, so say so plainly rather than rendering a form that will
  // silently fail.
  if (!isConfigured) {
    return <SetupNeeded />;
  }

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
          <img src={logo} alt={BUSINESS.name} className="w-full max-w-[220px] mx-auto rounded-xl shadow-sm mb-6" />
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <SignInForm />
          </div>
        </div>
      </div>
    );
  }

  const backBar = (label) => (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4">
      <button onClick={() => setView("settings")} className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-700"><ArrowLeft size={12} /> Settings</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-0">
      <NavBar view={view} setView={setView} demoMode={demoMode} onEnterDemo={() => toggleDemoMode(true)} onExitDemo={() => toggleDemoMode(false)} enquiryBadge={newLeadCount} />

      {view === "today" && (
        <TodaySimple
          jobs={liveJobs}
          customers={liveCustomers}
          customerNotes={customerNotes}
          activity={activity}
          onUndoActivity={undoActivityItem}
          quotes={liveQuotes}
          renewals={renewals}
          settings={settings}
          todoState={todoState}
          onTodoAction={todoAction}
          onTodoSnooze={snoozeTodo}
          onTodoDismiss={dismissTodo}
          onTodoDone={doneTodo}
          services={services}
          onQuickAddCustomer={quickAddCustomer}
          pendingOffline={pendingOffline}
          photoCounts={photoCounts}
          onPhotoAdded={() => reload(["photoCounts"])}
          checklist={settings.packing_checklist || []}
          typeChecklists={settings.type_checklists || {}}
          onSaveChecklist={(items) => saveMileageSettings({ packing_checklist: items })}
          onComplete={completeJobAndReload}
          onSaveJob={saveJob}
          onReschedule={rescheduleJob}
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
          invoices={liveInvoices}
          leads={leads}
        />
      )}

      {view === "schedule" && (
        <Schedule
          customers={liveCustomers}
          jobs={liveJobs}
          quotes={liveQuotes}
          services={services}
          settings={settings}
          onSave={saveJob}
          onComplete={completeJobAndReload}
          onCancelJob={cancelJob}
          onDelete={removeJob}
          onRaiseInvoice={raiseInvoiceForJob}
          onConvertAndSchedule={convertQuoteToCustomerAndSchedule}
          draftCustomer={scheduleDraftCustomer}
          draftQuote={scheduleDraftQuote}
          draftService={scheduleDraftService}
          onDraftConsumed={() => {
            setScheduleDraftCustomer(null);
            setScheduleDraftQuote(null);
            setScheduleDraftService(null);
          }}
        />
      )}

      {view === "customers" && (
        <Customers
          tab={customersTab}
          onTab={setCustomersTab}
          customers={liveCustomers}
          jobs={liveJobs}
          customerNotes={customerNotes}
          lapsedDays={settings.lapsed_days ?? 180}
          dueSoonDays={settings.due_soon_days ?? 7}
          onSave={saveCustomer}
          onDelete={removeCustomer}
          draft={customerDraft}
          onDraftConsumed={() => setCustomerDraft(null)}
          services={services}
          serviceDefaults={settings.service_defaults || {}}
          onSaveService={saveService}
          onRemoveService={removeService}
          leads={leads}
          onSetLeadStatus={setLeadStatus}
          onDeleteLead={removeLead}
          onConvertLead={convertLeadToCustomer}
          onCreateQuote={createQuoteFromLead}
        />
      )}

      {view === "money" && (
        <Money
          tab={moneyTab}
          onTab={setMoneyTab}
          quotes={liveQuotes}
          invoices={liveInvoices}
          expenses={liveExpenses}
          trips={liveTrips}
          customers={liveCustomers}
          jobs={liveJobs}
          settings={settings}
          allInvoices={invoices}
          allExpenses={expenses}
          allTrips={trips}
          allCustomers={customers}
          onSaveQuote={saveQuote}
          onDeleteQuote={removeQuote}
          onSaveInvoice={saveInvoice}
          onDeleteInvoice={removeInvoice}
          onMarkInvoicePaid={markPaid}
          onEmailInvoice={emailInvoice}
          onSaveExpense={saveExpense}
          onDeleteExpense={removeExpense}
          onSaveTrip={saveTrip}
          onDeleteTrip={removeTrip}
          onCacheCoords={cacheCustomerCoords}
          onOpenSettings={() => setView("settings")}
          onScheduleFromQuote={scheduleForCustomer}
          onConvertQuoteAndSchedule={convertQuoteToCustomerAndSchedule}
          quoteDraft={quoteDraft}
          onQuoteDraftConsumed={() => setQuoteDraft(null)}
          invoiceDraft={invoiceDraft}
          onInvoiceDraftConsumed={() => setInvoiceDraft(null)}
        />
      )}

      {view === "settings" && (
        <Settings
          settings={settings}
          onSave={saveMileageSettings}
          customers={customers}
          invoices={invoices}
          expenses={expenses}
          trips={trips}
          renewals={renewals}
          onSaveRenewal={saveRenewal}
          onDeleteRenewal={removeRenewal}
          onLogout={handleLogout}
          onOpenDev={() => setView("dev")}
          onOpenUsage={() => setView("usage")}
          onOpenPublicPage={() => setView("customerpage")}
          demoMode={demoMode}
          onToggleDemo={toggleDemoMode}
        />
      )}

      {view === "usage" && <UsageTimeline onBack={() => setView("settings")} />}

      {view === "customerpage" && (
        <>
          {backBar()}
          <CustomerPage />
        </>
      )}

      {view === "dev" && (
        <>
          {backBar()}
          <Dev demoMode={demoMode} onToggleDemo={toggleDemoMode} />
        </>
      )}

      {emailDraft && (
        <EmailPreview
          draft={emailDraft.draft}
          smsHref={emailDraft.smsHref}
          onClose={() => setEmailDraft(null)}
          onSent={async () => {
            await doneTodo(emailDraft.item, emailDraft.action);
            setToast({ message: "Sent." });
          }}
        />
      )}
      <FeedbackButton />
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
