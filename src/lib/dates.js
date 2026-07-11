// Date helpers used across the app. Dates are stored/handled as "YYYY-MM-DD"
// strings (matching Postgres `date` columns) to avoid timezone drift.

export function todayStr() {
  return toDateStr(new Date());
}

export function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateStr(s) {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(dateStr, days) {
  const d = parseDateStr(dateStr);
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

export function addWeeks(dateStr, weeks) {
  return addDays(dateStr, weeks * 7);
}

export function daysBetween(fromStr, toStr) {
  const from = parseDateStr(fromStr);
  const to = parseDateStr(toStr);
  return Math.round((to - from) / 86400000);
}

export function formatDate(dateStr, opts = { day: "numeric", month: "short", year: "numeric" }) {
  if (!dateStr) return "—";
  return parseDateStr(dateStr).toLocaleDateString("en-AU", opts);
}

export function formatDateLong(dateStr) {
  return formatDate(dateStr, { day: "numeric", month: "long", year: "numeric" });
}

// The Australian financial year runs 1 July - 30 June. Returns the "YYYY-MM-DD"
// of the 1 July that starts the FY containing `dateStr` (defaults to today).
export function financialYearStart(dateStr = todayStr()) {
  const d = parseDateStr(dateStr);
  const year = d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1; // month 6 = July
  return `${year}-07-01`;
}

// A short label for the FY containing `dateStr`, e.g. "2026-27".
export function financialYearLabel(dateStr = todayStr()) {
  const start = financialYearStart(dateStr);
  const startYear = Number(start.slice(0, 4));
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

// Next due date for a recurring customer, derived from last_service_date +
// frequency_weeks. Returns null if the customer isn't on a recurring plan or
// has never been serviced yet.
export function nextDueDate(customer) {
  if (!customer.frequency_weeks || !customer.last_service_date) return null;
  return addWeeks(customer.last_service_date, customer.frequency_weeks);
}

// "overdue" | "due_soon" | "scheduled" | null (not due yet / not recurring)
export function dueStatus(customer, { soonDays = 7 } = {}) {
  const due = nextDueDate(customer);
  if (!due) return null;
  const diff = daysBetween(todayStr(), due);
  if (diff < 0) return "overdue";
  if (diff <= soonDays) return "due_soon";
  return "scheduled";
}
