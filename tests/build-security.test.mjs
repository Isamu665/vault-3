import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { assertPublicArtifact, validatePublicSupabaseConfig } from '../scripts/build-security.mjs';

const publicKey = 'sb_publishable_' + 'a'.repeat(28);
const privateKey = 'sb_secret_' + 'b'.repeat(28);
const legacyJWT = role => {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  return [encode({ alg: 'HS256' }), encode({ role }), 'invalidTestSignature'].join('.');
};

test('the frontend accepts a public Supabase key or an anonymous legacy key', () => {
  validatePublicSupabaseConfig('https://example.supabase.co', publicKey);
  validatePublicSupabaseConfig('http://127.0.0.1:54321', legacyJWT('anon'));
  validatePublicSupabaseConfig('', '');
});

test('unsafe frontend configuration is rejected without printing its value', () => {
  for (const value of [privateKey, legacyJWT('service_role'), legacyJWT('authenticated'), 'arbitrary-value']) {
    assert.throws(() => validatePublicSupabaseConfig('https://example.supabase.co', value), error => {
      return /VITE_SUPABASE_PUBLISHABLE_KEY/.test(error.message) && !error.message.includes(value);
    });
  }
  const url = 'https://user:private@supabase.example';
  assert.throws(() => validatePublicSupabaseConfig(url, publicKey), error => {
    return /VITE_SUPABASE_URL/.test(error.message) && !error.message.includes(url);
  });
});

test('public artifacts reject private keys, privileged JWTs, and local environment files', async t => {
  const root = await mkdtemp(join(tmpdir(), 'vault-build-security-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const assets = join(root, 'assets');
  await mkdir(assets);
  const app = join(assets, 'app.js');
  await writeFile(app, JSON.stringify({ publicKey, anon: legacyJWT('anon') }));
  await assertPublicArtifact(root);

  for (const [value, encoding] of [[privateKey, 'utf8'], [legacyJWT('service_role'), 'utf16le']]) {
    await writeFile(app, JSON.stringify({ value }), encoding);
    await assert.rejects(assertPublicArtifact(root), error => {
      return /app\.js/.test(error.message) && !error.message.includes(value);
    });
  }

  await rm(app);
  await writeFile(join(root, '.env.local'), '');
  await assert.rejects(assertPublicArtifact(root), /\.env\.local/);
});
