import { validateBackup } from './validate-records.mjs';
export const ACCOUNT_ENTITIES = ['Income','Expense','Bill','Debt','Goal','Reserve','ReserveTransaction','Investment','InvestmentTransaction','InvestmentUpdate','Category','BudgetPlan','MarketIndicator','MarketIndicatorHistory','Preference'];
import { SPEC_BY_NAME } from './record-schema.mjs';
const money = rows => rows.reduce((n,r) => n + Math.round(Number(r.amount || 0)*100),0)/100;
const normalizeDescription = value => String(value ?? '').normalize('NFD')
  .replace(/\p{M}/gu, '').trim().toLowerCase().replace(/\s+/g, ' ');

export function accountContext(records) {
  const entities = Object.fromEntries(ACCOUNT_ENTITIES.map(entity => [entity, records.filter(r=>r.entity===entity).map(r=>Object.fromEntries([['id',r.id],...SPEC_BY_NAME[entity].fields.filter(f=>r.data[f]!==undefined).map(f=>[f,r.data[f]])]))]));
  const observedByDescription = new Map();
  for (const expense of entities.Expense) {
    const description = normalizeDescription(expense.description);
    const period = String(expense.date ?? '').slice(0, 7);
    if (!description || !/^\d{4}-(0[1-9]|1[0-2])$/.test(period) ||
        expense.reserve_id || expense.investment_id || expense.installment) continue;
    const key = JSON.stringify([description, expense.category || '']);
    const periods = observedByDescription.get(key) ?? new Set();
    periods.add(period);
    observedByDescription.set(key, periods);
  }
  const months = [...new Set([...entities.Expense,...entities.Income,...entities.Bill].map(r=>String(r.date || r.due_date || '').slice(0,7)).filter(s=>/^\d{4}-\d{2}$/.test(s)))].sort();
  const monthly = months.map(period => {
    const all = entities.Expense.filter(r=>String(r.date).startsWith(period));
    const expenses = all.filter(r=>!r.reserve_id && !r.investment_id);
    const categories=entities.Category.filter(c => !c.type || c.type === 'despesa');
    const classified = expenses.map(r=>{
      const matches=categories.filter(c=>c.id===r.category || c.name===r.category);
      const classification=r.need_type || (matches.length===1 ? matches[0].classification : undefined);
      const key = JSON.stringify([normalizeDescription(r.description), r.category || '']);
      const observedMonths = r.installment ? [] : [...(observedByDescription.get(key) ?? [])]
        .filter(month => month <= period).sort().slice(-6);
      return {...r,essential:classification==='necessidade',classification:classification || null,observedMonths};
    });
    const fixed=classified.filter(r=>r.recurring===true), essential=classified.filter(r=>r.essential), both=fixed.filter(r=>r.essential);
    const income=money(entities.Income.filter(r=>String(r.date).startsWith(period))), expense=money(expenses);
    return {period,income,expense,net:Math.round((income-expense)*100)/100,fixed:money(fixed),essential:money(essential),fixedAndEssential:money(both),fixedOrEssential:Math.round((money(fixed)+money(essential)-money(both))*100)/100,
      unclassified:money(classified.filter(r=>!r.classification)),unclassifiedCount:classified.filter(r=>!r.classification).length,internalTransfers:money(all.filter(r=>r.reserve_id || r.investment_id)),
      expenseEvidence:classified.map(r=>({id:r.id,amount:r.amount,description:r.description,category:r.category,date:r.date,fixed:r.recurring===true,essential:r.essential,classification:r.classification,
        ...(r.observedMonths.length > 1 ? { observedMonths: r.observedMonths } : {}),
        ...(r.installment ? { installment: true } : {})})),
      bills:entities.Bill.filter(r=>String(r.due_date).startsWith(period))};
  });
  // Keep only known business fields; never forward ownership/auth metadata or arbitrary Preference values.
  delete entities.Preference;
  for(const rows of Object.values(entities)) for(const row of rows) for(const field of ['user_id','created_by','created_by_id','access_token','refresh_token','legacy_id']) delete row[field];
  return {entities,monthly,definitions:{fixed:'Recorrência marcada pelo usuário; ausência não prova que é variável',essential:'Rótulo necessidade registrado ou herdado da categoria; não comprova obrigação básica, mensal ou recorrente',observedMonths:'Mesma descrição normalizada e categoria em meses distintos até o período analisado, excluídos parcelamentos e aportes. Repetição é indício, não prova de obrigação fixa',bills:'Contas previstas separadas das despesas realizadas; só reconhecer conciliação com payment_expense_id',transfers:'Aportes vinculados excluídos das despesas comuns',unknown:'Não inventar classificações nem tratar dados ausentes como confirmação'}};
}
export const ACTION_FIELDS = { Income:['description','amount','date','category','recurring','notes'],Expense:['description','amount','date','category','recurring','need_type','payment_method','notes'],Bill:['description','amount','due_date','category'],Goal:['name','target_amount','current_amount','deadline','category','where'] };
export function validateProposal(proposal, records) {
  if (!proposal || !['create','update'].includes(proposal.operation) || !Object.hasOwn(ACTION_FIELDS,proposal.entity)) throw Error('Ação não suportada.');
  if (!proposal.data || typeof proposal.data!=='object' || Array.isArray(proposal.data) || !Object.keys(proposal.data).length) throw Error('Ação sem campos.');
  for(const key of Object.keys(proposal.data)) if(!ACTION_FIELDS[proposal.entity].includes(key)) throw Error('Campo não permitido: '+key);
  const current=proposal.operation==='update' ? records.find(r=>r.id===proposal.recordId && r.entity===proposal.entity) : null;
  if(proposal.operation==='update' && !current) throw Error('Registro não encontrado nesta conta.');
  const data={...(current?.data || {}),...proposal.data};
  const result=validateBackup({format:'vault-backup',version:1,exportedAt:new Date().toISOString(),entities:{[proposal.entity]:[{...data,id:current?.id || 'draft'}]}});
  if(result.errorCount) throw Error(result.errors[0]);
  return {operation:proposal.operation,entity:proposal.entity,record_id:current?.id || crypto.randomUUID(),before_data:current?.data || null,after_data:{...(current?.data || {}),...proposal.data}};
}

