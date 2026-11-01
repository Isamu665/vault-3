
create or replace function public.pay_bill(bill_id uuid, payment jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare b public.vault_records; expense_id uuid; payload jsonb; cat public.vault_records; category_name text; classification text;
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
 if payment ? 'new_category' then
   category_name:=btrim(payment->'new_category'->>'name'); classification:=payment->'new_category'->>'classification';
   if coalesce(category_name,'')='' or length(category_name)>100 or classification not in ('necessidade','desejo') or classification is null then raise exception 'Informe nome e classificação da categoria'; end if;
   perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':category:' || lower(category_name),0));
   select * into cat from public.vault_records where user_id=auth.uid() and entity='Category' and lower(btrim(data->>'name'))=lower(category_name) and coalesce(data->>'type','despesa')='despesa' order by created_at limit 1;
   if cat.id is not null then raise exception 'Já existe uma categoria com esse nome. Selecione-a na lista.'; end if;
   insert into public.vault_records(user_id,entity,data) values(auth.uid(),'Category',jsonb_build_object('name',category_name,'type','despesa','classification',classification,'status','active','color','#6366f1'));
 elsif payment ? 'category_id' then
   select * into cat from public.vault_records where id=(payment->>'category_id')::uuid and user_id=auth.uid() and entity='Category' and coalesce(data->>'type','despesa')='despesa' and coalesce(data->>'status','active')='active';
   if cat.id is null then raise exception 'Categoria indisponível nesta conta'; end if;
   category_name:=cat.data->>'name'; classification:=cat.data->>'classification';
 else category_name:=payment->>'category'; end if;
 payload:=jsonb_build_object('description',b.data->>'description','amount',payment->'amount','date',payment->>'date','category',category_name,'payment_method',payment->>'payment_method');
 if classification in ('necessidade','desejo','patrimônio','investimento') then payload:=payload || jsonb_build_object('need_type',classification); end if;
 insert into public.vault_records(user_id,entity,data) values(auth.uid(),'Expense',payload) returning id into expense_id;
 update public.vault_records set data=data || jsonb_build_object('status','pago','payment_expense_id',expense_id,'paid_at',now()) where id=b.id and user_id=auth.uid();
 return jsonb_build_object('alreadyPaid',false,'expenseId',expense_id);
end; $$;
revoke all on function public.pay_bill(uuid,jsonb) from public,anon;
grant execute on function public.pay_bill(uuid,jsonb) to authenticated;

