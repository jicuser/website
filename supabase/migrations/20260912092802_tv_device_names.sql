-- Names describe hardware to staff. Tokens and fixed input slots remain the identities.
alter table public.tv_devices add column name text not null default ''
  check (char_length(name) <= 60);
alter table public.tv_inputs add column device_name text not null default ''
  check (char_length(device_name) <= 60);

-- Reuse the existing approval transaction; a failed name update rolls it back too.
create function public.approve_named_tv_browser(hall text, setup_code text, device_name text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare device_id uuid;
begin
  if device_name is null or length(trim(device_name)) = 0 or length(device_name) > 60 then
    raise exception using errcode = '22023', message = 'Give this TV a name using up to 60 characters';
  end if;
  device_id := public.approve_tv_browser_setup(hall, setup_code);
  update public.tv_devices set name = trim(device_name) where id = device_id and screen_id = hall;
  return device_id;
end;
$$;

-- The original start function owns locking, staff access and occupied-slot checks.
-- Keeping it as the common operation also preserves older deployed clients.
create function public.start_named_tv_input(actor uuid, hall text, input_slot text, input_kind text, device_name text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare input_session uuid;
begin
  if device_name is null or length(trim(device_name)) = 0 or length(device_name) > 60 then
    raise exception using errcode = '22023', message = 'Give this laptop or phone a name using up to 60 characters';
  end if;
  input_session := public.start_tv_input(actor, hall, input_slot, input_kind);
  update public.tv_inputs set device_name = trim(start_named_tv_input.device_name)
    where session_id = input_session and screen_id = hall;
  return input_session;
end;
$$;

revoke all on function public.approve_named_tv_browser(text,text,text) from public, anon, authenticated;
revoke all on function public.start_named_tv_input(uuid,text,text,text,text) from public, anon, authenticated;
grant execute on function public.approve_named_tv_browser(text,text,text) to service_role;
grant execute on function public.start_named_tv_input(uuid,text,text,text,text) to service_role;
