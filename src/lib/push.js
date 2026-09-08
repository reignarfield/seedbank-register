// Push notifications, scaffolded. Nothing is sent yet. This registers the
// service worker and, when the owner turns the switch on, subscribes this
// device and stores the subscription - so that when sending is switched on
// later (an Edge Function with the matching private key, see
// supabase/functions/send-push) there are devices to send to.
//
// Needs VITE_VAPID_PUBLIC_KEY at build time. Without it the switch in
// Settings is shown disabled with a note, rather than pretending.

import { savePushSubscription, removePushSubscription } from "./api";

const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

export const pushAvailable = () =>
  Boolean(VAPID_PUBLIC) && typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

export function registerServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

function urlBase64ToUint8Array(base64) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export async function currentSubscription() {
  if (!pushAvailable()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

export async function subscribeThisDevice() {
  if (!pushAvailable()) throw new Error("Push isn't set up for this build yet.");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notifications were not allowed on this phone.");
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) });
  const json = sub.toJSON();
  await savePushSubscription({ endpoint: json.endpoint, keys: json.keys, user_agent: navigator.userAgent.slice(0, 120) });
  return sub;
}

export async function unsubscribeThisDevice() {
  const sub = await currentSubscription();
  if (!sub) return;
  await removePushSubscription(sub.endpoint).catch(() => {});
  await sub.unsubscribe();
}
