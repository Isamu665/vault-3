import test from 'node:test';import assert from 'node:assert/strict';import {accountContext,validateProposal} from '../supabase/functions/assistant/account-context.mjs';
const row=(id,entity,data)=>({id,entity,data});
test('observed repetition is separate from marked recurrence and ignores installments and later months', () => {
 const expenses = [
   row('sep','Expense',{description:'Fatura TIM',category:'Telefone',amount:30,date:'2026-09-10'}),
   row('oct','Expense',{description:'fatura  TIM',category:'Telefone',amount:31,date:'2026-10-10',need_type:'necessidade'}),
   row('nov','Expense',{description:'Fatura TIM',category:'Telefone',amount:32,date:'2026-11-10'}),
   row('parcel','Expense',{description:'Fatura TIM',category:'Telefone',amount:15,date:'2026-10-12',installment:true}),
   row('party','Expense',{description:'Aniversário',amount:45,date:'2026-10-18',need_type:'necessidade'}),
 ];
 const october = accountContext(expenses).monthly.find(item => item.period === '2026-10');
 const evidence = Object.fromEntries(october.expenseEvidence.map(item => [item.id,item]));
 assert.equal(october.fixed,0);
 assert.equal(evidence.oct.fixed,false);
 assert.deepEqual(evidence.oct.observedMonths,['2026-09','2026-10']);
 assert.equal(evidence.parcel.installment,true);
 assert.equal(evidence.parcel.observedMonths,undefined);
 assert.equal(evidence.party.essential,true);
 assert.equal(evidence.party.observedMonths,undefined);
});
test('account analysis separates fixed, essential, overlap, unknown and transfers without floating point drift',()=>{
const data=[row('cat','Category',{name:'Moradia',classification:'necessidade'}),row('a','Expense',{description:'Aluguel',amount:100.10,date:'2026-10-01',category:'Moradia',recurring:true}),row('b','Expense',{amount:20.20,date:'2026-10-02',need_type:'necessidade'}),row('c','Expense',{amount:30,date:'2026-10-03',recurring:true,need_type:'desejo'}),row('d','Expense',{amount:5,date:'2026-10-04'}),row('e','Expense',{amount:200,date:'2026-10-05',reserve_id:'r'}),row('i','Income',{amount:500,date:'2026-10-01'}),row('bill','Bill',{amount:100.10,due_date:'2026-10-01',status:'pago'}),row('nov','Expense',{amount:999,date:'2026-11-01'}),row('p','Preference',{key:'token',value:'secret'})];
const ctx=accountContext(data),oct=ctx.monthly.find(m=>m.period==='2026-10');assert.equal(oct.expense,155.3);assert.equal(oct.fixed,130.1);assert.equal(oct.essential,120.3);assert.equal(oct.fixedAndEssential,100.1);assert.equal(oct.fixedOrEssential,150.3);assert.equal(oct.unclassified,5);assert.equal(oct.internalTransfers,200);assert.equal(oct.net,344.7);assert.equal(oct.bills.length,1);assert.ok(!JSON.stringify(ctx).includes('secret'));assert.equal(oct.expenseEvidence.length,4);
});
test('proposals accept only known fields and own existing targets',()=>{assert.throws(()=>validateProposal({operation:'delete',entity:'Expense',data:{}},[]));assert.throws(()=>validateProposal({operation:'update',entity:'Expense',recordId:'foreign',data:{amount:3}},[]));assert.throws(()=>validateProposal({operation:'create',entity:'Income',data:{user_id:'other'}},[]));const p=validateProposal({operation:'create',entity:'Income',data:{description:'x',date:'2026-10-01',amount:5}},[]);assert.equal(p.before_data,null);assert.equal(p.after_data.amount,5);});

