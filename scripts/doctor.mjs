#!/usr/bin/env node
// ---------------------------------------------------------------------------
// npm run doctor
//
// Checks a setup end to end and says, in plain words, what's still missing.
// Written for someone who has never run a build tool before: no stack traces,
// no jargon, and every failure names the next thing to do.
//
// Deliberately dependency-free - it has to work before `npm install` has been
// sorted out, which is exactly when setup is most likely to be broken.
// ---------------------------------------------------------------------------

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

let failed = 0;
let warned = 0;

function pass(label, detail) {
  console.log(`  ${green("✓")} ${label}${detail ? dim(`  ${detail}`) : ""}`);
}
function fail(label, fix) {
  failed++;
  console.log(`  ${red("✗")} ${label}`);
  if (fix) console.log(`      ${yellow("→")} ${fix}`);
}
function warn(label, fix) {
  warned++;
  console.log(`  ${yellow("!")} ${label}`);
  if (fix) console.log(`      ${yellow("→")} ${fix}`);
}

// --- .env -------------------------------------------------------------------
function readEnv() {
  const path = join(root, ".env");
  if (!existsSync(path)) return null;
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
  return out;
}

console.log(`\n${bold("Checking your setup")}\n`);

console.log(bold("Config"));

const env = readEnv();
if (!env) {
  fail("No .env file", "Copy .env.example to .env, then fill in the two Supabase values.");
} else {
  pass(".env file found");
}

const url = env?.VITE_SUPABASE_URL;
const key = env?.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url) {
  fail("VITE_SUPABASE_URL is not set", "Supabase → Project Settings → API → Project URL");
} else if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/.test(url)) {
  fail(
    `VITE_SUPABASE_URL doesn't look right (${url})`,
    "It should look like https://abcdefghijkl.supabase.co - no trailing slash, no /rest/v1"
  );
} else {
  pass("VITE_SUPABASE_URL", url);
}

if (!key) {
  fail(
    "VITE_SUPABASE_PUBLISHABLE_KEY is not set",
    "Supabase → Project Settings → API → publishable (or anon) key"
  );
} else if (key.startsWith("sb_secret") || key.startsWith("service_role")) {
  fail(
    "That's the SECRET key, not the publishable one",
    "Never put a secret key in a browser app - anyone visiting the site could read it. Use the publishable/anon key."
  );
} else {
  pass("VITE_SUPABASE_PUBLISHABLE_KEY", `${key.slice(0, 12)}…`);
}

// --- Dependencies -----------------------------------------------------------
console.log(`\n${bold("Dependencies")}`);
if (existsSync(join(root, "node_modules"))) {
  pass("node_modules installed");
} else {
  fail("Packages aren't installed", "Run: npm install");
}

const [major] = process.versions.node.split(".").map(Number);
if (major >= 18) pass("Node.js version", `v${process.versions.node}`);
else fail(`Node.js v${process.versions.node} is too old`, "Install the LTS version from nodejs.org (v18 or newer).");

// --- Database ---------------------------------------------------------------
// Tables are probed through the REST API. A missing table answers 404; a table
// that exists but is protected by RLS answers 200 with an empty list - which
// is exactly the "locked but present" result we want to see.
const TABLES = [
  "customers", "jobs", "quotes", "invoices", "leads",
  "expenses", "renewals", "settings", "trips", "customer_notes", "reminder_log",
];

if (url && key && !failed) {
  console.log(`\n${bold("Database")}`);
  const missing = [];
  let reachable = true;

  for (const table of TABLES) {
    try {
      const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      });
      if (res.status === 404) missing.push(table);
      else if (res.status === 401 || res.status === 403) {
        // Present and locked down - RLS doing its job.
      } else if (!res.ok) {
        const body = await res.text();
        if (body.includes("Could not find the table")) missing.push(table);
      }
    } catch {
      reachable = false;
      break;
    }
  }

  if (!reachable) {
    fail(
      "Can't reach Supabase",
      "Check your internet connection, and that the project URL is right and the project isn't paused."
    );
  } else if (missing.length === TABLES.length) {
    fail(
      "None of the tables exist yet",
      "Open Supabase → SQL Editor, paste in supabase/schema.sql, and hit Run."
    );
  } else if (missing.length) {
    fail(
      `Missing ${missing.length} table${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`,
      "Re-run supabase/schema.sql in the SQL Editor - it's safe to run again and won't touch existing data."
    );
  } else {
    pass(`All ${TABLES.length} tables present`);
  }
} else if (url && key) {
  console.log(`\n${bold("Database")}`);
  warn("Skipped the database check", "Fix the problems above first, then run npm run doctor again.");
}

// --- Optional extras --------------------------------------------------------
console.log(`\n${bold("Optional")}`);
if (env?.VITE_BUSINESS_PHONE) pass("Tap-to-call button", env.VITE_BUSINESS_PHONE);
else warn("No VITE_BUSINESS_PHONE set", "The tap-to-call button on the public page stays hidden without it.");

if (env?.VITE_BUSINESS_NAME) pass("Business name", env.VITE_BUSINESS_NAME);
else warn("No VITE_BUSINESS_NAME set", 'Defaults to "Tydie Cleaning". See src/lib/business.js for everything you can rename.');

// --- Verdict ----------------------------------------------------------------
console.log("");
if (failed) {
  console.log(red(bold(`${failed} thing${failed > 1 ? "s" : ""} to fix.`)), "Work down the arrows above, then run this again.\n");
  process.exit(1);
} else {
  console.log(green(bold("Everything checks out.")), `Run ${bold("npm run dev")} and open the address it prints.`);
  if (warned) console.log(dim(`(${warned} optional item${warned > 1 ? "s" : ""} not set - the app runs fine without them.)`));
  console.log("");
}
