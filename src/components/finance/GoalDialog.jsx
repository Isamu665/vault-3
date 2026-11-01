import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CATS = ['segurança', 'lazer', 'moradia', 'educação', 'aposentadoria', 'outros'];
const blank = { name: '', category: 'outros', target_amount: '', current_amount: 0, deadline: '', where: '' };

export default function GoalDialog({ open, onOpenChange, goal, onSaved }) {
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setForm(goal ? { ...blank, ...goal } : blank); }, [goal, open]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    const payload = { ...form, target_amount: Number(form.target_amount) || 0, current_amount: Number(form.current_amount) || 0 };
    if (!payload.deadline) delete payload.deadline;
    delete payload.id;
    if (goal?.id) await base44.entities.Goal.update(goal.id, payload);
    else await base44.entities.Goal.create(payload);
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader><DialogTitle>{goal ? 'Editar meta' : 'Nova meta'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Nome</Label><Input value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
          <div>
            <Label>Categoria</Label>
            <Select value={form.category} onValueChange={(v) => set('category', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Valor desejado</Label><Input type="number" step="0.01" value={form.target_amount} onChange={(e) => set('target_amount', e.target.value)} /></div>
            <div><Label>Valor atual</Label><Input type="number" step="0.01" value={form.current_amount} onChange={(e) => set('current_amount', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Prazo</Label><Input type="date" value={form.deadline || ''} onChange={(e) => set('deadline', e.target.value)} /></div>
            <div><Label>Onde guardar</Label><Input value={form.where || ''} onChange={(e) => set('where', e.target.value)} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !form.name || !form.target_amount}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}