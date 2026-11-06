import { copyFile, writeFile, readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
await copyFile('dist/index.html','dist/404.html');
await writeFile('dist/.nojekyll','');
const sourceCommit = process.env.GITHUB_SHA;
if (sourceCommit && /^[a-f0-9]{40}$/i.test(sourceCommit)) {
  await writeFile('dist/version.json', JSON.stringify({ sourceCommit }) + '\n');
}
const html = await readFile('dist/index.html','utf8');
const base = html.match(/href="([^"]*)manifest.json"/)[1];
const assets = (await readdir('dist/assets')).map(file => base + 'assets/' + file);
const files = [base, base + 'index.html', base + 'manifest.json', base + 'icon.svg',
  base + 'icon-192.png', base + 'icon-512.png', base + 'icon-maskable.png', ...assets];
const version = createHash('sha256').update(html).digest('hex').slice(0,12);
const worker = [
  'const CACHE = ' + JSON.stringify('vault-shell-' + version) + ';',
  'const FILES = ' + JSON.stringify(files) + ';',
  'self.addEventListener("install", event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES))); });',
  'self.addEventListener("activate", event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("vault-shell-") && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });',
  'self.addEventListener("fetch", event => {',
  ' const url = new URL(event.request.url);',
  ' if(event.request.method !== "GET" || url.origin !== self.location.origin || !url.pathname.startsWith(' + JSON.stringify(base) + ')) return;',
  ' if(event.request.mode === "navigate") { event.respondWith(fetch(event.request).catch(() => caches.match(' + JSON.stringify(base + 'index.html') + '))); return; }',
  ' if(FILES.includes(url.pathname)) event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));',
  '});'
].join('\n');
await writeFile('dist/sw.js',worker);
