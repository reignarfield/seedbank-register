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
export const passkeysSupported = (...a) => real.passkeysSupported(...a);
export const signInWithPasskey = (...a) => real.signInWithPasskey(...a);
export const registerPasskey = (...a) => real.registerPasskey(...a);
export const listPasskeys = (...a) => real.listPasskeys(...a);
export const deletePasskey = (...a) => real.deletePasskey(...a);

// The public page's words, and email - both always real.
export const fetchPublicProfile = (...a) => real.fetchPublicProfile(...a);
export const sendEmail = (...a) => real.sendEmail(...a);
export const savePushSubscription = (...a) => real.savePushSubscription(...a);
export const removePushSubscription = (...a) => real.removePushSubscription(...a);

// Public booking form - a real enquiry from a real visitor, always real.
export const submitPublicLead = (...a) => real.submitPublicLead(...a);

// Usage tracking and suggestions - about the person, not the data set, so
// they go to the real database even while demo data is on screen.
export const insertUsageEvents = (...a) => real.insertUsageEvents(...a);
export const fetchUsageEvents = (...a) => real.fetchUsageEvents(...a);
export const submitFeedback = (...a) => real.submitFeedback(...a);
export const fetchFeedback = (...a) => real.fetchFeedback(...a);

// ---------------------------------------------------------------------------
// Business data - real or demo
// ---------------------------------------------------------------------------
export const fetchCustomers = (...a) => impl().fetchCustomers(...a);
export const upsertCustomer = (...a) => impl().upsertCustomer(...a);
export const archiveCustomer = (...a) => impl().archiveCustomer(...a);
export const saveCustomerCoords = (...a) => impl().saveCustomerCoords(...a);

export const fetchJobs = (...a) => impl().fetchJobs(...a);
export const upsertJob = (...a) => impl().upsertJob(...a);
export const archiveJob = (...a) => impl().archiveJob(...a);
export const completeJob = (...a) => impl().completeJob(...a);

export const logAutoTrip = (...a) => impl().logAutoTrip(...a);
export const logHeadingHome = (...a) => impl().logHeadingHome(...a);
export const fetchTrips = (...a) => impl().fetchTrips(...a);
export const upsertTrip = (...a) => impl().upsertTrip(...a);
export const archiveTrip = (...a) => impl().archiveTrip(...a);

export const fetchQuotes = (...a) => impl().fetchQuotes(...a);
export const upsertQuote = (...a) => impl().upsertQuote(...a);
export const archiveQuote = (...a) => impl().archiveQuote(...a);

export const fetchInvoices = (...a) => impl().fetchInvoices(...a);
export const upsertInvoice = (...a) => impl().upsertInvoice(...a);
export const archiveInvoice = (...a) => impl().archiveInvoice(...a);
export const markInvoicePaid = (...a) => impl().markInvoicePaid(...a);
export const markInvoiceSent = (...a) => impl().markInvoiceSent(...a);

export const fetchLeads = (...a) => impl().fetchLeads(...a);
export const upsertLead = (...a) => impl().upsertLead(...a);
export const deleteLead = (...a) => impl().deleteLead(...a);

export const fetchExpenses = (...a) => impl().fetchExpenses(...a);
export const upsertExpense = (...a) => impl().upsertExpense(...a);
export const archiveExpense = (...a) => impl().archiveExpense(...a);

export const fetchRenewals = (...a) => impl().fetchRenewals(...a);
export const upsertRenewal = (...a) => impl().upsertRenewal(...a);
export const deleteRenewal = (...a) => impl().deleteRenewal(...a);

export const fetchSettings = (...a) => impl().fetchSettings(...a);
export const saveSettings = (...a) => impl().saveSettings(...a);

export const fetchCustomerNotes = (...a) => impl().fetchCustomerNotes(...a);

export const fetchTodoState = (...a) => impl().fetchTodoState(...a);
export const setTodoState = (...a) => impl().setTodoState(...a);
export const addCustomerNote = (...a) => impl().addCustomerNote(...a);

export const fetchActivity = (...a) => impl().fetchActivity(...a);
export const logActivity = (...a) => impl().logActivity(...a);
export const undoActivity = (...a) => impl().undoActivity(...a);

export const uploadReceipt = (...a) => impl().uploadReceipt(...a);
export const uploadJobPhoto = (...a) => impl().uploadJobPhoto(...a);
export const fetchJobPhotos = (...a) => impl().fetchJobPhotos(...a);
export const fetchPhotoCounts = (...a) => impl().fetchPhotoCounts(...a);
export const photoUrl = (...a) => impl().photoUrl(...a);
export const receiptUrl = (...a) => impl().receiptUrl(...a);

export { resetDemoData } from "./demoApi";
