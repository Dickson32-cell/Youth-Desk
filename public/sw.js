// Youth Desk NJSMA service worker - FAIL-OPEN by design.
// - /api/* is NEVER cached: anything visible is truly on the server.
// - Navigations go network-first with an offline fallback page.
// - Static assets (_next/static + icons) are cache-first (immutable builds).
const VERSION = "ydw-v1";
const SHELL = ["/offline.html", "/icons-192.png", "/icons-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/image?")) return; // live data passthrough
  if (e.request.mode === "navigate" || (e.request.headers.get("accept") || "").includes("text/html")) {
    e.respondWith(
      fetch(e.request)
        .then((r) => r)
        .catch(() => caches.match("/offline.html").then((m) => m || new Response("Offline", { status: 503 })))
    );
    return;
  }
  if (url.pathname.startsWith("/_next/static/") || /icons-|maskable-|\.ico$/.test(url.pathname)) {
    e.respondWith(
      caches.match(e.request).then((m) =>
        m ||
        fetch(e.request).then((r) => {
          const copy = r.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy)).catch(() => {});
          return r;
        }).catch(() => new Response("", { status: 503 }))
      )
    );
  }
});
