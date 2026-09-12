-- Database-owner integration tests. All users, counters and hall changes roll back.
begin;
do $$
declare
  operator_id uuid := gen_random_uuid();
  helper_id uuid := gen_random_uuid();
  config jsonb;
  original_scenes jsonb;
  saved jsonb;
  joined jsonb;
  stamp timestamptz;
  old_stamp timestamptz;
  presentation_id uuid;
  display_id uuid;
  input_session uuid;
  digest text := repeat('a', 64);
  client_digest text := repeat('b', 64);
  rejected boolean;
  object_name text;
begin
  foreach object_name in array array['tv_presentations', 'tv_join_attempts', 'tv_devices'] loop
    if has_table_privilege('anon', 'public.' || object_name, 'select')
       or has_table_privilege('authenticated', 'public.' || object_name, 'select')
       or not exists(select 1 from pg_class where oid = ('public.' || object_name)::regclass and relrowsecurity) then
      raise exception 'Private table % is exposed or lacks RLS', object_name;
    end if;
  end loop;
  foreach object_name in array array[
    'save_tv_presentation(uuid,text,jsonb,timestamptz,text,boolean)',
    'join_tv_presentation(text,text,text,text,text)',
    'start_tv_input(uuid,text,text,text)', 'join_tv_receiver(text,uuid,uuid)'
  ] loop
    if has_function_privilege('anon', 'public.' || object_name, 'execute')
       or has_function_privilege('authenticated', 'public.' || object_name, 'execute')
       or not has_function_privilege('service_role', 'public.' || object_name, 'execute') then
      raise exception 'Private RPC % has incorrect grants', object_name;
    end if;
  end loop;
  if to_regclass('public.tv_browser_setup') is not null
     or to_regclass('public.tv_pairing_codes') is not null
     or to_regprocedure('public.save_tv_scene(uuid,text,jsonb,timestamptz)') is not null then
    raise exception 'Obsolete display approval API remains';
  end if;

  insert into auth.users(id, email) values
    (operator_id, operator_id || '@example.invalid'), (helper_id, helper_id || '@example.invalid');
  update public.profiles set is_active = true, permissions = array['tv'] where id = operator_id;
  update public.profiles set is_active = true, permissions = array[]::text[], is_owner = false where id = helper_id;
  select settings, updated_at into config, stamp from public.tv_screens where id = 'mens-upstairs';
  config := config || '{"scene_mode":"teaching","class_until":"","active_scene_id":"test-scene","scenes":[{"id":"test-scene","name":"Test","overlap":false,"layers":[{"id":"camera","type":"input","slot":"input-1","capture":"camera","name":"Teacher phone","audio":true,"x":0,"y":0,"width":100,"height":100}]}]}'::jsonb;
  original_scenes := config->'scenes';
  delete from public.tv_join_attempts where screen_id = 'mens-upstairs';
  set local role service_role;
  rejected := false;
  begin
    perform public.save_tv_presentation(helper_id, 'mens-upstairs', config, stamp, '12345678');
  exception when raise_exception then rejected := true;
  end;
  if not rejected then raise exception 'Viewer permission could publish a layout'; end if;
  saved := public.save_tv_presentation(operator_id, 'mens-upstairs',
    config || '{"scene_mode":"normal"}'::jsonb, stamp, null);
  stamp := (saved->>'updated_at')::timestamptz;
  saved := public.save_tv_presentation(operator_id, 'mens-upstairs', config, stamp, '12345678');
  stamp := (saved->>'updated_at')::timestamptz;
  presentation_id := (saved->'presentation'->>'id')::uuid;
  if saved->'presentation'->>'code' <> '12345678' or saved->'settings'->'scenes' <> original_scenes then
    raise exception 'Starting presentation lost the code or saved layout';
  end if;
  joined := public.join_tv_presentation('mens-upstairs', '12345678', '', digest, client_digest);
  if (joined->>'status')::integer <> 400 then raise exception 'Blank device name accepted'; end if;
  joined := public.join_tv_presentation('mens-upstairs', '00000000', 'Student phone', digest, client_digest);
  if (joined->>'status')::integer <> 403 then raise exception 'Wrong session code accepted'; end if;
  joined := public.join_tv_presentation('mens-main', '12345678', 'Student phone', digest, client_digest);
  if joined ? 'deviceId' then raise exception 'Code crossed halls'; end if;
  joined := public.join_tv_presentation('mens-upstairs', '12345678', '  Student phone  ', digest, client_digest);
  display_id := (joined->>'deviceId')::uuid;
  if display_id is null or (select name from public.tv_devices where id = display_id) <> 'Student phone'
     or (joined->>'expiresAt')::timestamptz <> now() + interval '24 hours' then
    raise exception 'Named viewer was not joined with bounded credentials';
  end if;
  if (public.join_tv_presentation('mens-upstairs', '12345678', 'Student phone', digest, client_digest)->>'deviceId')::uuid <> display_id then
    raise exception 'Retry created duplicate viewers';
  end if;
  -- A class behind one Wi-Fi router must not consume a failed-guess budget by joining.
  for i in 1..25 loop
    joined := public.join_tv_presentation('mens-upstairs', '12345678', 'Student ' || i,
      lpad(to_hex(i), 64, '0'), client_digest);
    if not (joined ? 'deviceId') then raise exception 'Correct shared-network join % was blocked', i; end if;
  end loop;
  if (select attempts from public.tv_join_attempts where screen_id = 'mens-upstairs' and client_hash = client_digest) <> 1 then
    raise exception 'Successful joins incremented failed-guess counters';
  end if;
  input_session := public.start_named_tv_input(operator_id, 'mens-upstairs', 'input-1', 'camera', 'Teacher phone');
  perform public.join_tv_receiver('mens-upstairs', input_session, display_id);
  rejected := false;
  begin perform public.start_tv_input(helper_id, 'mens-upstairs', 'input-2', 'camera');
  exception when raise_exception then rejected := true;
  end;
  if not rejected then raise exception 'Viewer could contribute a camera'; end if;

  old_stamp := stamp;
  saved := public.save_tv_presentation(operator_id, 'mens-upstairs', config, stamp, '87654321');
  stamp := (saved->>'updated_at')::timestamptz;
  if (saved->'presentation'->>'id')::uuid <> presentation_id
     or saved->'presentation'->>'code' <> '12345678'
     or not exists(select 1 from public.tv_devices where id = display_id)
     or not exists(select 1 from public.tv_inputs where session_id = input_session) then
    raise exception 'Saving a scene interrupted the current presentation';
  end if;
  rejected := false;
  begin perform public.save_tv_presentation(operator_id, 'mens-upstairs', config, old_stamp, '87654321', true);
  exception when raise_exception then rejected := true;
  end;
  if not rejected or not exists(select 1 from public.tv_devices where id = display_id) then
    raise exception 'Stale editor replaced the active presentation';
  end if;
  rejected := false;
  begin perform public.save_tv_presentation(operator_id, 'mens-upstairs', config, stamp, '12345678', true);
  exception when invalid_parameter_value then rejected := true;
  end;
  if not rejected then raise exception 'Restart reused the previous session code'; end if;
  saved := public.save_tv_presentation(operator_id, 'mens-upstairs', config, stamp, '87654321', true);
  stamp := (saved->>'updated_at')::timestamptz;
  if (saved->'presentation'->>'id')::uuid = presentation_id
     or exists(select 1 from public.tv_devices where id = display_id)
     or exists(select 1 from public.tv_inputs where session_id = input_session)
     or saved->'settings'->'scenes' <> original_scenes then
    raise exception 'New presentation did not invalidate old connections while preserving scenes';
  end if;
  joined := public.join_tv_presentation('mens-upstairs', '12345678', 'Old viewer', digest, client_digest);
  if (joined->>'status')::integer <> 403 then raise exception 'Previous session code was reused'; end if;

  config := config || jsonb_build_object('class_until', now() + interval '30 minutes');
  saved := public.save_tv_presentation(operator_id, 'mens-upstairs', config, stamp, '00000000');
  stamp := (saved->>'updated_at')::timestamptz;
  joined := public.join_tv_presentation('mens-upstairs', '87654321', 'Student phone', digest, client_digest);
  if (joined->>'expiresAt')::timestamptz <> now() + interval '30 minutes' then
    raise exception 'Viewer credential outlived timed presentation';
  end if;
  update public.tv_presentations set expires_at = now() - interval '1 second' where screen_id = 'mens-upstairs';
  joined := public.join_tv_presentation('mens-upstairs', '87654321', 'Student phone', digest, client_digest);
  if (joined->>'status')::integer <> 410 then raise exception 'Expired session admitted a viewer'; end if;
  saved := public.save_tv_presentation(operator_id, 'mens-upstairs', config, stamp, '11112222');
  stamp := (saved->>'updated_at')::timestamptz;
  if saved->'presentation'->>'code' <> '11112222' then raise exception 'Expired presentation retained its code'; end if;

  delete from public.tv_join_attempts where screen_id = 'mens-upstairs';
  for i in 1..20 loop
    joined := public.join_tv_presentation('mens-upstairs', '00000000', 'Guess', digest, client_digest);
    if (joined->>'status')::integer <> 403 then raise exception 'Guess budget rejected attempt % too soon', i; end if;
  end loop;
  joined := public.join_tv_presentation('mens-upstairs', '11112222', 'Student phone', digest, client_digest);
  if (joined->>'status')::integer <> 429 then raise exception 'Failed-guess budget could be bypassed'; end if;
  update public.tv_join_attempts set window_started_at = now() - interval '20 minutes' where screen_id = 'mens-upstairs';
  joined := public.join_tv_presentation('mens-upstairs', '11112222', 'Student phone', digest, client_digest);
  if not (joined ? 'deviceId') then raise exception 'Expired guess budget did not reset'; end if;
  insert into public.tv_join_attempts values ('mens-upstairs', '*', date_bin(interval '10 minutes', now(), '2000-01-01'::timestamptz), 300)
    on conflict (screen_id, client_hash) do update set attempts = 300;
  joined := public.join_tv_presentation('mens-upstairs', '11112222', 'Another phone', digest, repeat('c',64));
  if (joined->>'status')::integer <> 429 then raise exception 'Hall guess budget could be bypassed'; end if;

  config := jsonb_set(config, '{scenes,0,layers}', '[]'::jsonb);
  saved := public.save_tv_presentation(operator_id, 'mens-upstairs', config, stamp, '33334444');
  stamp := (saved->>'updated_at')::timestamptz;
  if saved->'settings'->>'scene_mode' <> 'normal' or saved->'presentation' <> 'null'::jsonb
     or exists(select 1 from public.tv_presentations where screen_id = 'mens-upstairs')
     or exists(select 1 from public.tv_devices where screen_id = 'mens-upstairs') then
    raise exception 'Cleared active scene did not return to public Normal';
  end if;
  config := jsonb_set(config, '{scenes}', original_scenes);
  saved := public.save_tv_presentation(operator_id, 'mens-upstairs', config, stamp, '33334444');
  stamp := (saved->>'updated_at')::timestamptz;
  saved := public.save_tv_presentation(operator_id, 'mens-upstairs', config || '{"scene_mode":"normal"}', stamp, null);
  if saved->'settings'->'scenes' <> original_scenes
     or exists(select 1 from public.tv_presentations where screen_id = 'mens-upstairs') then
    raise exception 'Return to Normal lost saved scenes or left viewing access active';
  end if;
  reset role;
end;
$$;
select 'PASS: session grants, named viewers, shared Wi-Fi, stable saves, rotation, expiry, source permissions, guess limits and Normal fallback' as result;
rollback;
