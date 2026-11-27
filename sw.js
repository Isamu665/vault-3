const CACHE = "vault-shell-fbbf04b289bf";
const FILES = ["/vault-3/","/vault-3/index.html","/vault-3/manifest.json","/vault-3/icon.svg","/vault-3/icon-192.png","/vault-3/icon-512.png","/vault-3/icon-maskable.png","/vault-3/assets/AssistantChat-CZZKJh8Z.js","/vault-3/assets/BalanceLineChart-CI7wkY3h.js","/vault-3/assets/BarChart-BtsjG8Qa.js","/vault-3/assets/Dashboard-Dh3JHyCH.js","/vault-3/assets/index-BAAIqCRm.css","/vault-3/assets/index-o3-E8bRO.js","/vault-3/assets/LineChart-BeqDU6PR.js","/vault-3/assets/Patrimonio-h6weJYgD.js","/vault-3/assets/piggy-bank-Ds1t7fKQ.js","/vault-3/assets/refresh-cw-BzdUqsNr.js","/vault-3/assets/Reports-WNXYrNGH.js","/vault-3/assets/Simulacro-7o-CyeJb.js","/vault-3/assets/StatCard-BdeJM2_k.js"];
self.addEventListener("install", event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES))); });
self.addEventListener("activate", event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("vault-shell-") && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", event => {
 const url = new URL(event.request.url);
 if(event.request.method !== "GET" || url.origin !== self.location.origin || !url.pathname.startsWith("/vault-3/")) return;
 if(event.request.mode === "navigate") { event.respondWith(fetch(event.request).catch(() => caches.match("/vault-3/index.html"))); return; }
 if(FILES.includes(url.pathname)) event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});