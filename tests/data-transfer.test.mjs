import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareImport, validateBackup, buildBackup } from '../src/lib/data-transfer.mjs';
import { normalizePreferences, readPreferences, restorePreferences } from '../src/lib/dataTransfer/preferences.mjs';
const business = { Reserve: [{id:'old-reserve',name:'Emergency'}], Investment: [{id:'old-investment',name:'Bond',type:'cdb',reserve_id:'old-reserve'}], InvestmentTransaction:[{id:'old-tx',investment_id:'old-investment',amount:25,date:'2026-11-01'}] };
const wrap = entities => ({format:'vault-backup',version:1,exportedAt:'2026-11-01T12:00:00Z',entities});
test('Base44 imports are stable per account and preserve all relationships', async () => {
  const first = await prepareImport(wrap(business),'alice');
  assert.deepEqual(first, await prepareImport(wrap(business),'alice'));
  const reserve = first.find(r=>r.entity==='Reserve'), investment=first.find(r=>r.entity==='Investment'), tx=first.find(r=>r.entity==='InvestmentTransaction');
  assert.equal(investment.data.reserve_id,reserve.id); assert.equal(tx.data.investment_id,investment.id);
  assert.notEqual(reserve.id,(await prepareImport(wrap(business),'bob')).find(r=>r.entity==='Reserve').id);
  await assert.rejects(prepareImport({ Investment:[{id:'one',name:'x',type:'cdb',reserve_id:'missing'}] },'alice'),/Vínculo ausente/);
  const existing=first.map(r=>({...r.data,id:r.id,entity:r.entity}));
  const [child] = await prepareImport({InvestmentTransaction:business.InvestmentTransaction},'alice',existing);
  assert.equal(child.data.investment_id,investment.id);
});
test('native and cross-account export/import round trips retain lineage and omit ownership metadata', async () => {
  const original = await prepareImport(wrap(business),'alice');
  const exportRows=original.map(r=>({...r.data,id:r.id,user_id:'secret-owner',created_by_id:'secret-owner',access_token:'secret',entity:r.entity}));
  const backup = await buildBackup(async entity=>exportRows.filter(r=>r.entity===entity),'alice',{});
  assert.equal(JSON.stringify(backup).includes('secret'),false);
  assert.deepEqual(await prepareImport(backup,'alice'),original);
  const bob = await prepareImport(backup,'bob');
  assert.deepEqual(bob,await prepareImport(wrap(business),'bob'));
  const reb = await buildBackup(async entity=>bob.filter(r=>r.entity===entity).map(r=>({...r.data,id:r.id})),'bob',{});
  assert.deepEqual(await prepareImport(reb,'alice',exportRows),original);
});
test('native restore retains IDs even when records have been deleted', async () => {
  const id = '12345678-1234-5678-9012-123456789012';
  const [row] = await prepareImport({...wrap({Income:[{id,description:'Work',amount:10,date:'2026-11-01',user_id:'someone-else'}]}),ownerId:'alice'},'alice');
  assert.equal(row.id,id); assert.equal(row.data.user_id,undefined);
});
test('validation rejects malformed backups, impossible dates, types, duplicate IDs and prototype keys', async () => {
  const income={id:'x',description:'Work',amount:10,date:'2026-11-01'};
  for (const input of [ {...wrap({}),version:2}, {...wrap({}),exportedAt:'2026-02-31T00:00:00Z'},
    wrap({Income:[{...income,date:'2026-02-31'}]}),wrap({Income:[{...income,amount:'10'}]}),wrap({Income:[income,income]}),
    wrap({Income:[{...income,description:'  '}]}), JSON.parse('{"__proto__":[]}'), wrap({Income:new Array(10001).fill(income)}) ]) {
    assert.ok(validateBackup(input).errorCount>0,JSON.stringify(input).slice(0,200));
    await assert.rejects(prepareImport(input,'alice'));
  }
  assert.equal(validateBackup(wrap({Income:[{...income,date:'2024-02-29'}]})).errorCount,0);
});
test('export includes over 1000 records, safe preferences and progress; no partial oversize file', async () => {
  const progress=[];
  const backup=await buildBackup(async entity=>entity==='Income'?Array.from({length:1201},(_,i)=>({id:String(i),description:'x',amount:i,date:'2026-11-01'})):[],'alice',{},p=>progress.push(p));
  assert.equal(backup.entities.Income.length,1201); assert.equal(progress.at(-1).done,15);
  await assert.rejects(buildBackup(async entity=>entity==='Income'?Array(10001).fill({id:'x'}):[],'alice',{}),/limite/);
});
test('browser preferences are validated, opt-in and scoped to the current account', () => {
  const storage=new Map(), adapter={getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)};
  const prefs={localStorage:{theme:'dark',access_token:'secret',rule_50_30_20_config:{categories:[{key:'needs',percentage:50,label:'Needs',color:'#123abc'}]}}};
  assert.equal(Object.keys(normalizePreferences(prefs)).length,2);
  const restored=restorePreferences(prefs,adapter,'alice'); assert.equal(restored.restored.length,2);
  assert.ok(storage.has('rule_50_30_20_config:alice')); assert.equal(storage.has('rule_50_30_20_config'),false);
  assert.equal(readPreferences(adapter,'bob').localStorage.rule_50_30_20_config,undefined);
  assert.equal(readPreferences(adapter,'alice').localStorage.theme,'dark');
  assert.equal(normalizePreferences({localStorage:{rule_50_30_20_config:{categories:[{key:'x',percentage:Infinity}]}}}).rule_50_30_20_config,undefined);
  assert.equal(restorePreferences(prefs,{setItem(){throw Error('quota')}},'alice').errors.length,2);
});
