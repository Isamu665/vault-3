import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import useCollection from '@/hooks/useCollection';
import { brl, civilDate } from '@/lib/finance';
import { Button } from '@/components/ui/button';

const displayDate = value => new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(value);
const COLORS = ['#6366f1', '#059669', '#dc2626', '#0284c7', '#9333ea'];

function csvCell(value) {
  const text = String(value ?? '');
  const safe = /^[\s]*[=+@-]/.test(text) && typeof value !== 'number' ? "'" + text : text;
  return '"' + safe.replaceAll('"', '""') + '"';
}

export default function InvestmentComparison() {
  const investments = useCollection('Investment', 'name');
  const updates = useCollection('InvestmentUpdate', 'date');
  const [selection, setSelection] = useState(null);
  const idsWithHistory = useMemo(() => new Set(updates.items.map(row => row.investment_id)), [updates.items]);
  const available = investments.items.filter(item => idsWithHistory.has(item.id));
  const selected = selection ?? available.slice(0, 2).map(item => item.id);
  const series = available.filter(item => selected.includes(item.id));
  const byDate = new Map();
  const orderedUpdates = [...updates.items].sort((left, right) =>
    String(left.updated_date || left.created_date || '').localeCompare(String(right.updated_date || right.created_date || ''))
  );
  for (const update of orderedUpdates) {
    const date = civilDate(update.date);
    if (!selected.includes(update.investment_id) || !date || !Number.isFinite(Date.parse(date)) ||
        update.amount == null || update.amount === '' || !Number.isFinite(Number(update.amount))) continue;
    const point = byDate.get(date) ?? { date, time: Date.parse(date) };
    point[update.investment_id] = Number(update.amount);
    byDate.set(date, point);
  }
  const points = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));

  function exportComparison() {
    const rows = [['Data', ...series.map(item => item.name)],
      ...points.map(point => [point.date, ...series.map(item => point[item.id] ?? '')])];
    const url = URL.createObjectURL(new Blob(['\uFEFF', rows.map(row => row.map(csvCell).join(';')).join('\r\n')],
      { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vault-comparativo-investimentos.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  if (investments.loading || updates.loading) return <p role="status" className="text-sm">Carregando histórico…</p>;
  if (investments.error || updates.error) return <p role="alert" className="text-sm">Não foi possível carregar o histórico de investimentos.</p>;
  if (!available.length) return <p className="text-sm text-muted-foreground">Registre atualizações de valor em Patrimônio para comparar os investimentos.</p>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Valores totais registrados em Patrimônio. Os pontos são datas com atualização. Aportes podem afetar o saldo, por isso o gráfico não mede rentabilidade.</p>
      <fieldset className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <legend className="mb-2 font-medium">Escolha até cinco investimentos</legend>
        {available.map(item => {
          const checked = selected.includes(item.id);
          return <label key={item.id} className="flex items-center gap-2">
            <input type="checkbox" checked={checked} disabled={!checked && series.length >= COLORS.length}
              onChange={() => setSelection(checked ? selected.filter(id => id !== item.id) : [...selected, item.id])} />
            {item.name}
          </label>;
        })}
      </fieldset>
      {points.length ? <>
        <div className="h-56 min-w-0" role="img" aria-label="Evolução dos valores registrados por investimento. Os números estão na tabela abaixo.">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="time" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={displayDate} tick={{ fontSize: 10 }} />
              <YAxis width={70} tick={{ fontSize: 10 }} tickFormatter={brl} />
              <Tooltip formatter={brl} labelFormatter={displayDate} />
              {series.map((item, index) => <Line key={item.id} name={item.name} dataKey={item.id}
                stroke={COLORS[index]} connectNulls dot={{ r: 3 }} isAnimationActive={false} />)}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <details>
          <summary className="cursor-pointer text-sm">Ver tabela de valores</summary>
          <div className="max-h-64 overflow-auto">
            <table className="w-full text-left text-xs">
              <thead><tr><th className="p-2">Data</th>{series.map(item => <th className="p-2" key={item.id}>{item.name}</th>)}</tr></thead>
              <tbody>{points.map(point => <tr className="border-t" key={point.date}><td className="p-2">{point.date}</td>
                {series.map(item => <td className="p-2" key={item.id}>{point[item.id] == null ? '—' : brl(point[item.id])}</td>)}
              </tr>)}</tbody>
            </table>
          </div>
        </details>
        <Button size="sm" variant="outline" onClick={exportComparison}>Baixar tabela CSV</Button>
      </> : <p className="text-sm text-muted-foreground">Selecione um investimento com valores registrados.</p>}
    </div>
  );
}
