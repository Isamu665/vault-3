const CACHE = "vault-shell-96a734a8b24a";
const FILES = ["/vault-3/","/vault-3/index.html","/vault-3/manifest.json","/vault-3/icon.svg","/vault-3/icon-192.png","/vault-3/icon-512.png","/vault-3/icon-maskable.png","/vault-3/assets/AssistantChat-q67ZS540.js","/vault-3/assets/BalanceLineChart-atRDlBPq.js","/vault-3/assets/BarChart-Bkosex8F.js","/vault-3/assets/Dashboard-BQxdZaI0.js","/vault-3/assets/generateCategoricalChart-CRyzQ-Ll.js","/vault-3/assets/index-DmFsG-Qe.js","/vault-3/assets/index-NGYEZKWF.css","/vault-3/assets/Patrimonio-Cz3MpIi-.js","/vault-3/assets/piggy-bank-CoP4YQOm.js","/vault-3/assets/refresh-cw-gHlL7Vjy.js","/vault-3/assets/Reports-BI3OXV95.js","/vault-3/assets/Simulacro-BxSE3LDF.js","/vault-3/assets/StatCard-D_QpHh_K.js"];
self.addEventListener("install", event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES))); });
self.addEventListener("activate", event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("vault-shell-") && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", event => {
 const url = new URL(event.request.url);
 if(event.request.method !== "GET" || url.origin !== self.location.origin || !url.pathname.startsWith("/vault-3/")) return;
 if(event.request.mode === "navigate") { event.respondWith(fetch(event.request).catch(() => caches.match("/vault-3/index.html"))); return; }
 if(FILES.includes(url.pathname)) event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});