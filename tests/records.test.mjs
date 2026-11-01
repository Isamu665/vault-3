import test from 'node:test';
import assert from 'node:assert/strict';
import { recordData, fromRecord, sortRecords } from '../src/api/record-model.mjs';
test('record metadata comes from the database, not user-controlled JSON', () => {
  assert.deepEqual(recordData({ id:'spoofed',user_id:'other',created_by_id:'other',amount:10 }), {amount:10});
  assert.equal(fromRecord({id:'real',data:{id:'spoofed',amount:10}}).id,'real');
});
test('sorting uses numeric comparisons and preserves the original list', () => {
  const rows=[{amount:2},{amount:10},{amount:1}];
  assert.deepEqual(sortRecords(rows,'-amount').map(r=>r.amount),[10,2,1]);
  assert.equal(rows[0].amount,2);
});
