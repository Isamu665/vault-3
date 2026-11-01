import { copyFile, writeFile } from 'node:fs/promises';

// Pages has no SPA rewrites. Its custom 404 loads the same app on deep links.
await copyFile('dist/index.html', 'dist/404.html');
await writeFile('dist/.nojekyll', '');
