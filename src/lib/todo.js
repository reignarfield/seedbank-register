// The "Needs you" list on Today: everything the app thinks he should do
// about that isn't a job in the van, each with one obvious action and the
// option to snooze it. Derived fresh from live data every time - nothing is
// stored except what he did about an item (see todo_state).
//
// The order is deliberate. Money that's late and a customer expecting him
// tomorrow come first; a one-off customer he hasn't seen in six months comes
// last. Within a kind, the most overdue comes first.

import { todayStr, addDays, daysBetween, formatDate, formatTime, nextDueDate } from "./dates";
import { BUSINESS, cap } from "./business";
import { customersDue, customersLapsed, invoicesOverdue, jobsTomorrow, leadsNew, renewalsUpcoming } from "./today";

const first = (name) => (name || "").trim().split(" ")[0] || "there";
const shortId = (id) => String(id || "").replace(/-/g, "").slice(0, 8).toUpperCase();
const cleanPhone = (p) => (p || "").replace(/[^0-9+]/g, "");

// sms: with a prefilled body. The "?&body=" form is the one both iOS and
// Android honour.
export const smsLink = (phone, body) => (phone ? `sms:${cleanPhone(phone)}?&body=${encodeURIComponent(body)}` : null);
export const telLink = (phone) => (phone ? `tel:${cleanPhone(phone)}` : null);

// What the app would say on his behalf. Shown to him before anything is sent;
// he can change it in the messages app. Plain and short - it's a text.
export const MESSAGES = {
  confirm: (c, job) =>
    `Hi ${first(c.name)}, it's ${BUSINESS.name} - just confirming I'll be round tomorrow${job?.scheduled_time ? ` around ${formatTime(job.scheduled_time)}` : ""} for your ${job?.job_type ? job.job_type.toLowerCase() : BUSINESS.vocab.service}. See you then!`,
  chase: (c, inv) =>
    `Hi ${first(c.name)}, ${BUSINESS.name} here - a friendly reminder that invoice ${shortId(inv.id)} for $${Number(inv.amount).toFixed(2)} was due ${formatDate(inv.due_date)}. Bank transfer or cash is fine. Thanks!`,
  due: (c) =>
    `Hi ${first(c.name)}, it's ${BUSINESS.name} - you're about due for your next ${BUSINESS.vocab.service}. Want me to book you in? Just reply with a day that suits.`,
  reach: (c) =>
    `Hi ${first(c.name)}, ${BUSINESS.name} here - it's been a while since your last ${BUSINESS.vocab.service}. Happy to fit you in if you'd like one - just let me know.`,
  reply: (l) => `Hi ${first(l.name)}, ${BUSINESS.name} here - thanks for getting in touch. When's a good time for a quick chat about what you're after?`,
};

const ORDER = ["chase", "confirm", "book_overdue", "reply", "invoice", "book_quote", "book_soon", "reach", "renewal"];

export function buildTodos({ customers = [], jobs = [], invoices = [], quotes = [], leads = [], renewals = [], settings = {}, state = {}, today = todayStr() }) {
  const byId = new Map(customers.map((c) => [c.id, c]));
  const items = [];
  const scheduledFor = new Set(jobs.filter((j) => j.status === "scheduled" && !j.archived_at && j.scheduled_date >= today).map((j) => j.customer_id));

  // Money that's late
  for (const inv of invoicesOverdue(invoices, today)) {
    const c = byId.get(inv.customer_id);
    if (!c) continue;
    const late = daysBetween(inv.due_date, today);
    items.push({
      key: `chase:${inv.id}`,
      kind: "chase",
      title: `Chase ${c.name}`,
      why: `$${Number(inv.amount).toFixed(2)} · ${late} day${late === 1 ? "" : "s"} overdue`,
      customer: c,
      ref: inv,
      primary: c.phone ? { label: "Text reminder", href: smsLink(c.phone, MESSAGES.chase(c, inv)), logs: `Texted ${c.name} about invoice ${shortId(inv.id)}` } : { label: "View invoice", action: "invoice" },
      secondary: { label: "Mark paid", action: "markPaid" },
      sortKey: -late,
    });
  }

  // Tomorrow's customers
  for (const j of jobsTomorrow(jobs, today)) {
    const c = byId.get(j.customer_id);
    if (!c) continue;
    items.push({
      key: `confirm:${j.id}`,
      kind: "confirm",
      title: `Confirm ${c.name} for tomorrow`,
      why: [j.scheduled_time ? formatTime(j.scheduled_time) : null, j.job_type, c.address].filter(Boolean).join(" · "),
      customer: c,
      ref: j,
      primary: c.phone ? { label: "Text", href: smsLink(c.phone, MESSAGES.confirm(c, j)), logs: `Texted ${c.name} to confirm tomorrow` } : { label: "No phone on file", disabled: true },
      sortKey: 0,
    });
  }

  // Recurring customers due, not yet booked
  for (const { customer: c, status } of customersDue(customers, settings.due_soon_days ?? 7)) {
    if (scheduledFor.has(c.id)) continue;
    const due = nextDueDate(c);
    const overdue = status === "overdue";
    items.push({
      key: `book:${c.id}:${due}`,
      kind: overdue ? "book_overdue" : "book_soon",
      title: `Book ${c.name}`,
      why: `${overdue ? "Was due" : "Due"} ${formatDate(due)} · every ${c.frequency_weeks} weeks`,
      customer: c,
      primary: { label: "Book it", action: "schedule" },
      secondary: c.phone ? { label: "Text first", href: smsLink(c.phone, MESSAGES.due(c)), logs: `Texted ${c.name} about their next ${BUSINESS.vocab.service}` } : null,
      sortKey: daysBetween(today, due),
    });
  }

  // New enquiries
  for (const l of leadsNew(leads)) {
    const age = daysBetween((l.created_at || "").slice(0, 10) || today, today);
    items.push({
      key: `reply:${l.id}`,
      kind: "reply",
      title: `Reply to ${l.name}`,
      why: [l.message ? `“${l.message.slice(0, 60)}${l.message.length > 60 ? "…" : ""}”` : null, l.source && l.source !== "direct" ? `via ${l.source}` : null, age > 0 ? `${age} day${age === 1 ? "" : "s"} ago` : "today"].filter(Boolean).join(" · "),
      ref: l,
      primary: l.phone ? { label: "Call", href: telLink(l.phone), logs: `Called ${l.name} about their enquiry` } : l.email ? { label: "Email", href: `mailto:${l.email}`, logs: `Emailed ${l.name} about their enquiry` } : { label: "Open enquiries", action: "leads" },
      secondary: l.phone ? { label: "Text", href: smsLink(l.phone, MESSAGES.reply(l)), logs: `Texted ${l.name} about their enquiry` } : null,
      sortKey: -age,
    });
  }

  // Completed jobs that never got a price
  for (const j of jobs) {
    if (j.archived_at || j.status !== "completed") continue;
    if (j.price != null && Number(j.price) > 0) continue;
    if (invoices.some((i) => i.job_id === j.id && !i.archived_at)) continue;
    const c = byId.get(j.customer_id);
    if (!c) continue;
    items.push({
      key: `invoice:${j.id}`,
      kind: "invoice",
      title: `Invoice ${c.name}`,
      why: `Done ${formatDate(j.scheduled_date)} with no price set`,
      customer: c,
      ref: j,
      primary: { label: "Invoice it", action: "raiseInvoice" },
      sortKey: daysBetween(j.scheduled_date, today) * -1,
    });
  }

  // Accepted quotes with nothing booked
  for (const q of quotes) {
    if (q.archived_at || q.status !== "accepted") continue;
    if (jobs.some((j) => j.quote_id === q.id && !j.archived_at)) continue;
    const c = q.customer_id ? byId.get(q.customer_id) : null;
    items.push({
      key: `bookquote:${q.id}`,
      kind: "book_quote",
      title: `Book ${c?.name || q.contact_name || "the accepted quote"}`,
      why: `$${Number(q.amount).toFixed(2)} accepted${q.description ? ` · ${q.description.slice(0, 50)}` : ""}`,
      customer: c,
      ref: q,
      primary: { label: "Book it", action: c ? "scheduleQuote" : "convertQuote" },
      sortKey: 0,
    });
  }

  // One-offs not seen in a while
  for (const c of customersLapsed(customers, settings.lapsed_days ?? 180, today)) {
    const months = Math.round(daysBetween(c.last_service_date, today) / 30);
    items.push({
      key: `reach:${c.id}:${c.last_service_date}`,
      kind: "reach",
      title: `Call ${c.name}`,
      why: `Last ${BUSINESS.vocab.service} ${months} months ago · one-off`,
      customer: c,
      primary: c.phone ? { label: "Call", href: telLink(c.phone), logs: `Called ${c.name} to see if they want another ${BUSINESS.vocab.service}` } : { label: "No phone on file", disabled: true },
      secondary: c.phone ? { label: "Text", href: smsLink(c.phone, MESSAGES.reach(c)), logs: `Texted ${c.name} to see if they want another ${BUSINESS.vocab.service}` } : null,
      sortKey: -months,
    });
  }

  // Renewals
  for (const r of renewalsUpcoming(renewals, settings.renewal_lead_days ?? 30, today)) {
    const d = daysBetween(today, r.due_date);
    items.push({
      key: `renewal:${r.id}:${r.due_date}`,
      kind: "renewal",
      title: `Renew ${r.name}`,
      why: d < 0 ? `Was due ${formatDate(r.due_date)}` : d === 0 ? "Due today" : `Due ${formatDate(r.due_date)} · ${d} days`,
      ref: r,
      primary: { label: "Done", action: "renewalDone" },
      sortKey: d,
    });
  }

  // Apply what he's already done about things
  const visible = items.filter((it) => {
    const s = state[it.key];
    if (!s) return true;
    if (s.dismissed_at) return false;
    if (s.snoozed_until && s.snoozed_until >= today) return false;
    return true;
  });

  return visible.sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind) || a.sortKey - b.sortKey);
}

// Snooze options - the same short list every time so it becomes muscle memory.
export const SNOOZE = [
  { label: "Tomorrow", days: 1 },
  { label: "3 days", days: 3 },
  { label: "Next week", days: 7 },
  { label: "A month", days: 30 },
];

export function snoozeUntil(days, today = todayStr()) {
  return addDays(today, days);
}

export { cap };
