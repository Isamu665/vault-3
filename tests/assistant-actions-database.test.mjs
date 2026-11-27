import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('confirmed actions enforce isolation, idempotency, undo, schema and concurrent edit checks',async()=>{
 const db=new PGlite(),alice='00000000-0000-0000-0000-000000000001',bob='00000000-0000-0000-0000-000000000002';
 try {
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);
   create function auth.uid() returns uuid language sql stable as 'select nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
   grant usage on schema auth to authenticated,anon,service_role;grant execute on function auth.uid() to authenticated,anon,service_role;
   insert into auth.users values ('${alice}'),('${bob}');`);
  const dir=new URL('../supabase/migrations/',import.meta.url);
  for(const file of (await readdir(dir)).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(new URL(file,dir),'utf8'));
  await db.exec(`set role authenticated;set request.jwt.claim.sub='${alice}';`);
  const record='30000000-0000-0000-0000-000000000001';
  const stageSql="insert into public.assistant_actions(user_id,operation,entity,record_id,before_data,after_data,server_verified) values ($1,$2,'Expense',$3,$4::jsonb,$5::jsonb,$6) returning id";
  const stage=async(operation,before,after,id=record,verified=true)=>{
    await db.exec('set role service_role');
    try {
      return (await db.query(stageSql,[alice,operation,id,before===null?null:JSON.stringify(before),JSON.stringify(after),verified])).rows[0].id;
    } finally { await db.exec('set role authenticated'); }
  };
  const apply=(id,undo=false)=>db.query('select public.confirm_assistant_action($1,$2)',[id,undo]);
  const cancel=id=>db.query('select public.cancel_assistant_action($1)',[id]);
  const initial={description:'Teste',amount:10,date:'2026-10-01'},id=await stage('create',null,initial);
  await assert.rejects(db.query(stageSql,[alice,'create',record,null,JSON.stringify(initial),true]),/permission denied/);
  await assert.rejects(db.query("update public.assistant_actions set status='applied' where id=$1",[id]),/permission denied/);
  assert.equal((await db.query('select * from public.vault_records')).rows.length,0);
  await db.exec(`set request.jwt.claim.sub='${bob}';`);await assert.rejects(apply(id));await assert.rejects(cancel(id));assert.equal((await db.query('select * from public.assistant_actions')).rows.length,0);
  await db.exec(`set request.jwt.claim.sub='${alice}';`);await apply(id);await apply(id);assert.equal((await db.query('select * from public.vault_records')).rows.length,1);
  await assert.rejects(cancel(id),/Only pending/);
  await apply(id,true);await apply(id,true);assert.equal((await db.query('select * from public.vault_records')).rows.length,0);
  const legacy=await stage('create',null,initial,record,false);
  await assert.rejects(apply(legacy),/new preview/);await assert.rejects(apply(legacy,true),/new preview/);
  await cancel(legacy);await cancel(legacy);
  assert.equal((await db.query("select status from public.assistant_actions where id=$1",[legacy])).rows[0].status,'cancelled');
  const cancelled=await stage('create',null,initial);await cancel(cancelled);await assert.rejects(apply(cancelled),/cancelled/);
  const again=await stage('create',null,initial);await apply(again);
  const updated={...initial,amount:20},change=await stage('update',initial,updated);await apply(change);assert.equal((await db.query('select data from public.vault_records')).rows[0].data.amount,20);
  await apply(change,true);assert.equal((await db.query('select data from public.vault_records')).rows[0].data.amount,10);
  const stale=await stage('update',initial,updated);await db.query(`update public.vault_records set data=data || '{"notes":"manual"}'`);await assert.rejects(apply(stale),/changed/);
  const invalid=await stage('create',null,{description:'x',amount:'bad',date:'2026-10-01'},'30000000-0000-0000-0000-000000000002');await assert.rejects(apply(invalid));
  const expired=await stage('create',null,initial,'30000000-0000-0000-0000-000000000003');
  await db.exec('reset role');await db.query("update public.assistant_actions set expires_at=now()-interval '1 minute' where id=$1",[expired]);await db.exec('set role authenticated');
  await assert.rejects(apply(expired),/expired/);
  await db.exec('reset role;set role anon;');await assert.rejects(apply(again));await assert.rejects(db.query('select * from public.assistant_actions'));
 }finally{await db.close();}
});

