import { localDate } from '@/lib/finance';
import React, { useState, useEffect } from 'react';
import { vault } from '@/api/vaultClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const blank = () => ({ description: '', amount: '', due_date: localDate(), category: '', status: 'pendente' });

export default function BillDialog({ open, onOpenChange, bill, onSaved, categories = [], categoriesLoading, categoriesError }) {
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setForm(bill ? { ...blank(), ...bill } : blank()); }, [bill, open]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const selectedCategory = categories.find((c) => c.name === form.category || c.id === form.category);
  const legacyCategory = form.category && !selectedCategory;

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
          <div>
            <Label htmlFor="bill-category">Categoria</Label>
            <Select value={selectedCategory?.id || (legacyCategory ? 'legacy' : 'none')} onValueChange={(value) => { if (value !== 'legacy') set('category', categories.find((c) => c.id === value)?.name || ''); }} disabled={saving || categoriesLoading || !!categoriesError}>
              <SelectTrigger id="bill-category"><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem categoria</SelectItem>
                {legacyCategory && <SelectItem value="legacy">{form.category} (categoria anterior)</SelectItem>}
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1.5">{categoriesLoading ? 'Carregando categorias…' : 'A categoria escolhida já virá preenchida ao confirmar o pagamento.'}</p>
            {categoriesError && <p role="alert" className="text-destructive text-sm mt-1.5">Não foi possível carregar suas categorias. Tente novamente.</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !form.description || !form.amount}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
