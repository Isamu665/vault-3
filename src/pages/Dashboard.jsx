import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, TrendingUp, TrendingDown, PiggyBank, AlertTriangle, Target, Landmark, Coins } from 'lucide-react';
import useCollection from '@/hooks/useCollection';
import PageHeader from '@/components/finance/PageHeader';
import MonthPicker from '@/components/finance/MonthPicker';
import StatCard from '@/components/finance/StatCard';
import Section from '@/components/finance/Section';
import ExpandableBudgetGroup from '@/components/finance/ExpandableBudgetGroup';
import CategoryDonut from '@/components/finance/CategoryDonut';
import MonthlyChart from '@/components/finance/MonthlyChart';
import BalanceLineChart from '@/components/finance/BalanceLineChart';
import { Progress } from '@/components/ui/progress';
import { brl, inMonth, sum, groupBy, daysUntil, MONTHS } from '@/lib/finance';
import { economiaForMonth, patrimonyAccumulated, patrimonyBreakdown } from '@/lib/patrimony';
import { computeSaldoDisponivel } from '@/lib/cashflow';
import useRuleConfig from '@/hooks/useRuleConfig';

const CLASSIFICATION_MAP = { 'necessidades': 'necessidade', 'desejos': 'desejo', 'patrimonio': 'patrimônio' };

export default function Dashboard() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const { items: incomes } = useCollection('Income');
  const { items: expenses } = useCollection('Expense');
  const { items: bills } = useCollection('Bill', 'due_date');
  const { items: goals } = useCollection('Goal', '-created_date');
  const { items: debts } = useCollection('Debt', '-created_date');
  const { items: categories } = useCollection('Category', 'name');
  const { items: reserves } = useCollection('Reserve', 'name');
  const { items: investments } = useCollection('Investment', '-date');
  const { items: reserveTxs } = useCollection('ReserveTransaction');
  const { items: investmentTxs } = useCollection('InvestmentTransaction');

  const { config } = useRuleConfig();
  const GROUPS = config.categories.map((c) => ({
    key: CLASSIFICATION_MAP[c.key] || c.key,
    label: c.label,
    share: c.percentage / 100,
    color: c.color,
  }));

  // Exclude auto-created expenses (linked to investments/reserves)
  const mIncomes = incomes.filter((r) => inMonth(r.date, year, month));
  const mExpenses = expenses.filter((e) => inMonth(e.date, year, month) && !e.investment_id && !e.reserve_id);
  const economia = economiaForMonth(reserveTxs, investmentTxs, investments, year, month);
  const cashCollections = { incomes, expenses, reserveTxs, investmentTxs, investments };
  const { saldoDoMes: saving, dinheiroDisponivel: accumulatedSaldo } = computeSaldoDisponivel(cashCollections, year, month);
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const { saldoDoMes: prevSaving } = computeSaldoDisponivel(cashCollections, prevYear, prevMonth);

  const totalIn = sum(mIncomes);
  const totalOut = sum(mExpenses);
  const byCat = groupBy(mExpenses, 'category');
  const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
  const biggest = [...mExpenses].sort((a, b) => b.amount - a.amount)[0];
  const committed = totalIn ? Math.min(100, Math.max(0, ((totalIn - saving) / totalIn) * 100)) : 0;
  const dueSoon = bills.filter((b) => b.status !== 'pago' && daysUntil(b.due_date) <= 7);
  const pendingDebt = debts.reduce(
    (a, d) => a + Math.max(0, ((d.installments_total || 0) - (d.installment_current || 0)) * (d.installment_amount || 0)), 0);

  const endOfMonth = new Date(year, month + 1, 0).toISOString().slice(0, 10);
  const totalWealth = patrimonyAccumulated(reserveTxs, investmentTxs, investments, endOfMonth);

  const groupData = GROUPS.map((g) => {
    const ideal = totalIn * g.share;
    if (g.key === 'patrimônio') {
      const spent = economia;
      const categories = patrimonyBreakdown(reserveTxs, investmentTxs, reserves, investments, year, month);
      return { ...g, ideal, spent, categories, noCategoryIdeal: true };
    }
    const groupExpenses = mExpenses.filter((e) => (e.need_type || 'necessidade') === g.key);
    const spent = sum(groupExpenses);
    const groupCats = categories
      .filter((c) => c.classification === g.key && c.type === 'despesa')
      .map((cat) => {
        const catSpent = sum(groupExpenses.filter((e) => e.category === cat.name));
        return { name: cat.name, spent: catSpent, percentage: cat.percentage || 0, color: cat.color };
      });
    const knownNames = new Set(groupCats.map((c) => c.name));
    const unknownCats = Object.entries(groupBy(groupExpenses, 'category'))
      .filter(([name]) => name !== 'Sem categoria' && !knownNames.has(name))
      .map(([name, amt]) => ({ name, spent: amt, percentage: 0, color: '#64748b' }));
    return { ...g, ideal, spent, categories: [...groupCats, ...unknownCats], noCategoryIdeal: false };
  });

  return (
    <div>
      <PageHeader title="Painel" subtitle={`Resumo de ${MONTHS[month]} de ${year}`}>
        <MonthPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5 mb-6">
        <StatCard label="Saldo do mês" value={saving} icon={Wallet} tone={saving >= 0 ? 'positive' : 'negative'} delay={0} />
        <StatCard label="Receitas" value={totalIn} icon={TrendingUp} tone="positive" delay={0.06} />
        <StatCard label="Despesas" value={totalOut} icon={TrendingDown} tone="negative" delay={0.12} />
        <StatCard label="Economia" value={economia} icon={PiggyBank} delay={0.18}
          sub={`${saving >= prevSaving ? '+' : ''}${brl(saving - prevSaving)} vs mês anterior`} />
        <StatCard label="Patrimônio" value={totalWealth} icon={Landmark} tone="accent" delay={0.24} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5 mb-6">
        <StatCard label="Maior gasto" value={biggest ? biggest.amount : 0} sub={biggest?.description || '—'} delay={0.3} />
        <StatCard label="Categoria campeã" value={topCat ? topCat[0] : '—'} sub={topCat ? brl(topCat[1]) : '—'} delay={0.36} />
        <StatCard label="Renda comprometida" value={committed} format={(v) => `${v.toFixed(0)}%`} tone={committed > 90 ? 'negative' : 'default'} delay={0.42} />
        <StatCard label="Dívidas pendentes" value={pendingDebt} icon={AlertTriangle} tone={pendingDebt ? 'negative' : 'default'} delay={0.48} />
        <StatCard label="Dinheiro disponível" value={accumulatedSaldo} icon={Coins} tone={accumulatedSaldo >= 0 ? 'positive' : 'negative'} delay={0.54} />
      </div>

      <Section title={`Orçamento ${config.categories.map((c) => c.percentage).join('/')}`} className="mb-6" action={<Link to="/regra" className="text-xs text-indigo-600">ver detalhes</Link>}>
        <div className="grid gap-4 lg:grid-cols-3">
          {groupData.map((g) => (
            <ExpandableBudgetGroup key={g.key} label={g.label} share={g.share} ideal={g.ideal} spent={g.spent} color={g.color} categories={g.categories} noCategoryIdeal={g.noCategoryIdeal} invertColor={g.key === 'patrimônio'} />
          ))}
        </div>
      </Section>

      <div className="grid gap-4 lg:grid-cols-2 mb-6">
        <Section title="Gastos por categoria"><CategoryDonut expenses={mExpenses} categories={categories} /></Section>
        <Section title="Comparativo mensal">
          <MonthlyChart incomes={incomes} expenses={expenses} year={year} reserveTxs={reserveTxs} investmentTxs={investmentTxs} investments={investments} />
        </Section>
        <Section title="Evolução do patrimônio">
          <BalanceLineChart reserveTxs={reserveTxs} investmentTxs={investmentTxs} investments={investments} year={year} />
        </Section>

        <Section title="Contas próximas do vencimento" action={<Link to="/contas" className="text-xs text-indigo-600">ver todas</Link>}>
          {dueSoon.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma conta vencendo nos próximos 7 dias.</p> : (
            <ul className="space-y-3">
              {dueSoon.slice(0, 5).map((b) => {
                const d = daysUntil(b.due_date);
                return (
                  <li key={b.id} className="flex items-center justify-between text-sm">
                    <span>{b.description}</span>
                    <span className="flex items-center gap-3">
                      <span className={d < 0 ? 'text-rose-600' : 'text-amber-600'}>{d < 0 ? `${-d}d atrasada` : `em ${d}d`}</span>
                      <span className="font-medium">{brl(b.amount)}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <Section title="Metas em andamento" action={<Link to="/metas" className="text-xs text-indigo-600">ver todas</Link>}>
          {goals.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma meta cadastrada.</p> : (
            <ul className="space-y-4">
              {goals.slice(0, 4).map((g) => {
                const p = g.target_amount ? Math.min(100, (g.current_amount / g.target_amount) * 100) : 0;
                return (
                  <li key={g.id}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="flex items-center gap-2"><Target className="w-3.5 h-3.5 text-indigo-500" />{g.name}</span>
                      <span className="text-muted-foreground">{brl(g.current_amount)} / {brl(g.target_amount)}</span>
                    </div>
                    <Progress value={p} className="h-2" />
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <Section title="Previsão do saldo do mês">
          <p className="text-3xl font-semibold tracking-tight">{brl(saving - sum(bills.filter((b) => b.status !== 'pago' && inMonth(b.due_date, year, month))))}</p>
          <p className="text-xs text-muted-foreground mt-2">Saldo atual menos as contas ainda não pagas deste mês.</p>
        </Section>
      </div>
    </div>
  );
}