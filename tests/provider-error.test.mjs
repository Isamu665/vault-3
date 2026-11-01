import test from 'node:test';
import assert from 'node:assert/strict';
import { providerFailure } from '../supabase/functions/assistant/provider-error.mjs';
test('provider errors distinguish quota, key, access and model without exposing raw messages', () => {
  for (const [status, text] of [[429,'cota'],[403,'negou'],[404,'modelo'],[400,'configuração'],[503,'temporariamente']]) assert.ok(providerFailure(status).error.includes(text));
  const failure = providerFailure(400,{error:{status:'INVALID_ARGUMENT',message:'API key secret-value',details:[{reason:'API_KEY_INVALID',metadata:{secret:'secret-value'}}]}});
  assert.ok(failure.error.includes('chave')); assert.ok(!JSON.stringify(failure).includes('secret-value'));
});

