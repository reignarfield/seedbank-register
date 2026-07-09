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

### 1. Create the database
1. Create a new Supabase project.
2. Open the SQL editor and run every file in `supabase/migrations/`, in
   order (0001, then 0002, then 0003, ...).
3. Add a login for the business owner: Supabase -> Authentication -> Users
   -> Add user (email + password, tick auto-confirm). Anyone with an
   account can sign in and see/edit everything at `/team`.

### 2. Run locally
1. Install Node.js (LTS) from nodejs.org.
2. Copy `.env.example` to `.env` and fill in your Supabase project URL and
   publishable key (Supabase -> Project Settings -> API), plus optionally
   `VITE_BUSINESS_PHONE` / `VITE_BUSINESS_EMAIL` for the public page's
   tap-to-call button.
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
   (same values as your local `.env`), plus `VITE_BUSINESS_PHONE` if you
   want the call button live.
5. Deploy. You'll get a live URL - that's the public site (booking +
   pricing). Staff sign in at `<your-site>/team`.

## Managing who can edit
Add user accounts in Supabase -> Authentication -> Users -> Add user
(email + password; tick auto-confirm). Anyone with an account can sign in
at `/team` and manage the whole business (customers, jobs, quotes,
invoices, expenses, leads).

## Updating prices
The public pricing page reads from `src/lib/pricing.js` - edit that file
and redeploy to change what's shown.
