// Service worker personnalisé (mode injectManifest de next-pwa).
// Remplace la génération automatique (generateSW) pour pouvoir ajouter les
// listeners push/notificationclick — on rejoue donc ici les mêmes règles de
// cache que next-pwa/cache utilise en interne, pour ne rien régresser côté
// comportement hors-ligne.

import { PrecacheController, PrecacheRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst, StaleWhileRevalidate, NetworkFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import runtimeCaching from "next-pwa/cache";

// precacheAndRoute() fait échouer TOUTE l'installation si UN SEUL asset ne
// peut pas être précaché (réseau instable, timing de déploiement, etc.) —
// on gère donc l'installation nous-mêmes pour qu'un échec partiel de
// précache n'empêche jamais le SW de s'activer (symptôme observé :
// "le service worker a échoué à s'installer").
const precacheController = new PrecacheController();
precacheController.addToCacheList(self.__WB_MANIFEST);
registerRoute(new PrecacheRoute(precacheController));

self.addEventListener("install", (event) => {
  event.waitUntil(
    precacheController.install(event).catch((err) => {
      console.error("[sw] précache partiellement échoué, installation poursuivie quand même:", err);
    })
  );
});

// next-pwa's `skipWaiting`/`register` options only affect its own
// auto-generated service worker — since we provide a custom source
// (swSrc), those config options are silently ignored here. Without this,
// a newly deployed SW stays stuck in "waiting" behind any already-open
// tab, and won't take control of open pages even once activated — every
// deploy required fully closing the site to pick up new code, which
// looked like fixes "not applying" the same way twice in this session.
self.skipWaiting();
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      precacheController.activate(event).catch(() => {}),
      self.clients.claim(),
    ])
  );
});

const STRATEGIES = { CacheFirst, StaleWhileRevalidate, NetworkFirst };

for (const entry of runtimeCaching) {
  const StrategyClass = STRATEGIES[entry.handler];
  if (!StrategyClass) continue;
  const opts = entry.options ?? {};
  const plugins = [];
  if (opts.expiration) plugins.push(new ExpirationPlugin(opts.expiration));
  if (opts.cacheableResponse) plugins.push(new CacheableResponsePlugin(opts.cacheableResponse));
  registerRoute(
    entry.urlPattern,
    new StrategyClass({
      cacheName: opts.cacheName,
      networkTimeoutSeconds: opts.networkTimeoutSeconds,
      plugins,
    })
  );
}

// ── Notifications push ──────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || "Kayakbet";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url || "/app" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/app";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      const existing = clientsArr.find((c) => c.url.includes(url));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});
