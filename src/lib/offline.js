// A queue for the handful of things done standing at a house: mark done,
// move a job, cancel it, jot a note, log an expense. When there's no signal
// the action is written here instead of failing, the screen updates as if it
// worked, and the queue drains the moment the phone is back online - in order,
// one at a time, so a job isn't invoiced before it's completed.
//
// Kept deliberately small. It is not a sync engine: reads still need the
// network, and anything not in the list below still fails honestly with a
// toast. Photos can't be queued (they're too big for localStorage), so an
// expense logged offline goes without its receipt and says so.

const KEY = "tydie_offline_queue";

let listeners = new Set();
function notify() {
  for (const fn of listeners) fn(load());
}
export function onQueueChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}
function save(q) {
  try {
    localStorage.setItem(KEY, JSON.stringify(q));
  } catch {
    // Full or blocked storage: the write goes through the normal failure path.
  }
  notify();
}

export function pending() {
  return load();
}

// Treat these as "no signal" rather than "the server said no". A server that
// answered with an error (a bad request, a policy refusal) is not a reason to
// keep retrying forever.
export function isNetworkFailure(err) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const msg = String(err?.message || err || "").toLowerCase();
  return err?.name === "TypeError" || /failed to fetch|network|load failed|fetch failed|timeout|abort/.test(msg);
}

// Queue an action by name with its arguments. `describe` is what the pill on
// Today shows - "Mark Sarah Nguyen done", not "completeJob".
export function enqueue(action, args, describe) {
  const q = load();
  q.push({ id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, at: new Date().toISOString(), action, args, describe });
  save(q);
}

// Drain in order. `perform(action, args)` runs the real write. Stops at the
// first network failure (still offline); drops an item the server rejected
// outright after reporting it, so one bad row can't jam everything behind it.
export async function drain(perform, report) {
  if (draining) return;
  draining = true;
  try {
    let q = load();
    while (q.length) {
      const item = q[0];
      try {
        await perform(item.action, item.args);
        q = q.slice(1);
        save(q);
      } catch (err) {
        if (isNetworkFailure(err)) break;
        report?.(item, err);
        q = q.slice(1);
        save(q);
      }
    }
  } finally {
    draining = false;
  }
}
let draining = false;

// Wire the "we're back" moments: coming online, the app returning to the
// foreground, and app start.
export function attachDrain(run) {
  const go = () => run();
  window.addEventListener("online", go);
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && go());
  setTimeout(go, 1500);
  return () => window.removeEventListener("online", go);
}
