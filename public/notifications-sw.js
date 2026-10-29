// Displays page-triggered notifications only. No push subscriptions or offline caching.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(
    event.notification.data?.href || "/notifications",
    self.location.origin,
  );
  if (url.origin !== self.location.origin) return;
  event.waitUntil(self.clients.openWindow(url.href));
});
