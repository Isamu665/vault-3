import React, { useState } from 'react';
import { Plus, Repeat, Pencil, Trash2 } from 'lucide-react';
import { vault } from '@/api/vaultClient';
import useCollection from '@/hooks/useCollection';
import PageHeader from '@/components/finance/PageHeader';
import MonthPicker from '@/components/finance/MonthPicker';
import EmptyState from '@/components/finance/EmptyState';
import IncomeDialog from '@/components/finance/IncomeDialog';
import RecurringIncomes from '@/components/finance/RecurringIncomes';
import TransactionDetailDialog from '@/components/finance/TransactionDetailDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { brl, inMonth, sum } from '@/lib/finance';

export default function Incomes() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [q, setQ] = useState('');
  const { items, reload } = useCollection('Income');

  const list = items
    .filter((r) => inMonth(r.date, year, month))
    .filter((r) => (r.description + r.category).toLowerCase().includes(q.toLowerCase()));

  const remove = async (id) => { await vault.entities.Income.delete(id); reload(); };

  return (
    <div>
      <PageHeader title="Receitas" subtitle={`Total do mês: ${brl(sum(list))}`}>
        <MonthPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
        <Button className="rounded-full gap-2" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="w-4 h-4" /> Nova receita
        </Button>
      </PageHeader>

      <Input placeholder="Pesquisar receitas..." value={q} onChange={(e) => setQ(e.target.value)} className="mb-4 max-w-sm rounded-xl" />

      <RecurringIncomes incomes={items} year={year} month={month} onSaved={reload} />

      {list.length === 0 ? <EmptyState text="Nenhuma receita neste mês." /> : (
        <div className="space-y-2">
          {list.map((r) => (
            <div key={r.id} onClick={() => setDetailItem(r)} className="group flex items-center justify-between rounded-2xl border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-emerald-200 dark:hover:border-emerald-800 cursor-pointer">
              <div>
                <p className="font-medium flex items-center gap-2">
                  {r.description}
                  {r.recurring && <Repeat className="w-3.5 h-3.5 text-indigo-500" />}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {r.category} · {new Date(r.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                  {r.notes ? ` · ${r.notes}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{brl(r.amount)}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(ev) => { ev.stopPropagation(); setEditing(r); setOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={(ev) => { ev.stopPropagation(); remove(r.id); }}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <IncomeDialog open={open} onOpenChange={setOpen} income={editing} onSaved={reload} />
      <TransactionDetailDialog item={detailItem} type="income" open={!!detailItem} onOpenChange={(v) => !v && setDetailItem(null)}
        onEdit={(item) => { setDetailItem(null); setEditing(item); setOpen(true); }}
        onDelete={async (id) => { await remove(id); setDetailItem(null); }} />
    </div>
  );
}
