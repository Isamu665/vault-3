import test from 'node:test';
import assert from 'node:assert/strict';
import { consentKey, hasAssistantConsent, saveAssistantConsent } from '../src/lib/assistant-consent.mjs';

test('assistant permission persists, remains account-scoped, can be revoked and fails closed', () => {
  const rows = new Map();
  const storage = { getItem: key => rows.get(key) ?? null, setItem: (key, value) => rows.set(key, value), removeItem: key => rows.delete(key) };
  assert.equal(hasAssistantConsent(storage, 'alice'), false);
  saveAssistantConsent(storage, 'alice', true);
  assert.equal(hasAssistantConsent(storage, 'alice'), true);
  assert.equal(hasAssistantConsent(storage, 'bob'), false);
  assert.equal(hasAssistantConsent(storage, null), false);
  assert.throws(() => saveAssistantConsent(storage, null, true));
  saveAssistantConsent(storage, 'alice', false);
  assert.equal(hasAssistantConsent(storage, 'alice'), false);
  for (const value of ['bad json', '{}', '{"version":2,"granted":true,"grantedAt":"2026-11-02"}', '{"version":1,"granted":true,"grantedAt":"invalid"}']) {
    storage.setItem(consentKey('alice'), value);
    assert.equal(hasAssistantConsent(storage, 'alice'), false);
  }
  const blocked = { getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('blocked'); } };
  assert.equal(hasAssistantConsent(blocked, 'alice'), false);
  assert.throws(() => saveAssistantConsent(blocked, 'alice', true));
});
