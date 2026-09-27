-- Notifications for custom-form followers/managers were written as kind='form',
-- but the original notification predicate only exposed task notifications.
-- Keep notification rows private to their intended user and verify underlying access.
begin;

create or replace function private.can_receive_notification(
  account uuid,
  kind text,
  entity uuid
) returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select case
    when kind = 'task' then private.read_task(entity, account)
    when kind = 'form' then private.read_custom_submission(entity, account)
    else false
  end;
$$;

revoke all on function private.can_receive_notification(uuid,text,uuid)
  from public, anon, authenticated;
grant execute on function private.can_receive_notification(uuid,text,uuid)
  to authenticated, service_role;

commit;
