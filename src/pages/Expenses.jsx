import React, { useState } from 'react';
import { Plus, Repeat, Pencil, Trash2, CreditCard } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import useCollection from '@/hooks/useCollection';
import PageHeader from '@/components/finance/PageHeader';
import MonthPicker from '@/components/finance/MonthPicker';
import EmptyState from '@/components/finance/EmptyState';
import ExpenseDialog from '@/components/finance/ExpenseDialog';
import TransactionDetailDialog from '@/components/finance/TransactionDetailDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { brl, inMonth, sum } from '@/lib/finance';

export default function Expenses() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('todas');
  const { items, reload } = useCollection('Expense');
  const { items: categories } = useCollection('Category', 'name');

  const list = items
    .filter((e) => inMonth(e.date, year, month))
    .filter((e) => !e.investment_id && !e.reserve_id)
    .filter((e) => cat === 'todas' || e.category === cat)
    .filter((e) => (e.description + (e.category || '')).toLowerCase().includes(q.toLowerCase()));

  const remove = async (id) => { await base44.entities.Expense.delete(id); reload(); };
  const colorOf = (name) => categories.find((c) => c.name === name)?.color || '#64748b';

  return (
    <div>
      <PageHeader title="Despesas" subtitle={`Total do mês: ${brl(sum(list))}`}>
        <MonthPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
        <Button className="rounded-full gap-2" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="w-4 h-4" /> Nova despesa
        </Button>
      </PageHeader>

      <div className="flex flex-wrap gap-3 mb-4">
        <Input placeholder="Pesquisar despesas..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm rounded-xl" />
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="w-48 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as categorias</SelectItem>
            {categories.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {list.length === 0 ? <EmptyState text="Nenhuma despesa neste mês." /> : (
        <div className="space-y-2">
          {list.map((e) => (
            <div key={e.id} onClick={() => setDetailItem(e)} className="flex items-center justify-between rounded-2xl border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-indigo-200 dark:hover:border-indigo-800 cursor-pointer">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: colorOf(e.category) }} />
                <div className="min-w-0">
                  <p className="font-medium flex items-center gap-2 truncate">
                    {e.description}
                    {e.recurring && <Repeat className="w-3.5 h-3.5 text-indigo-500" />}
                    {e.installment && <CreditCard className="w-3.5 h-3.5 text-violet-500" />}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {e.category} · {e.payment_method} · {new Date(e.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                    {e.installment && e.installments_total ? ` · ${e.installment_current || 1}/${e.installments_total}` : ''}
                    {` · ${e.need_type}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-semibold text-rose-600 dark:text-rose-400">{brl(e.amount)}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(ev) => { ev.stopPropagation(); setEditing(e); setOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={(ev) => { ev.stopPropagation(); remove(e.id); }}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ExpenseDialog open={open} onOpenChange={setOpen} expense={editing} categories={categories} onSaved={reload} />
      <TransactionDetailDialog item={detailItem} type="expense" open={!!detailItem} onOpenChange={(v) => !v && setDetailItem(null)}
        onEdit={(item) => { setDetailItem(null); setEditing(item); setOpen(true); }}
        onDelete={async (id) => { await remove(id); setDetailItem(null); }} />
    </div>
  );
}