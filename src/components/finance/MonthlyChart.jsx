import React from 'react';
import ChartReveal from '@/components/finance/ChartReveal';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { brl, MONTHS_SHORT, inMonth, sum } from '@/lib/finance';
import { economiaForMonth } from '@/lib/patrimony';

export default function MonthlyChart({ incomes, expenses, year, reserveTxs = [], investmentTxs = [], investments = [] }) {
  const data = MONTHS_SHORT.map((m, i) => ({
    mes: m,
    Receitas: sum(incomes.filter((r) => inMonth(r.date, year, i))),
    Despesas: sum(expenses.filter((e) => inMonth(e.date, year, i) && !e.investment_id && !e.reserve_id)),
    Economia: economiaForMonth(reserveTxs, investmentTxs, investments, year, i),
  }));
  return (
    <ChartReveal delay={0.25} className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
          <XAxis dataKey="mes" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis fontSize={11} tickLine={false} axisLine={false} width={50} />
          <Tooltip formatter={(v) => brl(v)} />
          <Legend />
          <Bar dataKey="Receitas" fill="#10b981" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={1400} animationEasing="ease-out" animationBegin={0} />
          <Bar dataKey="Despesas" fill="#f43f5e" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={1400} animationEasing="ease-out" animationBegin={150} />
          <Bar dataKey="Economia" fill="#6366f1" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={1400} animationEasing="ease-out" animationBegin={300} />
        </BarChart>
      </ResponsiveContainer>
    </ChartReveal>
  );
}