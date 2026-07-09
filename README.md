# Clear View Job Manager

A job-management app built for a window cleaning business: customers,
recurring schedules, quotes, invoices, inbound leads, and automated
"you're due" / "invoice overdue" email reminders. Data lives in Supabase.
Hosted on Netlify.

## What it does

- **Dashboard** - what needs attention today: who's due/overdue for a clean,
  jobs booked this week, overdue invoices, new leads.
- **Customers** - contact info, address, access notes (gate codes, pets,
  hazards), and a recurring cleaning frequency (e.g. every 8 weeks).
- **Schedule** - book and track jobs; marking a job complete automatically
  rolls the customer's "next due" date forward.
- **Billing** - quotes (for leads or existing customers, with
  draft/sent/accepted/declined status) and invoices (unpaid/paid, overdue
  highlighted automatically).
- **Leads** - a public "request a quote" page (`/request-quote`) that
  anyone can submit without an account; requests land in the Leads inbox to
  triage, quote, or convert straight into a customer record.
- **Automated reminders** - a scheduled Supabase Edge Function emails
  customers when they're due for a clean or have an overdue invoice, and
  sends the owner a daily digest. See
  `supabase/functions/send-reminders/README.md` to turn it on.

## What's connected
- Database + auth: your own Supabase project (create a new one - don't
  reuse an old project's data).
- The publishable key in `.env` is safe for the browser; security is
  enforced by Row Level Security policies (see
  `supabase/migrations/0001_window_cleaning_schema.sql`): signed-in users
  get full access, and the public can only *insert* a lead (via the
  quote-request form) - never read/edit/delete anything.

## First-time setup

### 1. Create the database
1. Create a new Supabase project.
2. Open the SQL editor and run
   `supabase/migrations/0001_window_cleaning_schema.sql`.
3. Add a login for the business owner: Supabase -> Authentication -> Users
   -> Add user (email + password, tick auto-confirm). Anyone with an
   account can sign in and see/edit everything.

### 2. Run locally
1. Install Node.js (LTS) from nodejs.org.
2. Copy `.env.example` to `.env` and fill in your Supabase project URL and
   publishable key (Supabase -> Project Settings -> API).
3. In this folder, run:
       npm install
       npm run dev
4. Open the local URL it prints (usually http://localhost:5173).

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
   (same values as your local `.env`).
5. Deploy. You'll get a live URL - share `<your-site>/request-quote` as
   the public quote-request link (e.g. in Google/Facebook listings, a
   linktree, or a text-back auto-reply).

## Managing who can edit
Add user accounts in Supabase -> Authentication -> Users -> Add user
(email + password; tick auto-confirm). Anyone with an account can sign in
and manage the whole business (customers, jobs, quotes, invoices, leads).
