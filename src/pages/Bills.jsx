import React, { useState } from 'react';
import { Plus, Check, Trash2 } from 'lucide-react';
import { vault } from '@/api/vaultClient';
import useCollection from '@/hooks/useCollection';
import PageHeader from '@/components/finance/PageHeader';
import Section from '@/components/finance/Section';
import EmptyState from '@/components/finance/EmptyState';
import BillDialog from '@/components/finance/BillDialog';
import TransactionDetailDialog from '@/components/finance/TransactionDetailDialog';
import { Button } from '@/components/ui/button';
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue,SelectSeparator } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { brl, daysUntil } from '@/lib/finance';

const statusOf = (b) => {
  if (b.status === 'pago') return { label: 'Pago', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' };
  const d = daysUntil(b.due_date);
  if (d < 0) return { label: 'Atrasado', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' };
  if (d <= 5) return { label: 'Próximo do vencimento', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' };
  return { label: 'Pendente', cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' };
};

const startOfWeek = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
};

export default function Bills() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [paymentBill,setPaymentBill]=useState(null),[payment,setPayment]=useState({amount:'',category:'',date:'',payment_method:'pix'});
  const [paying,setPaying]=useState(''),[paymentError,setPaymentError]=useState(''),[notice,setNotice]=useState('');
  const {items:categories,loading:categoriesLoading,error:categoriesError}=useCollection('Category');
  const [categoryChoice,setCategoryChoice]=useState(''),[newName,setNewName]=useState(''),[newClass,setNewClass]=useState('necessidade');
  const expenseCategories=categories.filter(c=>(!c.type || c.type==='despesa') && c.status!=='inactive');
  const { items, reload } = useCollection('Bill', 'due_date');

  const toggle = async (b) => {
    if(paying || b.status==='pago')return;
    setPaying(b.id);setPaymentError('');setNotice('');
    try { const result=await vault.payBill(b.id,{...payment,amount:Number(payment.amount),...(categoryChoice==='new'?{new_category:{name:newName.trim(),classification:newClass}}:categoryChoice?{category_id:categoryChoice}:{})});setNotice(result.alreadyPaid?'Esta conta já estava paga. Nenhuma despesa foi duplicada.':'Conta marcada como paga e despesa registrada com os dados confirmados.');setPaymentBill(null);reload(); }
    catch(e){setPaymentError(e.message || 'Não foi possível registrar o pagamento.');}
    finally{setPaying('');}
  };
  const remove = async (id) => { await vault.entities.Bill.delete(id); reload(); };

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek());
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    return { date: d, iso, bills: items.filter((b) => b.due_date === iso) };
  });

  return (
    <div>
      <PageHeader title="Contas a pagar" subtitle="Acompanhe vencimentos por semana">
        <Button className="rounded-full gap-2" onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> Nova conta</Button>
      </PageHeader>
      <p className="text-xs text-muted-foreground mb-4">Confira valor, categoria, data e forma de pagamento antes de registrar a despesa.</p>
      {paymentError && <p role="alert" className="text-destructive mb-4">{paymentError}</p>}
      {notice && <p role="status" className="text-emerald-600 mb-4">{notice}</p>}

      <Section title="Calendário desta semana" className="mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {week.map(({ date, iso, bills }) => (
            <div key={iso} className="rounded-xl border p-3 min-h-[6.5rem]">
              <p className="text-xs text-muted-foreground capitalize">
                {date.toLocaleDateString('pt-BR', { weekday: 'short' })} {date.getDate()}
              </p>
              <div className="mt-2 space-y-1.5">
                {bills.map((b) => (
                  <div key={b.id} className={`rounded-lg px-2 py-1 text-[11px] leading-tight ${statusOf(b).cls}`}>
                    {b.description}<br />{brl(b.amount)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {items.length === 0 ? <EmptyState text="Nenhuma conta cadastrada." /> : (
        <div className="space-y-2">
          {items.map((b) => {
            const s = statusOf(b);
            return (
              <div key={b.id} onClick={() => setDetailItem(b)} className="flex items-center justify-between rounded-2xl border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-amber-200 dark:hover:border-amber-800 cursor-pointer">
                <div>
                  <p className="font-medium">{b.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    vence {new Date(b.due_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}{b.category ? ` · ${b.category}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3" onClick={(ev) => ev.stopPropagation()}>
                  <Badge className={`${s.cls} border-0 font-normal`}>{s.label}</Badge>
                  <span className="font-semibold">{brl(b.amount)}</span>
                  <Button variant="ghost" size="icon" aria-label={b.status==='pago'?'Conta já paga':'Marcar como paga e registrar despesa'} title={b.status==='pago'?'Conta já paga':'Marcar como paga e registrar despesa'} disabled={!!paying || b.status==='pago'} className="h-8 w-8 text-emerald-600" onClick={() => {setPaymentError('');setCategoryChoice(expenseCategories.find(c=>c.name===b.category || c.id===b.category)?.id || '');setNewName('');setNewClass('necessidade');setPaymentBill(b);const d=new Date();setPayment({amount:String(b.amount),category:b.category || '',date:d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'),payment_method:'pix'});}}><Check className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={() => remove(b.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!paymentBill} onOpenChange={value=>{if(!value && !paying)setPaymentBill(null);}}><DialogContent className="sm:max-w-lg rounded-2xl max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>Confirmar pagamento</DialogTitle><DialogDescription>{paymentBill?.description} — a despesa será criada com os dados abaixo. O vencimento e o valor previsto da conta serão preservados.</DialogDescription></DialogHeader>
        <form className="space-y-4" onSubmit={e=>{e.preventDefault();toggle(paymentBill);}}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label htmlFor="payment-amount">Valor pago</Label><Input id="payment-amount" required type="number" min="0.01" step="0.01" value={payment.amount} onChange={e=>setPayment({...payment,amount:e.target.value})} disabled={!!paying}/></div>
            <div className="space-y-1.5"><Label htmlFor="payment-date">Data do pagamento</Label><Input id="payment-date" required type="date" value={payment.date} onChange={e=>setPayment({...payment,date:e.target.value})} disabled={!!paying}/></div>
          </div>
          <div className="space-y-1.5"><Label htmlFor="payment-category">Categoria</Label><Select value={categoryChoice} onValueChange={setCategoryChoice} disabled={!!paying || categoriesLoading || !!categoriesError}><SelectTrigger id="payment-category"><SelectValue placeholder={categoriesLoading?'Carregando categorias…':'Selecione uma categoria'}/></SelectTrigger><SelectContent>{expenseCategories.map(c=><SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}{expenseCategories.length>0 && <SelectSeparator/>}<SelectItem value="new"><span className="flex items-center gap-2 text-indigo-600 dark:text-indigo-300"><Plus className="w-4 h-4"/>Criar nova categoria</span></SelectItem></SelectContent></Select></div>
          {categoriesError && <p role="alert" className="text-destructive text-sm">Não foi possível carregar suas categorias. Tente novamente.</p>}
          {categoryChoice==='new' && <div className="rounded-xl border bg-muted/30 p-4 space-y-4"><p className="text-sm font-medium flex items-center gap-2"><Plus className="w-4 h-4 text-indigo-500"/>Nova categoria</p><div className="space-y-1.5"><Label htmlFor="new-category-name">Nome</Label><Input id="new-category-name" required maxLength={100} placeholder="Ex.: Moradia" value={newName} onChange={e=>setNewName(e.target.value)} disabled={!!paying}/></div><div className="space-y-1.5"><Label htmlFor="new-category-class">Classificação</Label><Select value={newClass} onValueChange={setNewClass} disabled={!!paying}><SelectTrigger id="new-category-class"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="necessidade">Necessidade</SelectItem><SelectItem value="desejo">Desejo</SelectItem></SelectContent></Select></div><p className="text-xs text-muted-foreground">Criada junto com a despesa ao confirmar o pagamento.</p></div>}
          <div className="space-y-1.5"><Label htmlFor="payment-method">Forma de pagamento</Label><Select value={payment.payment_method} onValueChange={value=>setPayment({...payment,payment_method:value})} disabled={!!paying}><SelectTrigger id="payment-method"><SelectValue/></SelectTrigger><SelectContent>{[['pix','Pix'],['dinheiro','Dinheiro'],['débito','Cartão de débito'],['crédito','Cartão de crédito'],['boleto','Boleto'],['transferência','Transferência']].map(([value,label])=><SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
          {paymentError && <p role="alert" className="text-destructive text-sm">{paymentError}</p>}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2"><Button type="button" variant="ghost" disabled={!!paying} onClick={()=>setPaymentBill(null)}>Cancelar</Button><Button type="submit" disabled={!!paying || categoriesLoading || !!categoriesError || !categoryChoice || (categoryChoice==='new' && !newName.trim())}>{paying?'Salvando…':'Confirmar pagamento e despesa'}</Button></div>
        </form>
      </DialogContent></Dialog>
      <BillDialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) setEditing(null); }} bill={editing} onSaved={reload} categories={expenseCategories} categoriesLoading={categoriesLoading} categoriesError={categoriesError} />
      <TransactionDetailDialog item={detailItem} type="bill" open={!!detailItem} onOpenChange={(v) => !v && setDetailItem(null)}
        onEdit={(item) => { setDetailItem(null); setEditing(item); setOpen(true); }}
        onDelete={async (id) => { await remove(id); setDetailItem(null); }} />
    </div>
  );
}
