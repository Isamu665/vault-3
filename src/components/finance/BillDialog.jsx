import React, { useState, useEffect } from 'react';
import { vault } from '@/api/vaultClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const blank = { description: '', amount: '', due_date: new Date().toISOString().slice(0, 10), category: '', status: 'pendente' };

export default function BillDialog({ open, onOpenChange, bill, onSaved }) {
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setForm(bill ? { ...blank, ...bill } : blank); }, [bill, open]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    const payload = { ...form, amount: Number(form.amount) };
    delete payload.id;
    if (bill?.id) await vault.entities.Bill.update(bill.id, payload);
    else await vault.entities.Bill.create(payload);
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader><DialogTitle>{bill ? 'Editar conta' : 'Nova conta a pagar'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Descrição</Label><Input value={form.description} onChange={(e) => set('description', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Valor</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} /></div>
            <div><Label>Vencimento</Label><Input type="date" value={form.due_date} onChange={(e) => set('due_date', e.target.value)} /></div>
          </div>
          <div><Label>Categoria</Label><Input value={form.category} onChange={(e) => set('category', e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !form.description || !form.amount}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
