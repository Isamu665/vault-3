import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('record changes notify only the owner, including deletions and identical backup IDs', async () => {
  const db = new PGlite();
  const alice = '00000000-0000-0000-0000-000000000001';
  const bob = '00000000-0000-0000-0000-000000000002';
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth; create schema realtime;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        'select nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
      create function realtime.topic() returns text language sql stable as
        'select current_setting(''test.topic'',true)';
      create table realtime.messages(extension text, topic text, payload jsonb, private boolean);
      alter table realtime.messages enable row level security;
      create function realtime.send(jsonb,text,text,boolean) returns void language sql as
        'insert into realtime.messages values (''broadcast'', $3, $1, $4)';
      grant usage on schema auth,realtime to authenticated;
      grant select on realtime.messages to authenticated;
      insert into auth.users values ('${alice}'),('${bob}');`);
    const dir = new URL('../supabase/migrations/', import.meta.url);
    for (const file of (await readdir(dir)).filter(f => f.endsWith('.sql')).sort()) {
      await db.exec(await readFile(new URL(file, dir), 'utf8'));
    }
    const id = '10000000-0000-0000-0000-000000000001';
    for (const owner of [alice,bob]) {
      await db.exec(`set role authenticated; set request.jwt.claim.sub='${owner}'; set test.topic='vault-records:${owner}';`);
      await db.query("insert into public.vault_records(id,entity,data) values($1,'Income',$2)", [id,JSON.stringify({amount:10,description:'Private',date:'2026-11-27'})]);
      const result = await db.query('select * from realtime.messages');
      assert.equal(result.rows.length, 1);
      assert.equal(result.rows[0].private, true);
      assert.equal(result.rows[0].topic, 'vault-records:' + owner);
      assert.deepEqual(result.rows[0].payload, {entity:'Income'});
    }
    await db.query('delete from public.vault_records where id=$1',[id]);
    assert.equal((await db.query('select count(*)::int as n from realtime.messages')).rows[0].n,2);
    await db.exec(`set test.topic='vault-records:${alice}';`);
    assert.equal((await db.query('select * from realtime.messages')).rows.length,0);
    await db.exec(`set request.jwt.claim.sub='${alice}';`);
    assert.equal((await db.query('select * from public.vault_records')).rows.length,1);
    assert.equal((await db.query('select * from realtime.messages')).rows.length,1);
    const sharedExpenseId = '20000000-0000-0000-0000-000000000001';
    const schedule = { active:true, automatic:true, day:13, start:'2026-11-01', end:'',
      amount:15, description:'Mensalidade', category:'Serviços', notes:'' };
    await db.query("insert into public.vault_records(id,entity,data) values($1,'Expense',$2)",
      [sharedExpenseId,JSON.stringify({amount:15,expense_schedule:schedule})]);
    await db.exec(`set request.jwt.claim.sub='${bob}';`);
    await db.query("insert into public.vault_records(id,entity,data) values($1,'Expense',$2)",
      [sharedExpenseId,JSON.stringify({amount:20})]);
    await db.exec('reset role');
    assert.equal((await db.query("select vault_private.book_recurring_expenses('2026-11-13') as n")).rows[0].n,1);
    const rows = (await db.query('select user_id,data from public.vault_records where id=$1',[sharedExpenseId])).rows;
    assert.equal(rows.find(row => row.user_id === alice).data.expense_auto_month,'2026-11');
    assert.equal(rows.find(row => row.user_id === bob).data.expense_auto_month,undefined);
  } finally { await db.close(); }
});
