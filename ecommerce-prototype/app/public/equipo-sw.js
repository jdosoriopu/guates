// Service worker for the owner's dashboard: shows order notices and opens the order on tap.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const url = data.url || "/equipo";
  event.waitUntil(
    self.registration.showNotification(data.title || "Guates · Pedidos", {
      body: data.body || "",
      data: { url },
      icon: "/equipo-icon-192.png",
      tag: url,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/equipo", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((c) => new URL(c.url).pathname.startsWith("/equipo"));
      if (open) {
        // navigate() only works on clients this worker controls; fall back to a new window.
        const moved = await open.navigate(target).catch(() => null);
        if (moved) return moved.focus();
      }
      return self.clients.openWindow(target);
    })(),
  );
});
