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

const blank = { description: '', category: 'salário', amount: '', date: new Date().toISOString().slice(0, 10), recurring: false, notes: '' };

export default function IncomeDialog({ open, onOpenChange, income, onSaved }) {
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(income ? { ...blank, ...income } : blank); }, [income, open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    const payload = { ...form, amount: Number(form.amount) };
    delete payload.id;
    if (income?.id) await vault.entities.Income.update(income.id, payload);
    else await vault.entities.Income.create(payload);
    setSaving(false);
    onOpenChange(false);
    onSaved();
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
            <Switch checked={form.recurring} onCheckedChange={(v) => set('recurring', v)} />
          </div>
          <div><Label>Observação</Label><Textarea rows={2} value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !form.description || !form.amount}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
