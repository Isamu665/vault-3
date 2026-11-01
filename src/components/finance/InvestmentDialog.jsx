import React, { useState, useEffect } from 'react';
import { vault } from '@/api/vaultClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const TYPES = [
  { value: 'tesouro_selic', label: 'Tesouro Selic' },
  { value: 'acoes', label: 'Ações' },
  { value: 'etf', label: 'ETF' },
  { value: 'cdb', label: 'CDB' },
  { value: 'fundo', label: 'Fundo de Investimento' },
  { value: 'renda_fixa', label: 'Renda Fixa' },
  { value: 'cripto', label: 'Criptomoeda' },
  { value: 'outros', label: 'Outros' },
];

const blank = {
  name: '', type: 'tesouro_selic', reserve_id: '',
  institution: '',
  taxa: '', vencimento: '', quantidade: '', preco_medio: '', percentual_cdi: '', notes: '',
};

export default function InvestmentDialog({ open, onOpenChange, investment, reserves, onSaved }) {
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(investment ? { ...blank, ...investment } : blank);
  }, [investment, open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    const payload = {
      name: form.name,
      type: form.type,
      reserve_id: form.reserve_id || null,
      institution: form.institution,
      taxa: form.taxa ? Number(form.taxa) : null,
      quantidade: form.quantidade ? Number(form.quantidade) : null,
      preco_medio: form.preco_medio ? Number(form.preco_medio) : null,
      percentual_cdi: form.percentual_cdi ? Number(form.percentual_cdi) : null,
      vencimento: form.vencimento || null,
      notes: form.notes,
    };
    delete payload.id;

    if (investment?.id) {
      await vault.entities.Investment.update(investment.id, payload);
    } else {
      await vault.entities.Investment.create(payload);
    }

    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  const showQuantidade = ['acoes', 'etf', 'cripto'].includes(form.type);
  const showTaxa = ['tesouro_selic', 'renda_fixa'].includes(form.type);
  const showVencimento = ['tesouro_selic', 'renda_fixa', 'cdb'].includes(form.type);
  const showCdi = ['cdb'].includes(form.type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{investment ? 'Editar investimento' : 'Novo investimento'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Nome</Label><Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex: Tesouro Selic 2029" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => set('type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reserva de origem (opcional)</Label>
              <Select value={form.reserve_id || 'nenhuma'} onValueChange={(v) => set('reserve_id', v === 'nenhuma' ? '' : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhuma">Nenhuma</SelectItem>
                  {reserves.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Instituição (opcional)</Label><Input value={form.institution} onChange={(e) => set('institution', e.target.value)} placeholder="Ex: XP, Nubank" /></div>
          {showQuantidade && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Quantidade</Label><Input type="number" step="0.0001" value={form.quantidade || ''} onChange={(e) => set('quantidade', e.target.value)} /></div>
              <div><Label>Preço médio</Label><Input type="number" step="0.01" value={form.preco_medio || ''} onChange={(e) => set('preco_medio', e.target.value)} /></div>
            </div>
          )}
          {showTaxa && (
            <div><Label>Taxa contratada (% a.a.)</Label><Input type="number" step="0.01" value={form.taxa || ''} onChange={(e) => set('taxa', e.target.value)} /></div>
          )}
          {showCdi && (
            <div><Label>Percentual do CDI (%)</Label><Input type="number" step="0.01" value={form.percentual_cdi || ''} onChange={(e) => set('percentual_cdi', e.target.value)} /></div>
          )}
          {showVencimento && (
            <div><Label>Vencimento</Label><Input type="date" value={form.vencimento || ''} onChange={(e) => set('vencimento', e.target.value)} /></div>
          )}
          <div><Label>Observações</Label><Textarea rows={2} value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !form.name}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
