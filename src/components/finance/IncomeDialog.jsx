import React, { useState, useEffect } from 'react';
import { vault } from '@/api/vaultClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { INCOME_CATEGORIES } from '@/lib/finance';
import { makeIncomeSchedule, localToday } from '@/lib/income-recurrence.mjs';

const blank = { description: '', category: 'salário', amount: '', date: new Date().toISOString().slice(0, 10), recurring: false, notes: '' };

export default function IncomeDialog({ open, onOpenChange, income, onSaved }) {
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { setForm(income ? { ...blank, ...income } : { ...blank, date: localToday() }); setError(''); }, [income, open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    setError('');
    /** @type {Record<string, any>} */
    const payload = { ...form, amount: Number(form.amount) };
    if (form.recurring && !income?.income_schedule) payload.income_schedule = makeIncomeSchedule(payload);
    if (income?.income_schedule) payload.income_schedule = { ...income.income_schedule, active: form.recurring };
    delete payload.id;
    try {
      if (income?.id) await vault.entities.Income.update(income.id, payload);
      else await vault.entities.Income.create(payload);
      onOpenChange(false);
      onSaved();
    } catch (e) { setError(e.message || 'Não foi possível salvar a receita.'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader><DialogTitle>{income ? 'Editar receita' : 'Nova receita'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Descrição</Label><Input value={form.description} onChange={(e) => set('description', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Valor</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} /></div>
            <div><Label>Data</Label><Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} /></div>
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={form.category} onValueChange={(v) => set('category', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{INCOME_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-xl border p-3">
            <Label>Receita recorrente</Label>
            <Switch checked={form.recurring} onCheckedChange={(v) => set('recurring', v)} disabled={saving || !!income?.recurrence_source} />
          </div>
          {form.recurring && <p className="text-xs text-muted-foreground">Esta receita é registrada como recebida na data informada. A repetição mensal cria previsões a partir de {income?.income_schedule?.start || makeIncomeSchedule(form).start}. Elas só entram no saldo ao confirmar o recebimento. Gerencie valor, dia e encerramento em “Receitas recorrentes”.</p>}
          {income?.recurrence_source && <p className="text-xs text-muted-foreground">Recebimento de uma recorrência. Edite as próximas previsões em “Receitas recorrentes”.</p>}
          <div><Label>Observação</Label><Textarea rows={2} value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} /></div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !form.description.trim() || !(Number(form.amount) > 0) || !form.date}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
