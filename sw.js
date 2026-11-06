const CACHE = "vault-shell-c5cb07e499b5";
const FILES = ["/vault-3/","/vault-3/index.html","/vault-3/manifest.json","/vault-3/icon.svg","/vault-3/icon-192.png","/vault-3/icon-512.png","/vault-3/icon-maskable.png","/vault-3/assets/AssistantChat-COAXWo-W.js","/vault-3/assets/BalanceLineChart-qV-TRFa6.js","/vault-3/assets/BarChart-CCdXupJa.js","/vault-3/assets/Dashboard-BIHw9s5n.js","/vault-3/assets/generateCategoricalChart-bqjWVcDN.js","/vault-3/assets/index-Ex4ySKw_.js","/vault-3/assets/index-NGYEZKWF.css","/vault-3/assets/Patrimonio-Cr8Jdg_l.js","/vault-3/assets/piggy-bank-BZZYiBeN.js","/vault-3/assets/refresh-cw-gguSHcDv.js","/vault-3/assets/Reports-BeCZLsfF.js","/vault-3/assets/Simulacro-C32ec811.js","/vault-3/assets/StatCard-D0val_ui.js"];
self.addEventListener("install", event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES))); });
self.addEventListener("activate", event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("vault-shell-") && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", event => {
 const url = new URL(event.request.url);
 if(event.request.method !== "GET" || url.origin !== self.location.origin || !url.pathname.startsWith("/vault-3/")) return;
 if(event.request.mode === "navigate") { event.respondWith(fetch(event.request).catch(() => caches.match("/vault-3/index.html"))); return; }
 if(FILES.includes(url.pathname)) event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});