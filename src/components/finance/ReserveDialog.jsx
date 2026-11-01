import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const blank = { name: '', target_amount: '', deadline: '', notes: '' };

export default function ReserveDialog({ open, onOpenChange, reserve, onSaved }) {
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(reserve ? { ...blank, ...reserve } : blank);
  }, [reserve, open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    const payload = {
      name: form.name,
      target_amount: Number(form.target_amount) || 0,
      deadline: form.deadline || null,
      notes: form.notes,
    };
    delete payload.id;

    if (reserve?.id) {
      await base44.entities.Reserve.update(reserve.id, payload);
    } else {
      const created = await base44.entities.Reserve.create(payload);
      // Initialize current_amount to 0 for new reserves
      await base44.entities.Reserve.update(created.id, { current_amount: 0 });
    }

    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader><DialogTitle>{reserve ? 'Editar reserva' : 'Nova reserva'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Nome</Label><Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex: Reserva de Emergência" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Objetivo (meta)</Label><Input type="number" step="0.01" value={form.target_amount} onChange={(e) => set('target_amount', e.target.value)} placeholder="0,00" /></div>
            <div><Label>Prazo (opcional)</Label><Input type="date" value={form.deadline || ''} onChange={(e) => set('deadline', e.target.value)} /></div>
          </div>
          <div><Label>Observações</Label><Textarea rows={2} value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} /></div>
          <p className="text-xs text-muted-foreground">Use os botões + Depósito e Saque na reserva para registrar movimentações.</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !form.name}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}