import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { requireBackend } from '@/api/supabase';
import { Button } from '@/components/ui/button';
const labels={Income:'Receita',Expense:'Despesa',Bill:'Conta a pagar',Goal:'Meta'};
export default function AssistantActions({refresh}) {
  const {user}=useAuth(), cache=useQueryClient();
  const [actions,setActions]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(''),[reload,setReload]=useState(0);
  useEffect(()=>{
    let active=true;
    requireBackend().from('assistant_actions').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(20).then(({data,error})=>{
      if(!active)return; if(error)setError('Não foi possível carregar o histórico de ações.'); else {setActions(data);setError('');}
    }); return()=>{active=false;};
  },[user.id,refresh,reload]);
  const perform=async(action,kind)=>{
    if(busy)return;setBusy(action.id);setError('');
    try {
      const {data:identity,error:authError}=await requireBackend().auth.getUser();
      if(authError || identity.user?.id!==user.id)throw Error('Sua sessão mudou. Entre novamente.');
      if(kind==='cancel') {
        const {error}=await requireBackend().from('assistant_actions').update({status:'cancelled'}).eq('id',action.id).eq('user_id',user.id).eq('status','pending'); if(error)throw error;
      } else {
        const result=await requireBackend().functions.invoke('assistant',{body:{action:kind,actionId:action.id}});
        if(result.error){let detail='';try{detail=(await result.error.context?.json())?.error;}catch{/* fallback */}throw Error(detail || 'Não foi possível confirmar a ação.');}
        await cache.invalidateQueries({queryKey:['records',user.id]});
      }
      setReload(value=>value+1);
    }catch(e){setError(e.message);}finally{setBusy('');}
  };
  return <section className="space-y-3 mt-4" aria-label="Prévia e histórico de ações"><h3 className="text-sm font-semibold">Ações propostas e histórico</h3><p className="text-xs text-muted-foreground">Uma ação por confirmação. Repetir o clique não duplica. Desfazer é bloqueado se o registro tiver sido alterado depois.</p>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {!actions.length && <p className="text-xs text-muted-foreground">Nenhuma ação proposta. Você pode pedir para cadastrar uma despesa, receita, conta ou meta, ou ajustar um registro existente.</p>}
    {actions.map(action=>{const pending=action.status==='pending',expired=new Date(action.expires_at)<new Date();return <article className="border rounded-xl p-3 space-y-3" key={action.id}>
      <p className="text-sm font-medium">{action.operation==='create'?'Cadastrar':'Atualizar'} {labels[action.entity]} · {new Date(action.created_at).toLocaleString('pt-BR')}</p>
      <p className="text-xs">{pending ? expired?'Prévia expirada. Peça uma nova proposta.':'Aguardando sua confirmação — nada foi alterado.' : action.status==='applied'?'Aplicada':action.status==='undone'?'Desfeita':'Cancelada'}</p>
      <details open={pending}><summary className="text-xs cursor-pointer">Conferir campos {action.operation==='update'?'antes e depois':''}</summary><div className="overflow-x-auto"><table className="w-full text-xs mt-2"><thead><tr><th className="text-left p-1">Campo</th>{action.before_data && <th className="text-left p-1">Antes</th>}<th className="text-left p-1">Depois</th></tr></thead><tbody>{Object.keys(action.after_data).map(field=><tr key={field} className="border-t"><td className="p-1">{field}</td>{action.before_data && <td className="p-1 break-all">{JSON.stringify(action.before_data[field] ?? null)}</td>}<td className="p-1 break-all">{JSON.stringify(action.after_data[field])}</td></tr>)}</tbody></table></div></details>
      <div className="flex flex-wrap gap-2">{pending && <><Button size="sm" disabled={!!busy || expired} onClick={()=>perform(action,'confirm')}>Confirmar e salvar</Button><Button size="sm" variant="outline" disabled={!!busy} onClick={()=>perform(action,'cancel')}>Cancelar proposta</Button></>}{action.status==='applied' && <Button size="sm" variant="outline" disabled={!!busy} onClick={()=>perform(action,'undo')}>Desfazer esta ação</Button>}</div>
    </article>;})}
  </section>;
}

