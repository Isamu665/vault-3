create function public.check_expense_recurrence() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.entity <> 'Expense' then return new; end if;
  if new.data->>'expense_auto_month' is not null and
    new.data->>'expense_auto_month' !~ '^\d{4}-(0[1-9]|1[0-2])$' then
    raise exception 'Mês de lançamento automático inválido.';
  end if;
  if new.data ? 'expense_schedule' and new.data->'expense_schedule' <> 'null'::jsonb and
    (not public.valid_income_schedule(new.data->'expense_schedule') or
     (new.data->'expense_schedule' ? 'automatic' and jsonb_typeof(new.data->'expense_schedule'->'automatic') <> 'boolean')) then
    raise exception 'Configuração de despesa recorrente inválida.';
  end if;
  if (coalesce(new.data->>'recurrence_source','') <> '') <> (coalesce(new.data->>'recurrence_due','') <> '') then
    raise exception 'Incomplete recurring receipt';
  end if;
  if coalesce(new.data->>'recurrence_source','') <> '' then
    perform (new.data->>'recurrence_source')::uuid;
    if new.data->>'recurrence_due' !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Invalid recurrence date'; end if;
    perform (new.data->>'recurrence_due')::date;
    if new.data ? 'expense_schedule' and new.data->'expense_schedule' <> 'null'::jsonb then
      raise exception 'A receipt cannot create another recurrence';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.check_expense_recurrence() from public, anon, authenticated;
create trigger expense_recurrence_check before insert or update on public.vault_records
for each row execute function public.check_expense_recurrence();

create unique index expense_receipt_once on public.vault_records
  (user_id, (data->>'recurrence_source'), (left(data->>'recurrence_due',7)))
  where entity = 'Expense' and data ? 'recurrence_source' and data ? 'recurrence_due';

create function public.confirm_recurring_expense(source_id uuid, due_date date,
  received_amount numeric, received_date date, expected_schedule jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare source public.vault_records; receipt public.vault_records; s jsonb;
  month_start date; expected_due date; today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into source from public.vault_records where id=source_id and entity='Expense'
    and user_id=auth.uid() for update;
  if source.id is null or source.data->>'installment' = 'true' or source.data ? 'reserve_id' and source.data->>'reserve_id' is not null or source.data ? 'investment_id' and source.data->>'investment_id' is not null then raise exception 'Despesa de origem não encontrada.'; end if;
  -- Serialize against retries, other devices and concurrent schedule edits.
  select * into receipt from public.vault_records where user_id=auth.uid() and entity='Expense'
    and data->>'recurrence_source'=source_id::text and left(data->>'recurrence_due',7)=left(due_date::text,7);
  if receipt.id is not null then return jsonb_build_object('id',receipt.id,'alreadyReceived',true); end if;
  s := source.data->'expense_schedule';
  if not public.valid_income_schedule(s) or s is distinct from expected_schedule then
    raise exception 'A recorrência mudou. Atualize a página e confira os dados novamente.';
  end if;
  if s->>'active' <> 'true' then raise exception 'Esta recorrência está encerrada.'; end if;
  if due_date is null or due_date > today or due_date < (s->>'start')::date or
    (s->>'end' <> '' and due_date > (s->>'end')::date) then raise exception 'Data prevista fora do período permitido.'; end if;
  month_start := date_trunc('month',due_date)::date;
  expected_due := month_start + (least((s->>'day')::integer,
    extract(day from (month_start + interval '1 month - 1 day'))::integer) - 1);
  if due_date <> expected_due then raise exception 'Data diferente do dia previsto.'; end if;
  if received_amount is null or received_amount <= 0 or received_amount::text in ('NaN','Infinity','-Infinity') or
    received_amount <> round(received_amount,2) or received_date is null or received_date > today then
    raise exception 'Informe valor positivo com até duas casas decimais e uma data de recebimento válida.';
  end if;
  insert into public.vault_records(user_id,entity,data) values(auth.uid(),'Expense',jsonb_build_object(
    'description',s->>'description','category',s->>'category','amount',received_amount,
    'date',received_date::text,'notes',s->>'notes','recurring',true,
    'payment_method',source.data->>'payment_method','need_type',source.data->>'need_type',
    'recurrence_source',source_id::text,'recurrence_due',due_date::text)) returning * into receipt;
  update public.vault_records set data = data || jsonb_build_object('expense_auto_month', greatest(data->>'expense_auto_month', left(due_date::text,7)))
    where id=source_id and user_id=auth.uid();
  return jsonb_build_object('id',receipt.id,'alreadyReceived',false);
end;
$$;
revoke all on function public.confirm_recurring_expense(uuid,date,numeric,date,jsonb) from public, anon;
grant execute on function public.confirm_recurring_expense(uuid,date,numeric,date,jsonb) to authenticated;

-- Removing a source stops forecasts while preserving its received descendants.
-- Detach their links atomically so future backups remain self-contained.
create function public.delete_expense_with_recurrence(expense_id uuid) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  perform 1 from public.vault_records where id=expense_id and entity='Expense' and user_id=auth.uid() for update;
  if not found then raise exception 'Despesa não encontrada.'; end if;
  update public.vault_records set data=data - 'recurrence_source' - 'recurrence_due'
    where user_id=auth.uid() and entity='Expense' and data->>'recurrence_source'=expense_id::text;
  delete from public.vault_records where id=expense_id and entity='Expense' and user_id=auth.uid();
end;
$$;
revoke all on function public.delete_expense_with_recurrence(uuid) from public, anon;
grant execute on function public.delete_expense_with_recurrence(uuid) to authenticated;


create or replace function public.import_vault_backup(payload jsonb, expected_user uuid) returns jsonb
language plpgsql security invoker set search_path = '' as $function$
declare
  specs constant jsonb := '{"Income":{"name":"Income","label":"Receitas","fields":["description","category","amount","date","recurring","notes","income_schedule","recurrence_source","recurrence_due"],"required":["description","amount","date"],"numbers":["amount"],"booleans":["recurring"],"dates":["date","recurrence_due"],"enums":{},"links":{"recurrence_source":"Income"},"json":["income_schedule"]},"Expense":{"name":"Expense","label":"Despesas","fields":["description","category","amount","date","payment_method","need_type","recurring","installment","installments_total","installment_current","investment_id","reserve_id","notes","expense_schedule","recurrence_source","recurrence_due","expense_auto_month"],"required":["description","amount","date"],"numbers":["amount","installments_total","installment_current"],"booleans":["recurring","installment"],"dates":["date","recurrence_due"],"enums":{"payment_method":["dinheiro","pix","débito","crédito","boleto","transferência"],"need_type":["necessidade","desejo","patrimônio","investimento"]},"links":{"investment_id":"Investment","reserve_id":"Reserve","recurrence_source":"Expense"},"json":["expense_schedule"]},"Category":{"name":"Category","label":"Categorias","fields":["name","type","classification","color","icon","status","percentage"],"required":["name"],"numbers":["percentage"],"booleans":[],"dates":[],"enums":{"type":["receita","despesa","reserva"],"classification":["necessidade","desejo","patrimônio"],"status":["active","inactive"]},"links":{}},"Bill":{"name":"Bill","label":"Contas a pagar","fields":["description","amount","due_date","status","category","paid_at","payment_expense_id"],"required":["description","amount","due_date"],"numbers":["amount"],"booleans":[],"dates":["due_date","paid_at"],"enums":{"status":["pendente","pago"]},"links":{"payment_expense_id":"Expense"}},"Debt":{"name":"Debt","label":"Dívidas","fields":["creditor","start_date","original_amount","installment_amount","installments_total","installment_current","interest_rate","cet","reason"],"required":["creditor","installment_amount","installments_total"],"numbers":["original_amount","installment_amount","installments_total","installment_current","interest_rate","cet"],"booleans":[],"dates":["start_date"],"enums":{},"links":{}},"Goal":{"name":"Goal","label":"Metas","fields":["name","category","target_amount","current_amount","deadline","where"],"required":["name","target_amount"],"numbers":["target_amount","current_amount"],"booleans":[],"dates":["deadline"],"enums":{"category":["segurança","lazer","moradia","educação","aposentadoria","outros"]},"links":{}},"Reserve":{"name":"Reserve","label":"Reservas","fields":["name","target_amount","current_amount","deposit_date","deadline","notes"],"required":["name"],"numbers":["target_amount","current_amount"],"booleans":[],"dates":["deposit_date","deadline"],"enums":{},"links":{}},"ReserveTransaction":{"name":"ReserveTransaction","label":"Transações de reservas","fields":["reserve_id","amount","date","type","notes"],"required":["reserve_id","amount","date","type"],"numbers":["amount"],"booleans":[],"dates":["date"],"enums":{"type":["deposit","withdrawal"]},"links":{"reserve_id":"Reserve"}},"Investment":{"name":"Investment","label":"Investimentos","fields":["name","type","reserve_id","applied_amount","current_amount","institution","date","taxa","vencimento","quantidade","preco_medio","percentual_cdi","notes"],"required":["name","type"],"numbers":["applied_amount","current_amount","taxa","quantidade","preco_medio","percentual_cdi"],"booleans":[],"dates":["date","vencimento"],"enums":{"type":["tesouro_selic","acoes","etf","cdb","fundo","renda_fixa","cripto","outros"]},"links":{"reserve_id":"Reserve"}},"InvestmentTransaction":{"name":"InvestmentTransaction","label":"Transações de investimentos","fields":["investment_id","amount","date","notes"],"required":["investment_id","amount","date"],"numbers":["amount"],"booleans":[],"dates":["date"],"enums":{},"links":{"investment_id":"Investment"}},"InvestmentUpdate":{"name":"InvestmentUpdate","label":"Atualizações de investimentos","fields":["investment_id","date","amount","notes"],"required":["investment_id","date","amount"],"numbers":["amount"],"booleans":[],"dates":["date"],"enums":{},"links":{"investment_id":"Investment"}},"BudgetPlan":{"name":"BudgetPlan","label":"Planos de orçamento","fields":["reference_month","planned_income","planned_necessities","planned_wishes","planned_investments","notes"],"required":["reference_month"],"numbers":["planned_income","planned_necessities","planned_wishes","planned_investments"],"booleans":[],"dates":["reference_month"],"enums":{},"links":{}},"MarketIndicator":{"name":"MarketIndicator","label":"Indicadores salvos","fields":["indicatorKey","name","value","unit","referenceDate","referencePeriod","source","sourceSeries","sourceVariable","fetchedAt","status"],"required":["indicatorKey","name","value"],"numbers":["value"],"booleans":[],"dates":["referenceDate","fetchedAt"],"enums":{},"links":{}},"MarketIndicatorHistory":{"name":"MarketIndicatorHistory","label":"Histórico de indicadores","fields":["indicatorKey","name","value","unit","referenceDate","referencePeriod","source","sourceSeries","sourceVariable","fetchedAt","status"],"required":["indicatorKey","referenceDate","value"],"numbers":["value"],"booleans":[],"dates":["referenceDate","fetchedAt"],"enums":{},"links":{}},"Preference":{"name":"Preference","label":"Preferências da conta","fields":["key","value"],"required":["key"],"numbers":[],"booleans":[],"dates":[],"enums":{},"links":{},"json":["value"]}}'::jsonb;
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

-- The scheduled job runs with the migration owner's privileges. App roles cannot call it.
create schema if not exists vault_private;
revoke all on schema vault_private from public, anon, authenticated;

create function vault_private.book_recurring_expenses(run_date date default (now() at time zone 'America/Sao_Paulo')::date)
returns integer language plpgsql security invoker set search_path = '' as $$
declare
  source public.vault_records;
  schedule jsonb;
  month_start date := date_trunc('month', run_date)::date;
  month_key text := to_char(run_date, 'YYYY-MM');
  due_date date;
  inserted integer;
  booked integer := 0;
begin
  for source in
    select * from public.vault_records
    where entity = 'Expense'
      and data->'expense_schedule' @> '{"active":true,"automatic":true}'::jsonb
      and coalesce(data->>'expense_auto_month', '') < month_key
      and data->>'recurrence_source' is null
      and coalesce(data->>'installment', 'false') <> 'true'
      and data->>'reserve_id' is null and data->>'investment_id' is null
    for update skip locked
  loop
    schedule := source.data->'expense_schedule';
    due_date := month_start + least((schedule->>'day')::integer,
      extract(day from month_start + interval '1 month - 1 day')::integer) - 1;

    if due_date <= run_date and due_date >= (schedule->>'start')::date and
      (schedule->>'end' = '' or due_date <= (schedule->>'end')::date) then
      insert into public.vault_records(user_id, entity, data)
      values (source.user_id, 'Expense', jsonb_build_object(
        'description', schedule->>'description', 'category', schedule->>'category',
        'amount', schedule->'amount', 'date', due_date::text, 'notes', schedule->>'notes',
        'payment_method', source.data->>'payment_method', 'need_type', source.data->>'need_type',
        'recurring', true, 'recurrence_source', source.id::text, 'recurrence_due', due_date::text
      )) on conflict do nothing;
      get diagnostics inserted = row_count;
      booked := booked + inserted;
      -- Keep the month even if the user later removes the generated expense.
      update public.vault_records
      set data = data || jsonb_build_object('expense_auto_month', month_key)
      where id = source.id;
    end if;
  end loop;
  return booked;
end;
$$;
revoke all on function vault_private.book_recurring_expenses(date) from public, anon, authenticated;

-- PGlite and other development databases can test the worker without pg_cron.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    execute 'create extension if not exists pg_cron';
    perform cron.schedule('vault-recurring-expenses', '*/15 * * * *',
      'select vault_private.book_recurring_expenses()');
  end if;
end;
$$;
