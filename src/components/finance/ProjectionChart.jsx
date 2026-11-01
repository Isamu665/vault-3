import React from 'react';
import ChartReveal from '@/components/finance/ChartReveal';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ReferenceLine } from 'recharts';
import { brl, MONTHS_SHORT } from '@/lib/finance';

export default function ProjectionChart({ projection, goalTarget, currentSaved }) {
  const data = projection.map((p) => ({
    mes: MONTHS_SHORT[p.month],
    Projetado: p.cumulative + currentSaved,
    Meta: goalTarget,
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
          <Bar dataKey="Projetado" fill="#6366f1" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={1400} animationEasing="ease-out" animationBegin={100} />
          <ReferenceLine y={goalTarget} stroke="#10b981" strokeDasharray="6 4" label={{ value: 'Meta', fontSize: 11, fill: '#10b981' }} />
        </BarChart>
      </ResponsiveContainer>
    </ChartReveal>
  );
}