-- Record the staff name supplied at admin sign-in with each audited change.
-- Safe to run repeatedly.

alter table public.audit_log add column if not exists actor_name text;

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  audit_actor_name text;
begin
  select coalesce(
    nullif(auth.jwt()->'user_metadata'->>'audit_name', ''),
    nullif(p.display_name, ''),
    'Staff'
  )
  into audit_actor_name
  from (select 1) seed
  left join public.profiles p on p.id = auth.uid();

  if tg_op = 'INSERT' then
    insert into public.audit_log(actor_id, actor_name, table_name, record_id, action, new_data)
    values(auth.uid(), audit_actor_name, tg_table_name, coalesce(to_jsonb(new)->>'id', to_jsonb(new)->>'d_date', ''), tg_op, to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_log(actor_id, actor_name, table_name, record_id, action, old_data, new_data)
    values(auth.uid(), audit_actor_name, tg_table_name, coalesce(to_jsonb(new)->>'id', to_jsonb(new)->>'d_date', ''), tg_op, to_jsonb(old), to_jsonb(new));
    return new;
  else
    insert into public.audit_log(actor_id, actor_name, table_name, record_id, action, old_data)
    values(auth.uid(), audit_actor_name, tg_table_name, coalesce(to_jsonb(old)->>'id', to_jsonb(old)->>'d_date', ''), tg_op, to_jsonb(old));
    return old;
  end if;
end;
$$;

-- Managed content tables.
do $$
declare
  table_name text;
begin
  foreach table_name in array array['page_content','events','announcements','livestream_settings','team_members','prayer_times','profiles'] loop
    execute format('drop trigger if exists audit_changes on public.%I', table_name);
    execute format('create trigger audit_changes after insert or update or delete on public.%I for each row execute function public.write_audit_log()', table_name);
  end loop;
end
$$;
