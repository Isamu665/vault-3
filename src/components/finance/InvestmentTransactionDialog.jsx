import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function InvestmentTransactionDialog({ open, onOpenChange, investment, onSaved }) {
  const [form, setForm] = useState({ amount: '', date: new Date().toISOString().slice(0, 10), notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm({ amount: '', date: new Date().toISOString().slice(0, 10), notes: '' });
  }, [open]);

  const save = async () => {
    const amount = Number(form.amount) || 0;
    if (amount <= 0) return;
    setSaving(true);

    await base44.entities.InvestmentTransaction.create({
      investment_id: investment.id,
      amount,
      date: form.date,
      notes: form.notes,
    });

    const newApplied = (investment.applied_amount || 0) + amount;
    const baseCurrent = investment.current_amount || (investment.applied_amount || 0);
    const newCurrent = baseCurrent + amount;
    await base44.entities.Investment.update(investment.id, { applied_amount: newApplied, current_amount: newCurrent });

    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm rounded-2xl">
        <DialogHeader><DialogTitle>Novo aporte</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Investimento</Label>
            <p className="text-sm font-medium mt-1">{investment?.name}</p>
          </div>
          <div>
            <Label>Valor do aporte</Label>
            <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0,00" />
          </div>
          <div>
            <Label>Data</Label>
            <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          </div>
          <div>
            <Label>Observações (opcional)</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !form.amount}>{saving ? 'Salvando...' : 'Confirmar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}