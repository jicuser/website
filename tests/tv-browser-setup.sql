-- Run after the TV browser setup migration. All fixtures are rolled back.
begin;
do $$
declare
  token_digest text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  another_digest text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  first_request jsonb;
  retried_request jsonb;
  device_id uuid;
  rejected boolean;
  pending_count integer;
begin
  if has_table_privilege('anon', 'public.tv_browser_setup', 'select')
     or has_table_privilege('authenticated', 'public.tv_browser_setup', 'select')
     or has_function_privilege('anon', 'public.begin_tv_browser_setup(text,text)', 'execute')
     or has_function_privilege('authenticated', 'public.begin_tv_browser_setup(text,text)', 'execute')
     or has_function_privilege('anon', 'public.approve_tv_browser_setup(text,text)', 'execute')
     or has_function_privilege('authenticated', 'public.approve_tv_browser_setup(text,text)', 'execute') then
    raise exception 'TV setup grants expose credentials or approval';
  end if;
  if not exists(select 1 from pg_class where oid = 'public.tv_browser_setup'::regclass and relrowsecurity)
     or not has_function_privilege('service_role', 'public.begin_tv_browser_setup(text,text)', 'execute')
     or not has_function_privilege('service_role', 'public.approve_tv_browser_setup(text,text)', 'execute') then
    raise exception 'TV setup access rules are incomplete';
  end if;

  first_request := public.begin_tv_browser_setup('mens-upstairs', token_digest);
  retried_request := public.begin_tv_browser_setup('mens-upstairs', token_digest);
  if first_request <> retried_request
     or (first_request->>'code') !~ '^[0-9]{6}$'
     or (first_request->>'expires_at')::timestamptz <> now() + interval '10 minutes' then
    raise exception 'Setup must be idempotent with a six-digit, ten-minute code';
  end if;
  rejected := false;
  begin perform public.begin_tv_browser_setup('mens-main', token_digest);
  exception when invalid_parameter_value then rejected := true;
  end;
  if not rejected then raise exception 'Pending credential crossed halls'; end if;
  rejected := false;
  begin perform public.approve_tv_browser_setup('mens-main', first_request->>'code');
  exception when invalid_parameter_value then rejected := true;
  end;
  if not rejected then raise exception 'Code approved in another hall'; end if;

  device_id := public.approve_tv_browser_setup('mens-upstairs', first_request->>'code');
  if not exists(select 1 from public.tv_devices where id = device_id and token_hash = token_digest
      and screen_id = 'mens-upstairs' and expires_at = now() + interval '90 days')
     or exists(select 1 from public.tv_browser_setup where token_hash = token_digest) then
    raise exception 'Approval did not preserve the browser credential and consume its code';
  end if;
  if public.begin_tv_browser_setup('mens-upstairs', token_digest) <> '{"approved":true}'::jsonb then
    raise exception 'Approved browser needed another code';
  end if;
  rejected := false;
  begin perform public.approve_tv_browser_setup('mens-upstairs', first_request->>'code');
  exception when invalid_parameter_value then rejected := true;
  end;
  if not rejected then raise exception 'Setup code was reusable'; end if;

  update public.tv_devices set expires_at = now() - interval '1 second' where id = device_id;
  first_request := public.begin_tv_browser_setup('mens-upstairs', token_digest);
  if first_request ? 'approved' or exists(select 1 from public.tv_devices where id = device_id) then
    raise exception 'Expired browser was approved without staff';
  end if;
  update public.tv_browser_setup set expires_at = now() - interval '1 second' where token_hash = token_digest;
  rejected := false;
  begin perform public.approve_tv_browser_setup('mens-upstairs', first_request->>'code');
  exception when invalid_parameter_value then rejected := true;
  end;
  if not rejected then raise exception 'Expired setup code was accepted'; end if;
  perform public.begin_tv_browser_setup('mens-upstairs', another_digest);
  if exists(select 1 from public.tv_browser_setup where token_hash = token_digest) then
    raise exception 'Expired setup queue was not cleaned';
  end if;

  select count(*) into pending_count from public.tv_browser_setup where screen_id = 'mens-upstairs';
  for i in pending_count..19 loop
    perform public.begin_tv_browser_setup('mens-upstairs',
      replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''));
  end loop;
  rejected := false;
  begin perform public.begin_tv_browser_setup('mens-upstairs', token_digest);
  exception when raise_exception then rejected := true;
  end;
  if not rejected or (select count(*) from public.tv_browser_setup where screen_id = 'mens-upstairs') <> 20 then
    raise exception 'Pending TV limit failed';
  end if;
  perform public.begin_tv_browser_setup('mens-upstairs', another_digest);
end;
$$;
select 'PASS: private grants, code expiry, browser retry, approval, hall scope, one-time use and queue limit' as result;
rollback;
