import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareImport } from '../src/lib/data-transfer.mjs';
test('legacy imports are stable per account and preserve linked relationships', async () => {
  const input = { Reserve: [{id:'old-reserve',name:'Emergency'}], Investment: [{id:'old-investment',reserve_id:'old-reserve'}], InvestmentTransaction:[{id:'old-tx',investment_id:'old-investment',amount:25}] };
  const first = await prepareImport(input,'alice');
  assert.deepEqual(first, await prepareImport(input,'alice'));
  assert.notEqual(first[0].id, (await prepareImport(input,'bob'))[0].id);
  assert.equal(first[1].data.reserve_id,first[0].id); assert.equal(first[2].data.investment_id,first[1].id);
  await assert.rejects(prepareImport({ Investment:[{id:'one',reserve_id:'missing'}] },'alice'));
});
test('a native backup restored to its owner retains IDs rather than duplicating records', async () => {
  const id = '12345678-1234-5678-9012-123456789012';
  const [row] = await prepareImport({ format:'vault-backup',ownerId:'alice',entities:{ Income:[{id,amount:10,user_id:'someone-else'}] } },'alice');
  assert.equal(row.id,id); assert.equal(row.data.user_id,undefined);
});
