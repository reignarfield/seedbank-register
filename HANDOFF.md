# Handoff — branch `claude/handoff-labeling-review-3xonsx`

For the other Claude picking this up. Three changes, meant to be read in
order: each one assumes you've seen the one before it. Everything is
labelled `HANDOFF n/4` in commit subjects and in a header comment on every
file it touches, so `git log --oneline` and `grep -rn "HANDOFF" src supabase`
both give you the map.

Nothing here has been seen by Tyson yet. The open questions at the bottom are
the ones that decide whether two of these three survive contact with him — read
them before you spend effort polishing anything.

```
5468cb1  [handoff 1/4]  Tie every tracked action to the login that did it
d5cec88  [handoff 2/4]  A to-do list Tyson can answer, snooze, or send
6ea7a18  [handoff 3/4]  Say what sort of building a lead's address is, when it can
         [handoff 4/4]  This file
```

Baseline is `0a0b4bd` — the tracking commit. `git diff 0a0b4bd..HEAD` is the
whole of it.

---

## 1/4 — Whose day is this? (review first)

**Why it's first:** it's a correctness fix to the thing you shipped last, and
everything after it is read *through* the usage timeline. If the timeline is
blending two people, every conclusion drawn from it — including the
personalised screen order this is all aimed at — is an average of two people
that is true of neither.

**The gap:** `usage_events` carried a per-app-open `session_id` and nothing
else. One login, that's fine. Two — Tyson and whoever's building this, or
Tyson and an offsider — and the record is unreadable, with no way to separate
it after the fact.

**What to look at, in this order:**

1. `supabase/migrations/0013_usage_identity.sql` — `user_id` + `user_email` on
   `usage_events` and `feedback`. **The data question to satisfy yourself
   about:** the RLS split. Read stays open to every signed-in user (comparing
   two people's days is the point); insert is `with check (user_id =
   auth.uid())`. That's deliberate — attribution has to be unforgeable to be
   worth reading — but it means a client that fails to stamp `user_id` now
   gets a *rejected row* rather than an anonymous one. Check you agree that's
   the right failure.
2. `src/lib/supabaseApi.js` → `whoami()`, `insertUsageEvents`,
   `submitFeedback`. Stamping happens here, at the one door into the table,
   not at each call site. **Worth checking:** the signed-out early return.
   Events queued before sign-out and flushed after are dropped rather than
   retried forever — is that the trade you'd make?
3. `src/lib/track.js` → `endSession()`, and `handleLogout` in `src/App.jsx`.
   Signing out now clears the sessionStorage id. Without it the id outlives
   the login and the next person to sign in on the same phone continues
   someone else's session.
4. `src/components/UsageTimeline.jsx` — a person filter across the top;
   totals, sessions, suggestions and the CSV all derive from one filtered
   `shown` array so the filter can't apply to half the screen.

**The data that matters when you run it:** rows written before this migration
have a null `user_id`. They're kept and shown as *"Before logins were
tracked"* rather than folded into whoever happens to be signed in. If you see
recent activity landing in that bucket, something isn't stamping and the RLS
check should have caught it — that's the bug to chase.

**Migration order note:** 0013 replaces the `authenticated full access`
policies on both tables. Apply it before deploying the client, or inserts fail
against the old policy.

---

## 2/4 — The to-do list (the biggest change; review second)

**Why second:** it's the first thing that changes what Tyson *sees*, and it's
the one most likely to be wrong in ways only he can tell you.

**The idea:** the app already knew who was past due, which invoice hadn't been
paid and which lead nobody rang back. It never said so as a list of things to
do. Today now carries "Worth doing", **below** the jobs in front of him — the
work he's actually driving to comes first.

**What to look at, in this order:**

1. `src/lib/nudges.js` — the whole thing is one pure function. Give it the
   same data twice and it says the same thing twice; that's what makes it
   testable and what stops the order shuffling under his thumb.
   **The data to check:** the thresholds at the top —
   `LEAD_UNANSWERED_DAYS = 1`, `QUOTE_UNANSWERED_DAYS = 4`,
   `INVOICE_CHASE_DAYS = 3`, `MAX_ITEMS = 8`. These are my guesses about a
   window cleaner's week, not his. They're the single highest-value thing to
   put in front of him, and they belong in `settings` once he's argued with
   them.
   **The suppression rules to verify, because a false positive here is what
   kills the list:** a customer with any future job booked gets no rebooking
   nudge regardless of due date; a lapsed customer already covered by a
   rebooking nudge isn't mentioned twice; archived rows never appear
   (`App.jsx` passes `liveRows(...)`).
2. `supabase/migrations/0014_nudges.sql` — `nudge_state`, one row per person
   per suggestion. **The key design point to review:** the nudge key is
   *derived*, not stored — `rebook:<customer_id>`, `invoice:<invoice_id>`.
   Tomorrow's identical suggestion is the same key, which is the only reason
   "snooze until Monday" means anything. If you change a key format in
   `nudges.js`, every existing snooze and completion silently detaches. Say so
   in the commit if you ever do.
   Rows are per-user (`primary key (user_id, nudge_key)`, RLS `user_id =
   auth.uid()`) — following 1/4, and because putting something off is a
   personal decision, not a fact about the business.
3. `src/components/TodoList.jsx` — three answers on every item: **Call** (the
   number, one tap, no screen in between), **Did it**, **Not now** (tomorrow /
   3 days / next week / a month). A list you can't answer is a list you
   scroll past.
4. `supabase/functions/send-reminders/index.ts` — **read this bit carefully,
   it's the only change that can email a real customer.** Items that would
   email get a fourth button, "Send it". That writes `approved_send_at`; the
   scheduled function sends it and stamps `sent_at`, spending the approval so
   it isn't standing permission to email that person forever. The existing
   Settings switches are unchanged and still mean blanket permission — the
   gate is `if (!on.due_soon && !approvedHere) continue`. With the switches
   off (they're off by default) the *only* mail that goes out is what he
   pressed send on.
   **Check:** the `recentlySent()` guard still runs ahead of an approved send,
   so an approval inside the resend window is silently swallowed. I think
   that's right — better a suppressed duplicate than a second email — but it's
   a judgement call worth a second pair of eyes.

**The data that matters when you run it:** with a fresh database and no
`nudge_state` rows, "Worth doing" should be dense — every overdue thing at
once. That's the honest first-run state and it's also the moment the list is
most likely to feel like nagging. Watch what it looks like against *his* real
data before you decide the cap of 8 is right.

`fetchNudgeStates` returns `{}` on a `42P01` (table missing) rather than
throwing, so a project that hasn't run 0014 loses the memory, not the app.

---

## 3/4 — What sort of building is this? (review last; may not survive)

**Why last:** it's the smallest change, it's isolated, and it's the one most
likely to get deleted after one conversation with Tyson. Don't polish it
before that conversation.

**The idea:** a quote is a guess about a building, and people describe their
own house badly. "Just a normal house" turns out to be a rendered two-storey
with a stairwell window over a pitched roof — and the quote is already given.
This doesn't try to be right about buildings. It tries to be right about *when
it doesn't know*, so the only thing it ever concludes is "worth a look before
you price it". It never suggests a price and never calls a building simple.

**What to look at:**

1. `src/lib/property.js` — two signals, cheapest first. The unit/level/shop
   number in the address the person typed is free, works offline, needs no
   request, and is the strongest single clue that this isn't a free-standing
   house; that runs on every lead. OpenStreetMap (the same free Nominatim the
   mileage estimate already uses) can carry building type and storeys, but
   **coverage in Australian suburbs is patchy and Nominatim's fair use doesn't
   allow looping a list through it** — so it's one tap, one address, cached.
2. `src/components/Leads.jsx` → `PropertyHint`. Note that "nothing on the map"
   is rendered as a real answer, not as silence — otherwise he taps it again
   tomorrow expecting something different.

**Known and accepted:** the slash rule matches streets written as fractions
("1/2 Acre Rd") and calls them units. It's a soft hint nobody prices off; I
left it rather than over-fitting the regex.

---

## Questions for Tyson — ask before building further

Ordered by how much downstream work the answer changes.

1. **Do you go and look at a place before you quote it, or price it off the
   phone call?** This decides 3/4 outright. If he always drives past, the
   building hint is clutter and should be deleted. If he prices off the call,
   the useful version isn't a guess at all — it's the "get eyes on this one"
   flag, which is all it currently is, and the next step is putting that flag
   where the quote gets written rather than only on Leads.
2. **When a quote has gone wrong, which direction was it?** Under-quoted a
   two-storey, or lost a job by over-quoting a simple one? A hint that only
   ever says "look closer" is only worth its screen space if the misses run
   one way.
3. **The to-do list thresholds.** How long is a lead allowed to sit before
   it's late — same day, or is tomorrow morning fine? How overdue is an
   invoice before chasing feels fair? How many items before a list stops being
   useful? All four numbers are at the top of `nudges.js` and all four are
   guesses.
4. **"Send it" — does he want to press it every time, or should some of these
   go automatically once he's seen a few?** The approval path is built and the
   blanket switches still work; what's missing is knowing which he'd actually
   trust after a fortnight.
5. **Is anyone else ever going to log in?** 1/4 assumes yes eventually. If the
   answer is a firm no, the person filter is dead weight on his screen —
   though the attribution itself still earns its place the moment you and he
   are both in the timeline.

## What I didn't do

- **No demo-mode versions** of nudges or property lookups. Nudge state is
  always real (a snooze is a decision about real work, and losing it on a demo
  toggle would be the kind of small betrayal that stops someone trusting the
  list). But it does mean a demo walkthrough shows "Worth doing" built from
  demo data with real snoozes on top. Worth deciding deliberately.
- **No tests.** There's no test runner in the repo. `nudges.js` is pure and
  was the obvious candidate; if you're adding a runner, start there.
- **Nothing moved on the Dashboard.** "Worth doing" is on Today only. The
  Dashboard's "needs attention" panel now overlaps it — worth reconciling once
  Tyson has said which screen he actually opens.
