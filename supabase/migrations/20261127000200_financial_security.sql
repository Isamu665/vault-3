-- Enforce financial input rules on every write path, including direct Data API
-- requests. Existing fields that have not changed remain editable for cleanup.
create function vault_private.check_financial_record() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  previous jsonb := '{}'::jsonb;
  fields text[];
  field_name text;
  value jsonb;
  number_value numeric;
  minimum numeric;
  maximum numeric;
  scheduled_amount numeric;
  status_changed boolean;
  payment_changed boolean;
begin
  if tg_op = 'UPDATE' then previous := old.data; end if;

  if new.entity = 'Bill' then
    status_changed := coalesce(new.data->>'status','pendente')
      is distinct from coalesce(previous->>'status','pendente');
    payment_changed := new.data->'payment_expense_id' is distinct from previous->'payment_expense_id'
      or new.data->'paid_at' is distinct from previous->'paid_at';
    if status_changed or payment_changed then
      if current_user in ('anon','authenticated') then
        raise exception 'Use Contas a pagar para registrar ou estornar um pagamento' using errcode = '42501';
      end if;
      if coalesce(new.data->>'status','pendente') not in ('pendente','pago') or
        (coalesce(new.data->>'status','pendente') <> 'pago' and
          (new.data->>'payment_expense_id' is not null or new.data->>'paid_at' is not null)) then
        raise exception 'Estado de pagamento inválido' using errcode = '22023';
      end if;
    end if;
  end if;

  fields := case new.entity
    when 'Income' then array['amount']
    when 'Expense' then array['amount','installments_total','installment_current']
    when 'Bill' then array['amount']
    when 'Debt' then array['original_amount','installment_amount','installments_total','installment_current','interest_rate','cet']
    when 'Goal' then array['target_amount','current_amount']
    when 'Reserve' then array['target_amount','current_amount']
    when 'Investment' then array['applied_amount','current_amount','taxa','quantidade','preco_medio','percentual_cdi']
    when 'ReserveTransaction' then array['amount']
    when 'InvestmentTransaction' then array['amount']
    when 'InvestmentUpdate' then array['amount']
    when 'BudgetPlan' then array['planned_income','planned_necessities','planned_wishes','planned_investments']
    else array[]::text[]
  end;
  foreach field_name in array fields loop
    value := new.data->field_name;
    if tg_op = 'UPDATE' and value is not distinct from previous->field_name then continue; end if;
    if value is null or value = 'null'::jsonb then
      if field_name in ('amount','installment_amount') or (new.entity = 'Goal' and field_name = 'target_amount') then
        raise exception 'Informe o valor de %', field_name using errcode = '22023';
      end if;
      continue;
    end if;
    if jsonb_typeof(value) is distinct from 'number' then
      raise exception 'Valor numérico inválido para %', field_name using errcode = '22023';
    end if;

    number_value := (value #>> '{}')::numeric;
    minimum := case when field_name = 'taxa' then -100 else 0 end;
    maximum := case
      when field_name in ('installments_total','installment_current') then 1200
      when field_name in ('taxa','percentual_cdi','interest_rate','cet') then 10000
      else 1000000000000
    end;
    if number_value not between minimum and maximum or
      (number_value = 0 and (
        field_name in ('amount','installment_amount') or
        new.entity = 'Goal' and field_name = 'target_amount' or
        new.entity = 'Expense' and field_name in ('installments_total','installment_current')
      )) or (field_name in ('installments_total','installment_current') and number_value <> trunc(number_value))
    then
      raise exception 'Valor fora do intervalo permitido para %', field_name using errcode = '22023';
    end if;
    if field_name in ('amount','original_amount','installment_amount','target_amount','current_amount','applied_amount',
        'planned_income','planned_necessities','planned_wishes','planned_investments') and number_value <> round(number_value,2)
    then
      raise exception 'Informe até duas casas decimais para %', field_name using errcode = '22023';
    end if;
  end loop;

  if new.entity in ('Debt','Expense') and
    (new.data->'installments_total' is distinct from previous->'installments_total'
      or new.data->'installment_current' is distinct from previous->'installment_current') and
    jsonb_typeof(new.data->'installments_total') = 'number' and
    jsonb_typeof(new.data->'installment_current') = 'number' and
    (new.data->>'installment_current')::numeric > (new.data->>'installments_total')::numeric
  then
    raise exception 'A parcela atual não pode ser maior que o total' using errcode = '22023';
  end if;

  -- In particular prevent one account from storing a schedule that produces
  -- out-of-range amounts in the shared recurring-expense worker.
  field_name := case new.entity when 'Income' then 'income_schedule' when 'Expense' then 'expense_schedule' end;
  value := new.data->field_name->'amount';
  if value is distinct from previous->field_name->'amount' and jsonb_typeof(value) = 'number' then
    scheduled_amount := (value #>> '{}')::numeric;
    if scheduled_amount > 1000000000000 or scheduled_amount <> round(scheduled_amount,2) then
      raise exception 'Informe um valor de recorrência dentro do limite e com até duas casas decimais' using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function vault_private.check_financial_record() from public, anon, authenticated;
create trigger check_financial_record before insert or update on public.vault_records
for each row execute function vault_private.check_financial_record();

-- These existing RPCs identify the account with auth.uid(), scope all row
-- operations by that owner and keep the account and expense writes atomic.
alter function public.pay_bill(uuid,jsonb) security definer;
alter function public.reverse_bill_payment(uuid) security definer;

-- A historical backup may restore a paid bill, even if older versions did not
-- record an associated expense. The import checks the caller and all links.
alter function public.import_vault_backup(jsonb,uuid) security definer;

-- Normalize computed balances to cents when older records still contain
-- floating-point residue. Leave their original transactions intact.
create or replace function public.record_patrimony_movement(asset_id uuid, movement_id uuid, movement text, amount numeric, movement_date date, notes text)
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
     or amount <= 0 or amount > 1000000000000 or amount <> round(amount,2)
     or movement_date is null or movement_id is null then
    raise exception 'Informe um valor positivo com até duas casas decimais e uma data válida';
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
    balance := round(balance,2);
    if movement = 'withdrawal' and amount > balance then raise exception 'Saldo insuficiente para este saque'; end if;
    patch := jsonb_build_object('current_amount',balance + case when movement = 'deposit' then amount else -amount end);
  elsif movement = 'valuation' then
    patch := jsonb_build_object('current_amount',amount);
  else
    applied := round(coalesce((asset.data->>'applied_amount')::numeric, 0),2);
    balance := round(coalesce((asset.data->>'current_amount')::numeric, applied),2);
    patch := jsonb_build_object('applied_amount',applied + amount,'current_amount',balance + amount);
  end if;
  insert into public.vault_records(id,user_id,entity,data) values(movement_id,auth.uid(),history_entity,payload);
  update public.vault_records set data = data || patch
  where id = asset_id and entity = asset_entity and user_id = auth.uid();
end;
$$;
