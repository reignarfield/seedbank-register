import React, { useState } from "react";
import { Sparkles, FolderKanban } from "lucide-react";
import { Card, EmptyState } from "./ui";

// Newest first. No dates on purpose - these were written up after the fact
// rather than timestamped as they shipped; add a date once entries are
// logged as they happen.
const CHANGELOG = [
  { title: "One-page booking flow", detail: "Pricing is now built into the booking page itself as collapsible categories - tick anything you want quoted, see a running summary, then your details at the bottom." },
  { title: "Password reset", detail: "\"Forgot password?\" on the sign-in screen - no more being locked out with nobody able to get back in." },
  { title: "Workflow continuity fixes", detail: "An accepted quote from a lead (not yet a customer) now has an \"Add & schedule\" action instead of a dead end. Completing a job with no price now asks for one instead of silently skipping the invoice." },
  { title: "Real branding", detail: "Swapped the placeholder name/icon for the actual Tydie Cleaning logo and brand blue, everywhere in the app." },
  { title: "Customer Page tab", detail: "Staff-only tab that embeds the live public site, so it's easy to see exactly what a customer sees without leaving the app." },
  { title: "Public pricing page", detail: "A simplified, grouped price list (window cleaning, pressure cleaning, solar, car cleaning, house/office cleaning, bond cleans, add-ons) alongside the booking form." },
  { title: "Split the site into a public booking page and a staff area", detail: "The homepage is now the booking page for anyone; staff sign in at /team instead of hitting a sign-in wall on the homepage." },
  { title: "Dev tab", detail: "This tab - a changelog, and a reserved spot for other projects." },
  { title: "Automatic invoicing on job completion", detail: "Completing a job with a price now raises its invoice automatically instead of needing a separate step." },
  { title: "Job-day confirmations and review requests", detail: "Automatic email the day before a booked job, and a review-request email the day after a completed one (once a Google review link is configured)." },
  { title: "Lead source tracking", detail: "The public quote page now records which link a booking came from (e.g. ?src=google), shown as a badge in the Leads inbox." },
  { title: "Owner digest includes new leads", detail: "The daily automated email now lists new leads alongside due-soon customers and overdue invoices, so nothing sits unseen over a weekend." },
  { title: "Accessibility pass on the public quote page", detail: "Bigger text and touch targets, a tap-to-call button, and copy clarifying only a name plus one contact method is required." },
  { title: "Automated reminders", detail: "A scheduled function emails customers who are due for a clean and customers with an overdue invoice." },
  { title: "Public quote-request page and Leads inbox", detail: "Anyone can request a quote without an account; requests land in a Leads inbox to triage, quote, or convert to a customer." },
  { title: "Quotes and invoicing", detail: "Draft/sent/accepted/declined quotes; unpaid/paid invoices with automatic overdue highlighting." },
  { title: "Recurring job scheduling", detail: "Customers get a cleaning frequency; completing a job automatically rolls their next-due date forward." },
  { title: "Customer records with access notes", detail: "Contact info, address, and notes like gate codes or pets in one place." },
  { title: "Rebuilt from the old Seedbank Register", detail: "This app started life as an unrelated seed-inventory tracker and was completely replaced with the window-cleaning job manager." },
];

export default function Dev() {
  const [tab, setTab] = useState("changelog");

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-slate-900">Dev</h1>
        <p className="text-sm text-slate-500 mt-1">What's been built, and a reserved spot for other projects.</p>
      </div>

      <div className="flex items-center gap-1 bg-slate-100 rounded-full p-1 mb-5 w-fit">
        <button
          onClick={() => setTab("changelog")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${tab === "changelog" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-blue-700"}`}
        >
          Changelog
        </button>
        <button
          onClick={() => setTab("projects")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${tab === "projects" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-blue-700"}`}
        >
          Projects
        </button>
      </div>

      {tab === "changelog" ? (
        <div className="space-y-2">
          {CHANGELOG.map((entry, i) => (
            <Card key={i} className="px-4 py-3 flex items-start gap-3">
              <Sparkles size={15} className="text-blue-500 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-900">{entry.title}</div>
                <div className="text-xs text-slate-500 mt-0.5">{entry.detail}</div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FolderKanban}
          title="Nothing here yet."
          subtitle="Reserved for future personal projects to fold into this app."
        />
      )}
    </div>
  );
}
