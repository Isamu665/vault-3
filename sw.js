const CACHE = "vault-shell-931446ca772e";
const FILES = ["/vault-3/","/vault-3/index.html","/vault-3/manifest.json","/vault-3/icon.svg","/vault-3/icon-192.png","/vault-3/icon-512.png","/vault-3/icon-maskable.png","/vault-3/assets/AssistantChat-Dmb175Kj.js","/vault-3/assets/BalanceLineChart-D06rXy5f.js","/vault-3/assets/BarChart-Bv1A6zi3.js","/vault-3/assets/Dashboard-ovFR6Y9C.js","/vault-3/assets/index-BAAIqCRm.css","/vault-3/assets/index-BJ8ZdpC3.js","/vault-3/assets/LineChart-F1E_uIgQ.js","/vault-3/assets/Patrimonio-DM-buWJM.js","/vault-3/assets/piggy-bank-D-RguFS1.js","/vault-3/assets/refresh-cw-5SiYZyr1.js","/vault-3/assets/Reports-BcRgvjnL.js","/vault-3/assets/Simulacro-CxAFIasG.js","/vault-3/assets/StatCard-DfSmW2Yd.js"];
self.addEventListener("install", event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES))); });
self.addEventListener("activate", event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("vault-shell-") && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", event => {
 const url = new URL(event.request.url);
 if(event.request.method !== "GET" || url.origin !== self.location.origin || !url.pathname.startsWith("/vault-3/")) return;
 if(event.request.mode === "navigate") { event.respondWith(fetch(event.request).catch(() => caches.match("/vault-3/index.html"))); return; }
 if(FILES.includes(url.pathname)) event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});