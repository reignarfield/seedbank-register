import React, { useState } from "react";
import { Sparkles, FolderKanban, FlaskConical, Database } from "lucide-react";
import { Card, EmptyState, Button } from "./ui";
import DayInTheLife from "./DayInTheLife";

// Newest first. No dates on purpose - these were written up after the fact
// rather than timestamped as they shipped; add a date once entries are
// logged as they happen.
const CHANGELOG = [
  { title: "One app, five tabs", detail: "The Simple/Advanced split is gone. Today is the first of five tabs along the bottom of the screen (Today, Schedule, Customers, Money, Settings), where a thumb reaches. Dashboard folded into Money's numbers and Schedule's \"Needs booking\"; Leads became the Enquiries segment under Customers; Mileage became the Km segment under Money. Every list row now has one labelled action - the rest is inside the record. Sign out is the last row of Settings." },
  { title: "Needs you, per-login tracking, a glance at the building", detail: "Today gained a short list of suggested actions with one obvious button each and a four-choice snooze - the app writes the text, he taps send. Usage events record which login. An address can be looked up for building type and storeys, with satellite and Street View links." },
  { title: "Tracking, feedback and a timeline", detail: "Every screen and tap is logged to the app's own database; a corner button takes suggestions; Settings has a timeline of what actually gets used." },
  { title: "Archive not delete, Settings, activity feed with undo, receipts, tax pack", detail: "Nothing is deleted any more - records leave the screen, never the books. Tyson's numbers moved into one Settings screen. Every automatic action is logged and undoable. Expenses take a receipt photo; invoices print with the ABN and the right GST wording; a tax pack exports a year as CSVs." },
  { title: "Six fixes from a flaw review, imagining a distracted, tech-wary user", detail: "Failed saves now show a visible message instead of silently doing nothing, especially on Today which had no error surface at all. Today itself is a bit lighter (merged nudges, smaller secondary buttons). \"Can't do it today\" and \"Paid on the spot\" are easier to spot, reorder arrows read as a real control. Add note and New job now confirm before discarding typed text on a stray tap. Checklist ticks survive an accidental reload. And a completed job that skipped its price now gets a \"No invoice raised\" flag with a one-tap way to invoice it later, in Schedule." },
  { title: "Quote carry-through, weather, day start/end, and a Journey tab", detail: "Scheduling a job from an accepted quote now carries the price and description straight across, so the invoice matches what was actually quoted with nothing to remember. Today shows a rain heads-up (free forecast, no key) and a one-tap \"Start my day\"/end-of-day recap bookending the day itself, not just the jobs. Also added a Journey tab here in Dev - a written walkthrough of a realistic day, kept honest about the gaps it still finds." },
  { title: "Reschedule, quick add, chained mileage, notes, paid-on-spot", detail: "\"Can't do it today\" reschedules or cancels a job in one tap instead of leaving it to quietly go overdue. \"New job\" and \"Add note\" (pick a customer, jot it down) are now right on Today. Completing jobs auto-logs real mileage legs (home → job → job → home, not a round trip per job) with a \"Heading home\" button for closing a loop - and today's jobs can be manually reordered to match his actual route. A \"Paid on the spot\" tick at completion skips a separate trip into Billing." },
  { title: "Per-job-type kit checklists + overdue jobs on Today", detail: "Scheduling a job can now tag it with a type (window cleaning, pressure cleaning, solar, cars, etc, with a rough price guide once picked). Today's checklist automatically adds that type's extra kit on top of the everyday list - set up once via \"Kit lists\" on the Dashboard. Today also now surfaces any job from a previous day that never got marked done, not just today's jobs, so nothing gets forgotten." },
  { title: "Simple/Advanced split", detail: "Signing in now lands on a bare-bones \"Today\" screen - today's jobs with call/navigate/mark-done, the packing checklist, tomorrow's confirmations, and a nudge only if something's overdue. The full app (Customers, Schedule, Billing, Mileage, Leads) is one tap away behind \"Full app\", for sit-down admin sessions." },
  { title: "One-tap sign in for /team", detail: "Signing in is now the page itself instead of a button behind a tap - go to /team and the form's already there. The public booking site is unaffected and stays the default for everyone else." },
  { title: "Reach out to lapsed customers", detail: "Customers tab has a \"Reach out again\" filter for active, one-off customers not serviced in 6+ months - the ones the recurring due-date system doesn't catch, straight from Tyson's feedback." },
  { title: "Before-you-go checklist and tomorrow's confirmations", detail: "Dashboard now shows an editable packing checklist on days with jobs on, plus a one-tap text link to confirm tomorrow's bookings - no missed gear, no forgotten reminders." },
  { title: "Simpler mileage tab", detail: "Stripped back to one glance number and a big Log-a-trip button - no scrolling, quick during the day. Distances now calculate from real map routing between addresses (type any From/To and tap Calculate), with home base and rate tucked behind the settings gear." },
  { title: "Mileage tracking", detail: "Log work km for the cents-per-km tax deduction. Set a home base once and trips to a customer auto-calculate the distance from their address - and it remembers the real distance per customer after the first time. Shows your FY total, the $ estimate, and the 5,000 km cap. Also on the dashboard." },
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

export default function Dev({ demoMode, onToggleDemo }) {
  const [tab, setTab] = useState("changelog");

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-slate-900">Dev</h1>
        <p className="text-sm text-slate-500 mt-1">What's been built, and a reserved spot for other projects.</p>
      </div>

      <Card className={`p-4 mb-5 ${demoMode ? "border-amber-300 bg-amber-50/60" : ""}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {demoMode ? <FlaskConical size={15} className="text-amber-600" /> : <Database size={15} className="text-blue-600" />}
              <span className="text-sm font-semibold text-slate-900">
                {demoMode ? "Showing demo data" : "Showing real data"}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {demoMode
                ? "A realistic sample business, held in memory only. Nothing you do here touches the real records, and it resets when you reload."
                : "The live business records. Switch to demo data to explore or show the app without changing anything real."}
            </p>
          </div>
          <Button
            variant={demoMode ? "secondary" : "primary"}
            className="shrink-0"
            onClick={() => onToggleDemo(!demoMode)}
          >
            {demoMode ? "Use real data" : "Use demo data"}
          </Button>
        </div>
      </Card>

      <div className="flex items-center gap-1 bg-slate-100 rounded-full p-1 mb-5 w-fit">
        <button
          onClick={() => setTab("changelog")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${tab === "changelog" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-blue-700"}`}
        >
          Changelog
        </button>
        <button
          onClick={() => setTab("journey")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${tab === "journey" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-blue-700"}`}
        >
          Journey
        </button>
        <button
          onClick={() => setTab("projects")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${tab === "projects" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-blue-700"}`}
        >
          Projects
        </button>
      </div>

      {tab === "changelog" && (
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
      )}

      {tab === "journey" && <DayInTheLife />}

      {tab === "projects" && (
        <EmptyState
          icon={FolderKanban}
          title="Nothing here yet."
          subtitle="Reserved for future personal projects to fold into this app."
        />
      )}
    </div>
  );
}
