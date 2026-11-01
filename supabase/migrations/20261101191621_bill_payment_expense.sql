create function public.pay_bill(bill_id uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare b public.vault_records; expense_id uuid; payload jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select * into b from public.vault_records where id=bill_id and entity='Bill' and user_id=auth.uid() for update;
 if b.id is null then raise exception 'Conta não encontrada'; end if;
 if b.data->>'status'='pago' then return jsonb_build_object('alreadyPaid',true,'expenseId',b.data->>'payment_expense_id'); end if;
 if jsonb_typeof(b.data->'amount') is distinct from 'number' or (b.data->>'amount')::numeric < 0 or coalesce(btrim(b.data->>'description'),'')='' then raise exception 'Confira o valor e a descrição da conta'; end if;
 payload:=jsonb_build_object('description',b.data->>'description','amount',b.data->'amount','date',to_char(now() at time zone 'America/Sao_Paulo','YYYY-MM-DD'));
 if nullif(b.data->>'category','') is not null then payload:=payload || jsonb_build_object('category',b.data->>'category'); end if;
 insert into public.vault_records(user_id,entity,data) values(auth.uid(),'Expense',payload) returning id into expense_id;
 update public.vault_records set data=data || jsonb_build_object('status','pago','payment_expense_id',expense_id,'paid_at',now()) where id=b.id and user_id=auth.uid();
 return jsonb_build_object('alreadyPaid',false,'expenseId',expense_id);
end; $$;
revoke all on function public.pay_bill(uuid) from public,anon;
grant execute on function public.pay_bill(uuid) to authenticated;

