import { useId, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { brl } from '@/lib/finance';

const FIELDS = [
  { key: 'initial', label: 'Valor inicial (R$)', max: 100000000, step: '0.01' },
  { key: 'contribution', label: 'Aporte mensal (R$)', max: 100000000, step: '0.01' },
  { key: 'months', label: 'Prazo (meses)', min: 1, max: 600, step: '1' },
  { key: 'rateA', label: 'Taxa anual A (%)', min: -99, max: 100, step: '0.01' },
  { key: 'rateB', label: 'Taxa anual B (%)', min: -99, max: 100, step: '0.01' },
];

export default function InvestmentScenarios() {
  const prefix = useId();
  const [form, setForm] = useState({ initial: '0', contribution: '0', months: '12', rateA: '0', rateB: '0' });
  const valid = FIELDS.every(({ key, min = 0, max }) => {
    const value = Number(form[key]);
    return form[key] !== '' && Number.isFinite(value) && value >= min && value <= max;
  }) && Number.isInteger(Number(form.months));
  const points = [];
  if (valid) {
    const contribution = Number(form.contribution);
    const monthlyFactorA = (1 + Number(form.rateA) / 100) ** (1 / 12);
    const monthlyFactorB = (1 + Number(form.rateB) / 100) ** (1 / 12);
    let balanceA = Number(form.initial);
    let balanceB = balanceA;
    for (let month = 0; month <= Number(form.months); month++) {
      points.push({ month, balanceA, balanceB });
      balanceA = balanceA * monthlyFactorA + contribution;
      balanceB = balanceB * monthlyFactorB + contribution;
    }
  }
  const last = points.at(-1);
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Compare duas taxas informadas por você. A projeção assume taxa constante e aportes no fim de cada mês. Os valores são brutos, sem impostos, taxas ou inflação.</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {FIELDS.map(({ key, label, min = 0, max, step }) => (
          <div key={key} className="space-y-1">
            <Label htmlFor={prefix + key}>{label}</Label>
            <Input id={prefix + key} type="number" min={min} max={max} step={step} value={form[key]}
              onChange={event => setForm(previous => ({ ...previous, [key]: event.target.value }))} />
          </div>
        ))}
      </div>
      {last ? <>
        <div className="grid grid-cols-2 gap-3">
          <p className="rounded-xl bg-muted p-3 text-sm">Cenário A <strong className="block break-words">{brl(last.balanceA)}</strong></p>
          <p className="rounded-xl bg-muted p-3 text-sm">Cenário B <strong className="block break-words">{brl(last.balanceB)}</strong></p>
        </div>
        <div className="h-52 min-w-0" role="img" aria-label="Projeção mensal dos cenários A e B. Os valores finais estão acima e a série mensal está na tabela abaixo.">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="month" tickFormatter={month => `${month}m`} tick={{ fontSize: 10 }} />
              <YAxis width={66} tickFormatter={value => Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(value)} tick={{ fontSize: 10 }} />
              <Tooltip formatter={brl} labelFormatter={month => `Mês ${month}`} />
              <Legend />
              <Line dataKey="balanceA" name="Cenário A" stroke="#6366f1" dot={false} isAnimationActive={false} />
              <Line dataKey="balanceB" name="Cenário B" stroke="#059669" dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <details>
          <summary className="cursor-pointer text-sm">Ver projeção mês a mês</summary>
          <div className="max-h-56 overflow-auto">
            <table className="w-full text-left text-xs">
              <thead><tr><th className="p-2">Mês</th><th>Cenário A</th><th>Cenário B</th></tr></thead>
              <tbody>{points.map(point => <tr key={point.month} className="border-t">
                <td className="p-2">{point.month}</td><td>{brl(point.balanceA)}</td><td>{brl(point.balanceB)}</td>
              </tr>)}</tbody>
            </table>
          </div>
        </details>
      </> : <p role="status" className="text-sm text-muted-foreground">Confira os valores. Use um prazo inteiro de 1 a 600 meses e taxas de −99% a 100% ao ano.</p>}
    </div>
  );
}
