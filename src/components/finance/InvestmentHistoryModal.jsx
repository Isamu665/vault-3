import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { brl } from '@/lib/finance';
import { investmentTotal } from '@/lib/patrimony';

export default function InvestmentHistoryModal({ open, onOpenChange, investment, updates, investmentTxs }) {
  const sorted = [...updates].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const invested = investment ? investmentTotal(investmentTxs, investment.id) : 0;
  const current = investment?.current_amount || invested;
  const profit = current - invested;
  const profPct = invested ? (profit / invested) * 100 : 0;

  const data = sorted.map((u) => ({
    date: new Date(u.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }),
    Valor: u.amount,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Rendimentos: {investment?.name}</DialogTitle></DialogHeader>

        <div className="grid grid-cols-3 gap-2 text-sm mb-4">
          <div>
            <p className="text-xs text-muted-foreground">Aplicado</p>
            <p className="font-medium">{brl(invested)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Atual</p>
            <p className="font-medium">{brl(current)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Lucro</p>
            <p className={`font-medium ${profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {brl(profit)}
            </p>
          </div>
        </div>

        {sorted.length >= 2 ? (
          <div className="h-40 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} width={50} />
                <Tooltip formatter={(v) => brl(v)} />
                <Line type="monotone" dataKey="Valor" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-4">
            Registre pelo menos 2 atualizações para ver o gráfico de evolução.
          </p>
        )}

        <p className="text-xs font-medium text-muted-foreground mb-2">Histórico de atualizações</p>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Nenhuma atualização registrada ainda.</p>
        ) : (
          <div className="space-y-2">
            {[...sorted].reverse().map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded-xl border p-3">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-4 h-4 text-indigo-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{brl(u.amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(u.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                      {u.notes ? ` · ${u.notes}` : ''}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}