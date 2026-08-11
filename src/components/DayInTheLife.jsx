import React from "react";
import { AlertTriangle } from "lucide-react";
import { Card } from "./ui";

// A working design document, not marketing copy: a plain walkthrough of a
// realistic day, naming actual buttons/screens so it stays checkable
// against the real app. Flaws it surfaces along the way are called out
// rather than smoothed over - finding them is the point of writing it.

function Beat({ when, children }) {
  return (
    <div className="mb-4">
      <div className="text-sm font-semibold text-blue-700 mb-1">{when}</div>
      <p className="text-sm text-slate-700 leading-relaxed">{children}</p>
    </div>
  );
}

function Flaw({ children }) {
  return (
    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mb-4 text-sm text-amber-800">
      <AlertTriangle size={15} className="shrink-0 mt-0.5" />
      <p>
        <strong>Flaw: </strong>
        {children}
      </p>
    </div>
  );
}

const B = ({ children }) => <strong className="text-slate-900">{children}</strong>;

export default function DayInTheLife() {
  return (
    <div className="max-w-2xl">
      <p className="text-sm text-slate-500 mb-5">
        A day, imagined in as much real detail as we can - written to check the app against how Tyson would actually use it, not how we'd like him to. Kept honest: the flagged spots are real gaps, not solved yet.
      </p>

      <Card className="p-5">
        <Beat when="6:45am, kitchen table">
          Phone's already bookmarked straight to <code>/team</code> from the home screen - one tap, no typing, no sign-in screen. Lands directly on Today. Six jobs are already sitting there in the order they're scheduled, not yet the order he'll actually drive them.
        </Beat>

        <Beat when="Starting the day">
          Since he hasn't started the day yet, instead of the normal view he sees a quick three-step confirm: today's six jobs (he drags two into a better order with the arrows - saves doubling back across the bridge), the kit checklist (already includes "pressure washer" and "surface cleaner attachment" because one of today's jobs is tagged Pressure Cleaning, on top of his everyday squeegees-and-pole list), and a one-line "Starting from: 5 Smith St" he just confirms. A small weather line sits above it all: "Rain unlikely today (15%)." Taps <B>Start my day</B>. Loads the van against the checklist on screen. Out the door by 7:05.
        </Beat>

        <Beat when="7:30am, Sarah Nguyen's — Window Cleaning, $250">
          This one was quoted three weeks ago and accepted over text. Because the job got scheduled straight from that accepted quote, the price and description were already sitting on the job when he arrived - he didn't have to remember what he'd quoted her. Finishes, taps <B>Mark done</B>, ticks <B>Paid on the spot</B> since she hands him cash, done. Invoice exists already, already marked paid, correct amount, correct description. Zero paperwork.
        </Beat>

        <Beat when="Driving to job two">
          A trip leg logs itself in the background - home to Sarah's - no action from him at all.
        </Beat>

        <Beat when="8:20am, a text comes in mid-drive">
          A stranger asking for a quote on a pressure clean. He can't stop to do anything with it right now - it'll sit as a new lead whenever he next opens the full app.
        </Beat>
        <Flaw>
          there's no way to jot down "call this number back, wants a pressure clean quote" in the ten seconds he has at a red light - the note picker exists for customers already in the system, not a brand new stranger. Worth a "quick lead" version of Add note, or just letting Add note create a new contact on the fly.
        </Flaw>

        <Beat when="9:15am, Overdue Ollie's — was meant to happen three days ago">
          Shows up flagged amber above today's jobs, exactly where he left it. Rain that day meant he genuinely couldn't do it - not something he forgot. Marks it done same as any other job; the mileage leg logs from wherever he actually was, not from some idealised plan.
        </Beat>

        <Beat when="10:40am, a gutter bracket looks loose at a job that's not on today's sheet">
          Worth flagging to the customer, maybe a future quote. Taps <B>Add note</B>, picks the customer, jots it down in fifteen seconds. It'll be sitting there next time he opens their file, instead of living in his head or a text message to himself.
        </Beat>

        <Beat when="12:30pm, last job of the morning loop">
          Taps <B>Heading home</B> - one more leg logged, back to base. Grabs lunch, restocks a squeegee blade from the shed.
        </Beat>

        <Beat when="1:15pm, second loop starts">
          A job with no price set yet (a one-off he hasn't settled on a rate for). Taps Mark done, gets asked for a price right then instead of the invoice silently never getting raised - enters $180, done. Because this is the first job since "Heading home," its leg logs from base again, not from wherever the morning ended.
        </Beat>

        <Beat when="3:40pm, last job of the day">
          Marks it done. Today's list is empty - instead of a blank "nothing here," a small recap sits in its place: 6 jobs done, $940 earned, 34km driven. Nothing left needing attention. Locks the phone, day's actually over, not just the jobs.
        </Beat>

        <Beat when="7:00pm, sat down with a coffee">
          Flips to Full app for the bits that don't happen mid-job: two bank-transfer invoices from earlier in the week still show unpaid in Billing, marks them paid now that the money's landed. Adds a new customer who called the landline. Glances at Customers to remember the gate code note from a job two weeks ago before tomorrow's repeat visit there. Ten minutes, once a day, not a dozen small interruptions.
        </Beat>
      </Card>
    </div>
  );
}
