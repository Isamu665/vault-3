import React from 'react';
import ChartReveal from '@/components/finance/ChartReveal';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { brl, groupBy } from '@/lib/finance';

export default function CategoryDonut({ expenses, categories }) {
  const grouped = groupBy(expenses, 'category');
  const data = Object.entries(grouped)
    .map(([name, value]) => ({ name, value, color: categories.find((c) => c.name === name)?.color || '#64748b' }))
    .sort((a, b) => b.value - a.value);

  if (!data.length) return <p className="text-sm text-muted-foreground">Sem despesas no período.</p>;

  return (
    <ChartReveal delay={0.15} className="grid sm:grid-cols-2 gap-4 items-center">
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="88%" paddingAngle={2} stroke="none" isAnimationActive animationDuration={1400} animationEasing="ease-out" animationBegin={150}>
              {data.map((d) => <Cell key={d.name} fill={d.color} />)}
            </Pie>
            <Tooltip formatter={(v) => brl(v)} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="space-y-2">
        {data.slice(0, 6).map((d) => (
          <li key={d.name} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />{d.name}
            </span>
            <span className="font-medium">{brl(d.value)}</span>
          </li>
        ))}
      </ul>
    </ChartReveal>
  );
}