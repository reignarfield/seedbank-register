// One definition of "today", "overdue", "tomorrow" and "this week", shared by
// every screen that shows them. These used to be computed three slightly
// different ways in three components; when the meaning of "overdue" changes -
// and it will, the first time someone says "that's not overdue, I moved it" -
// it changes here and every screen agrees.
//
// Archived rows are excluded everywhere. Archiving is how records leave the
// screen without leaving the books.

import { todayStr, addDays, daysBetween, dueStatus } from "./dates";

const live = (row) => !row.archived_at;
const open = (job) => live(job) && job.status === "scheduled";

// Today's open jobs in route order; jobs never reordered sort last, in the
// order they arrived.
export function jobsToday(jobs, today = todayStr()) {
  return jobs
    .filter((j) => open(j) && j.scheduled_date === today)
    .sort((a, b) => (a.route_order ?? Number.MAX_SAFE_INTEGER) - (b.route_order ?? Number.MAX_SAFE_INTEGER));
}

// Scheduled for a day that has passed and never marked done - oldest first.
export function jobsOverdue(jobs, today = todayStr()) {
  return jobs
    .filter((j) => open(j) && j.scheduled_date < today)
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
}

export function jobsTomorrow(jobs, today = todayStr()) {
  const tomorrow = addDays(today, 1);
  return jobs.filter((j) => open(j) && j.scheduled_date === tomorrow);
}

// From today through `days` ahead, inclusive.
export function jobsUpcoming(jobs, days = 7, today = todayStr()) {
  return jobs
    .filter((j) => {
      if (!open(j)) return false;
      const d = daysBetween(today, j.scheduled_date);
      return d >= 0 && d <= days;
    })
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
}

// Finished today, whichever day they were booked for - an overdue job done
// today still counts as today's work.
export function jobsCompletedToday(jobs, today = todayStr()) {
  return jobs.filter((j) => live(j) && j.status === "completed" && (j.completed_at || "").slice(0, 10) === today);
}

export function invoicesOverdue(invoices, today = todayStr()) {
  return invoices
    .filter((i) => live(i) && i.status === "unpaid" && i.due_date < today)
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
}

export function invoicesUnpaid(invoices) {
  return invoices.filter((i) => live(i) && i.status === "unpaid");
}

export function leadsNew(leads) {
  return leads.filter((l) => l.status === "new");
}

// Recurring customers whose next visit is due or overdue. `dueSoonDays` is
// Tyson's setting for how far ahead counts as "soon".
export function customersDue(customers, dueSoonDays = 7) {
  return customers
    .filter((c) => live(c) && c.status === "active")
    .map((c) => ({ customer: c, status: dueStatus(c, { soonDays: dueSoonDays }) }))
    .filter((x) => x.status === "overdue" || x.status === "due_soon")
    .sort((a, b) => (a.status === b.status ? 0 : a.status === "overdue" ? -1 : 1));
}

// One-off customers the due-date system never resurfaces, not seen in a
// while - worth a call. `lapsedDays` is Tyson's setting.
export function customersLapsed(customers, lapsedDays = 180, today = todayStr()) {
  return customers
    .filter((c) => live(c) && c.status === "active" && !c.frequency_weeks && c.last_service_date && daysBetween(c.last_service_date, today) >= lapsedDays)
    .sort((a, b) => a.last_service_date.localeCompare(b.last_service_date));
}

export function renewalsUpcoming(renewals, leadDays = 30, today = todayStr()) {
  return [...renewals]
    .filter((r) => daysBetween(today, r.due_date) <= leadDays)
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
}

export function liveRows(rows) {
  return rows.filter(live);
}
