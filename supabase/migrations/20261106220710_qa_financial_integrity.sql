create function public.record_patrimony_movement(asset_id uuid, movement_id uuid, movement text, amount numeric, movement_date date, notes text)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  asset public.vault_records;
  prior public.vault_records;
  asset_entity text;
  history_entity text;
  payload jsonb;
  patch jsonb;
  balance numeric;
  applied numeric;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para continuar'; end if;
  if movement is null or movement not in ('deposit','withdrawal','contribution','valuation')
     or amount is null or amount::text in ('NaN','Infinity','-Infinity')
     or amount <= 0 or movement_date is null or movement_id is null then
    raise exception 'Informe um valor positivo e uma data válida';
  end if;
  asset_entity := case when movement in ('deposit','withdrawal') then 'Reserve' else 'Investment' end;
  select * into asset from public.vault_records
  where id = asset_id and entity = asset_entity and user_id = auth.uid() for update;
  if not found then raise exception 'Item de patrimônio não encontrado'; end if;

  payload := jsonb_build_object('amount',amount,'date',movement_date,'notes',coalesce(notes,''));
  if asset_entity = 'Reserve' then
    history_entity := 'ReserveTransaction';
    payload := payload || jsonb_build_object('reserve_id',asset_id,'type',movement);
  else
    history_entity := case when movement = 'valuation' then 'InvestmentUpdate' else 'InvestmentTransaction' end;
    payload := payload || jsonb_build_object('investment_id',asset_id);
  end if;
  select * into prior from public.vault_records where id = movement_id and user_id = auth.uid();
  if found then
    if prior.entity = history_entity and prior.data = payload then return; end if;
    raise exception 'Já existe uma movimentação diferente para esta tentativa';
  end if;

  if asset_entity = 'Reserve' then
    select coalesce(sum(case data->>'type' when 'deposit' then (data->>'amount')::numeric
      when 'withdrawal' then -(data->>'amount')::numeric else 0 end), 0) into balance
    from public.vault_records
    where user_id = auth.uid() and entity = 'ReserveTransaction' and data->>'reserve_id' = asset_id::text;
    if movement = 'withdrawal' and amount > balance then raise exception 'Saldo insuficiente para este saque'; end if;
    patch := jsonb_build_object('current_amount',balance + case when movement = 'deposit' then amount else -amount end);
  elsif movement = 'valuation' then
    patch := jsonb_build_object('current_amount',amount);
  else
    applied := coalesce((asset.data->>'applied_amount')::numeric, 0);
    balance := coalesce((asset.data->>'current_amount')::numeric, applied);
    patch := jsonb_build_object('applied_amount',applied + amount,'current_amount',balance + amount);
  end if;
  insert into public.vault_records(id,user_id,entity,data) values(movement_id,auth.uid(),history_entity,payload);
  update public.vault_records set data = data || patch
  where id = asset_id and entity = asset_entity and user_id = auth.uid();
end;
$$;

create function public.delete_patrimony_asset(asset_id uuid, asset_entity text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null or asset_entity is null or asset_entity not in ('Reserve','Investment') then
    raise exception 'Operação inválida';
  end if;
  perform 1 from public.vault_records
  where id = asset_id and entity = asset_entity and user_id = auth.uid() for update;
  if not found then return; end if;
  if asset_entity = 'Reserve' then
    update public.vault_records set data = data - 'reserve_id'
    where user_id = auth.uid() and entity = 'Investment' and data->>'reserve_id' = asset_id::text;
  end if;
  delete from public.vault_records
  where user_id = auth.uid() and (
    (asset_entity = 'Reserve' and entity in ('ReserveTransaction','Expense') and data->>'reserve_id' = asset_id::text)
    or (asset_entity = 'Investment' and entity in ('InvestmentTransaction','InvestmentUpdate','Expense') and data->>'investment_id' = asset_id::text)
    or (entity = asset_entity and id = asset_id)
  );
end;
$$;

create function public.prevent_linked_expense_delete()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then return old; end if;
  if old.entity = 'Bill' and old.data ? 'payment_expense_id' then
    raise exception 'Estorne o pagamento antes de excluir esta conta.';
  end if;
  if old.entity = 'Expense' and exists (
    select 1 from public.vault_records
    where entity = 'Bill' and user_id = old.user_id and data->>'payment_expense_id' = old.id::text
  ) then raise exception 'Esta despesa está vinculada a uma conta. Estorne o pagamento em Contas a pagar.'; end if;
  return old;
end;
$$;

create trigger prevent_linked_expense_delete before delete on public.vault_records
for each row execute function public.prevent_linked_expense_delete();

create function public.reverse_bill_payment(bill_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  bill public.vault_records;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para continuar'; end if;
  select * into bill from public.vault_records
  where id = bill_id and user_id = auth.uid() and entity = 'Bill' for update;
  if not found then raise exception 'Conta não encontrada'; end if;
  if bill.data->>'status' is distinct from 'pago' then return; end if;

  update public.vault_records set data = (data - 'payment_expense_id' - 'paid_at') || '{"status":"pendente"}'::jsonb
  where id = bill_id and user_id = auth.uid() and entity = 'Bill';
  delete from public.vault_records
  where user_id = auth.uid() and entity = 'Expense' and id::text = bill.data->>'payment_expense_id';
end;
$$;

revoke all on function public.record_patrimony_movement(uuid,uuid,text,numeric,date,text),
  public.delete_patrimony_asset(uuid,text), public.reverse_bill_payment(uuid),
  public.prevent_linked_expense_delete() from public, anon, authenticated;
grant execute on function public.record_patrimony_movement(uuid,uuid,text,numeric,date,text),
  public.delete_patrimony_asset(uuid,text), public.reverse_bill_payment(uuid) to authenticated;

create or replace function public.confirm_assistant_action(action_id uuid, undo boolean default false) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare a public.assistant_actions; current_data jsonb; expected_data jsonb; next_data jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select * into a from public.assistant_actions where id=action_id and user_id=auth.uid() for update;
 if a.id is null then raise exception 'Action not found'; end if;
 if (undo and a.status='undone') or (not undo and a.status='applied') then return jsonb_build_object('status',a.status,'id',a.id); end if;
 if undo and a.status<>'applied' then raise exception 'Action cannot be undone'; end if;
 if not undo and (a.status<>'pending' or a.expires_at<now()) then raise exception 'Preview expired or cancelled'; end if;
 if a.entity not in ('Income','Expense','Bill','Goal') or a.operation not in ('create','update') then raise exception 'Unsupported action'; end if;
 select data into current_data from public.vault_records where id=a.record_id and entity=a.entity and user_id=auth.uid() for update;
 expected_data:=case when undo then a.after_data else a.before_data end;
 next_data:=case when undo then a.before_data else a.after_data end;
 if current_data is distinct from expected_data then raise exception 'Record changed; review a new preview'; end if;
 if a.operation='create' and not undo and a.before_data is not null then raise exception 'Invalid create'; end if;
 if a.operation='update' and (a.before_data is null or current_data is null) then raise exception 'Invalid update'; end if;
 if a.entity='Bill' and (
   (next_data->>'status'='pago' and current_data->>'status' is distinct from 'pago')
   or (current_data->>'status'='pago' and next_data->>'status' is distinct from 'pago')
   or next_data->'payment_expense_id' is distinct from current_data->'payment_expense_id'
   or next_data->'paid_at' is distinct from current_data->'paid_at'
 ) then raise exception 'Use Contas a pagar para registrar ou estornar um pagamento'; end if;
 if next_data is not null then
   -- Reuse the authoritative schema validation; for updates the duplicate is only validated, never overwritten.
   perform public.import_vault_backup(jsonb_build_array(jsonb_build_object('id',a.record_id,'entity',a.entity,'data',next_data)),auth.uid());
   if a.operation='update' then update public.vault_records set data=next_data where id=a.record_id and user_id=auth.uid() and entity=a.entity; end if;
 else
   if exists(select 1 from public.vault_records v where v.user_id=auth.uid() and (v.data->>'reserve_id'=a.record_id::text or v.data->>'investment_id'=a.record_id::text)) then raise exception 'Record has dependent links'; end if;
   delete from public.vault_records where id=a.record_id and entity=a.entity and user_id=auth.uid();
 end if;
 update public.assistant_actions set status=case when undo then 'undone' else 'applied' end,
 applied_at=case when undo then applied_at else now() end,undone_at=case when undo then now() else null end where id=a.id and user_id=auth.uid();
 return jsonb_build_object('id',a.id,'status',case when undo then 'undone' else 'applied' end);
end; $$;
revoke all on function public.confirm_assistant_action(uuid,boolean) from public,anon;
grant execute on function public.confirm_assistant_action(uuid,boolean) to authenticated;


create or replace function public.import_vault_backup(payload jsonb, expected_user uuid) returns jsonb
language plpgsql security invoker set search_path = '' as $function$
declare
  specs constant jsonb := '{"Income":{"name":"Income","label":"Receitas","fields":["description","category","amount","date","recurring","notes","income_schedule","recurrence_source","recurrence_due"],"required":["description","amount","date"],"numbers":["amount"],"booleans":["recurring"],"dates":["date","recurrence_due"],"enums":{},"links":{"recurrence_source":"Income"},"json":["income_schedule"]},"Expense":{"name":"Expense","label":"Despesas","fields":["description","category","amount","date","payment_method","need_type","recurring","installment","installments_total","installment_current","investment_id","reserve_id","notes"],"required":["description","amount","date"],"numbers":["amount","installments_total","installment_current"],"booleans":["recurring","installment"],"dates":["date"],"enums":{"payment_method":["dinheiro","pix","débito","crédito","boleto","transferência"],"need_type":["necessidade","desejo","patrimônio","investimento"]},"links":{"investment_id":"Investment","reserve_id":"Reserve"}},"Category":{"name":"Category","label":"Categorias","fields":["name","type","classification","color","icon","status","percentage"],"required":["name"],"numbers":["percentage"],"booleans":[],"dates":[],"enums":{"type":["receita","despesa","reserva"],"classification":["necessidade","desejo","patrimônio"],"status":["active","inactive"]},"links":{}},"Bill":{"name":"Bill","label":"Contas a pagar","fields":["description","amount","due_date","status","category","paid_at","payment_expense_id"],"required":["description","amount","due_date"],"numbers":["amount"],"booleans":[],"dates":["due_date","paid_at"],"enums":{"status":["pendente","pago"]},"links":{"payment_expense_id":"Expense"}},"Debt":{"name":"Debt","label":"Dívidas","fields":["creditor","start_date","original_amount","installment_amount","installments_total","installment_current","interest_rate","cet","reason"],"required":["creditor","installment_amount","installments_total"],"numbers":["original_amount","installment_amount","installments_total","installment_current","interest_rate","cet"],"booleans":[],"dates":["start_date"],"enums":{},"links":{}},"Goal":{"name":"Goal","label":"Metas","fields":["name","category","target_amount","current_amount","deadline","where"],"required":["name","target_amount"],"numbers":["target_amount","current_amount"],"booleans":[],"dates":["deadline"],"enums":{"category":["segurança","lazer","moradia","educação","aposentadoria","outros"]},"links":{}},"Reserve":{"name":"Reserve","label":"Reservas","fields":["name","target_amount","current_amount","deposit_date","deadline","notes"],"required":["name"],"numbers":["target_amount","current_amount"],"booleans":[],"dates":["deposit_date","deadline"],"enums":{},"links":{}},"ReserveTransaction":{"name":"ReserveTransaction","label":"Transações de reservas","fields":["reserve_id","amount","date","type","notes"],"required":["reserve_id","amount","date","type"],"numbers":["amount"],"booleans":[],"dates":["date"],"enums":{"type":["deposit","withdrawal"]},"links":{"reserve_id":"Reserve"}},"Investment":{"name":"Investment","label":"Investimentos","fields":["name","type","reserve_id","applied_amount","current_amount","institution","date","taxa","vencimento","quantidade","preco_medio","percentual_cdi","notes"],"required":["name","type"],"numbers":["applied_amount","current_amount","taxa","quantidade","preco_medio","percentual_cdi"],"booleans":[],"dates":["date","vencimento"],"enums":{"type":["tesouro_selic","acoes","etf","cdb","fundo","renda_fixa","cripto","outros"]},"links":{"reserve_id":"Reserve"}},"InvestmentTransaction":{"name":"InvestmentTransaction","label":"Transações de investimentos","fields":["investment_id","amount","date","notes"],"required":["investment_id","amount","date"],"numbers":["amount"],"booleans":[],"dates":["date"],"enums":{},"links":{"investment_id":"Investment"}},"InvestmentUpdate":{"name":"InvestmentUpdate","label":"Atualizações de investimentos","fields":["investment_id","date","amount","notes"],"required":["investment_id","date","amount"],"numbers":["amount"],"booleans":[],"dates":["date"],"enums":{},"links":{"investment_id":"Investment"}},"BudgetPlan":{"name":"BudgetPlan","label":"Planos de orçamento","fields":["reference_month","planned_income","planned_necessities","planned_wishes","planned_investments","notes"],"required":["reference_month"],"numbers":["planned_income","planned_necessities","planned_wishes","planned_investments"],"booleans":[],"dates":["reference_month"],"enums":{},"links":{}},"MarketIndicator":{"name":"MarketIndicator","label":"Indicadores salvos","fields":["indicatorKey","name","value","unit","referenceDate","referencePeriod","source","sourceSeries","sourceVariable","fetchedAt","status"],"required":["indicatorKey","name","value"],"numbers":["value"],"booleans":[],"dates":["referenceDate","fetchedAt"],"enums":{},"links":{}},"MarketIndicatorHistory":{"name":"MarketIndicatorHistory","label":"Histórico de indicadores","fields":["indicatorKey","name","value","unit","referenceDate","referencePeriod","source","sourceSeries","sourceVariable","fetchedAt","status"],"required":["indicatorKey","referenceDate","value"],"numbers":["value"],"booleans":[],"dates":["referenceDate","fetchedAt"],"enums":{},"links":{}},"Preference":{"name":"Preference","label":"Preferências da conta","fields":["key","value"],"required":["key"],"numbers":[],"booleans":[],"dates":[],"enums":{},"links":{},"json":["value"]}}'::jsonb;
  owner_id uuid := auth.uid();
  r jsonb; d jsonb; spec jsonb; field text; value jsonb; target text; target_id uuid;
  total integer; added integer; counts jsonb;
begin
  if owner_id is null or expected_user is distinct from owner_id then raise exception 'Authentication changed'; end if;
  if payload is null or jsonb_typeof(payload) <> 'array' then raise exception 'Invalid import'; end if;
  total := jsonb_array_length(payload);
  if total > 10000 or octet_length(payload::text) > 10000000 then raise exception 'Import limit exceeded'; end if;
  -- Serialize retries from this account; the primary key also protects against duplicates.
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text, 2711));
  if (select count(distinct (item->>'id')::uuid) from jsonb_array_elements(payload) item) <> total then
    raise exception 'Duplicate or missing import ID';
  end if;
  for r in select * from jsonb_array_elements(payload) loop
    spec := specs->(r->>'entity'); d := r->'data';
    if spec is null or jsonb_typeof(r) <> 'object' or jsonb_typeof(d) is distinct from 'object' or
       jsonb_typeof(r->'id') is distinct from 'string' or (r->>'id')::uuid is null then raise exception 'Invalid record'; end if;
    if octet_length(d::text) > 65536 then raise exception 'Record limit exceeded'; end if;
    if exists(select 1 from public.vault_records v where v.id = (r->>'id')::uuid and v.user_id = owner_id and v.entity <> r->>'entity') then
      raise exception 'ID belongs to another entity';
    end if;
    for field in select jsonb_object_keys(d) loop
      if field <> 'legacy_id' and not (spec->'fields' ? field) then raise exception 'Unexpected record field: %', field; end if;
    end loop;
    if d ? 'legacy_id' and (jsonb_typeof(d->'legacy_id') <> 'string' or length(btrim(d->>'legacy_id')) = 0 or length(d->>'legacy_id') > 256) then raise exception 'Invalid source ID'; end if;
    for field in select jsonb_array_elements_text(spec->'required') loop
      if not (d ? field) or d->field = 'null'::jsonb or btrim(d->>field) = '' then raise exception 'Missing required field: %', field; end if;
    end loop;
    for field in select jsonb_array_elements_text(spec->'fields') loop
      value := d->field;
      if value is null or value = 'null'::jsonb then continue; end if;
      if spec->'numbers' ? field then
        if jsonb_typeof(value) <> 'number' then raise exception 'Invalid number: %', field; end if;
      elsif spec->'booleans' ? field then
        if jsonb_typeof(value) <> 'boolean' then raise exception 'Invalid boolean: %', field; end if;
      elsif not (coalesce(spec->'json', '[]'::jsonb) ? field) then
        if jsonb_typeof(value) <> 'string' or length(d->>field) > 60000 then raise exception 'Invalid text: %', field; end if;
      end if;
      if spec->'dates' ? field and d->>field <> '' then
        if (d->>field) !~ '^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2}))?$' then raise exception 'Invalid date: %', field; end if;
        perform (left(d->>field, 10))::date;
        perform (d->>field)::timestamptz;
      end if;
      if (spec->'enums') ? field and d->>field <> '' and not (spec->'enums'->field ? (d->>field)) then raise exception 'Invalid option: %', field; end if;
    end loop;
  end loop;
  with inserted as (
    insert into public.vault_records(id,user_id,entity,data)
      select (item->>'id')::uuid, owner_id, item->>'entity', item->'data' from jsonb_array_elements(payload) item
      on conflict (id) do nothing returning entity
  ), grouped as (select entity,count(*) as n from inserted group by entity)
  select coalesce(sum(n),0)::integer, coalesce(jsonb_object_agg(entity,n),'{}'::jsonb) into added,counts from grouped;
  -- Resolve every link against persisted rows owned by this account, including skipped parents.
  for r in select * from jsonb_array_elements(payload) loop
    if not exists(select 1 from public.vault_records v where v.id=(r->>'id')::uuid and v.user_id=owner_id and v.entity=r->>'entity') then
      raise exception 'Import ID unavailable';
    end if;
    for field,target in select * from jsonb_each_text(specs->(r->>'entity')->'links') loop
      if coalesce(r->'data'->>field,'') = '' then continue; end if;
      target_id := (r->'data'->>field)::uuid;
      perform 1 from public.vault_records v where v.id=target_id and v.entity=target and v.user_id=owner_id for key share;
      if not found then raise exception 'Missing owned link: %', field; end if;
    end loop;
  end loop;
  return jsonb_build_object('addedTotal',added,'duplicatesTotal',total-added,'added',counts);
end;
$function$;
revoke all on function public.import_vault_backup(jsonb,uuid) from public, anon;
grant execute on function public.import_vault_backup(jsonb,uuid) to authenticated;

create function public.protect_category_history()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null or old.entity <> 'Category' then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  if tg_op = 'UPDATE' and
     new.data->>'name' is not distinct from old.data->>'name' and
     new.data->>'type' is not distinct from old.data->>'type' then return new; end if;

  if exists (
    select 1 from public.vault_records
    where user_id = old.user_id and entity in ('Income','Expense','Bill','Goal')
      and data->>'category' = old.data->>'name'
  ) then raise exception 'Categoria em uso no histórico. Você pode arquivá-la e criar outra.'; end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger protect_category_history before update or delete on public.vault_records
for each row execute function public.protect_category_history();
revoke all on function public.protect_category_history() from public, anon, authenticated;
