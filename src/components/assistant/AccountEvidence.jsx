import {useEffect,useState} from 'react';
import {brl} from '@/lib/finance';
export default function AccountEvidence({analysis}) {
 const [period,setPeriod]=useState('');
 useEffect(()=>{setPeriod(analysis.rows.some(r=>r.period===analysis.period)?analysis.period:analysis.rows.at(-1)?.period || '');},[analysis]);
 const row=analysis.rows.find(r=>r.period===period);if(!row)return null;
 return <section className="rounded-xl border p-3 space-y-3" aria-label="Cálculos conferíveis da conta"><h3 className="text-sm font-semibold">Cálculos da conta · feitos pelo aplicativo</h3>
  <label className="text-xs flex gap-2 items-center">Mês de referência<select aria-label="Mês dos cálculos" value={period} onChange={e=>setPeriod(e.target.value)} className="border rounded p-1 bg-background">{analysis.rows.map(r=><option key={r.period} value={r.period}>{r.period}</option>)}</select></label>
  <div className="grid grid-cols-2 gap-2 text-xs">{[['Despesas realizadas',row.expense],['Fixos identificados',row.fixed],['Essenciais identificados',row.essential],['Fixos e essenciais',row.fixedAndEssential],['Fixos ou essenciais (sem repetição)',row.fixedOrEssential],['Sem classificação',row.unclassified]].map(([label,value])=><div key={label} className="rounded-lg bg-muted p-2"><p>{label}</p><strong>{brl(value)}</strong></div>)}</div>
  <p className="text-xs text-muted-foreground">Fixos: recorrência marcada. Essenciais: necessidade no lançamento ou categoria inequívoca. A ausência de marcação não confirma que o gasto é variável ou dispensável. Contas a pagar ficam separadas das despesas realizadas.</p>
  <details><summary className="text-xs cursor-pointer">Conferir {row.expenseEvidence.length} despesas usadas no cálculo</summary><div className="overflow-x-auto max-h-64"><table className="text-xs w-full"><thead><tr><th className="text-left p-1">Data / descrição</th><th>Valor</th><th>Fixo</th><th>Essencial</th></tr></thead><tbody>{row.expenseEvidence.map(item=><tr key={item.id} className="border-t"><td className="p-1 break-words">{item.date} · {item.description || item.category || 'Sem descrição'}</td><td>{brl(item.amount)}</td><td>{item.fixed?'Sim':'Não marcado'}</td><td>{item.essential?'Sim':item.classification?'Não':'Sem classificação'}</td></tr>)}</tbody></table></div></details>
 </section>;
}

