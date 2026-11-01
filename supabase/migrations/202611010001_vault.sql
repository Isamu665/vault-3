-- Independent backend. Run on a new Supabase project; never on the old service.
create table public.vault_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  entity text not null check (entity in ('Bill','BudgetPlan','Category','Debt','Expense','Goal','Income',
    'Investment','InvestmentTransaction','InvestmentUpdate','Reserve','ReserveTransaction',
    'MarketIndicator','MarketIndicatorHistory','Preference')),
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 65536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index vault_owner_entity on public.vault_records(user_id, entity);
alter table public.vault_records enable row level security;
create policy own_records on public.vault_records for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.vault_records from anon;
grant select, insert, update, delete on public.vault_records to authenticated;

create function public.lock_record_identity() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.user_id <> old.user_id or new.id <> old.id or new.entity <> old.entity then
    raise exception 'Record identity cannot change';
  end if;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;
create trigger vault_record_update before update on public.vault_records
  for each row execute function public.lock_record_identity();

create function public.patch_vault_record(record_id uuid, record_entity text, patch jsonb)
returns public.vault_records language plpgsql security invoker set search_path = '' as $$
declare result public.vault_records;
begin
  if jsonb_typeof(patch) <> 'object' then raise exception 'Invalid patch'; end if;
  update public.vault_records set data = data || patch
    where id = record_id and entity = record_entity and user_id = auth.uid() returning * into result;
  if result.id is null then raise exception 'Record not found'; end if;
  return result;
end;
$$;
revoke all on function public.patch_vault_record(uuid,text,jsonb) from public, anon;
grant execute on function public.patch_vault_record(uuid,text,jsonb) to authenticated;

create function public.import_vault_records(payload jsonb) returns integer
language plpgsql security invoker set search_path = '' as $$
declare imported integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(payload) <> 'array' or jsonb_array_length(payload) > 10000
    or octet_length(payload::text) > 10000000 then raise exception 'Invalid import'; end if;
  insert into public.vault_records(id,user_id,entity,data)
    select (r->>'id')::uuid, auth.uid(), r->>'entity', r->'data' from jsonb_array_elements(payload) r
    on conflict (id) do nothing;
  get diagnostics imported = row_count;
  return imported;
end;
$$;
revoke all on function public.import_vault_records(jsonb) from public, anon;
grant execute on function public.import_vault_records(jsonb) to authenticated;

-- Server-only quota state. Only the checked user's JWT may consume their quota.
create table public.assistant_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default current_date,
  requests integer not null default 0,
  primary key(user_id, day)
);
alter table public.assistant_usage enable row level security;
revoke all on public.assistant_usage from anon, authenticated;
create function public.consume_assistant_quota() returns boolean
language plpgsql security definer set search_path = '' as $$
declare used integer;
begin
  if auth.uid() is null then return false; end if;
  insert into public.assistant_usage(user_id,day,requests) values(auth.uid(),current_date,1)
    on conflict(user_id,day) do update set requests = public.assistant_usage.requests + 1
    where public.assistant_usage.requests < 30 returning requests into used;
  return used is not null;
end;
$$;
revoke all on function public.consume_assistant_quota() from public, anon;
grant execute on function public.consume_assistant_quota() to authenticated;

-- Enable live updates only when Supabase's publication exists.
do $$ begin
  if exists(select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.vault_records;
  end if;
end $$;
