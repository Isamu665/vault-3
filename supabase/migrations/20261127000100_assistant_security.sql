-- Only the server may stage a validated proposal. Keep older entries for viewing,
-- but do not trust their contents for applying or undoing financial changes.
alter table public.assistant_actions add column server_verified boolean not null default false;

drop policy own_assistant_actions on public.assistant_actions;
create policy read_own_assistant_actions on public.assistant_actions for select to authenticated
  using ((select auth.uid()) = user_id);
revoke all on public.assistant_actions from public, anon, authenticated;
grant select on public.assistant_actions to authenticated;

-- Production has this role. Plain development Postgres may not.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select, insert on public.assistant_actions to service_role;
  end if;
end;
$$;

create or replace function public.confirm_assistant_action(action_id uuid, undo boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a public.assistant_actions; current_data jsonb; expected_data jsonb; next_data jsonb;
begin
 if undo is null then raise exception 'Invalid action'; end if;
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select * into a from public.assistant_actions where id=action_id and user_id=auth.uid() for update;
 if a.id is null then raise exception 'Action not found'; end if;
 if not a.server_verified then raise exception 'Prepare a new preview'; end if;
 if (undo and a.status='undone') or (not undo and a.status='applied') then return jsonb_build_object('status',a.status,'id',a.id); end if;
 if undo and a.status<>'applied' then raise exception 'Action cannot be undone'; end if;
 if not undo and (a.status<>'pending' or a.expires_at<now()) then raise exception 'Preview expired or cancelled'; end if;
 if a.entity not in ('Income','Expense','Bill','Goal') or a.operation not in ('create','update') then raise exception 'Unsupported action'; end if;
 -- Match the importer's lock order before taking any vault_records row lock.
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 2711));
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

revoke all on function public.confirm_assistant_action(uuid,boolean) from public, anon;
grant execute on function public.confirm_assistant_action(uuid,boolean) to authenticated;

create function public.cancel_assistant_action(action_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  action_status text;
begin
  if owner_id is null then raise exception 'Authentication required'; end if;
  select status into action_status from public.assistant_actions
  where id = action_id and user_id = owner_id for update;
  if not found then raise exception 'Action not found'; end if;

  if action_status = 'pending' then
    update public.assistant_actions set status = 'cancelled'
    where id = action_id and user_id = owner_id;
  elsif action_status <> 'cancelled' then
    raise exception 'Only pending actions may be cancelled';
  end if;
  return jsonb_build_object('id', action_id, 'status', 'cancelled');
end;
$$;
revoke all on function public.cancel_assistant_action(uuid) from public, anon;
grant execute on function public.cancel_assistant_action(uuid) to authenticated;
