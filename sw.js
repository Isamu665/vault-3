const CACHE = "vault-shell-ecb8564e08b4";
const FILES = ["/vault-3/","/vault-3/index.html","/vault-3/manifest.json","/vault-3/icon.svg","/vault-3/icon-192.png","/vault-3/icon-512.png","/vault-3/icon-maskable.png","/vault-3/assets/AssistantChat-BkUxw_8Y.js","/vault-3/assets/BalanceLineChart-D_ZmyYFz.js","/vault-3/assets/BarChart-BOG62hzr.js","/vault-3/assets/Dashboard-CSwBa-j2.js","/vault-3/assets/index-BAAIqCRm.css","/vault-3/assets/index-FQy88lB0.js","/vault-3/assets/LineChart-IjOTm7ou.js","/vault-3/assets/Patrimonio-B8CWy7ov.js","/vault-3/assets/piggy-bank-BG1QgY8j.js","/vault-3/assets/refresh-cw-Cwm5VpVJ.js","/vault-3/assets/Reports-BjRv8ei0.js","/vault-3/assets/Simulacro-CC61jRjp.js","/vault-3/assets/StatCard-BEq2oRRf.js"];
self.addEventListener("install", event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES))); });
self.addEventListener("activate", event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("vault-shell-") && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", event => {
 const url = new URL(event.request.url);
 if(event.request.method !== "GET" || url.origin !== self.location.origin || !url.pathname.startsWith("/vault-3/")) return;
 if(event.request.mode === "navigate") { event.respondWith(fetch(event.request).catch(() => caches.match("/vault-3/index.html"))); return; }
 if(FILES.includes(url.pathname)) event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});