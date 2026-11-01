create table public.assistant_actions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 operation text not null check(operation in ('create','update')),
 entity text not null check(entity in ('Income','Expense','Bill','Goal')), record_id uuid not null,
 before_data jsonb, after_data jsonb not null check(jsonb_typeof(after_data)='object' and octet_length(after_data::text)<=65536),
 status text not null default 'pending' check(status in ('pending','applied','undone','cancelled')),
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '15 minutes',
 applied_at timestamptz, undone_at timestamptz
);
create index assistant_actions_owner on public.assistant_actions(user_id,created_at desc);
alter table public.assistant_actions enable row level security;
create policy own_assistant_actions on public.assistant_actions for all to authenticated
 using ((select auth.uid())=user_id) with check((select auth.uid())=user_id);
revoke all on public.assistant_actions from anon;
grant select,insert,update on public.assistant_actions to authenticated;

create function public.confirm_assistant_action(action_id uuid, undo boolean default false) returns jsonb
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

