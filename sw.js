const CACHE = "vault-shell-88617822b485";
const FILES = ["/vault-3/","/vault-3/index.html","/vault-3/manifest.json","/vault-3/icon.svg","/vault-3/icon-192.png","/vault-3/icon-512.png","/vault-3/icon-maskable.png","/vault-3/assets/AssistantChat-DPAOchJL.js","/vault-3/assets/BalanceLineChart-NZE09kgP.js","/vault-3/assets/BarChart-BK98B1Uu.js","/vault-3/assets/Dashboard-yKuj7XjA.js","/vault-3/assets/index-BAAIqCRm.css","/vault-3/assets/index-DS-ZLCwD.js","/vault-3/assets/LineChart-pBhsIrdJ.js","/vault-3/assets/Patrimonio-HMPWKxr-.js","/vault-3/assets/piggy-bank-DkktD9yb.js","/vault-3/assets/refresh-cw-Dt5Nk6yH.js","/vault-3/assets/Reports-T9_n3Xwf.js","/vault-3/assets/Simulacro-66QBy7V1.js","/vault-3/assets/StatCard-DcCHvnzY.js"];
self.addEventListener("install", event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES))); });
self.addEventListener("activate", event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("vault-shell-") && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", event => {
 const url = new URL(event.request.url);
 if(event.request.method !== "GET" || url.origin !== self.location.origin || !url.pathname.startsWith("/vault-3/")) return;
 if(event.request.mode === "navigate") { event.respondWith(fetch(event.request).catch(() => caches.match("/vault-3/index.html"))); return; }
 if(FILES.includes(url.pathname)) event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});