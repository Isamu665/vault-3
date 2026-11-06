import React, { useState } from 'react';
import { Plus, Trash2, Sparkles, Pencil } from 'lucide-react';
import { vault } from '@/api/vaultClient';
import useCollection from '@/hooks/useCollection';
import PageHeader from '@/components/finance/PageHeader';
import EmptyState from '@/components/finance/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_RESERVE_CATEGORIES } from '@/lib/finance';

const COLORS = ['#f97316', '#0ea5e9', '#22c55e', '#a855f7', '#ef4444', '#6366f1', '#ec4899', '#14b8a6', '#eab308', '#64748b'];
const CLASSIFICATIONS = [
  { value: 'necessidade', label: 'Necessidade' },
  { value: 'desejo', label: 'Desejo' },
  { value: 'patrimônio', label: 'Patrimônio' },
];

export default function Categories() {
  const { items, reload } = useCollection('Category', 'name');
  const [draft, setDraft] = useState({ name: '', type: 'despesa', classification: 'necessidade', color: COLORS[0], status: 'active' });
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const form = editing ? editForm : draft;
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const setField = (setter, key, value) => setter(previous => ({ ...previous, [key]: value }));

  const startEdit = (c) => {
    setError('');
    setEditing(c);
    setEditForm({ name: c.name, type: c.type || 'despesa', classification: c.classification || 'necessidade', color: c.color, status: c.status || 'active' });
  };

  const save = async () => {
    if (saving || !form.name.trim()) return;
    setError('');
    const payload = {
      name: form.name.trim(),
      type: form.type,
      classification: form.type === 'reserva' ? 'patrimônio' : form.classification,
      color: form.color,
      status: form.status,
    };
    const normalized = payload.name.toLocaleLowerCase('pt-BR');
    const unchanged = editing?.name === payload.name && editing?.type === payload.type;
    if (!unchanged && items.some(c => c.id !== editing?.id && (c.type || 'despesa') === payload.type &&
        c.name?.trim().toLocaleLowerCase('pt-BR') === normalized)) {
      setError('Já existe uma categoria desse tipo com esse nome.');
      return;
    }
    setSaving(true);
    try {
      if (editing) await vault.entities.Category.update(editing.id, payload);
      else await vault.entities.Category.create(payload);
    } catch (error) {
      setError(error.message || 'Não foi possível salvar a categoria.');
      return;
    } finally {
      setSaving(false);
    }
    if (!editing) setDraft({ name: '', type: 'despesa', classification: 'necessidade', color: COLORS[0], status: 'active' });
    setEditing(null);
    reload();
  };

  const remove = async (id) => {
    if (!window.confirm('Excluir esta categoria? Para preservá-la no histórico, use o controle de arquivamento.')) return;
    setError('');
    try {
      await vault.entities.Category.delete(id);
      reload();
    } catch (error) {
      setError(error.message || 'Não foi possível excluir a categoria.');
    }
  };
  const toggleStatus = async (c) => { await vault.entities.Category.update(c.id, { status: c.status === 'inactive' ? 'active' : 'inactive' }); reload(); };
  const seedExpenses = async () => {
    await vault.entities.Category.bulkCreate(DEFAULT_EXPENSE_CATEGORIES.map(c => ({ ...c, status: 'active' })));
    reload();
  };

  const seedReserves = async () => {
    await vault.entities.Category.bulkCreate(DEFAULT_RESERVE_CATEGORIES.map((c) => ({ ...c, status: 'active' })));
    reload();
  };

  const closeEdit = () => {
    if (saving) return;
    setEditing(null);
    setError('');
  };

  const renderFields = (form, setter, prefix) => {
    const set = (key, value) => setField(setter, key, value);
    return (
        <div className={prefix === 'edit-category' ? 'grid gap-4 sm:grid-cols-2' : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-4'}>
          <div>
            <Label htmlFor={prefix + "-name"}>Nome</Label>
            <Input id={prefix + "-name"} placeholder="Ex: Academia" value={form.name} onChange={(e) => set('name', e.target.value)} className="rounded-xl mt-1" />
          </div>
          <div>
            <Label htmlFor={prefix + "-type"}>Tipo</Label>
            <Select value={form.type} onValueChange={(v) => set('type', v)}>
              <SelectTrigger id={prefix + "-type"} className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="despesa">Despesa</SelectItem>
                <SelectItem value="reserva">Reserva</SelectItem>
                <SelectItem value="receita">Receita</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.type === 'despesa' ? (
            <div>
              <Label htmlFor={prefix + "-classification"}>Classificação</Label>
              <Select value={form.classification} onValueChange={(v) => set('classification', v)}>
                <SelectTrigger id={prefix + "-classification"} className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CLASSIFICATIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="flex items-end">
              <div className="rounded-xl border bg-muted/50 px-3 py-2 text-sm text-muted-foreground w-full mt-1">
                {form.type === 'reserva' ? 'Patrimônio (auto)' : '—'}
              </div>
            </div>
          )}
          <div>
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {COLORS.map((c) => (
                <button type="button" aria-label={`Cor ${c}`} aria-pressed={form.color === c} key={c} onClick={() => set('color', c)}
                  className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? 'ring-2 ring-offset-2 ring-foreground scale-110' : ''}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>
        </div>
    );
  };

  return (
    <div>
      {!editing && error && <p role="alert" className="mb-3 text-sm text-destructive">{error}</p>}
      <PageHeader title="Categorias" subtitle="Organize por tipo e classificação 50/30/20">
        <Button variant="outline" className="rounded-full gap-2" onClick={seedExpenses}><Sparkles className="w-4 h-4" /> Despesas padrão</Button>
        <Button variant="outline" className="rounded-full gap-2" onClick={seedReserves}><Sparkles className="w-4 h-4" /> Reservas padrão</Button>
      </PageHeader>

      <div className="rounded-2xl border bg-card p-5 shadow-sm mb-6">
        {renderFields(draft, setDraft, 'new-category')}
        <div className="flex justify-end mt-4">
          <Button className="rounded-full gap-2" onClick={save} disabled={saving || !!editing}>
            <Plus className="w-4 h-4" /> Adicionar
          </Button>
        </div>
      </div>

      <Dialog open={Boolean(editing)} onOpenChange={open => { if (!open) closeEdit(); }}>
        <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Editar categoria</DialogTitle>
            <DialogDescription>Altere os dados da categoria selecionada.</DialogDescription>
          </DialogHeader>
          {editForm && renderFields(editForm, setEditForm, 'edit-category')}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="ghost" onClick={closeEdit} disabled={saving}>Cancelar</Button>
            <Button onClick={save} disabled={saving || !editForm?.name.trim()}>{saving ? 'Salvando…' : 'Salvar alterações'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {items.length === 0 ? <EmptyState text="Nenhuma categoria ainda." /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <div key={c.id} className={`rounded-2xl border bg-card p-4 shadow-sm ${c.status === 'inactive' ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: c.color }} />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.type}
                      {c.classification && c.type === 'despesa' && ` · ${c.classification}`}
                      {c.type === 'reserva' && ' · patrimônio'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Switch aria-label={c.status === 'inactive' ? 'Reativar categoria' : 'Arquivar categoria'} checked={c.status !== 'inactive'} onCheckedChange={() => toggleStatus(c)} />
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Editar categoria" onClick={() => startEdit(c)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" aria-label="Excluir categoria" onClick={() => remove(c.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
