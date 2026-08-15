// The single entry point every screen imports from. Auth always talks to real
// Supabase - demo mode must never become a way past the login. Everything
// below auth is dispatched to either the real database or the in-memory demo
// set, decided fresh on each call so flipping the toggle takes effect
// immediately without a reload.

import * as real from "./supabaseApi";
import * as demo from "./demoApi";
import { isDemoMode } from "./dataMode";

const impl = () => (isDemoMode() ? demo : real);

// ---------------------------------------------------------------------------
// Auth - always real, never demo
// ---------------------------------------------------------------------------
export const getSession = (...a) => real.getSession(...a);
export const onAuthChange = (...a) => real.onAuthChange(...a);
export const signIn = (...a) => real.signIn(...a);
export const signOut = (...a) => real.signOut(...a);
export const requestPasswordReset = (...a) => real.requestPasswordReset(...a);
export const updatePassword = (...a) => real.updatePassword(...a);

// Public booking form - a real enquiry from a real visitor, always real.
export const submitPublicLead = (...a) => real.submitPublicLead(...a);

// ---------------------------------------------------------------------------
// Business data - real or demo
// ---------------------------------------------------------------------------
export const fetchCustomers = (...a) => impl().fetchCustomers(...a);
export const upsertCustomer = (...a) => impl().upsertCustomer(...a);
export const deleteCustomer = (...a) => impl().deleteCustomer(...a);
export const saveCustomerCoords = (...a) => impl().saveCustomerCoords(...a);

export const fetchJobs = (...a) => impl().fetchJobs(...a);
export const upsertJob = (...a) => impl().upsertJob(...a);
export const deleteJob = (...a) => impl().deleteJob(...a);
export const completeJob = (...a) => impl().completeJob(...a);

export const logAutoTrip = (...a) => impl().logAutoTrip(...a);
export const logHeadingHome = (...a) => impl().logHeadingHome(...a);
export const fetchTrips = (...a) => impl().fetchTrips(...a);
export const upsertTrip = (...a) => impl().upsertTrip(...a);
export const deleteTrip = (...a) => impl().deleteTrip(...a);

export const fetchQuotes = (...a) => impl().fetchQuotes(...a);
export const upsertQuote = (...a) => impl().upsertQuote(...a);
export const deleteQuote = (...a) => impl().deleteQuote(...a);

export const fetchInvoices = (...a) => impl().fetchInvoices(...a);
export const upsertInvoice = (...a) => impl().upsertInvoice(...a);
export const deleteInvoice = (...a) => impl().deleteInvoice(...a);
export const markInvoicePaid = (...a) => impl().markInvoicePaid(...a);

export const fetchLeads = (...a) => impl().fetchLeads(...a);
export const upsertLead = (...a) => impl().upsertLead(...a);
export const deleteLead = (...a) => impl().deleteLead(...a);

export const fetchExpenses = (...a) => impl().fetchExpenses(...a);
export const upsertExpense = (...a) => impl().upsertExpense(...a);
export const deleteExpense = (...a) => impl().deleteExpense(...a);

export const fetchRenewals = (...a) => impl().fetchRenewals(...a);
export const upsertRenewal = (...a) => impl().upsertRenewal(...a);
export const deleteRenewal = (...a) => impl().deleteRenewal(...a);

export const fetchSettings = (...a) => impl().fetchSettings(...a);
export const saveSettings = (...a) => impl().saveSettings(...a);

export const fetchCustomerNotes = (...a) => impl().fetchCustomerNotes(...a);
export const addCustomerNote = (...a) => impl().addCustomerNote(...a);

export { resetDemoData } from "./demoApi";
