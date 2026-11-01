import React from 'react';
import ChartReveal from '@/components/finance/ChartReveal';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { brl, MONTHS_SHORT } from '@/lib/finance';
import { patrimonyAccumulated } from '@/lib/patrimony';

export default function BalanceLineChart({ reserveTxs = [], investmentTxs = [], investments = [], year }) {
  const data = MONTHS_SHORT.map((m, i) => {
    const endOfMonth = new Date(year, i + 1, 0).toISOString().slice(0, 10);
    return { mes: m, Patrimônio: patrimonyAccumulated(reserveTxs, investmentTxs, investments, endOfMonth) };
  });
  return (
    <ChartReveal delay={0.35} className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
          <XAxis dataKey="mes" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis fontSize={11} tickLine={false} axisLine={false} width={50} />
          <Tooltip formatter={(v) => brl(v)} />
          <Line type="monotone" dataKey="Patrimônio" stroke="#6366f1" strokeWidth={3} dot={{ r: 3 }} isAnimationActive animationDuration={1500} animationEasing="ease-out" animationBegin={200} />
        </LineChart>
      </ResponsiveContainer>
    </ChartReveal>
  );
}