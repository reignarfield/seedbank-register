# Seedbank Register

A web app for the 2025/2026 seedbank: browse seedlots (public), and add/edit
records (sign-in required). Data lives in Supabase (Sydney). Hosted on Netlify.

## What's connected
- Database + auth: Supabase project `hjhcybuxajhbcgvrimal` (Sydney / AWS ap-southeast-2)
- The publishable key in `.env` is safe for the browser; security is enforced by
  the Row Level Security policies on the `seedlots` table (public read, signed-in write).

## Run locally
1. Install Node.js (LTS) from nodejs.org
2. In this folder, run:
       npm install
       npm run dev
3. Open the local URL it prints (usually http://localhost:5173)

## Deploy to Netlify
1. Push this folder to a GitHub repository.
2. In Netlify: Add new site -> Import an existing project -> pick the repo.
3. Build settings are auto-detected from netlify.toml (build: `npm run build`,
   publish: `dist`).
4. IMPORTANT - add the environment variables in Netlify:
   Site configuration -> Environment variables -> add:
       VITE_SUPABASE_URL = https://hjhcybuxajhbcgvrimal.supabase.co
       VITE_SUPABASE_PUBLISHABLE_KEY = sb_publishable_NIjYXZPoy_AD8Org6KXrTg_8J0YPUHg
   (The local .env file is NOT uploaded to GitHub, so Netlify needs its own copy.)
5. Deploy. You'll get a live URL.

## Managing who can edit
Add user accounts in Supabase -> Authentication -> Users -> Add user
(email + password; tick auto-confirm). Anyone with an account can sign in and edit.

## Notes on the science
- Means are arithmetic means of the replicates actually entered (n shown if < 3).
- Stored values keep full precision; only the display is rounded.
- Seeds per gram is derived (100 / mean weight per 100 seeds), never entered.
- Replicates outside 0-100% (or negative) are flagged and excluded from the mean.
