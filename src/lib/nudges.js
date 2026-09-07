// HANDOFF 2/4 - the to-do list.
//
// Everything here is derived, never stored: the app already knows who is past
// their due date, whose invoice hasn't been paid and which lead nobody rang
// back. This turns those facts into a short list of things to do, in the order
// a working day would do them.
//
// Two rules keep it a list he'll actually read:
//
//   1. Every suggestion has a stable key derived from what it's about
//      ("rebook:<customer id>"), so tomorrow's identical suggestion is the
//      same item - which is what makes "snooze until Monday" mean anything.
//   2. Nothing a customer would see is on a timer. Items that would send an
//      email are marked `sendable` and go out only once he presses send;
//      everything else is a nudge to pick up the phone himself.
//
// Deliberately capped and deliberately boring. A list of thirty is a list of
// none.

import { todayStr, addDays, daysBetween, nextDueDate, formatDate } from "./dates";

const MAX_ITEMS = 8;

// How overdue something has to be before it's worth mentioning at all - a
// quote sent yesterday isn't being ignored, it's just yesterday's quote.
const LEAD_UNANSWERED_DAYS = 1;
const QUOTE_UNANSWERED_DAYS = 4;
const INVOICE_CHASE_DAYS = 3; // days past due before chasing is fair

const urgencyRank = { now: 0, soon: 1, whenever: 2 };

// A state row hides its item until it stops applying: done for good, or
// snoozed until a given morning.
function hidden(state, today) {
  if (!state) return false;
  if (state.done_at) return true;
  if (state.snoozed_until && state.snoozed_until > today) return true;
  return false;
}

/**
 * The list Tyson sees. Pure - give it the same data twice and it says the
 * same thing twice, which is what makes it testable and what stops the
 * order shuffling under his thumb.
 *
 * @param states  rows from nudge_state, keyed by nudge_key
 */
export function buildNudges({
  customers = [],
  jobs = [],
  invoices = [],
  leads = [],
  quotes = [],
  states = {},
  settings = {},
  today = todayStr(),
} = {}) {
  const out = [];
  const customerById = (id) => customers.find((c) => c.id === id);
  const money = (n) => `$${Number(n || 0).toFixed(2).replace(/\.00$/, "")}`;

  // A customer with a job already on the books needs no rebooking nudge, no
  // matter what their due date says.
  const hasFutureJob = new Set(
    jobs.filter((j) => j.status !== "cancelled" && j.scheduled_date >= today).map((j) => j.customer_id)
  );

  // --- New leads nobody has rung back -------------------------------------
  for (const l of leads) {
    if (l.status !== "new") continue;
    const waiting = daysBetween(l.created_at?.slice(0, 10) || today, today);
    if (waiting < LEAD_UNANSWERED_DAYS) continue;
    out.push({
      key: `lead:${l.id}`,
      kind: "lead",
      urgency: "now",
      title: `Ring ${l.name} back`,
      detail:
        waiting === 1
          ? "Asked for a quote yesterday and hasn't heard anything."
          : `Asked for a quote ${waiting} days ago and hasn't heard anything.`,
      phone: l.phone || null,
      ref: { table: "leads", id: l.id },
      goto: "leads",
    });
  }

  // --- Customers past their due date, with nothing booked -----------------
  for (const c of customers) {
    if (c.status !== "active" || !c.frequency_weeks) continue;
    if (hasFutureJob.has(c.id)) continue;
    const due = nextDueDate(c);
    if (!due || due > today) continue;
    const over = daysBetween(due, today);
    out.push({
      key: `rebook:${c.id}`,
      kind: "rebook",
      urgency: over > 14 ? "now" : "soon",
      title: `Book ${c.name} in again`,
      detail: `Due ${over === 0 ? "today" : `${over} day${over === 1 ? "" : "s"} ago`}${
        c.last_service_date ? ` · last done ${formatDate(c.last_service_date)}` : ""
      }, nothing booked.`,
      phone: c.phone || null,
      customerId: c.id,
      ref: { table: "customers", id: c.id },
      goto: "schedule",
      // The "you're due for another clean" email, but only if he says so.
      sendable: c.email ? { to: c.email, what: `"You're due for another ${settings.serviceWord || "clean"}" email` } : null,
    });
  }

  // --- Invoices that have gone past due -----------------------------------
  for (const inv of invoices) {
    if (inv.status === "paid" || !inv.due_date) continue;
    const late = daysBetween(inv.due_date, today);
    if (late < INVOICE_CHASE_DAYS) continue;
    const c = customerById(inv.customer_id);
    out.push({
      key: `invoice:${inv.id}`,
      kind: "invoice",
      urgency: late > 21 ? "now" : "soon",
      title: `Chase ${c?.name || "an invoice"} for ${money(inv.amount)}`,
      detail: `${late} days past due (${formatDate(inv.due_date)}).`,
      phone: c?.phone || null,
      customerId: inv.customer_id,
      ref: { table: "invoices", id: inv.id },
      goto: "billing",
      sendable: c?.email ? { to: c.email, what: "overdue invoice reminder" } : null,
    });
  }

  // --- Quotes sent and never answered -------------------------------------
  for (const q of quotes) {
    if (q.status !== "sent") continue;
    const waiting = daysBetween(q.created_at?.slice(0, 10) || today, today);
    if (waiting < QUOTE_UNANSWERED_DAYS) continue;
    const name = q.contact_name || customerById(q.customer_id)?.name || "them";
    out.push({
      key: `quote:${q.id}`,
      kind: "quote",
      urgency: "whenever",
      title: `Follow up ${name}'s quote`,
      detail: `${money(q.amount)} sent ${waiting} days ago, no answer either way.`,
      phone: q.contact_phone || customerById(q.customer_id)?.phone || null,
      ref: { table: "quotes", id: q.id },
      goto: "billing",
    });
  }

  // --- Regulars who have quietly stopped ----------------------------------
  const lapsedDays = settings.lapsed_days ?? 180;
  for (const c of customers) {
    if (c.status !== "active" || !c.last_service_date) continue;
    if (hasFutureJob.has(c.id)) continue;
    if (daysBetween(c.last_service_date, today) < lapsedDays) continue;
    // Already covered by a rebooking nudge - don't say it twice.
    if (out.some((n) => n.key === `rebook:${c.id}`)) continue;
    out.push({
      key: `lapsed:${c.id}`,
      kind: "lapsed",
      urgency: "whenever",
      title: `${c.name} hasn't been back`,
      detail: `Last done ${formatDate(c.last_service_date)}. Worth a call to see if they're still keen.`,
      phone: c.phone || null,
      customerId: c.id,
      ref: { table: "customers", id: c.id },
      goto: "customers",
    });
  }

  // Attach whatever he's already decided about each item, drop the ones he's
  // dealt with, and keep the list short enough to read in a driveway.
  return out
    .map((n) => ({ ...n, state: states[n.key] || null }))
    .filter((n) => !hidden(n.state, today))
    .sort((a, b) => urgencyRank[a.urgency] - urgencyRank[b.urgency] || a.title.localeCompare(b.title))
    .slice(0, MAX_ITEMS);
}

// The snooze options, in the words someone would actually use.
export const SNOOZE_CHOICES = [
  { label: "Tomorrow", days: 1 },
  { label: "In 3 days", days: 3 },
  { label: "Next week", days: 7 },
  { label: "In a month", days: 30 },
];

export function snoozeUntil(days, today = todayStr()) {
  return addDays(today, days);
}
