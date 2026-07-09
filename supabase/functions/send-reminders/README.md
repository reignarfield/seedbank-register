# Automated reminders

This Edge Function is the "automation" piece: once a day it checks who's due
for a clean and who's overdue on an invoice, and emails them automatically -
no need to open the app.

## 1. Get a Resend account (free tier is plenty to start)
1. Sign up at resend.com and verify a sending domain (or use their test
   domain while trying it out).
2. Create an API key.

## 2. Deploy the function
Install the Supabase CLI, then from the project root:

```
supabase login
supabase link --project-ref <your-project-ref>
supabase functions deploy send-reminders
```

## 3. Set the secrets it needs

```
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
supabase secrets set FROM_EMAIL="Clear View <jobs@yourdomain.com>"
supabase secrets set OWNER_EMAIL=you@yourdomain.com
supabase secrets set BUSINESS_NAME="Clear View Window Cleaning"
```

(`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically
by Supabase - you don't need to set those.)

## 4. Schedule it to run daily

Easiest option: Supabase Dashboard -> Edge Functions -> `send-reminders` ->
"Cron" tab -> add a schedule like `0 7 * * *` (7am daily).

If your project doesn't have that UI yet, run this in the SQL editor
instead (requires the `pg_cron` and `pg_net` extensions, which Supabase
provides):

```sql
select cron.schedule(
  'send-reminders-daily',
  '0 7 * * *', -- 7am UTC daily; adjust for your timezone
  $$
  select net.http_post(
    url := 'https://<your-project-ref>.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <your-service-role-key>',
      'Content-Type', 'application/json'
    )
  );
  $$
);
```

## 5. Test it manually any time

```
supabase functions invoke send-reminders
```

It returns a small JSON summary (how many emails it sent) so you can
confirm it's working before trusting the schedule.

## Tuning

Edit the constants at the top of `index.ts`:
- `DUE_SOON_LEAD_DAYS` - how many days before a clean is due to start emailing (default 3).
- `DUE_SOON_RESEND_DAYS` - cooldown before re-emailing the same customer about the same clean (default 21).
- `INVOICE_OVERDUE_RESEND_DAYS` - cooldown between overdue-invoice reminders (default 5).
