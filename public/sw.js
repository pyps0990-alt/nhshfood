const CACHE_NAME = "nhsh-food-v3";
const STATIC_CACHE = "nhsh-static-v3";
const API_CACHE = "nhsh-api-v2";

const PRECACHE_URLS = ["/"];

const STATIC_EXTENSIONS = /\.(js|css|woff2?|png|jpg|jpeg|svg|ico|webp)$/;
const CACHEABLE_API = /\/api\/(menu|settings)/;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  const keep = new Set([CACHE_NAME, STATIC_CACHE, API_CACHE]);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Navigation: network-first with offline fallback
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/"))
    );
    return;
  }

  // Static assets: cache-first (immutable hashed filenames)
  if (STATIC_EXTENSIONS.test(url.pathname) && url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Cacheable API (menu, settings): stale-while-revalidate
  if (CACHEABLE_API.test(url.pathname) && event.request.method === "GET") {
    event.respondWith(
      caches.open(API_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          const networkFetch = fetch(event.request).then((response) => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          }).catch(() => cached);

          return cached || networkFetch;
        })
      )
    );
    return;
  }
});

// Web Push Notifications
self.addEventListener("push", (event) => {
  let data = { title: "訂單更新", body: "您的訂單狀態已更新", orderNumber: "", orderId: "", status: "" };
  try {
    if (event.data) data = event.data.json();
  } catch (_) {}

  const vibrationPatterns = {
    ready: [300, 100, 300, 100, 300],
    confirmed: [200, 100, 200],
    cancelled: [500],
  };

  const options = {
    body: data.body,
    icon: "/icon-192.svg",
    badge: "/badge.svg",
    tag: "order-" + (data.orderNumber || "update"),
    renotify: true,
    requireInteraction: data.status === "ready",
    data: { orderId: data.orderId, orderNumber: data.orderNumber },
    vibrate: vibrationPatterns[data.status] || [200, 100, 200],
    actions: data.status === "ready"
      ? [{ action: "view", title: "查看訂單" }]
      : [{ action: "view", title: "查看詳情" }],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const orderId = event.notification.data?.orderId;
  const url = orderId ? "/order/" + orderId : "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
