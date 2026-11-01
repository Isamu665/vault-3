import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { brl } from '@/lib/finance';

const TITLES = {
  expense: 'Detalhes da despesa',
  income: 'Detalhes da receita',
  bill: 'Detalhes da conta',
  debt: 'Detalhes da dívida',
  goal: 'Detalhes da meta',
  reserve: 'Detalhes da reserva',
  investment: 'Detalhes do investimento',
};

const HIGHLIGHT_COLORS = {
  expense: 'text-rose-600 dark:text-rose-400',
  income: 'text-emerald-600 dark:text-emerald-400',
  bill: 'text-foreground',
  debt: 'text-rose-600 dark:text-rose-400',
  goal: 'text-indigo-600 dark:text-indigo-400',
  reserve: 'text-emerald-600 dark:text-emerald-400',
  investment: 'text-blue-600 dark:text-blue-400',
};

const PAYMENT_LABELS = { dinheiro: 'Dinheiro', pix: 'Pix', débito: 'Débito', credito: 'Crédito', boleto: 'Boleto', transferência: 'Transferência' };
const NEED_LABELS = { necessidade: 'Necessidade', desejo: 'Desejo', patrimônio: 'Patrimônio', investimento: 'Investimento' };
const BILL_STATUS = { pago: 'Pago', pendente: 'Pendente' };
const GOAL_CATEGORIES = { segurança: 'Segurança', lazer: 'Lazer', moradia: 'Moradia', educação: 'Educação', aposentadoria: 'Aposentadoria', outros: 'Outros' };
const INV_TYPES = { tesouro_selic: 'Tesouro Selic', acoes: 'Ações', etf: 'ETF', cdb: 'CDB', fundo: 'Fundo', renda_fixa: 'Renda Fixa', cripto: 'Cripto', outros: 'Outros' };

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function buildRows(item, type) {
  const rows = [];
  switch (type) {
    case 'expense':
      rows.push({ label: 'Descrição', value: item.description });
      rows.push({ label: 'Valor', value: brl(item.amount), highlight: true });
      rows.push({ label: 'Categoria', value: item.category || '—' });
      rows.push({ label: 'Data', value: fmtDate(item.date) });
      rows.push({ label: 'Forma de pagamento', value: PAYMENT_LABELS[item.payment_method] || item.payment_method || '—' });
      rows.push({ label: 'Classificação', value: NEED_LABELS[item.need_type] || item.need_type || '—' });
      if (item.installment && item.installments_total) rows.push({ label: 'Parcelamento', value: `${item.installment_current || 1} de ${item.installments_total}` });
      if (item.recurring) rows.push({ label: 'Recorrente', value: 'Sim' });
      if (item.notes) rows.push({ label: 'Observações', value: item.notes });
      break;
    case 'income':
      rows.push({ label: 'Descrição', value: item.description });
      rows.push({ label: 'Valor', value: brl(item.amount), highlight: true });
      rows.push({ label: 'Categoria', value: item.category || '—' });
      rows.push({ label: 'Data', value: fmtDate(item.date) });
      if (item.recurring) rows.push({ label: 'Recorrente', value: 'Sim' });
      if (item.notes) rows.push({ label: 'Observações', value: item.notes });
      break;
    case 'bill':
      rows.push({ label: 'Descrição', value: item.description });
      rows.push({ label: 'Valor', value: brl(item.amount), highlight: true });
      rows.push({ label: 'Vencimento', value: fmtDate(item.due_date) });
      rows.push({ label: 'Status', value: BILL_STATUS[item.status] || item.status || '—' });
      if (item.category) rows.push({ label: 'Categoria', value: item.category });
      break;
    case 'debt':
      rows.push({ label: 'Credor', value: item.creditor });
      rows.push({ label: 'Valor da parcela', value: brl(item.installment_amount), highlight: true });
      rows.push({ label: 'Parcelas', value: `${item.installment_current || 0} de ${item.installments_total || 0}` });
      rows.push({ label: 'Valor original', value: brl(item.original_amount || (item.installments_total || 0) * (item.installment_amount || 0)) });
      if (item.start_date) rows.push({ label: 'Data de início', value: fmtDate(item.start_date) });
      if (item.interest_rate) rows.push({ label: 'Juros', value: `${item.interest_rate}% a.m.` });
      if (item.cet) rows.push({ label: 'CET', value: `${item.cet}%` });
      if (item.reason) rows.push({ label: 'Motivo', value: item.reason });
      break;
    case 'goal':
      rows.push({ label: 'Nome', value: item.name });
      rows.push({ label: 'Valor atual', value: brl(item.current_amount || 0), highlight: true });
      rows.push({ label: 'Objetivo', value: brl(item.target_amount || 0) });
      rows.push({ label: 'Categoria', value: GOAL_CATEGORIES[item.category] || item.category || '—' });
      if (item.deadline) rows.push({ label: 'Prazo', value: fmtDate(item.deadline) });
      if (item.where) rows.push({ label: 'Onde', value: item.where });
      break;
    case 'reserve':
      rows.push({ label: 'Nome', value: item.name });
      if (item.target_amount) rows.push({ label: 'Objetivo', value: brl(item.target_amount), highlight: true });
      if (item.deadline) rows.push({ label: 'Prazo', value: fmtDate(item.deadline) });
      if (item.deposit_date) rows.push({ label: 'Data do depósito', value: fmtDate(item.deposit_date) });
      if (item.notes) rows.push({ label: 'Observações', value: item.notes });
      break;
    case 'investment':
      rows.push({ label: 'Nome', value: item.name });
      rows.push({ label: 'Tipo', value: INV_TYPES[item.type] || item.type || '—' });
      if (item.institution) rows.push({ label: 'Instituição', value: item.institution });
      rows.push({ label: 'Valor aplicado', value: brl(item.applied_amount || 0) });
      rows.push({ label: 'Valor atual', value: brl(item.current_amount || 0), highlight: true });
      if (item.date) rows.push({ label: 'Data', value: fmtDate(item.date) });
      if (item.taxa) rows.push({ label: 'Taxa', value: `${item.taxa}%` });
      if (item.percentual_cdi) rows.push({ label: '% CDI', value: `${item.percentual_cdi}%` });
      if (item.vencimento) rows.push({ label: 'Vencimento', value: fmtDate(item.vencimento) });
      if (item.quantidade) rows.push({ label: 'Quantidade', value: item.quantidade });
      if (item.preco_medio) rows.push({ label: 'Preço médio', value: brl(item.preco_medio) });
      if (item.notes) rows.push({ label: 'Observações', value: item.notes });
      break;
  }
  return rows;
}

export default function TransactionDetailDialog({ item, type, open, onOpenChange, onEdit, onDelete }) {
  const rows = item ? buildRows(item, type) : [];
  const title = TITLES[type] || 'Detalhes';
  const highlightColor = HIGHLIGHT_COLORS[type] || 'text-foreground';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        {item && (
          <>
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              {rows.map((row, i) => (
                <div key={i} className="flex justify-between items-start gap-4 text-sm">
                  <span className="text-muted-foreground shrink-0">{row.label}</span>
                  <span className={`text-right ${row.highlight ? 'text-lg font-semibold ' + highlightColor : 'font-medium'}`}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              {onDelete && (
                <Button variant="ghost" className="text-rose-500 hover:text-rose-600" onClick={() => onDelete(item.id)}>
                  <Trash2 className="w-4 h-4" /> Excluir
                </Button>
              )}
              {onEdit && (
                <Button variant="outline" onClick={() => onEdit(item)}>
                  <Pencil className="w-4 h-4" /> Editar
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}