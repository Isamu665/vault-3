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
import { Switch } from '@/components/ui/switch';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_RESERVE_CATEGORIES } from '@/lib/finance';

const COLORS = ['#f97316', '#0ea5e9', '#22c55e', '#a855f7', '#ef4444', '#6366f1', '#ec4899', '#14b8a6', '#eab308', '#64748b'];
const CLASSIFICATIONS = [
  { value: 'necessidade', label: 'Necessidade' },
  { value: 'desejo', label: 'Desejo' },
  { value: 'patrimônio', label: 'Patrimônio' },
];
const CLASS_LABELS = { necessidade: 'Necessidades', desejo: 'Desejos', 'patrimônio': 'Patrimônio' };

export default function Categories() {
  const { items, reload } = useCollection('Category', 'name');
  const [form, setForm] = useState({ name: '', type: 'despesa', classification: 'necessidade', percentage: '', color: COLORS[0], status: 'active' });
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const groupSums = {};
  items.filter(c => c.type === 'despesa').forEach(c => {
    const cls = c.classification || 'necessidade';
    groupSums[cls] = (groupSums[cls] || 0) + (Number(c.percentage) || 0);
  });

  const startEdit = (c) => {
    setEditing(c);
    setForm({ name: c.name, type: c.type, classification: c.classification || 'necessidade', percentage: c.percentage || '', color: c.color, status: c.status || 'active' });
  };

  const save = async () => {
    if (saving || !form.name.trim()) return;
    setError('');
    const payload = {
      name: form.name.trim(),
      type: form.type,
      classification: form.type === 'reserva' ? 'patrimônio' : form.classification,
      percentage: form.type === 'despesa' ? (Number(form.percentage) || 0) : 0,
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
    setForm({ name: '', type: 'despesa', classification: 'necessidade', percentage: '', color: COLORS[0], status: 'active' });
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
  const updatePercentage = async (c, pct) => {
    await vault.entities.Category.update(c.id, { percentage: Math.max(0, Math.min(100, Number(pct) || 0)) });
    reload();
  };

  const seedExpenses = async () => {
    const byClass = {};
    DEFAULT_EXPENSE_CATEGORIES.forEach(c => {
      const cls = c.classification || 'necessidade';
      if (!byClass[cls]) byClass[cls] = [];
      byClass[cls].push(c);
    });
    const categories = Object.entries(byClass).flatMap(([cls, cats]) => {
      const pct = Math.round(100 / cats.length);
      return cats.map(c => ({ ...c, status: 'active', percentage: pct }));
    });
    await vault.entities.Category.bulkCreate(categories);
    reload();
  };
  const seedReserves = async () => {
    await vault.entities.Category.bulkCreate(DEFAULT_RESERVE_CATEGORIES.map((c) => ({ ...c, status: 'active', percentage: 0 })));
    reload();
  };

  const showClassification = form.type === 'despesa';
  const despesaCats = items.filter(c => c.type === 'despesa');

  return (
    <div>
      {error && <p role="alert" className="mb-3 text-sm text-destructive">{error}</p>}
      <PageHeader title="Categorias" subtitle="Organize por tipo e classificação 50/30/20">
        <Button variant="outline" className="rounded-full gap-2" onClick={seedExpenses}><Sparkles className="w-4 h-4" /> Despesas padrão</Button>
        <Button variant="outline" className="rounded-full gap-2" onClick={seedReserves}><Sparkles className="w-4 h-4" /> Reservas padrão</Button>
      </PageHeader>

      {despesaCats.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3 mb-6">
          {CLASSIFICATIONS.map(cls => {
            const sum = groupSums[cls.value] || 0;
            const ok = sum === 100;
            const hasCats = despesaCats.some(c => (c.classification || 'necessidade') === cls.value);
            return (
              <div key={cls.value} className={`rounded-xl border p-3 ${ok ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : hasCats ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' : 'bg-muted/30'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{CLASS_LABELS[cls.value]}</span>
                  <span className={`text-sm font-semibold ${ok ? 'text-emerald-600 dark:text-emerald-400' : hasCats ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>{sum}%</span>
                </div>
                {!hasCats && <p className="text-xs text-muted-foreground mt-1">Nenhuma categoria</p>}
                {hasCats && !ok && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">A soma deve ser 100%</p>}
                {hasCats && ok && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">✓ Distribuição correta</p>}
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-2xl border bg-card p-5 shadow-sm mb-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <Label>Nome</Label>
            <Input placeholder="Ex: Academia" value={form.name} onChange={(e) => set('name', e.target.value)} className="rounded-xl mt-1" />
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={form.type} onValueChange={(v) => set('type', v)}>
              <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="despesa">Despesa</SelectItem>
                <SelectItem value="reserva">Reserva</SelectItem>
                <SelectItem value="receita">Receita</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {showClassification ? (
            <div>
              <Label>Classificação</Label>
              <Select value={form.classification} onValueChange={(v) => set('classification', v)}>
                <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
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
          {showClassification && (
            <div>
              <Label>% do grupo</Label>
              <Input type="number" min="0" max="100" value={form.percentage} onChange={(e) => set('percentage', e.target.value)} className="rounded-xl mt-1" placeholder="0" />
            </div>
          )}
          <div>
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {COLORS.map((c) => (
                <button key={c} onClick={() => set('color', c)}
                  className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? 'ring-2 ring-offset-2 ring-foreground scale-110' : ''}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <Button className="rounded-full gap-2" onClick={save} disabled={saving}>
            <Plus className="w-4 h-4" /> {editing ? 'Salvar edição' : 'Adicionar'}
          </Button>
        </div>
      </div>

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
              {c.type === 'despesa' && (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">% do grupo:</span>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={c.percentage || 0}
                    onChange={(e) => updatePercentage(c, e.target.value)}
                    className="h-7 w-20 text-sm rounded-lg"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
