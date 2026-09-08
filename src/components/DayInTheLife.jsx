import React from "react";
import { AlertTriangle, MessageCircleQuestion } from "lucide-react";
import { Card } from "./ui";

// A walkthrough script, not a story. Each step is one thing he physically
// does, what the app does in response, and the question to put to him about
// it. Meant to be read out loud with Tyson, a step at a time, checking each
// against how he actually works - so the gaps come from him, not from us
// guessing.

function Phase({ title, subtitle, children }) {
  return (
    <div className="mb-8">
      <div className="mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Step({ n, title, does, app, ask, gap }) {
  return (
    <Card className="p-4">
      <div className="flex items-baseline gap-2.5 mb-2.5">
        <span className="flex items-center justify-center shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-semibold tabular-nums">
          {n}
        </span>
        <h3 className="font-semibold text-slate-900">{title}</h3>
      </div>
      <dl className="space-y-1.5 text-sm">
        <div className="flex gap-2">
          <dt className="shrink-0 w-16 text-xs font-semibold uppercase tracking-wide text-slate-400 pt-0.5">He does</dt>
          <dd className="text-slate-700">{does}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 w-16 text-xs font-semibold uppercase tracking-wide text-slate-400 pt-0.5">App does</dt>
          <dd className="text-slate-700">{app}</dd>
        </div>
      </dl>
      {gap && (
        <p className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3 text-sm text-amber-800">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span><strong>Known gap: </strong>{gap}</span>
        </p>
      )}
      {ask && (
        <p className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mt-2 text-sm text-blue-900">
          <MessageCircleQuestion size={14} className="shrink-0 mt-0.5" />
          <span><strong>Ask Tyson: </strong>{ask}</span>
        </p>
      )}
    </Card>
  );
}

const B = ({ children }) => <strong className="text-slate-900">{children}</strong>;

export default function DayInTheLife() {
  return (
    <div className="max-w-2xl">
      <p className="text-sm text-slate-500 mb-6">
        A step-by-step walkthrough of a working day, written to be read out loud with Tyson one step at a time. Each step names what he does, what the app does back, and the question to check it against how he really works. The flagged gaps are real and not yet solved.
      </p>

      <Phase title="Before he leaves" subtitle="Kitchen table, roughly 6:45am">
        <Step
          n={1}
          title="Open the app"
          does="Taps the Tydie icon saved to his phone's home screen."
          app={<>Opens straight to <B>Today</B> — already signed in, no password, no menu.</>}
          ask="Is the phone home screen where he'd actually keep it, or would he go looking in a browser? Does he ever get signed out?"
        />
        <Step
          n={2}
          title="Look over the day"
          does="Reads down today's job list."
          app={<>Lists every job booked for today — name, address, and the price if there is one. Anything from an earlier day that never got marked done sits above in amber.</>}
          ask="Is a plain list the right thing to see first, or does he want times against each job?"
        />
        <Step
          n={3}
          title="Put the jobs in driving order"
          does="Uses the up/down arrows on each job to match the order he'll actually drive them."
          app="Saves that order, so the list stays that way all day."
          ask="Does he plan a route in his head the night before, or work it out as he goes? Would he bother re-ordering, or just ignore the list order?"
        />
        <Step
          n={4}
          title="Load the van"
          does="Works down the kit checklist, tapping each item as it goes in."
          app={<>Shows his everyday kit, plus extra gear for whatever job types are on today (e.g. a pressure washer if there's a pressure clean booked). Ticks stay put if the phone locks or reloads.</>}
          gap="The per-job-type kit lists are empty until someone fills them in. We only know the window-cleaning gear from his survey answer."
          ask="What actually goes in the van for a pressure clean? Solar? A car detail? A bond clean? This is the list we can't guess."
        />
        <Step
          n={5}
          title="Check the weather"
          does="Glances at the rain line on the start card."
          app="Shows today's rain chance for his home area, and warns during the day if it's likely."
          ask="Is rain chance the useful number, or is it more about wind, or the forecast for a particular suburb he's headed to?"
        />
        <Step
          n={6}
          title="Start the day"
          does={<>Taps <B>Start my day</B>.</>}
          app="Puts the start card away until tomorrow. Everything else was already on screen underneath."
          ask="Does a deliberate 'I'm on now' button feel useful, or is it just an extra tap in the way?"
        />
      </Phase>

      <Phase title="On the road" subtitle="This loop repeats for every job">
        <Step
          n={7}
          title="Drive to the job"
          does={<>Taps <B>Navigate</B> on the first job.</>}
          app="Opens Google Maps to that address."
          ask="Does he use Google Maps, or something else? Does he already know most addresses by heart?"
        />
        <Step
          n={8}
          title="Ring ahead if needed"
          does={<>Taps <B>Call</B>.</>}
          app="Dials the customer straight from the job."
          ask="How often does he actually ring on the way? Would a quick 'running late' text be more useful than a call?"
        />
        <Step
          n={9}
          title="Check what he needs to know before knocking"
          does="Reads the address line and any notes on the customer."
          app="Shows the address; access notes (gate codes, dogs, ladder access) live on the customer record."
          gap="Access notes aren't shown on the job card on Today — he'd have to go into the full app to see the gate code."
          ask="Is the gate code / dog / access stuff something he needs right there on the job, or does he remember his regulars?"
        />
        <Step
          n={10}
          title="Do the work"
          does="Cleans the windows. Phone stays in his pocket."
          app="Nothing. Deliberately."
          ask="Anything he'd want to record mid-job — before/after photos, hours actually spent?"
        />
        <Step
          n={11}
          title="Mark it done"
          does={<>Taps <B>Mark done</B>. If they paid him cash on the spot, ticks <B>Paid on the spot</B> first.</>}
          app="Marks the job complete, raises the invoice from the job's price automatically, marks it paid if he ticked that, rolls the customer's next-due date forward, and logs the drive leg in the background."
          ask="Does that match how he gets paid? Cash on the spot, bank transfer later, or invoice and chase?"
        />
        <Step
          n={12}
          title="If the job had no price set"
          does="Gets asked for a price right then. Enters it, or skips."
          app="If he enters one, invoice raised. If he skips, the job gets flagged 'No invoice raised' with a one-tap way to invoice it later."
          ask="How often does he turn up not knowing the price yet? Is being asked at that moment helpful or annoying?"
        />
        <Step
          n={13}
          title="If he can't do the job"
          does={<>Taps <B>Can't do it today</B> — moves it to tomorrow, picks another date, or cancels it.</>}
          app="Moves or cancels the job so it stops looking forgotten."
          gap="It doesn't tell the customer. He'd still have to text them himself."
          ask="When rain kills a job, what does he do right now? Would he want the app to text them, or does he prefer doing that himself?"
        />
        <Step
          n={14}
          title="Something worth remembering"
          does={<>Taps <B>Add note</B>, picks the customer, types it in.</>}
          app="Saves it against that customer, visible next time he opens them."
          ask="What kinds of things does he actually need to remember between visits?"
        />
        <Step
          n={15}
          title="A new job comes in mid-day"
          does={<>Someone rings wanting a clean. Taps <B>New job</B>, picks the customer, sets a date.</>}
          app="Books it."
          gap="Only works for people already in the system. A brand new caller can't be captured quickly — he'd have to add them as a customer first, in the full app."
          ask="How do new customers usually reach him — phone, text, Facebook? What does he do with the details in the moment?"
        />
      </Phase>

      <Phase title="Breaks and second runs" subtitle="Lunch, restocking, an afternoon loop">
        <Step
          n={16}
          title="Heading back to base"
          does={<>Taps <B>Heading home</B>.</>}
          app="Logs the drive home and closes off that loop, so the next job he does starts counting from home again."
          ask="Does he go home mid-day, or work straight through? How many separate runs in a typical day?"
        />
        <Step
          n={17}
          title="Back out for the afternoon"
          does="Just carries on marking jobs done."
          app="Starts the mileage chain fresh from home."
          ask="Does the driving between jobs actually matter to him, or does he not bother claiming it at tax time?"
        />
      </Phase>

      <Phase title="End of the day" subtitle="Last job done, heading home">
        <Step
          n={18}
          title="Finish the last job"
          does="Marks it done."
          app="Today's list is empty, so it shows a recap instead: jobs done, money earned, kilometres driven."
          ask="Is that the right three numbers? Is there something else he'd want to see at the end of a day?"
        />
        <Step
          n={19}
          title="Confirm tomorrow"
          does={<>Taps <B>Text</B> next to each of tomorrow's customers.</>}
          app="Opens his messages app with that customer ready to text."
          ask="Does he confirm the day before? By text or call? Would he want the message already written for him?"
        />
      </Phase>

      <Phase title="Sitting down with a coffee" subtitle="Evening, or once a week — the Full app side">
        <Step
          n={20}
          title="Chase the money"
          does={<>Taps <B>Full app</B> → Billing → Invoices.</>}
          app="Lists unpaid and overdue invoices. One tap marks one paid."
          ask="How does he know when someone's paid? Does he check the bank, or wait for a receipt?"
        />
        <Step
          n={21}
          title="Deal with new enquiries"
          does="Opens Leads, turns one into a quote."
          app="Quote gets created against that lead. When it's accepted, scheduling it carries the price and description straight onto the job."
          ask="How does he quote now — in person, over the phone, a text with a number? Does he write anything down?"
        />
        <Step
          n={21.5}
          title="Quote a job with several parts"
          does="Someone asks for the windows, the driveway and the solar panels."
          app="A quote is one amount and one description. The enquiry form lists what they ticked, but the quote doesn't itemise."
          gap="No line items on a quote. If he prices each part separately, he has to write it out in the description by hand."
          ask="Does he give one number or itemise? Does he go and look at a place before quoting it, or price it off what they said - and has that ever caught him out? (The address lookup on an enquiry shows the building type and a Street View link for exactly this.)"
        />
        <Step
          n={22}
          title="Ring people he hasn't seen in a while"
          does={<>Opens Customers → <B>Reach out again</B>.</>}
          app="Lists active one-off customers not serviced in 6+ months."
          ask="Is six months the right gap? Does he actually chase past customers, or wait for them to call?"
        />
        <Step
          n={23}
          title="Tax bits"
          does="Logs an expense, checks the mileage total, sets an insurance renewal date."
          app="Tracks expenses by category, kilometres against the ATO cents-per-km rate and 5,000 km cap, and reminds on renewals."
          ask="Does he do his own books or hand it all to an accountant? What does the accountant actually ask him for?"
        />
      </Phase>

      <Card className="p-4 bg-slate-50">
        <h3 className="font-semibold text-slate-900 mb-2 text-sm">The three questions worth asking at the end</h3>
        <ol className="text-sm text-slate-700 space-y-1.5 list-decimal list-inside">
          <li>Which of those steps is he already doing some other way that works fine?</li>
          <li>Which step, if the app got it wrong, would make him stop using it?</li>
          <li>What does he spend time on in a week that never came up anywhere above?</li>
        </ol>
      </Card>
    </div>
  );
}
