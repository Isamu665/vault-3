import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('bill payment uses confirmed details, is atomic, idempotent and owner isolated',async()=>{
 const db=new PGlite(),alice='00000000-0000-0000-0000-000000000001',bob='00000000-0000-0000-0000-000000000002';
 try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as 'select nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
 grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;
 insert into auth.users values ('${alice}'),('${bob}');`);
 const dir=new URL('../supabase/migrations/',import.meta.url);for(const file of (await readdir(dir)).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(new URL(file,dir),'utf8'));
 await db.exec(`set role authenticated;set request.jwt.claim.sub='${alice}';`);
 const b=(await db.query(`insert into public.vault_records(entity,data) values ('Bill','{"description":"Internet","amount":100,"category":"Casa","due_date":"2026-10-01","status":"pendente"}') returning id`)).rows[0];
 const payment={amount:95.5,category:'Serviços',date:'2026-10-05',payment_method:'débito'};
 const pay=p=>db.query('select public.pay_bill($1,$2::jsonb)',[b.id,JSON.stringify(p)]);
 await assert.rejects(pay({...payment,date:'2026-02-31'}));await assert.rejects(pay({...payment,amount:-1}));await assert.rejects(pay({...payment,payment_method:'invalid'}));
 assert.equal((await db.query('select data from public.vault_records where id=$1',[b.id])).rows[0].data.status,'pendente');
 await db.exec(`set request.jwt.claim.sub='${bob}';`);await assert.rejects(pay(payment));
 await db.exec(`set request.jwt.claim.sub='${alice}';`);await pay(payment);await pay(payment);
 const expenses=(await db.query("select data from public.vault_records where entity='Expense'")).rows;
 assert.equal(expenses.length,1);assert.deepEqual(expenses[0].data,{description:'Internet',...payment});
 const bill=(await db.query('select data from public.vault_records where id=$1',[b.id])).rows[0].data;assert.equal(bill.status,'pago');assert.equal(bill.amount,100);assert.equal(bill.due_date,'2026-10-01');
 const second=(await db.query(`insert into public.vault_records(entity,data) values ('Bill','{"description":"Teste","amount":10,"status":"pendente"}') returning id`)).rows[0];
 const paySecond=p=>db.query('select public.pay_bill($1,$2::jsonb)',[second.id,JSON.stringify(p)]);
 await assert.rejects(paySecond({...payment,category_id:'00000000-0000-0000-0000-000000000099'}));
 await assert.rejects(paySecond({...payment,new_category:{name:' ',classification:'necessidade'}}));
 await paySecond({...payment,new_category:{name:'Energia',classification:'necessidade'}});
 await paySecond({...payment,new_category:{name:'Energia',classification:'necessidade'}});
 const cats=(await db.query("select * from public.vault_records where entity='Category'")).rows;assert.equal(cats.length,1);assert.equal(cats[0].data.name,'Energia');
 const linked=(await db.query("select data from public.vault_records where entity='Expense' and data->>'category'='Energia'")).rows;assert.equal(linked.length,1);assert.equal(linked[0].data.need_type,'necessidade');
 const third=(await db.query(`insert into public.vault_records(entity,data) values ('Bill','{"description":"Teste 2","amount":10,"status":"pendente"}') returning id`)).rows[0];
 await assert.rejects(db.query('select public.pay_bill($1,$2::jsonb)',[third.id,JSON.stringify({...payment,new_category:{name:'energia',classification:'desejo'}})]));
 await db.query('select public.pay_bill($1,$2::jsonb)',[third.id,JSON.stringify({...payment,category_id:cats[0].id})]);
 assert.equal((await db.query("select * from public.vault_records where entity='Category'")).rows.length,1);
 await db.exec('reset role;set role anon;');await assert.rejects(pay(payment));
 }finally{await db.close();}
});

