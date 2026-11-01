import test from 'node:test';
import assert from 'node:assert/strict';
import { financialSnapshot } from '../src/lib/assistant-summary.mjs';
test('assistant totals exclude internal transfers and do not include personal descriptions', () => {
  const snapshot = financialSnapshot([{ amount: 1000, date: '2026-11-01', description: 'private employer' }],
    [{ amount: 100, date: '2026-11-01', category: 'Casa', notes: 'private' },
      { amount: 200, date: '2026-11-01', reserve_id: 'internal' },
      { amount: 25, date: '2026-10-02', category: 'Casa' }],
    [{ amount: 50, status: 'pendente' }, { amount: 20, status: 'pago' }], new Date(2026,10,15));
  assert.equal(snapshot.income, 1000); assert.equal(snapshot.expense,100); assert.equal(snapshot.net,900);
  assert.equal(snapshot.pendingBills,50); assert.equal(snapshot.months.length,6);
  assert.equal(snapshot.months[4].expense,25);
  assert.equal(JSON.stringify(snapshot).includes('private'), false);
});
