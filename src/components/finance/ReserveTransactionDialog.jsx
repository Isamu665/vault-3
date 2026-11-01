import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function ReserveTransactionDialog({ open, onOpenChange, reserve, mode, onSaved }) {
  const [form, setForm] = useState({ amount: '', date: new Date().toISOString().slice(0, 10), notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm({ amount: '', date: new Date().toISOString().slice(0, 10), notes: '' });
  }, [open]);

  const isWithdrawal = mode === 'withdrawal';

  const save = async () => {
    const amount = Number(form.amount) || 0;
    if (amount <= 0) return;
    setSaving(true);

    await base44.entities.ReserveTransaction.create({
      reserve_id: reserve.id,
      amount,
      date: form.date,
      type: mode,
      notes: form.notes,
    });

    const newBalance = isWithdrawal
      ? (reserve.current_amount || 0) - amount
      : (reserve.current_amount || 0) + amount;
    await base44.entities.Reserve.update(reserve.id, { current_amount: newBalance });

    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle>{isWithdrawal ? 'Saque da reserva' : 'Depósito na reserva'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Reserva</Label>
            <p className="text-sm font-medium mt-1">{reserve?.name}</p>
          </div>
          <div>
            <Label>{isWithdrawal ? 'Valor do saque' : 'Valor do depósito'}</Label>
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