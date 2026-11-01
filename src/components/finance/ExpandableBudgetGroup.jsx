import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { brl } from '@/lib/finance';

export default function ExpandableBudgetGroup({ label, share, ideal, spent, color, categories, noCategoryIdeal, invertColor }) {
  const [expanded, setExpanded] = useState(false);
  const percent = ideal ? (spent / ideal) * 100 : 0;
  const available = ideal - spent;
  const ok = invertColor ? spent >= ideal : spent <= ideal;

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <h3 className="font-semibold">{label}</h3>
        </div>
        <span className="text-sm text-muted-foreground">{share * 100}%</span>
      </button>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{brl(spent)}</p>
      <p className="text-xs text-muted-foreground">ideal: {brl(ideal)}</p>
      <Progress value={Math.min(100, percent)} className={`h-2.5 mt-3 ${ok ? '[&>div]:bg-emerald-500' : '[&>div]:bg-rose-500'}`} />
      <div className="mt-2 flex items-center justify-between text-sm">
        <span className={ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
          {percent.toFixed(0)}% do ideal
        </span>
        <span className="text-muted-foreground">
          {invertColor
            ? (available > 0.01
                ? `${brl(available)} abaixo do recomendado`
                : Math.abs(available) <= 0.01
                  ? 'meta atingida'
                  : `${brl(-available)} acima da meta`)
            : (available >= 0 ? `${brl(available)} disponível` : `${brl(-available)} acima`)}
        </span>
      </div>
      {expanded && categories.length > 0 && (
        <div className="mt-4 pt-4 border-t space-y-3">
          {categories.map((cat) => {
            if (noCategoryIdeal) {
              return (
                <div key={cat.name}>
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: cat.color || color }} />
                      {cat.name}
                    </span>
                    <span className="text-muted-foreground">{brl(cat.spent)}</span>
                  </div>
                </div>
              );
            }
            const catIdeal = cat.percentage > 0 ? (ideal * cat.percentage / 100) : (ideal / Math.max(1, categories.length));
            const catPercent = catIdeal ? (cat.spent / catIdeal) * 100 : 0;
            const catOk = cat.spent <= catIdeal;
            return (
              <div key={cat.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: cat.color || color }} />
                    {cat.name}
                    {cat.percentage > 0 && <span className="text-xs text-muted-foreground">({cat.percentage}%)</span>}
                  </span>
                  <span className="text-muted-foreground">{brl(cat.spent)} / {brl(catIdeal)}</span>
                </div>
                <Progress value={Math.min(100, catPercent)} className={`h-1.5 ${catOk ? '[&>div]:bg-emerald-500' : '[&>div]:bg-rose-500'}`} />
                <div className="mt-0.5 flex justify-between text-xs text-muted-foreground">
                  <span>{catPercent.toFixed(0)}%</span>
                  <span>{catOk ? `${brl(catIdeal - cat.spent)} disp.` : `${brl(cat.spent - catIdeal)} acima`}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {expanded && categories.length === 0 && (
        <p className="mt-4 pt-4 border-t text-sm text-muted-foreground">Nenhuma categoria cadastrada neste grupo.</p>
      )}
    </div>
  );
}