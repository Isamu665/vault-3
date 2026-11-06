import { localDate } from '@/lib/finance';
import React, { useState, useEffect, useRef, useId } from 'react';
import { vault } from '@/api/vaultClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function ReserveTransactionDialog({ open, onOpenChange, reserve, mode, onSaved }) {
  const [form, setForm] = useState({ amount: '', date: localDate(), notes: '' });
  const attempt = useRef(null);
  const fieldId = useId();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ amount: '', date: localDate(), notes: '' });
      setError('');
      attempt.current = null;
    }
  }, [open]);

  const isWithdrawal = mode === 'withdrawal';

  const save = async () => {
    const amount = Number(form.amount) || 0;
    if (saving || amount <= 0 || !form.date) return;
    const key = JSON.stringify([reserve.id, mode, amount, form.date, form.notes]);
    if (attempt.current?.key !== key) attempt.current = { key, id: crypto.randomUUID() };
    setSaving(true);
    setError('');
    try {
      await vault.recordPatrimonyMovement(reserve.id, attempt.current.id, mode, { ...form, amount });
      onOpenChange(false);
      onSaved();
    } catch (error) {
      setError(error.message || 'Não foi possível salvar a movimentação.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={value => { if (!saving) onOpenChange(value); }}>
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
            <Label htmlFor={fieldId + "-amount"}>{isWithdrawal ? 'Valor do saque' : 'Valor do depósito'}</Label>
            <Input id={fieldId + "-amount"} disabled={saving} type="number" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0,00" />
          </div>
          <div>
            <Label htmlFor={fieldId + "-date"}>Data</Label>
            <Input id={fieldId + "-date"} disabled={saving} type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor={fieldId + "-notes"}>Observações (opcional)</Label>
            <Textarea id={fieldId + "-notes"} disabled={saving} rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button disabled={saving} variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !(Number(form.amount) > 0) || !form.date}>{saving ? 'Salvando...' : 'Confirmar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
