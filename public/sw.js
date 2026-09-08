// Service worker: receives push messages and shows them. Nothing else - no
// caching, no offline shell - because the app's offline behaviour lives in
// the app itself (src/lib/offline.js) where it can be reasoned about.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Tydie", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Tydie";
  const options = {
    body: data.body || "",
    icon: "/tydie-icon-192.png",
    badge: "/tydie-icon-192.png",
    data: { url: data.url || "/team" },
    tag: data.tag || undefined,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/team";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) {
          c.navigate?.(url);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
