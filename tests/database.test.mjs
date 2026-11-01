import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('database enforces isolation, atomic patches, import and assistant quota', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        'select nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
      grant usage on schema auth to authenticated, anon;
      grant execute on function auth.uid() to authenticated, anon;
      insert into auth.users values ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002');`);
    await db.exec(await readFile(new URL('../supabase/migrations/20261101163455_vault_independent_backend.sql', import.meta.url), 'utf8'));
    const alice = '00000000-0000-0000-0000-000000000001';
    const bob = '00000000-0000-0000-0000-000000000002';
    await db.exec(`set role authenticated; set request.jwt.claim.sub = '${alice}';`);
    const { rows: [record] } = await db.query(`insert into public.vault_records(entity,data) values ('Income','{"amount":42,"date":"2026-11-01"}') returning id`);
    await db.query(`select public.patch_vault_record($1, 'Income', '{"notes":"ok"}')`, [record.id]);
    assert.equal((await db.query('select data from public.vault_records')).rows[0].data.amount, 42);
    await assert.rejects(db.query('update public.vault_records set user_id=$1', [bob]));
    await db.exec(`set request.jwt.claim.sub = '${bob}';`);
    assert.equal((await db.query('select * from public.vault_records')).rows.length, 0);
    await assert.rejects(db.query(`select public.patch_vault_record($1,'Income','{"amount":1}')`, [record.id]));
    assert.equal((await db.query('delete from public.vault_records returning id')).rows.length, 0);
    await assert.rejects(db.query(`insert into public.vault_records(user_id,entity) values ($1,'Income')`, [alice]));
    const payload = [{ id: '10000000-0000-0000-0000-000000000001', entity: 'Expense', data: { amount: 5 } }];
    assert.equal((await db.query('select public.import_vault_records($1::jsonb) as n', [JSON.stringify(payload)])).rows[0].n, 1);
    assert.equal((await db.query('select public.import_vault_records($1::jsonb) as n', [JSON.stringify(payload)])).rows[0].n, 0);
    for (let i=0;i<30;i++) assert.equal((await db.query('select public.consume_assistant_quota() as ok')).rows[0].ok, true);
    assert.equal((await db.query('select public.consume_assistant_quota() as ok')).rows[0].ok, false);
    await db.exec('reset role; set role anon;');
    await assert.rejects(db.query('select * from public.vault_records'));
    await assert.rejects(db.query('select public.consume_assistant_quota()'));
  } finally { await db.close(); }
});
