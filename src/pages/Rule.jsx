import React, { useState } from 'react';
import { Settings2, RotateCcw } from 'lucide-react';
import useCollection from '@/hooks/useCollection';
import useRuleConfig from '@/hooks/useRuleConfig';
import PageHeader from '@/components/finance/PageHeader';
import MonthPicker from '@/components/finance/MonthPicker';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { brl, inMonth, sum } from '@/lib/finance';
import { economiaForMonth, patrimonyBreakdown } from '@/lib/patrimony';

const CLASSIFICATION_MAP = { 'necessidades': 'necessidade', 'desejos': 'desejo', 'patrimonio': 'patrimônio' };
const HINTS = {
  'necessidade': 'moradia, mercado, contas, transporte',
  'desejo': 'lazer, assinaturas, restaurantes',
  'patrimônio': 'reservas, investimentos, metas',
};

export default function Rule() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [showConfig, setShowConfig] = useState(false);
  const { config, updatePercentage, resetConfig } = useRuleConfig();
  const { items: incomes } = useCollection('Income');
  const { items: expenses } = useCollection('Expense');
  const { items: categories } = useCollection('Category', 'name');
  const { items: reserves } = useCollection('Reserve', 'name');
  const { items: investments } = useCollection('Investment', '-date');
  const { items: reserveTxs } = useCollection('ReserveTransaction');
  const { items: investmentTxs } = useCollection('InvestmentTransaction');

  const BUCKETS = config.categories.map((c) => ({
    key: CLASSIFICATION_MAP[c.key] || c.key,
    label: c.label,
    share: c.percentage / 100,
    color: c.color,
    hint: HINTS[CLASSIFICATION_MAP[c.key] || c.key] || '',
  }));

  const income = sum(incomes.filter((r) => inMonth(r.date, year, month)));
  const mExpenses = expenses.filter((e) => inMonth(e.date, year, month) && !e.investment_id && !e.reserve_id);
  const economia = economiaForMonth(reserveTxs, investmentTxs, investments, year, month);
  const patrimonyCats = patrimonyBreakdown(reserveTxs, investmentTxs, reserves, investments, year, month);

  const ruleTitle = `Regra ${config.categories.map((c) => c.percentage).join('/')}`;
  const totalPct = config.categories.reduce((s, c) => s + c.percentage, 0);

  return (
    <div>
      <PageHeader title={ruleTitle} subtitle={`Receita do mês: ${brl(income)}`}>
        <MonthPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
        <Button variant="outline" className="rounded-full gap-2" onClick={() => setShowConfig(!showConfig)}>
          <Settings2 className="w-4 h-4" /> Personalizar
        </Button>
      </PageHeader>

      {showConfig && (
        <div className="rounded-2xl border bg-card p-5 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Personalizar regra</h3>
            <Button variant="ghost" size="sm" className="gap-2" onClick={resetConfig}>
              <RotateCcw className="w-3.5 h-3.5" /> Restaurar padrão
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {config.categories.map((c) => (
              <div key={c.key}>
                <Label className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                  {c.label}
                </Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input type="number" min="0" max="100" value={c.percentage}
                    onChange={(e) => updatePercentage(c.key, e.target.value)} />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            ))}
          </div>
          {totalPct !== 100 && (
            <p className="text-sm text-amber-600 dark:text-amber-500 mt-4">
              Atenção: a soma das porcentagens é {totalPct}%, não 100%.
            </p>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {BUCKETS.map((b) => {
          const ideal = income * b.share;
          let spent, groupCats;
          if (b.key === 'patrimônio') {
            spent = economia;
            groupCats = patrimonyCats;
          } else {
            spent = sum(mExpenses.filter((e) => (e.need_type || 'necessidade') === b.key));
            groupCats = categories.filter((c) => c.classification === b.key && c.type === 'despesa');
          }
          const diff = ideal - spent;
          const percent = ideal ? (spent / ideal) * 100 : 0;
          const ok = b.key === 'patrimônio' ? spent >= ideal : spent <= ideal;
          return (
            <div key={b.key} className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="flex items-baseline justify-between">
                <h3 className="font-semibold">{b.label}</h3>
                <span className="text-sm text-muted-foreground">{b.share * 100}%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{b.hint}</p>
              <p className="mt-5 text-3xl font-semibold tracking-tight">{brl(spent)}</p>
              <p className="text-xs text-muted-foreground">ideal: {brl(ideal)}</p>
              <Progress value={Math.min(100, percent)} className={`h-2.5 mt-4 ${ok ? '[&>div]:bg-emerald-500' : '[&>div]:bg-rose-500'}`} />
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className={ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                  {percent.toFixed(0)}% do ideal
                </span>
                <span className="text-muted-foreground">
                  {b.key === 'patrimônio'
                    ? (diff > 0.01
                        ? `${brl(diff)} abaixo do recomendado`
                        : Math.abs(diff) <= 0.01
                          ? 'meta atingida'
                          : `${brl(-diff)} acima da meta`)
                    : (diff >= 0 ? `${brl(diff)} disponível` : `${brl(-diff)} acima`)}
                </span>
              </div>
              {groupCats.length > 0 && (
                <div className="mt-4 pt-3 border-t space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">{b.key === 'patrimônio' ? 'Aplicações' : `Categorias (${groupCats.length})`}</p>
                  {groupCats.map((cat) => {
                    const catSpent = b.key === 'patrimônio' ? cat.spent : sum(mExpenses.filter((e) => e.category === cat.name));
                    const catBudget = cat.percentage > 0 ? (ideal * cat.percentage / 100) : (ideal / groupCats.length);
                    const catPercent = b.key === 'patrimônio' ? 0 : (catBudget ? (catSpent / catBudget) * 100 : 0);
                    return (
                      <div key={cat.id || cat.name}>
                        <div className="flex justify-between text-xs">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
                            {cat.name}
                          </span>
                          <span className="text-muted-foreground">{brl(catSpent)}</span>
                        </div>
                        {b.key !== 'patrimônio' && <Progress value={Math.min(100, catPercent)} className="h-1 mt-1" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}