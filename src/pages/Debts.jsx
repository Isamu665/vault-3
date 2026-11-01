import React, { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import useCollection from '@/hooks/useCollection';
import PageHeader from '@/components/finance/PageHeader';
import EmptyState from '@/components/finance/EmptyState';
import DebtDialog from '@/components/finance/DebtDialog';
import TransactionDetailDialog from '@/components/finance/TransactionDetailDialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { brl } from '@/lib/finance';

export default function Debts() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const { items, reload } = useCollection('Debt', '-created_date');

  const remove = async (id) => { await base44.entities.Debt.delete(id); reload(); };

  const calc = (d) => {
    const total = (d.installments_total || 0) * (d.installment_amount || 0);
    const paid = (d.installment_current || 0) * (d.installment_amount || 0);
    const left = Math.max(0, total - paid);
    const remaining = Math.max(0, (d.installments_total || 0) - (d.installment_current || 0));
    return { total, paid, left, remaining, percent: total ? (paid / total) * 100 : 0, days: remaining * 30 };
  };

  const totalLeft = items.reduce((a, d) => a + calc(d).left, 0);

  return (
    <div>
      <PageHeader title="Dívidas" subtitle={`Saldo restante total: ${brl(totalLeft)}`}>
        <Button className="rounded-full gap-2" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="w-4 h-4" /> Nova dívida
        </Button>
      </PageHeader>

      {items.length === 0 ? <EmptyState text="Nenhuma dívida cadastrada. Ótimo sinal!" /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((d) => {
            const c = calc(d);
            return (
              <div key={d.id} onClick={() => setDetailItem(d)} className="rounded-2xl border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-rose-200 dark:hover:border-rose-800 cursor-pointer">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{d.creditor}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{d.reason || 'Sem motivo informado'}</p>
                  </div>
                  <div className="flex gap-1" onClick={(ev) => ev.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(d); setOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={() => remove(d.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>

                <Progress value={c.percent} className="h-2.5 mt-5 [&>div]:bg-emerald-500" />
                <p className="text-xs text-muted-foreground mt-2">{c.percent.toFixed(0)}% pago · {brl(c.paid)} de {brl(c.total)}</p>

                <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div><dt className="text-xs text-muted-foreground">Valor restante</dt><dd className="font-medium text-rose-600 dark:text-rose-400">{brl(c.left)}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Parcelas restantes</dt><dd className="font-medium">{c.remaining} de {d.installments_total || 0}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Valor da parcela</dt><dd className="font-medium">{brl(d.installment_amount)}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Dias até quitar</dt><dd className="font-medium">{c.days}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Juros</dt><dd className="font-medium">{(d.interest_rate || 0).toFixed(2)}% a.m.</dd></div>
                  <div><dt className="text-xs text-muted-foreground">CET</dt><dd className="font-medium">{(d.cet || 0).toFixed(2)}%</dd></div>
                </dl>
              </div>
            );
          })}
        </div>
      )}

      <DebtDialog open={open} onOpenChange={setOpen} debt={editing} onSaved={reload} />
      <TransactionDetailDialog item={detailItem} type="debt" open={!!detailItem} onOpenChange={(v) => !v && setDetailItem(null)}
        onEdit={(item) => { setDetailItem(null); setEditing(item); setOpen(true); }}
        onDelete={async (id) => { await remove(id); setDetailItem(null); }} />
    </div>
  );
}