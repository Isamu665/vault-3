const CACHE = "vault-shell-fb97bffb5f0a";
const FILES = ["/vault-3/","/vault-3/index.html","/vault-3/manifest.json","/vault-3/icon.svg","/vault-3/icon-192.png","/vault-3/icon-512.png","/vault-3/icon-maskable.png","/vault-3/assets/AssistantChat-XQtb9pIZ.js","/vault-3/assets/BalanceLineChart-C1BX7475.js","/vault-3/assets/BarChart-pnrtVkRN.js","/vault-3/assets/Dashboard-D3F8rZ_M.js","/vault-3/assets/generateCategoricalChart-BQc0ZuEZ.js","/vault-3/assets/index-86mK1n84.css","/vault-3/assets/index-BF966xOW.js","/vault-3/assets/Patrimonio-BjVeZzH5.js","/vault-3/assets/piggy-bank-BGYxndif.js","/vault-3/assets/refresh-cw-B66rQuua.js","/vault-3/assets/Reports-DXTkfB-f.js","/vault-3/assets/Simulacro-CLSpppsA.js","/vault-3/assets/StatCard-DoQeyGzF.js"];
self.addEventListener("install", event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES))); });
self.addEventListener("activate", event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("vault-shell-") && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", event => {
 const url = new URL(event.request.url);
 if(event.request.method !== "GET" || url.origin !== self.location.origin || !url.pathname.startsWith("/vault-3/")) return;
 if(event.request.mode === "navigate") { event.respondWith(fetch(event.request).catch(() => caches.match("/vault-3/index.html"))); return; }
 if(FILES.includes(url.pathname)) event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});