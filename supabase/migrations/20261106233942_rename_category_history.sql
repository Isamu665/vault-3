create or replace function public.protect_category_history()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  old_name text;
  new_name text;
  old_type text;
  new_type text;
begin
  if auth.uid() is null or old.entity <> 'Category' then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  old_name := old.data->>'name';
  old_type := coalesce(old.data->>'type', 'despesa');

  if tg_op = 'UPDATE' then
    new_name := new.data->>'name';
    new_type := coalesce(new.data->>'type', 'despesa');
    if new_name is not distinct from old_name and new_type = old_type then
      return new;
    end if;

    if coalesce(btrim(new_name), '') = '' then
      raise exception 'Informe o nome da categoria.';
    end if;

    if old_type = 'despesa' and new_type = old_type then
      perform pg_advisory_xact_lock(hashtextextended(old.user_id::text || ':category:' || lower(btrim(new_name)), 0));
      if exists (
        select 1 from public.vault_records
        where user_id = old.user_id and entity = 'Category' and id <> old.id
          and coalesce(data->>'type', 'despesa') = old_type
          and lower(btrim(data->>'name')) = lower(btrim(new_name))
      ) then raise exception 'Já existe uma categoria de despesa com esse nome.'; end if;

      if exists (
        select 1 from public.vault_records
        where user_id = old.user_id and entity = 'Category' and id <> old.id
          and coalesce(data->>'type', 'despesa') = old_type and data->>'name' = old_name
      ) then raise exception 'Há categorias antigas com o mesmo nome. O vínculo dos lançamentos é ambíguo.'; end if;

      update public.vault_records
      set data = jsonb_set(data, '{category}', to_jsonb(new_name))
      where user_id = old.user_id and entity in ('Expense', 'Bill') and data->>'category' = old_name;
      return new;
    end if;
  end if;

  if exists (
    select 1 from public.vault_records
    where user_id = old.user_id and entity in ('Income','Expense','Bill','Goal')
      and data->>'category' = old_name
  ) then raise exception 'Categoria em uso no histórico. Você pode arquivá-la e criar outra.'; end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
