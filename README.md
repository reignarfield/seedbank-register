# Tydie Cleaning - Job Manager

A job-management app built for Tydie Cleaning: customers, recurring
schedules, quotes, invoices, expenses, inbound leads, and automated
"you're due" / "invoice overdue" / "we'll see you tomorrow" email
reminders. Data lives in Supabase. Hosted on Netlify.

The site is split in two:
- **`/`** (the homepage) - public. Anyone can book a clean or check pricing,
  no account needed.
- **`/team`** - staff only. Sign-in required; this is the job manager itself.

## What it does

- **Public site** (`/`) - a booking form and a simplified pricing page,
  branded for Tydie Cleaning, with a tap-to-call button for anyone who'd
  rather phone than fill in a form.
- **Dashboard** - what needs attention today: who's due/overdue for a clean,
  jobs booked this week, overdue invoices, new leads, upcoming renewals,
  and a profit-this-month figure (income minus expenses).
- **Customers** - contact info, address, access notes (gate codes, pets,
  hazards), and a recurring cleaning frequency (e.g. every 8 weeks).
- **Schedule** - book and track jobs; marking a job complete automatically
  rolls the customer's "next due" date forward and raises an invoice if
  the job has a price.
- **Billing** - quotes, invoices (unpaid/paid, overdue highlighted
  automatically), and expenses (for a real income-vs-spend picture at tax
  time).
- **Leads** - inbound requests from the public booking form land here to
  triage, quote, or convert straight into a customer record; each shows
  which link it came from.
- **Customer Page** - a staff-only tab that embeds the live public site, so
  it's easy to see exactly what a customer sees without leaving the app.
- **Dev** - a changelog of what's been built, and a placeholder area for
  other projects.
- **Automated reminders** - a scheduled Supabase Edge Function emails
  customers who are due for a clean, have an overdue invoice, are booked
  in for tomorrow, or were cleaned yesterday (review request) - and sends
  the owner a daily digest covering new leads, due cleans, overdue
  invoices, and upcoming renewals. See
  `supabase/functions/send-reminders/README.md` to turn it on.

## What's connected
- Database + auth: your own Supabase project (create a new one - don't
  reuse an old project's data).
- The publishable key in `.env` is safe for the browser; security is
  enforced by Row Level Security policies (see `supabase/migrations/`):
  signed-in users get full access, and the public can only *insert* a lead
  (via the booking form) - never read/edit/delete anything.

## First-time setup

Roughly five minutes, once. If you get stuck at any point, run
`npm run doctor` - it checks every part of the setup and tells you exactly
what's still missing.

### 1. Get the code running
1. Install Node.js (LTS) from nodejs.org.
2. In this folder, run:

       npm install
       npm run dev

3. Open the address it prints (usually http://localhost:5173). You'll get a
   setup screen walking you through the next two steps - it's the same
   information as below, in the app itself.

### 2. Create the database
1. Create a new Supabase project (free tier is plenty for one business).
2. Open the SQL Editor, paste in the whole of `supabase/schema.sql`, and
   run it. That's the entire database setup - one file, safe to run again
   at any time, and it never drops anything.
   *(The numbered files in `supabase/migrations/` are only for projects
   already running an older version.)*
3. Copy `.env.example` to `.env` and fill in your Supabase project URL and
   publishable key (Supabase -> Project Settings -> API).
4. Restart `npm run dev` so it picks up the new values.
5. Add your login: Supabase -> Authentication -> Users -> Add user (email +
   password, tick auto-confirm). Anyone with an account can sign in at
   `/team` and see everything.

### 3. Turn on automated reminders (optional but recommended)
Follow `supabase/functions/send-reminders/README.md` - it needs a (free)
Resend account for sending email and a one-time Supabase CLI deploy +
schedule.

## Deploy to Netlify
1. Push this folder to a GitHub repository.
2. In Netlify: Add new site -> Import an existing project -> pick the repo.
3. Build settings are auto-detected from `netlify.toml` (build:
   `npm run build`, publish: `dist`).
4. Add environment variables in Netlify: Site configuration -> Environment
   variables -> add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
   (same values as your local `.env`), plus `VITE_BUSINESS_PHONE` if you
   want the call button live.
5. Deploy. You'll get a live URL - that's the public site (booking +
   pricing). Staff sign in at `<your-site>/team`.

## Managing who can edit
Add user accounts in Supabase -> Authentication -> Users -> Add user
(email + password; tick auto-confirm). Anyone with an account can sign in
at `/team` and manage the whole business (customers, jobs, quotes,
invoices, expenses, leads).

## Using this for a different business

The database schema is deliberately trade-agnostic - customers, jobs,
quotes, invoices, expenses. A mobile mechanic, a gardener and a dog groomer
all store the same shapes; only the words change. So pointing this at a
different sole trader is configuration, not a rewrite:

1. **`src/lib/business.js`** - the single file that holds identity, contact
   details, currency, what this trade calls a "job", and which optional
   features are switched on. Every value can also be set from `.env`, so one
   codebase can serve several businesses without a code change.
2. **`src/lib/pricing.js`** - the price list the public page renders from.
3. **`src/assets/` and `public/`** - logo and icons.

Switching a feature off in `business.js` (mileage, quotes, expenses, leads,
recurring scheduling, the weather nudge) hides it completely rather than
leaving an empty tab. Removing what someone will never open is the fastest
way to make software feel simple.

The browser tab title, meta description and install manifest are generated
at build time from the same values, so renaming the business stays a
one-file job.

### What's not done yet

Every signed-in user can currently see every record - the row-level
security policies are `using (true)`. That's correct for one business running
its own copy, and it's the thing to change first if this ever becomes one
deployment serving many businesses: an `org_id` on every table, and policies
scoped to it.
## Updating prices
The public pricing page reads from `src/lib/pricing.js` - edit that file
and redeploy to change what's shown.
