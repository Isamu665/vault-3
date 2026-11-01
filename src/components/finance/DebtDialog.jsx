import React, { useState, useEffect } from 'react';
import { vault } from '@/api/vaultClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const blank = {
  creditor: '', start_date: new Date().toISOString().slice(0, 10), original_amount: '',
  installment_amount: '', installments_total: '', installment_current: 0, interest_rate: '', cet: '', reason: '',
};

export default function DebtDialog({ open, onOpenChange, debt, onSaved }) {
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setForm(debt ? { ...blank, ...debt } : blank); }, [debt, open]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    const payload = {
      ...form,
      original_amount: Number(form.original_amount) || 0,
      installment_amount: Number(form.installment_amount) || 0,
      installments_total: Number(form.installments_total) || 0,
      installment_current: Number(form.installment_current) || 0,
      interest_rate: Number(form.interest_rate) || 0,
      cet: Number(form.cet) || 0,
    };
    delete payload.id;
    if (debt?.id) await vault.entities.Debt.update(debt.id, payload);
    else await vault.entities.Debt.create(payload);
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{debt ? 'Editar dívida' : 'Nova dívida'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Credor</Label><Input value={form.creditor} onChange={(e) => set('creditor', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Data inicial</Label><Input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} /></div>
            <div><Label>Valor original</Label><Input type="number" step="0.01" value={form.original_amount} onChange={(e) => set('original_amount', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Parcela</Label><Input type="number" step="0.01" value={form.installment_amount} onChange={(e) => set('installment_amount', e.target.value)} /></div>
            <div><Label>Nº parcelas</Label><Input type="number" value={form.installments_total} onChange={(e) => set('installments_total', e.target.value)} /></div>
            <div><Label>Parcela atual</Label><Input type="number" value={form.installment_current} onChange={(e) => set('installment_current', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Juros (% a.m.)</Label><Input type="number" step="0.01" value={form.interest_rate} onChange={(e) => set('interest_rate', e.target.value)} /></div>
            <div><Label>CET (%)</Label><Input type="number" step="0.01" value={form.cet} onChange={(e) => set('cet', e.target.value)} /></div>
          </div>
          <div><Label>Motivo</Label><Textarea rows={2} value={form.reason || ''} onChange={(e) => set('reason', e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !form.creditor || !form.installment_amount}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
