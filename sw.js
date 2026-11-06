const CACHE = "vault-shell-85c07f6ff19a";
const FILES = ["/vault-3/","/vault-3/index.html","/vault-3/manifest.json","/vault-3/icon.svg","/vault-3/icon-192.png","/vault-3/icon-512.png","/vault-3/icon-maskable.png","/vault-3/assets/AssistantChat-Btkssqpq.js","/vault-3/assets/BalanceLineChart-BHzpOqKj.js","/vault-3/assets/BarChart-ZlygHGi6.js","/vault-3/assets/Dashboard-5Otb1Wr_.js","/vault-3/assets/generateCategoricalChart-D2Bpc_e6.js","/vault-3/assets/index-DXnwwImG.js","/vault-3/assets/index-NGYEZKWF.css","/vault-3/assets/Patrimonio-PDgWMZzd.js","/vault-3/assets/piggy-bank-Bvvbzxlf.js","/vault-3/assets/refresh-cw-Csjcdsze.js","/vault-3/assets/Reports-7ovzCkfh.js","/vault-3/assets/Simulacro-DkoOuxQq.js","/vault-3/assets/StatCard-B1yOOiIb.js"];
self.addEventListener("install", event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES))); });
self.addEventListener("activate", event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("vault-shell-") && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", event => {
 const url = new URL(event.request.url);
 if(event.request.method !== "GET" || url.origin !== self.location.origin || !url.pathname.startsWith("/vault-3/")) return;
 if(event.request.mode === "navigate") { event.respondWith(fetch(event.request).catch(() => caches.match("/vault-3/index.html"))); return; }
 if(FILES.includes(url.pathname)) event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});