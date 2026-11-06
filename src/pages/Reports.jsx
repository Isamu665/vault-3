import React, { useState } from 'react';
import useCollection from '@/hooks/useCollection';
import PageHeader from '@/components/finance/PageHeader';
import Section from '@/components/finance/Section';
import StatCard from '@/components/finance/StatCard';
import CategoryDonut from '@/components/finance/CategoryDonut';
import MonthlyChart from '@/components/finance/MonthlyChart';
import BalanceLineChart from '@/components/finance/BalanceLineChart';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { brl, sum } from '@/lib/finance';
import { economiaForRange, inRange, patrimonyAccumulated } from '@/lib/patrimony';

export default function Reports() {
  const year = new Date().getFullYear();
  const [from, setFrom] = useState(`${year}-01-01`);
  const [to, setTo] = useState(`${year}-12-31`);
  const [cat, setCat] = useState('todas');

  const { items: incomes } = useCollection('Income');
  const { items: expenses } = useCollection('Expense');
  const { items: categories } = useCollection('Category', 'name');
  const { items: reserveTxs } = useCollection('ReserveTransaction');
  const { items: investmentTxs } = useCollection('InvestmentTransaction');
  const { items: investments } = useCollection('Investment');

  const validRange = Boolean(from && to && from <= to);
  const fIncomes = incomes.filter((r) => inRange(r.date, from, to));
  // Exclude auto-created expenses (linked to investments/reserves)
  const fExpenses = expenses
    .filter((e) => inRange(e.date, from, to))
    .filter((e) => !e.investment_id && !e.reserve_id);
  const detailExpenses = fExpenses.filter((e) => cat === 'todas' || e.category === cat);

  const totalIn = sum(fIncomes);
  const totalOut = sum(fExpenses);
  const economia = economiaForRange(reserveTxs, investmentTxs, investments, from, to);
  const saldo = totalIn - totalOut - economia;
  const patrimonyPeriod = economia;
  const patrimonyAcc = patrimonyAccumulated(reserveTxs, investmentTxs, investments, to);
  const ranking = [...detailExpenses].sort((a, b) => b.amount - a.amount).slice(0, 10);

  return (
    <div>
      <PageHeader title="Relatórios" subtitle="Analise seus números por período e categoria" />

      <div className="rounded-2xl border bg-card p-5 shadow-sm mb-6 grid gap-4 sm:grid-cols-3">
        <div><Label htmlFor="report-from">De</Label><Input id="report-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-xl" /></div>
        <div><Label htmlFor="report-to">Até</Label><Input id="report-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-xl" /></div>
        <div>
          <Label htmlFor="report-category">Categoria do detalhamento</Label>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger id="report-category" className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {categories.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!validRange && <p role="alert" className="text-sm text-destructive">Informe um período válido. A data inicial deve ser igual ou anterior à final.</p>}
      {validRange && <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 mb-6">
        <StatCard label="Receitas do período" value={brl(totalIn)} tone="positive" />
        <StatCard label="Despesas do período" value={brl(totalOut)} tone="negative" />
        <StatCard label="Economia do período" value={brl(economia)} tone="accent" />
        <StatCard label="Saldo do período após aportes" value={brl(saldo)} tone={saldo >= 0 ? 'positive' : 'negative'} />
        <StatCard label="Patrimônio do período" value={brl(patrimonyPeriod)} tone="accent" />
        <StatCard label="Patrimônio acumulado" value={brl(patrimonyAcc)} tone="accent" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Distribuição por categoria"><CategoryDonut expenses={detailExpenses} categories={categories} /></Section>
        <Section title="Comparativo anual">
          <MonthlyChart incomes={incomes} expenses={expenses} year={year} reserveTxs={reserveTxs} investmentTxs={investmentTxs} investments={investments} />
        </Section>
        <Section title="Evolução do patrimônio">
          <BalanceLineChart reserveTxs={reserveTxs} investmentTxs={investmentTxs} investments={investments} year={year} />
        </Section>
        <Section title="Maiores gastos">
          {ranking.length === 0 ? <p className="text-sm text-muted-foreground">Sem despesas no período.</p> : (
            <ol className="space-y-2.5">
              {ranking.map((e, i) => (
                <li key={e.id} className="flex items-center justify-between text-sm">
                  <span className="truncate"><span className="text-muted-foreground mr-2">{i + 1}.</span>{e.description} <span className="text-muted-foreground">· {e.category}</span></span>
                  <span className="font-medium shrink-0 ml-3">{brl(e.amount)}</span>
                </li>
              ))}
            </ol>
          )}
        </Section>
      </div>
      </>}
    </div>
  );
}