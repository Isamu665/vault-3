import React, { useState } from 'react';
import { Plus, Check, Trash2 } from 'lucide-react';
import { vault } from '@/api/vaultClient';
import useCollection from '@/hooks/useCollection';
import PageHeader from '@/components/finance/PageHeader';
import Section from '@/components/finance/Section';
import EmptyState from '@/components/finance/EmptyState';
import BillDialog from '@/components/finance/BillDialog';
import TransactionDetailDialog from '@/components/finance/TransactionDetailDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { brl, daysUntil } from '@/lib/finance';

const statusOf = (b) => {
  if (b.status === 'pago') return { label: 'Pago', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' };
  const d = daysUntil(b.due_date);
  if (d < 0) return { label: 'Atrasado', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' };
  if (d <= 5) return { label: 'Próximo do vencimento', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' };
  return { label: 'Pendente', cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' };
};

const startOfWeek = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
};

export default function Bills() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const { items, reload } = useCollection('Bill', 'due_date');

  const toggle = async (b) => {
    await vault.entities.Bill.update(b.id, { status: b.status === 'pago' ? 'pendente' : 'pago' });
    reload();
  };
  const remove = async (id) => { await vault.entities.Bill.delete(id); reload(); };

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek());
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    return { date: d, iso, bills: items.filter((b) => b.due_date === iso) };
  });

  return (
    <div>
      <PageHeader title="Contas a pagar" subtitle="Acompanhe vencimentos por semana">
        <Button className="rounded-full gap-2" onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> Nova conta</Button>
      </PageHeader>

      <Section title="Calendário desta semana" className="mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {week.map(({ date, iso, bills }) => (
            <div key={iso} className="rounded-xl border p-3 min-h-[6.5rem]">
              <p className="text-xs text-muted-foreground capitalize">
                {date.toLocaleDateString('pt-BR', { weekday: 'short' })} {date.getDate()}
              </p>
              <div className="mt-2 space-y-1.5">
                {bills.map((b) => (
                  <div key={b.id} className={`rounded-lg px-2 py-1 text-[11px] leading-tight ${statusOf(b).cls}`}>
                    {b.description}<br />{brl(b.amount)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {items.length === 0 ? <EmptyState text="Nenhuma conta cadastrada." /> : (
        <div className="space-y-2">
          {items.map((b) => {
            const s = statusOf(b);
            return (
              <div key={b.id} onClick={() => setDetailItem(b)} className="flex items-center justify-between rounded-2xl border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-amber-200 dark:hover:border-amber-800 cursor-pointer">
                <div>
                  <p className="font-medium">{b.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    vence {new Date(b.due_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}{b.category ? ` · ${b.category}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3" onClick={(ev) => ev.stopPropagation()}>
                  <Badge className={`${s.cls} border-0 font-normal`}>{s.label}</Badge>
                  <span className="font-semibold">{brl(b.amount)}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" onClick={() => toggle(b)}><Check className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={() => remove(b.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BillDialog open={open} onOpenChange={setOpen} bill={editing} onSaved={reload} />
      <TransactionDetailDialog item={detailItem} type="bill" open={!!detailItem} onOpenChange={(v) => !v && setDetailItem(null)}
        onEdit={(item) => { setDetailItem(null); setEditing(item); setOpen(true); }}
        onDelete={async (id) => { await remove(id); setDetailItem(null); }} />
    </div>
  );
}
