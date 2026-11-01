drop function public.pay_bill(uuid);
create function public.pay_bill(bill_id uuid, payment jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare b public.vault_records; expense_id uuid; payload jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select * into b from public.vault_records where id=bill_id and entity='Bill' and user_id=auth.uid() for update;
 if b.id is null then raise exception 'Conta não encontrada'; end if;
 if b.data->>'status'='pago' then return jsonb_build_object('alreadyPaid',true,'expenseId',b.data->>'payment_expense_id'); end if;
 if payment is null or jsonb_typeof(payment)<>'object' or jsonb_typeof(payment->'amount') is distinct from 'number' or (payment->>'amount')::numeric<=0 then raise exception 'Informe um valor positivo'; end if;
 if coalesce(payment->>'date','') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Data inválida'; end if;
 perform (payment->>'date')::date;
 if coalesce(payment->>'payment_method','') not in ('dinheiro','pix','débito','crédito','boleto','transferência') then raise exception 'Forma de pagamento inválida'; end if;
 if jsonb_typeof(payment->'category') is distinct from 'string' or length(payment->>'category')>200 then raise exception 'Categoria inválida'; end if;
 payload:=jsonb_build_object('description',b.data->>'description','amount',payment->'amount','date',payment->>'date','category',payment->>'category','payment_method',payment->>'payment_method');
 insert into public.vault_records(user_id,entity,data) values(auth.uid(),'Expense',payload) returning id into expense_id;
 update public.vault_records set data=data || jsonb_build_object('status','pago','payment_expense_id',expense_id,'paid_at',now()) where id=b.id and user_id=auth.uid();
 return jsonb_build_object('alreadyPaid',false,'expenseId',expense_id);
end; $$;
revoke all on function public.pay_bill(uuid,jsonb) from public,anon;
grant execute on function public.pay_bill(uuid,jsonb) to authenticated;

