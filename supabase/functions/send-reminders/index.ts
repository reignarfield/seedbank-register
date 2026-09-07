// Supabase Edge Function: send-reminders
//
// Runs on a schedule (see supabase/functions/send-reminders/README.md for
// cron setup). Each run:
//   1. Finds active, recurring customers whose next clean is due soon or
//      overdue, and emails them a "you're due" reminder (drives rebooking).
//   2. Finds unpaid invoices past their due date and emails the customer
//      a payment reminder.
//   3. Emails customers the day before a booked job to confirm it's happening.
//   4. Emails customers a day after a completed job asking for a review
//      (only if REVIEW_LINK_URL is set).
//   5. Emails the business owner a daily digest - new leads, customers due
//      for a clean, and overdue invoices - so nothing needs checking inside
//      the app, and nobody who requests a quote on a Sunday gets missed.
//
// A row is written to reminder_log for every email sent, and re-sends are
// suppressed for a cooldown window (see the *_RESEND_DAYS constants) so the
// same customer isn't emailed every single day.
//
// Required secrets (set with `supabase secrets set NAME=value`):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  - auto-provided by Supabase
//   RESEND_API_KEY                           - from resend.com
//   FROM_EMAIL                               - verified sender, e.g. "Tydie Cleaning <jobs@yourdomain.com>"
//   OWNER_EMAIL                              - where the daily digest goes
//   BUSINESS_NAME                            - optional, defaults to "Tydie Cleaning"
//   REVIEW_LINK_URL                          - optional, your Google Business review link;
//                                               review-request emails are skipped without it

import { createClient } from "npm:@supabase/supabase-js@2";

const DUE_SOON_LEAD_DAYS = 3; // start reminding this many days before the clean is due
const DUE_SOON_RESEND_DAYS = 21; // don't re-email the same customer more often than this
const INVOICE_OVERDUE_RESEND_DAYS = 5;
const NEVER_REPEAT_DAYS = 400; // for once-per-job emails (confirmation, review request)
const DEFAULT_RENEWAL_LEAD_DAYS = 30; // overridden by settings.renewal_lead_days

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY");
const fromEmail = Deno.env.get("FROM_EMAIL");
const ownerEmail = Deno.env.get("OWNER_EMAIL");
const businessName = Deno.env.get("BUSINESS_NAME") || "Tydie Cleaning";
const reviewLinkUrl = Deno.env.get("REVIEW_LINK_URL");

const supabase = createClient(supabaseUrl, serviceRoleKey);

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(fromStr: string, toStr: string) {
  const from = new Date(fromStr + "T00:00:00");
  const to = new Date(toStr + "T00:00:00");
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!resendApiKey || !fromEmail) {
    console.log(`[skip - no RESEND_API_KEY/FROM_EMAIL configured] would email ${to}: ${subject}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: fromEmail, to, subject, html }),
  });
  if (!res.ok) {
    console.error(`Resend error for ${to}:`, await res.text());
  }
}

// Has a reminder of this type/ref already been sent within the cooldown window?
async function recentlySent(type: string, refId: string, withinDays: number) {
  const since = addDays(todayStr(), -withinDays);
  const { data, error } = await supabase
    .from("reminder_log")
    .select("id")
    .eq("type", type)
    .eq("ref_id", refId)
    .gte("sent_at", since)
    .limit(1);
  if (error) throw error;
  return (data || []).length > 0;
}

async function logSent(type: string, refId: string) {
  const { error } = await supabase.from("reminder_log").insert({ type, ref_id: refId });
  if (error) console.error("Failed to log reminder:", error.message);
}

Deno.serve(async () => {
  const today = todayStr();
  const results = {
    dueSoonEmailed: 0,
    overdueInvoiceEmailed: 0,
    jobConfirmationEmailed: 0,
    reviewRequestEmailed: 0,
    newLeadsInDigest: 0,
    renewalsInDigest: 0,
    digestSent: false,
    errors: [] as string[],
  };

  try {
    // ---- 0. What's switched on ----
    // Each kind of email is off until the owner has seen it and turned it on
    // in Settings. Nothing customer-facing goes out on a default. The owner
    // digest is the one exception, on unless switched off.
    const { data: settingsRow } = await supabase.from("settings").select("reminders, renewal_lead_days").eq("id", true).maybeSingle();
    const on = {
      owner_digest: true,
      due_soon: false,
      invoice_overdue: false,
      job_confirmation: false,
      review_request: false,
      ...(settingsRow?.reminders || {}),
    };
    const RENEWAL_LEAD_DAYS = settingsRow?.renewal_lead_days ?? DEFAULT_RENEWAL_LEAD_DAYS;

    // ---- 1. Customers due for their next clean ----
    const { data: customers, error: custError } = await supabase
      .from("customers")
      .select("id, name, email, frequency_weeks, last_service_date, status")
      .eq("status", "active")
      .is("archived_at", null)
      .not("frequency_weeks", "is", null)
      .not("last_service_date", "is", null);
    if (custError) throw custError;

    const dueSoonList: { name: string; nextDue: string }[] = [];

    for (const c of customers || []) {
      const nextDue = addDays(c.last_service_date, c.frequency_weeks * 7);
      const daysUntil = daysBetween(today, nextDue);
      if (daysUntil > DUE_SOON_LEAD_DAYS) continue; // not due soon yet

      dueSoonList.push({ name: c.name, nextDue });
      if (!on.due_soon) continue; // counted for the digest, not emailed

      if (!c.email) continue; // nothing to send, but still counted in the owner digest
      if (await recentlySent("due_soon", c.id, DUE_SOON_RESEND_DAYS)) continue;

      const phrase = daysUntil < 0 ? "was due" : daysUntil === 0 ? "is due today" : `is coming up on ${nextDue}`;
      await sendEmail(
        c.email,
        `${businessName} - your next window clean ${daysUntil < 0 ? "" : ""}`,
        `<p>Hi ${c.name.split(" ")[0]},</p>
         <p>Your next window clean ${phrase}. Reply to this email or give us a call to lock in a time.</p>
         <p>Thanks,<br/>${businessName}</p>`
      );
      await logSent("due_soon", c.id);
      results.dueSoonEmailed++;
    }

    // ---- 2. Overdue invoices ----
    const { data: invoices, error: invError } = await supabase
      .from("invoices")
      .select("id, amount, due_date, customer_id, customers(name, email)")
      .eq("status", "unpaid")
      .is("archived_at", null)
      .lt("due_date", today);
    if (invError) throw invError;

    const overdueList: { name: string; amount: number; dueDate: string }[] = [];

    for (const inv of invoices || []) {
      const customer = Array.isArray(inv.customers) ? inv.customers[0] : inv.customers;
      overdueList.push({ name: customer?.name || "Unknown", amount: inv.amount, dueDate: inv.due_date });

      if (!on.invoice_overdue) continue; // counted for the digest, not emailed
      if (!customer?.email) continue;
      if (await recentlySent("invoice_overdue", inv.id, INVOICE_OVERDUE_RESEND_DAYS)) continue;

      await sendEmail(
        customer.email,
        `${businessName} - overdue invoice reminder`,
        `<p>Hi ${customer.name.split(" ")[0]},</p>
         <p>Just a friendly reminder that an invoice for $${Number(inv.amount).toFixed(2)} was due on ${inv.due_date} and is still unpaid.</p>
         <p>If you've already paid, please disregard this message. Otherwise, let us know if you have any questions.</p>
         <p>Thanks,<br/>${businessName}</p>`
      );
      await logSent("invoice_overdue", inv.id);
      results.overdueInvoiceEmailed++;
    }

    // ---- 3. Job-day confirmations (email the day before a scheduled job) ----
    const tomorrow = addDays(today, 1);
    const { data: upcomingJobs, error: jobError } = await supabase
      .from("jobs")
      .select("id, scheduled_date, customer_id, customers(name, email)")
      .eq("status", "scheduled")
      .is("archived_at", null)
      .eq("scheduled_date", tomorrow);
    if (jobError) throw jobError;

    for (const j of on.job_confirmation ? upcomingJobs || [] : []) {
      const customer = Array.isArray(j.customers) ? j.customers[0] : j.customers;
      if (!customer?.email) continue;
      if (await recentlySent("job_confirmation", j.id, NEVER_REPEAT_DAYS)) continue;

      await sendEmail(
        customer.email,
        `${businessName} - we'll see you tomorrow`,
        `<p>Hi ${customer.name.split(" ")[0]},</p>
         <p>Just confirming your window clean is booked for tomorrow, ${tomorrow}. No need to do anything - we'll see you then.</p>
         <p>If that no longer works, reply to this email or give us a call to reschedule.</p>
         <p>Thanks,<br/>${businessName}</p>`
      );
      await logSent("job_confirmation", j.id);
      results.jobConfirmationEmailed++;
    }

    // ---- 4. Review requests (a day after a job is completed) ----
    if (reviewLinkUrl) {
      const yesterday = addDays(today, -1);
      const { data: recentlyCompleted, error: reviewJobError } = await supabase
        .from("jobs")
        .select("id, completed_at, customer_id, customers(name, email)")
        .eq("status", "completed")
        .is("archived_at", null)
        .gte("completed_at", `${yesterday}T00:00:00`)
        .lt("completed_at", `${today}T00:00:00`);
      if (reviewJobError) throw reviewJobError;

      for (const j of on.review_request ? recentlyCompleted || [] : []) {
        const customer = Array.isArray(j.customers) ? j.customers[0] : j.customers;
        if (!customer?.email) continue;
        if (await recentlySent("review_request", j.id, NEVER_REPEAT_DAYS)) continue;

        await sendEmail(
          customer.email,
          `${businessName} - how did we do?`,
          `<p>Hi ${customer.name.split(" ")[0]},</p>
           <p>Thanks for having us out! If you have a minute, a quick review would mean a lot to us:</p>
           <p><a href="${reviewLinkUrl}">${reviewLinkUrl}</a></p>
           <p>Thanks,<br/>${businessName}</p>`
        );
        await logSent("review_request", j.id);
        results.reviewRequestEmailed++;
      }
    }

    // ---- 5. New leads (so a Sunday request isn't invisible until he opens the app) ----
    const { data: newLeads, error: leadError } = await supabase
      .from("leads")
      .select("id, name, phone, email, address, message, created_at")
      .eq("status", "new")
      .order("created_at", { ascending: true });
    if (leadError) throw leadError;

    results.newLeadsInDigest = (newLeads || []).length;

    // ---- 5b. Upcoming/overdue renewals (insurance, licences) - owner-only, no per-item dedupe ----
    const { data: renewals, error: renewalError } = await supabase
      .from("renewals")
      .select("id, name, due_date")
      .lte("due_date", addDays(today, RENEWAL_LEAD_DAYS))
      .order("due_date", { ascending: true });
    if (renewalError) throw renewalError;
    results.renewalsInDigest = (renewals || []).length;

    // ---- 6. Owner digest ----
    if (on.owner_digest && ownerEmail && (dueSoonList.length > 0 || overdueList.length > 0 || (newLeads || []).length > 0 || (renewals || []).length > 0)) {
      const leadRows = (newLeads || [])
        .map((l) => `<li><strong>${l.name}</strong> — ${[l.phone, l.email].filter(Boolean).join(" / ") || "no contact info"}${l.address ? ` — ${l.address}` : ""}${l.message ? `<br/><em>${l.message}</em>` : ""}</li>`)
        .join("");
      const dueSoonRows = dueSoonList.map((d) => `<li>${d.name} — next clean ${d.nextDue}</li>`).join("");
      const overdueRows = overdueList.map((o) => `<li>${o.name} — $${Number(o.amount).toFixed(2)} due ${o.dueDate}</li>`).join("");
      const renewalRows = (renewals || [])
        .map((r) => `<li>${r.name} — ${r.due_date < today ? "was due" : "due"} ${r.due_date}</li>`)
        .join("");
      await sendEmail(
        ownerEmail,
        `${businessName} daily digest: ${(newLeads || []).length} new leads, ${dueSoonList.length} due, ${overdueList.length} overdue invoices`,
        `<p>New leads waiting (open the app's Leads tab to quote or convert):</p><ul>${leadRows || "<li>None</li>"}</ul>
         <p>Customers due for a clean:</p><ul>${dueSoonRows || "<li>None</li>"}</ul>
         <p>Overdue invoices:</p><ul>${overdueRows || "<li>None</li>"}</ul>
         <p>Renewals coming up:</p><ul>${renewalRows || "<li>None</li>"}</ul>`
      );
      results.digestSent = true;
    }
  } catch (e) {
    console.error(e);
    results.errors.push(String(e?.message || e));
  }

  return new Response(JSON.stringify(results), { headers: { "Content-Type": "application/json" } });
});
