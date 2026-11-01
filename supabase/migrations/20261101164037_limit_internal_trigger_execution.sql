-- Supabase may install this event trigger with broad default execute privileges.
-- The event trigger continues to run; API roles do not need to call it directly.
do $$ begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;
