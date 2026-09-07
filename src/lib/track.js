// Usage tracking: which screen, for how long, and every tap by its own label.
//
// Deliberately dumb. No analytics library, no identifiers beyond a per-open
// session id, nothing sent anywhere but this app's own database. Events are
// batched and flushed every few seconds and when the tab is hidden, so a
// phone going in a pocket mid-job still gets its last screen recorded.
//
// This runs even in demo mode - the behaviour is the point, not the data set.

import { insertUsageEvents } from "./supabaseApi";
import { BUSINESS } from "./business";

const FLUSH_MS = 4000;
const SESSION_KEY = "tydie_usage_session";

let sessionId = null;
let queue = [];
let timer = null;
let current = null; // { screen, since }
let enabled = BUSINESS.features.tracking !== false;
let user = { id: null, email: null };

// Which login this is. user_id is also set by the database from auth.uid()
// so it can't be faked; the email is for reading the timeline.
export function setTrackedUser(u) {
  user = { id: u?.id || null, email: u?.email || null };
}

function newSessionId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function meta() {
  return {
    vw: window.innerWidth,
    vh: window.innerHeight,
    online: navigator.onLine,
    standalone: window.matchMedia?.("(display-mode: standalone)")?.matches || false,
  };
}

function push(evt) {
  if (!enabled || !sessionId) return;
  queue.push({ session_id: sessionId, occurred_at: new Date().toISOString(), user_email: user.email, ...evt });
  if (!timer) timer = setTimeout(flush, FLUSH_MS);
}

export async function flush() {
  clearTimeout(timer);
  timer = null;
  if (queue.length === 0) return;
  const batch = queue;
  queue = [];
  try {
    await insertUsageEvents(batch);
  } catch {
    // Put them back and try again next flush; never let tracking break the app.
    queue = batch.concat(queue);
  }
}

// Close the current screen event with how long it was open.
function closeScreen() {
  if (!current) return;
  const duration_ms = Date.now() - current.since;
  push({ kind: "screen", screen: current.screen, duration_ms, meta: meta() });
  current = null;
}

export function startSession() {
  if (!enabled) return;
  try {
    sessionId = sessionStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      sessionId = newSessionId();
      sessionStorage.setItem(SESSION_KEY, sessionId);
      push({ kind: "session_start", meta: { ...meta(), ua: navigator.userAgent.slice(0, 120), path: location.pathname + location.search } });
    }
  } catch {
    sessionId = newSessionId();
  }

  // The tab going away is the most reliable "they stopped" signal on a phone.
  const onHide = () => {
    if (document.visibilityState === "hidden") {
      closeScreen();
      push({ kind: "session_end", meta: meta() });
      flush();
    } else if (current == null && lastScreen) {
      // Came back: reopen the screen they were on so dwell time resumes.
      current = { screen: lastScreen, since: Date.now() };
    }
  };
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", onHide);
}

let lastScreen = null;
export function trackScreen(screen) {
  if (!enabled || !screen || screen === current?.screen) return;
  closeScreen();
  current = { screen, since: Date.now() };
  lastScreen = screen;
}

export function trackTap(label, extra = {}) {
  if (!enabled || !label) return;
  push({ kind: "tap", screen: current?.screen || lastScreen, label: String(label).slice(0, 80), meta: { ...extra } });
}

export function trackFeedback(screen) {
  push({ kind: "feedback", screen });
  flush();
}

export function currentScreen() {
  return current?.screen || lastScreen;
}

export function currentSessionId() {
  return sessionId;
}

export function trackedUser() {
  return user;
}

// Attach once. Reads the tapped control's own words so the log says
// "Mark done" or "Can't do it today", never "button#3".
export function attachTapListener() {
  if (!enabled) return () => {};
  const handler = (e) => {
    const el = e.target.closest?.("button, a, [role='button'], input[type='checkbox'], input[type='radio'], select, summary");
    if (!el) return;
    let label =
      el.getAttribute("aria-label") ||
      el.getAttribute("title") ||
      (el.tagName === "INPUT" || el.tagName === "SELECT" ? el.closest("label")?.innerText : null) ||
      el.innerText ||
      el.getAttribute("href") ||
      el.tagName;
    label = label.replace(/\s+/g, " ").trim();
    if (!label) return;
    const extra = {};
    if (el.tagName === "A" && el.getAttribute("href")) extra.href = el.getAttribute("href").slice(0, 60);
    if (el.tagName === "INPUT" && el.type === "checkbox") extra.checked = el.checked;
    trackTap(label, extra);
  };
  document.addEventListener("click", handler, true);
  return () => document.removeEventListener("click", handler, true);
}
