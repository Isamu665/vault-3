import React, { useState } from 'react';
import { Plus, Pencil, Trash2, MapPin } from 'lucide-react';
import { vault } from '@/api/vaultClient';
import useCollection from '@/hooks/useCollection';
import PageHeader from '@/components/finance/PageHeader';
import EmptyState from '@/components/finance/EmptyState';
import GoalDialog from '@/components/finance/GoalDialog';
import TransactionDetailDialog from '@/components/finance/TransactionDetailDialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { brl, daysUntil } from '@/lib/finance';

export default function Goals() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const { items, reload } = useCollection('Goal', '-created_date');

  const remove = async (id) => { await vault.entities.Goal.delete(id); reload(); };

  return (
    <div>
      <PageHeader title="Metas financeiras" subtitle="Curto prazo até 2 anos · médio de 2 a 5 · longo acima de 5">
        <Button className="rounded-full gap-2" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="w-4 h-4" /> Nova meta
        </Button>
      </PageHeader>

      {items.length === 0 ? <EmptyState text="Nenhuma meta cadastrada." /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((g) => {
            const days = g.deadline ? daysUntil(g.deadline) : null;
            const months = days !== null ? days / 30 : null;
            const missing = Math.max(0, (g.target_amount || 0) - (g.current_amount || 0));
            const percent = g.target_amount ? Math.min(100, (g.current_amount / g.target_amount) * 100) : 0;
            const monthly = months && months > 0 ? missing / months : missing;
            return (
              <div key={g.id} onClick={() => setDetailItem(g)} className="rounded-2xl border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-indigo-200 dark:hover:border-indigo-800 cursor-pointer">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{g.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">{g.category}</p>
                  </div>
                  <div className="flex gap-1" onClick={(ev) => ev.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(g); setOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={() => remove(g.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>

                <p className="mt-4 text-2xl font-semibold tracking-tight">{brl(g.current_amount)} <span className="text-sm font-normal text-muted-foreground">de {brl(g.target_amount)}</span></p>
                <Progress value={percent} className="h-2.5 mt-3 [&>div]:bg-indigo-500" />
                <p className="text-xs text-muted-foreground mt-2">{percent.toFixed(0)}% concluído · faltam {brl(missing)}</p>

                <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div><dt className="text-xs text-muted-foreground">Dias restantes</dt><dd className="font-medium">{days === null ? '—' : Math.max(0, days)}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Meses restantes</dt><dd className="font-medium">{months === null ? '—' : Math.max(0, months).toFixed(1)}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Aporte mensal recomendado</dt><dd className="font-medium text-indigo-600 dark:text-indigo-400">{brl(monthly)}</dd></div>
                  <div><dt className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />Onde</dt><dd className="font-medium">{g.where || '—'}</dd></div>
                </dl>
              </div>
            );
          })}
        </div>
      )}

      <GoalDialog open={open} onOpenChange={setOpen} goal={editing} onSaved={reload} />
      <TransactionDetailDialog item={detailItem} type="goal" open={!!detailItem} onOpenChange={(v) => !v && setDetailItem(null)}
        onEdit={(item) => { setDetailItem(null); setEditing(item); setOpen(true); }}
        onDelete={async (id) => { await remove(id); setDetailItem(null); }} />
    </div>
  );
}
