import { localDate } from '@/lib/finance';
import React, { useState, useEffect } from 'react';
import { vault } from '@/api/vaultClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const blank = () => ({
  description: '', category: '', amount: '', date: localDate(),
  payment_method: 'pix', need_type: 'necessidade', recurring: false, installment: false,
  installments_total: '', installment_current: '', notes: '',
});
const METHODS = ['dinheiro', 'pix', 'débito', 'crédito', 'boleto', 'transferência'];
const NEEDS = [
  { value: 'necessidade', label: 'Necessidade' },
  { value: 'desejo', label: 'Desejo' },
  { value: 'patrimônio', label: 'Patrimônio' },
];

export default function ExpenseDialog({ open, onOpenChange, expense, categories, onSaved }) {
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(expense ? { ...blank(), ...expense } : { ...blank(), category: categories[0]?.name || '' });
  }, [expense, open, categories]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    const payload = {
      ...form,
      amount: Number(form.amount),
      installments_total: form.installment ? Number(form.installments_total) || null : null,
      installment_current: form.installment ? Number(form.installment_current) || null : null,
    };
    if (expense?.id) await vault.entities.Expense.update(expense.id, payload);
    else await vault.entities.Expense.create(payload);
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{expense ? 'Editar despesa' : 'Nova despesa'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Descrição</Label><Input value={form.description} onChange={(e) => set('description', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Valor</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} /></div>
            <div><Label>Data</Label><Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={(v) => {
                set('category', v);
                const cat = categories.find((c) => c.name === v);
                if (cat?.classification) set('need_type', cat.classification);
              }}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Forma de pagamento</Label>
              <Select value={form.payment_method} onValueChange={(v) => set('payment_method', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Classificação 50/30/20</Label>
            <Select value={form.need_type} onValueChange={(v) => set('need_type', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{NEEDS.map((n) => <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-xl border p-3">
            <Label>Despesa recorrente</Label>
            <Switch checked={form.recurring} onCheckedChange={(v) => set('recurring', v)} />
          </div>
          <div className="rounded-xl border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label>Parcelada</Label>
              <Switch checked={form.installment} onCheckedChange={(v) => set('installment', v)} />
            </div>
            {form.installment && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Parcela atual</Label><Input type="number" value={form.installment_current || ''} onChange={(e) => set('installment_current', e.target.value)} /></div>
                <div><Label>Total de parcelas</Label><Input type="number" value={form.installments_total || ''} onChange={(e) => set('installments_total', e.target.value)} /></div>
              </div>
            )}
          </div>
          <div><Label>Observações</Label><Textarea rows={2} value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !form.description || !form.amount}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
