import React, { useState } from 'react';
import { vault } from '@/api/vaultClient';
import { incomeForecasts, monthlyDate, localToday, makeIncomeSchedule, validIncomeSchedule } from '@/lib/income-recurrence.mjs';
import { brl, INCOME_CATEGORIES } from '@/lib/finance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const displayDate = date => date.split('-').reverse().join('/');
export default function RecurringIncomes({ incomes, year, month, onSaved, expense = false, categories = INCOME_CATEGORIES }) {
  const [editing, setEditing] = useState(null), [schedule, setSchedule] = useState(null);
  const [receipt, setReceipt] = useState(null), [amount, setAmount] = useState(''), [date, setDate] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const scheduleField = expense ? "expense_schedule" : "income_schedule";
  const entity = expense ? vault.entities.Expense : vault.entities.Income;
  const today = localToday();
  const forecasts = incomeForecasts(incomes, year, month, scheduleField);
  const sources = incomes.filter(r => !r.recurrence_source && (r[scheduleField] || r.recurring && !r.installment && !r.reserve_id && !r.investment_id));
  const change = (key, value) => setSchedule(s => ({ ...s, [key]: value }));
  const run = async (action) => {
    setBusy(true); setError(''); setNotice('');
    try { await action(); await onSaved(); }
    catch (e) { setError(e.message || 'Não foi possível salvar. Tente novamente.'); }
    finally { setBusy(false); }
  };
  const edit = source => {
    setError(''); setNotice(''); setEditing(source);
    const draft = source[scheduleField] || makeIncomeSchedule(source);
    if (expense && !source[scheduleField] && source.date.slice(0, 7) < today.slice(0, 7)) {
      const due = monthlyDate(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, draft.day);
      if (due >= today) draft.start = due;
    }
    setSchedule(draft);
  };
  return <section className="rounded-2xl border bg-card p-4 sm:p-5 mb-6 space-y-4">
    <div><h2 className="font-semibold">{expense ? "Despesas recorrentes" : "Receitas recorrentes"}</h2><p className="text-xs text-muted-foreground mt-1">Previsões mensais separadas do saldo. Use o seletor de mês para conferir previsões anteriores ou futuras. Em meses mais curtos, usamos o último dia.</p></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {notice && <p role="status" className="text-sm text-emerald-600">{notice}</p>}
    <div><h3 className="text-sm font-medium mb-2">Previstas no mês · {brl(forecasts.reduce((n, r) => n + r.amount, 0))}</h3>
      {forecasts.length === 0 ? <p className="text-sm text-muted-foreground">{expense ? "Nenhuma despesa recorrente pendente neste mês." : "Nenhum recebimento recorrente pendente neste mês."}</p> : <div className="space-y-2">{forecasts.map(f => <div key={`${f.source.id}:${f.due}`} className="rounded-xl border p-3 flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-sm font-medium">{f.description}</p><p className="text-xs text-muted-foreground">{displayDate(f.due)} · {f.category || 'Sem categoria'} · {f.automatic ? 'Lançamento automático' : f.due < today ? (expense ? 'Aguardando lançamento' : 'Aguardando recebimento') : 'Prevista'}</p></div>
        <div className="flex flex-wrap items-center gap-3"><span className="font-medium">{brl(f.amount)}</span><Button size="sm" disabled={busy || f.due > today} onClick={() => { setError(''); setReceipt(f); setAmount(String(f.amount)); setDate(today); }}>{expense ? "Registrar despesa" : "Confirmar recebimento"}</Button></div>
      </div>)}</div>}
    </div>
    {sources.length > 0 && <details><summary className="cursor-pointer text-sm font-medium">Gerenciar repetições ({sources.length})</summary><div className="space-y-2 mt-3">{sources.map(s => <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl border p-3"><div><p className="text-sm font-medium">{s[scheduleField]?.description || s.description}</p><p className="text-xs text-muted-foreground">{!s[scheduleField] ? 'Marcação antiga — ative para gerar previsões' : !s[scheduleField].active ? 'Encerrada' : s[scheduleField].end && s[scheduleField].end < today ? 'Encerrada na data definida' : `Mensal · dia ${s[scheduleField].day} · ${brl(s[scheduleField].amount)}`}</p></div><Button variant="outline" size="sm" disabled={busy} onClick={() => edit(s)}>{s[scheduleField] ? 'Configurar' : 'Ativar recorrência'}</Button></div>)}</div></details>}
    {sources.length === 0 && <p className="text-sm text-muted-foreground">{expense ? "Marque uma despesa como recorrente para configurar a repetição." : "Ative “Receita recorrente” ao cadastrar ou editar uma receita recebida."}</p>}
    <Dialog open={!!editing} onOpenChange={open => { if (!open && !busy) { setEditing(null); setError(''); } }}><DialogContent className="sm:max-w-lg rounded-2xl max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{expense ? "Configurar despesa recorrente" : "Configurar receita recorrente"}</DialogTitle><DialogDescription>As alterações valem para os próximos lançamentos e preservam o histórico.</DialogDescription></DialogHeader>
      {schedule && <form className="space-y-4" onSubmit={e => { e.preventDefault(); run(async () => {
        await entity.update(editing.id, { [scheduleField]: schedule, recurring: schedule.active });
        setEditing(null); setNotice('Recorrência atualizada.');
      }); }}>
        <div className="flex justify-between gap-3"><Label htmlFor="schedule-active">Repetição mensal ativa</Label><Switch id="schedule-active" checked={schedule.active} disabled={busy} onCheckedChange={value => change('active', value)} /></div>
        <div><Label htmlFor="schedule-description">Descrição dos próximos lançamentos</Label><Input id="schedule-description" required maxLength={500} value={schedule.description} disabled={busy} onChange={e => change('description', e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3"><div><Label htmlFor="schedule-amount">Valor previsto</Label><Input id="schedule-amount" type="number" required min="0.01" step="0.01" value={schedule.amount} disabled={busy} onChange={e => change('amount', Number(e.target.value))} /></div><div><Label htmlFor="schedule-day">Dia do mês</Label><Input id="schedule-day" type="number" required min="1" max="31" step="1" value={schedule.day} disabled={busy} onChange={e => change('day', Number(e.target.value))} /></div></div>
        <div><Label htmlFor="schedule-category">Categoria</Label><Select value={schedule.category || 'outros'} disabled={busy} onValueChange={value => change('category', value)}><SelectTrigger id="schedule-category"><SelectValue /></SelectTrigger><SelectContent>{[...new Set([...categories, schedule.category].filter(Boolean))].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
        <div className="grid grid-cols-2 gap-3"><div><Label htmlFor="schedule-start">Prever a partir de</Label><Input id="schedule-start" type="date" required value={schedule.start} disabled={busy} onChange={e => change('start', e.target.value)} /></div><div><Label htmlFor="schedule-end">Até (opcional)</Label><Input id="schedule-end" type="date" min={schedule.start} value={schedule.end} disabled={busy} onChange={e => change('end', e.target.value)} /></div></div>
        {expense && <div className="space-y-1"><div className="flex justify-between gap-3"><Label htmlFor="schedule-automatic">Registrar automaticamente no dia previsto</Label><Switch id="schedule-automatic" checked={schedule.automatic === true} disabled={busy} onCheckedChange={value => change("automatic", value)} /></div><p className="text-xs text-muted-foreground">O valor previsto entra nas despesas. Confira o lançamento se o banco cobrar um valor diferente ou o Pix falhar.</p></div>}
        <p className="text-xs text-muted-foreground">Desative para encerrar e retirar as previsões pendentes. Para recomeçar sem recuperar previsões antigas, ajuste “Prever a partir de”.</p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" disabled={busy} onClick={() => setEditing(null)}>Cancelar</Button><Button type="submit" disabled={busy || !validIncomeSchedule(schedule)}>{busy ? 'Salvando…' : 'Salvar recorrência'}</Button></div>
      </form>}
    </DialogContent></Dialog>
    <Dialog open={!!receipt} onOpenChange={open => { if (!open && !busy) { setReceipt(null); setError(''); } }}><DialogContent className="sm:max-w-md rounded-2xl"><DialogHeader><DialogTitle>{expense ? "Registrar despesa recorrente" : "Confirmar recebimento"}</DialogTitle><DialogDescription>{receipt?.description} · previsão para {receipt && displayDate(receipt.due)}. Confira o valor e a data antes de incluir no saldo.</DialogDescription></DialogHeader>
      <form className="space-y-4" onSubmit={e => { e.preventDefault(); run(async () => {
        const result = await (expense ? vault.confirmRecurringExpense : vault.confirmRecurringIncome)(receipt.source.id, receipt.due, Number(amount), date, receipt.source[scheduleField]);
        setReceipt(null); setNotice(result.alreadyReceived ? 'Este lançamento já está registrado.' : 'Lançamento incluído no saldo.');
      }); }}>
        <div><Label htmlFor="receipt-amount">Valor {expense ? "pago" : "recebido"}</Label><Input id="receipt-amount" type="number" min="0.01" step="0.01" required value={amount} disabled={busy} onChange={e => setAmount(e.target.value)} /></div>
        <div><Label htmlFor="receipt-date">Data do {expense ? "pagamento" : "recebimento"}</Label><Input id="receipt-date" type="date" max={today} required value={date} disabled={busy} onChange={e => setDate(e.target.value)} /></div>
        <p className="text-xs text-muted-foreground">Confirmar não altera o valor previsto para os próximos meses.</p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" disabled={busy} onClick={() => setReceipt(null)}>Cancelar</Button><Button type="submit" disabled={busy || !(Number(amount) > 0) || !date || date > today}>{busy ? 'Salvando…' : 'Confirmar e incluir no saldo'}</Button></div>
      </form>
    </DialogContent></Dialog>
  </section>;
}
