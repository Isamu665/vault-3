import React, { useState } from 'react';
import { Plus, Trash2, Pencil, TrendingUp, TrendingDown, Gem, Wallet, Target, History, ArrowDownToLine, ArrowUpFromLine, RefreshCw, LineChart } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import useCollection from '@/hooks/useCollection';
import PageHeader from '@/components/finance/PageHeader';
import StatCard from '@/components/finance/StatCard';
import Section from '@/components/finance/Section';
import EmptyState from '@/components/finance/EmptyState';
import ReserveDialog from '@/components/finance/ReserveDialog';
import InvestmentDialog from '@/components/finance/InvestmentDialog';
import ReserveTransactionDialog from '@/components/finance/ReserveTransactionDialog';
import InvestmentTransactionDialog from '@/components/finance/InvestmentTransactionDialog';
import InvestmentUpdateDialog from '@/components/finance/InvestmentUpdateDialog';
import InvestmentHistoryModal from '@/components/finance/InvestmentHistoryModal';
import HistoryModal from '@/components/finance/HistoryModal';
import TransactionDetailDialog from '@/components/finance/TransactionDetailDialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { brl, pct, daysUntil } from '@/lib/finance';
import { reserveBalance, investmentTotal } from '@/lib/patrimony';

const INV_TYPE_LABELS = {
  tesouro_selic: 'Tesouro Selic', acoes: 'Ações', etf: 'ETF', cdb: 'CDB',
  fundo: 'Fundo', renda_fixa: 'Renda Fixa', cripto: 'Cripto', outros: 'Outros',
};

export default function Patrimonio() {
  const { items: reserves, reload: reloadReserves } = useCollection('Reserve', 'name');
  const { items: investments, reload: reloadInvestments } = useCollection('Investment', '-date');
  const { items: reserveTxs, reload: reloadReserveTxs } = useCollection('ReserveTransaction', '-date');
  const { items: investmentTxs, reload: reloadInvestmentTxs } = useCollection('InvestmentTransaction', '-date');
  const { items: investmentUpdates, reload: reloadInvestmentUpdates } = useCollection('InvestmentUpdate', '-date');

  const [resOpen, setResOpen] = useState(false);
  const [invOpen, setInvOpen] = useState(false);
  const [editingRes, setEditingRes] = useState(null);
  const [editingInv, setEditingInv] = useState(null);
  const [resTxDialog, setResTxDialog] = useState({ open: false, reserve: null, mode: 'deposit' });
  const [invTxDialog, setInvTxDialog] = useState({ open: false, investment: null });
  const [invUpdateDialog, setInvUpdateDialog] = useState({ open: false, investment: null });
  const [invHistoryModal, setInvHistoryModal] = useState({ open: false, investment: null });
  const [historyModal, setHistoryModal] = useState({ open: false, title: '', transactions: [], type: 'reserve' });
  const [detailRes, setDetailRes] = useState(null);
  const [detailInv, setDetailInv] = useState(null);

  const reloadAll = () => { reloadReserves(); reloadInvestments(); reloadReserveTxs(); reloadInvestmentTxs(); reloadInvestmentUpdates(); };

  const totalReserved = reserves.reduce((a, r) => a + reserveBalance(reserveTxs, r.id), 0);
  const totalApplied = investments.reduce((a, i) => a + investmentTotal(investmentTxs, i.id), 0);
  const totalCurrent = investments.reduce((a, i) => a + (i.current_amount || investmentTotal(investmentTxs, i.id)), 0);
  const totalProfit = totalCurrent - totalApplied;
  const profitability = totalApplied ? (totalProfit / totalApplied) * 100 : 0;

  const deleteReserve = async (id) => {
    const linkedTxs = await base44.entities.ReserveTransaction.filter({ reserve_id: id });
    for (const tx of linkedTxs) await base44.entities.ReserveTransaction.delete(tx.id);
    const linkedExpenses = await base44.entities.Expense.filter({ reserve_id: id });
    for (const e of linkedExpenses) await base44.entities.Expense.delete(e.id);
    await base44.entities.Reserve.delete(id);
    reloadAll();
  };
  const deleteInvestment = async (id) => {
    const linkedTxs = await base44.entities.InvestmentTransaction.filter({ investment_id: id });
    for (const tx of linkedTxs) await base44.entities.InvestmentTransaction.delete(tx.id);
    const linkedExpenses = await base44.entities.Expense.filter({ investment_id: id });
    for (const e of linkedExpenses) await base44.entities.Expense.delete(e.id);
    await base44.entities.Investment.delete(id);
    reloadAll();
  };

  const reserveName = (id) => reserves.find((r) => r.id === id)?.name || '—';

  const showReserveHistory = (r) => {
    const txs = reserveTxs.filter((tx) => tx.reserve_id === r.id).sort((a, b) => new Date(b.date) - new Date(a.date));
    setHistoryModal({ open: true, title: `Histórico: ${r.name}`, transactions: txs, type: 'reserve' });
  };
  const showInvestmentHistory = (inv) => {
    const txs = investmentTxs.filter((tx) => tx.investment_id === inv.id).sort((a, b) => new Date(b.date) - new Date(a.date));
    setHistoryModal({ open: true, title: `Histórico: ${inv.name}`, transactions: txs, type: 'investment' });
  };

  return (
    <div>
      <PageHeader title="Patrimônio" subtitle="Reservas e carteira de investimentos" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <StatCard label="Total reservado" value={brl(totalReserved)} icon={Target} tone="accent" />
        <StatCard label="Total investido" value={brl(totalApplied)} icon={Wallet} tone="default" />
        <StatCard label="Lucro/Prejuízo" value={brl(totalProfit)} icon={totalProfit >= 0 ? TrendingUp : TrendingDown} tone={totalProfit >= 0 ? 'positive' : 'negative'} />
        <StatCard label="Rentabilidade" value={totalApplied ? pct(profitability) : '—'} icon={Gem} tone={totalProfit >= 0 ? 'positive' : 'negative'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Reservas" action={
          <Button size="sm" className="rounded-full gap-2" onClick={() => { setEditingRes(null); setResOpen(true); }}>
            <Plus className="w-4 h-4" /> Nova
          </Button>
        }>
          {reserves.length === 0 ? <EmptyState text="Nenhuma reserva criada ainda." /> : (
            <div className="space-y-3">
              {reserves.map((r) => {
                const balance = reserveBalance(reserveTxs, r.id);
                const p = r.target_amount ? Math.min(100, (balance / r.target_amount) * 100) : 0;
                const d = r.deadline ? daysUntil(r.deadline) : null;
                return (
                  <div key={r.id} onClick={() => setDetailRes(r)} className="rounded-2xl border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-emerald-200 dark:hover:border-emerald-800 cursor-pointer">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <p className="font-medium">{r.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {brl(balance)} / {brl(r.target_amount || 0)}
                          {d !== null && ` · ${d < 0 ? 'vencido' : `em ${d}d`}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0" onClick={(ev) => ev.stopPropagation()}>
                        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setResTxDialog({ open: true, reserve: r, mode: 'deposit' })}>
                          <ArrowDownToLine className="w-3.5 h-3.5" /> Depósito
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setResTxDialog({ open: true, reserve: r, mode: 'withdrawal' })}>
                          <ArrowUpFromLine className="w-3.5 h-3.5" /> Saque
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => showReserveHistory(r)}><History className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingRes(r); setResOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={() => deleteReserve(r.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                    <Progress value={p} className="h-2 mt-3" />
                    <p className="text-xs text-muted-foreground mt-1">{p.toFixed(0)}% do objetivo</p>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        <Section title="Carteira de Investimentos" action={
          <Button size="sm" className="rounded-full gap-2" onClick={() => { setEditingInv(null); setInvOpen(true); }}>
            <Plus className="w-4 h-4" /> Novo
          </Button>
        }>
          {investments.length === 0 ? <EmptyState text="Nenhum investimento cadastrado." /> : (
            <div className="space-y-3">
              {investments.map((inv) => {
                const invested = investmentTotal(investmentTxs, inv.id);
                const current = inv.current_amount || invested;
                const profit = current - invested;
                const profPct = invested ? (profit / invested) * 100 : 0;
                return (
                  <div key={inv.id} onClick={() => setDetailInv(inv)} className="rounded-2xl border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-blue-200 dark:hover:border-blue-800 cursor-pointer">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{inv.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {INV_TYPE_LABELS[inv.type] || inv.type}
                          {inv.institution && ` · ${inv.institution}`}
                          {inv.reserve_id && ` · ${reserveName(inv.reserve_id)}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0" onClick={(ev) => ev.stopPropagation()}>
                        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setInvTxDialog({ open: true, investment: inv })}>
                          <Plus className="w-3.5 h-3.5" /> Aporte
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setInvUpdateDialog({ open: true, investment: inv })}>
                          <RefreshCw className="w-3.5 h-3.5" /> Atualizar
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setInvHistoryModal({ open: true, investment: inv })}><LineChart className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => showInvestmentHistory(inv)}><History className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingInv(inv); setInvOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={() => deleteInvestment(inv.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Aplicado</p>
                        <p className="font-medium">{brl(invested)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Atual</p>
                        <p className="font-medium">{brl(current)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Lucro</p>
                        <p className={`font-medium ${profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{brl(profit)}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-2 text-xs">
                      <span className="text-muted-foreground">Rentabilidade</span>
                      <span className={`font-semibold ${profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {profPct >= 0 ? '+' : ''}{profPct.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      </div>

      <ReserveDialog open={resOpen} onOpenChange={setResOpen} reserve={editingRes} onSaved={reloadAll} />
      <InvestmentDialog open={invOpen} onOpenChange={setInvOpen} investment={editingInv} reserves={reserves} onSaved={reloadAll} />
      <ReserveTransactionDialog open={resTxDialog.open} onOpenChange={(v) => setResTxDialog((s) => ({ ...s, open: v }))} reserve={resTxDialog.reserve} mode={resTxDialog.mode} onSaved={reloadAll} />
      <InvestmentTransactionDialog open={invTxDialog.open} onOpenChange={(v) => setInvTxDialog((s) => ({ ...s, open: v }))} investment={invTxDialog.investment} onSaved={reloadAll} />
      <InvestmentUpdateDialog open={invUpdateDialog.open} onOpenChange={(v) => setInvUpdateDialog((s) => ({ ...s, open: v }))} investment={invUpdateDialog.investment} onSaved={reloadAll} />
      <InvestmentHistoryModal open={invHistoryModal.open} onOpenChange={(v) => setInvHistoryModal((s) => ({ ...s, open: v }))} investment={invHistoryModal.investment} updates={investmentUpdates.filter((u) => u.investment_id === invHistoryModal.investment?.id)} investmentTxs={investmentTxs} />
      <HistoryModal open={historyModal.open} onOpenChange={(v) => setHistoryModal((s) => ({ ...s, open: v }))} title={historyModal.title} transactions={historyModal.transactions} type={historyModal.type} />
      <TransactionDetailDialog item={detailRes} type="reserve" open={!!detailRes} onOpenChange={(v) => !v && setDetailRes(null)}
        onEdit={(item) => { setDetailRes(null); setEditingRes(item); setResOpen(true); }}
        onDelete={async (id) => { await deleteReserve(id); setDetailRes(null); }} />
      <TransactionDetailDialog item={detailInv} type="investment" open={!!detailInv} onOpenChange={(v) => !v && setDetailInv(null)}
        onEdit={(item) => { setDetailInv(null); setEditingInv(item); setInvOpen(true); }}
        onDelete={async (id) => { await deleteInvestment(id); setDetailInv(null); }} />
    </div>
  );
}