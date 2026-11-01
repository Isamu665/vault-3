import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { brl } from '@/lib/finance';

export default function HistoryModal({ open, onOpenChange, title, transactions, type }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Nenhum registro ainda.</p>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => {
              const isDeposit = type === 'investment' || tx.type === 'deposit';
              return (
                <div key={tx.id} className="flex items-center justify-between rounded-xl border p-3">
                  <div className="flex items-center gap-3">
                    {isDeposit
                      ? <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />
                      : <TrendingDown className="w-4 h-4 text-amber-500 shrink-0" />}
                    <div>
                      <p className="text-sm font-medium">{brl(tx.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                        {tx.notes ? ` · ${tx.notes}` : ''}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium shrink-0 ${isDeposit ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {isDeposit ? 'Aporte' : 'Saque'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}