import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveReturnTo } from '../src/lib/return-path.mjs';

const origin = 'https://isamu665.github.io';
const resolve = (raw) => resolveReturnTo(raw, origin, '/vault-3/');

test('retains the project prefix through login redirects', () => {
  assert.equal(resolve(null), '/vault-3/');
  assert.equal(resolve('/'), '/vault-3/');
  assert.equal(resolve('/receitas?month=11'), '/vault-3/receitas?month=11');
  assert.equal(resolve('/vault-3/receitas?month=11'), '/vault-3/receitas?month=11');
  assert.equal(resolve(origin + '/vault-3/metas'), '/vault-3/metas');
  assert.equal(resolveReturnTo('/receitas', origin), '/receitas');
});

test('rejects external destinations and strips bootstrap credentials', () => {
  for (const raw of ['https://evil.test/', '//evil.test', '/\\evil.test', '/%2f/evil.test', '/%5cevil.test']) {
    assert.equal(resolve(raw), '/vault-3/');
  }
  assert.equal(
    resolve('/vault-3/metas?access_token=secret&app_id=other&app_base_url=https://evil.test&ctx=ok'),
    '/vault-3/metas?ctx=ok',
  );
});
