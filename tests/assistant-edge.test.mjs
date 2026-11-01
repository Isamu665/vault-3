import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import {accountContext,ACCOUNT_ENTITIES,validateProposal} from '../supabase/functions/assistant/account-context.mjs';
import {providerFailure} from '../supabase/functions/assistant/provider-error.mjs';
const alice='00000000-0000-0000-0000-000000000001';
async function fixture({rows=[],authorized=true,answer={content:'Análise pronta',proposal:null}}={}) {
 const trace={reads:[],inserts:[],rpcs:[],fetches:[]};let handler;
 const client={auth:{getUser:async()=>({data:{user:authorized?{id:alice}:null},error:null})},rpc:async(name,args)=>{trace.rpcs.push({name,args});return {data:name==='consume_assistant_quota'?true:{status:'applied'},error:null};},from(table){
   const filters={};let range=[0,499],insert;
   const query={select(){return this;},eq(k,v){filters[k]=v;return this;},in(){return this;},order(){return this;},range(a,b){range=[a,b];return this;},insert(value){insert=value;return this;},async single(){trace.inserts.push({table,value:insert});return {data:{...insert,id:'proposal-id',status:'pending'},error:null};},then(resolve,reject){trace.reads.push({table,filters,range});return Promise.resolve({data:rows.slice(range[0],range[1]+1),error:null}).then(resolve,reject);}};return query;
 }};
 const source=(await readFile(new URL('../supabase/functions/assistant/index.ts',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'');
 vm.runInNewContext(ts.transpile(source,{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}),{
   createClient:()=>client,accountContext,ACCOUNT_ENTITIES,validateProposal,providerFailure,
   Deno:{env:{get:key=>({GEMINI_API_KEY:'test-key',SUPABASE_URL:'https://example.invalid',SUPABASE_ANON_KEY:'public'}[key])},serve:fn=>{handler=fn;}},
   fetch:async(url,options)=>{trace.fetches.push({url,body:JSON.parse(options.body)});return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(answer)}]}}]}));},
   Response,Request,TextEncoder,AbortSignal,Date,console,crypto
 });
 return {trace,call:async body=>{const response=await handler(new Request('https://example.invalid/functions/v1/assistant',{method:'POST',headers:{authorization:'Bearer test',origin:'https://isamu665.github.io','content-type':'application/json'},body:JSON.stringify(body)}));return {status:response.status,body:await response.json()};}};
}
test('edge requires auth and never reads or forwards account data without per-request consent',async()=>{
 const denied=await fixture({authorized:false});assert.equal((await denied.call({message:'oi',shareAccount:true})).status,401);assert.equal(denied.trace.fetches.length,0);
 const f=await fixture();assert.equal((await f.call({message:'oi',snapshot:{income:999999}})).status,200);assert.equal(f.trace.reads.length,0);assert.equal(JSON.parse(f.trace.fetches[0].body.contents[0].parts[0].text).context,null);
});
test('edge paginates owned rows, computes complete totals and stages proposals without applying changes',async()=>{
 const rows=Array.from({length:1201},(_,i)=>({id:'id-'+i,entity:'Expense',data:{description:'Teste',amount:1,date:'2026-10-01',recurring:true,need_type:'necessidade'}}));
 const f=await fixture({rows,answer:{content:'Proposta pendente',proposal:{operation:'create',entity:'Income',recordId:'',dataJson:JSON.stringify({description:'Salário',amount:100,date:'2026-10-01'})}}});
 const result=await f.call({message:'Cadastre receita',shareAccount:true});assert.equal(result.status,200);assert.equal(f.trace.reads.length,3);
 assert.ok(f.trace.reads.every(q=>q.filters.user_id===alice));const context=JSON.parse(f.trace.fetches[0].body.contents[0].parts[0].text).context;
 assert.equal(context.monthly[0].expense,1201);assert.equal(context.monthly[0].fixedAndEssential,1201);assert.equal(f.trace.inserts[0].table,'assistant_actions');assert.equal(f.trace.inserts[0].value.user_id,alice);
 assert.equal(f.trace.rpcs.some(r=>r.name==='confirm_assistant_action'),false);
});
test('edge confirmation bypasses model generation and only invokes owner-checked RPC',async()=>{
 const f=await fixture();assert.equal((await f.call({action:'confirm',actionId:'example'})).status,200);assert.equal(f.trace.fetches.length,0);assert.equal(f.trace.rpcs[0].name,'confirm_assistant_action');assert.equal(f.trace.rpcs[0].args.undo,false);
});

