-- Run as the database owner. Fixture users, displays and scene changes roll back.
begin;
do $$
declare
  operator_id uuid := gen_random_uuid();
  helper_id uuid := gen_random_uuid();
  display_digest text := repeat('e', 64);
  other_digest text := repeat('f', 64);
  client_digest text := repeat('d', 64);
  config jsonb;
  saved jsonb;
  requested jsonb;
  repeated jsonb;
  approved jsonb;
  stamp timestamptz;
  original_code text;
  renewed_code text;
  display_id uuid;
  presentation_id uuid;
  camera_session uuid;
  screen_session uuid;
  template_id uuid;
  object_name text;
  rejected boolean;
begin
  foreach object_name in array array['display_connection_codes', 'display_code_allocations', 'tv_scene_templates'] loop
    if has_table_privilege('anon', 'public.' || object_name, 'select,insert,update,delete')
       or has_table_privilege('authenticated', 'public.' || object_name, 'select,insert,update,delete')
       or not has_table_privilege('service_role', 'public.' || object_name, 'select,insert,update,delete')
       or not exists(select 1 from pg_class where oid = ('public.' || object_name)::regclass and relrowsecurity) then
      raise exception 'Private table % has incorrect grants or lacks RLS', object_name;
    end if;
  end loop;
  foreach object_name in array array[
    'request_display_code(text,text,text)', 'approve_display_code(uuid,text,text,text)',
    'save_tv_presentation(uuid,text,jsonb,timestamptz,text,boolean)'
  ] loop
    if has_function_privilege('anon', 'public.' || object_name, 'execute')
       or has_function_privilege('authenticated', 'public.' || object_name, 'execute')
       or not has_function_privilege('service_role', 'public.' || object_name, 'execute')
       or exists(select 1 from pg_proc where oid = ('public.' || object_name)::regprocedure and prosecdef) then
      raise exception 'Private RPC % has incorrect privileges', object_name;
    end if;
  end loop;

  insert into auth.users(id, email) values
    (operator_id, operator_id || '@example.invalid'), (helper_id, helper_id || '@example.invalid');
  update public.profiles set is_active = true, permissions = array['tv'] where id = operator_id;
  update public.profiles set is_active = true, is_owner = false, permissions = array[]::text[] where id = helper_id;
  select settings, updated_at into config, stamp from public.tv_screens where id = 'mens-upstairs';
  config := config || '{"scene_mode":"teaching","class_until":"","active_scene_id":"layout-test","scenes":[{"id":"layout-test","name":"Saved layout","overlap":true,"layers":[{"id":"camera","type":"input","slot":"input-1","capture":"camera","name":"Teacher phone","x":0,"y":0,"width":70,"height":100},{"id":"screen","type":"input","slot":"input-2","capture":"screen","x":70,"y":0,"width":30,"height":100}]}]}'::jsonb;
  delete from public.display_connection_codes;
  delete from public.display_code_allocations;

  set local role service_role;
  saved := public.save_tv_presentation(operator_id, 'mens-upstairs',
    config || '{"scene_mode":"normal"}'::jsonb, stamp, null);
  stamp := (saved->>'updated_at')::timestamptz;
  requested := public.request_display_code('mens-upstairs', display_digest, client_digest);
  original_code := requested->>'code';
  if original_code is null or original_code !~ '^[0-9]{6}$'
     or (requested->>'expires_at')::timestamptz is distinct from now() + interval '10 minutes' then
    raise exception 'Public display did not receive a ten-minute code';
  end if;
  if public.request_display_code('mens-upstairs', display_digest, client_digest) is distinct from requested
     or exists(select 1 from public.tv_devices where token_hash = display_digest) then
    raise exception 'Refreshing changed the code or approved a viewer automatically';
  end if;
  if (public.request_display_code('mens-main', display_digest, client_digest)->>'status')::integer is distinct from 409 then
    raise exception 'A browser credential could cross halls';
  end if;
  if (public.request_display_code('mens-upstairs', 'invalid', client_digest)->>'status')::integer is distinct from 400
     or (public.request_display_code('shoe-area', other_digest, client_digest)->>'status')::integer is distinct from 400 then
    raise exception 'Invalid display request accepted';
  end if;
  approved := public.approve_display_code(operator_id, 'mens-upstairs', original_code);
  if (approved->>'status')::integer is distinct from 409 then raise exception 'Viewing was approved without an active stream'; end if;

  saved := public.save_tv_presentation(operator_id, 'mens-upstairs', config, stamp, '87654321');
  stamp := (saved->>'updated_at')::timestamptz;
  presentation_id := (saved->'presentation'->>'id')::uuid;
  if (public.approve_display_code(helper_id, 'mens-upstairs', original_code)->>'status')::integer is distinct from 403 then
    raise exception 'A staff member without stream permission approved a display';
  end if;
  update public.profiles set is_active = false where id = operator_id;
  if (public.approve_display_code(operator_id, 'mens-upstairs', original_code)->>'status')::integer is distinct from 403 then
    raise exception 'An inactive operator approved a display';
  end if;
  update public.profiles set is_active = true where id = operator_id;
  if (public.approve_display_code(operator_id, 'mens-upstairs', original_code, repeat('n',61))->>'status')::integer is distinct from 400 then
    raise exception 'Oversized display name accepted';
  end if;
  requested := public.request_display_code('mens-main', other_digest, client_digest);
  if (public.approve_display_code(operator_id, 'mens-upstairs', requested->>'code')->>'status')::integer is distinct from 404 then
    raise exception 'Display code crossed halls';
  end if;
  approved := public.approve_display_code(operator_id, 'mens-upstairs', original_code);
  display_id := (approved->>'deviceId')::uuid;
  if display_id is null or approved->>'name' is distinct from 'Display ' || right(original_code,3)
     or (approved->>'presentationId')::uuid is distinct from presentation_id
     or (approved->>'expiresAt')::timestamptz is distinct from now() + interval '24 hours' then
    raise exception 'Display approval was not bound to the current stream';
  end if;
  if (select last_seen_at from public.tv_devices where id = display_id) is not null then
    raise exception 'Approval incorrectly claimed the display is already watching';
  end if;
  approved := public.approve_display_code(operator_id, 'mens-upstairs', original_code, '  Main display  ');
  if (approved->>'deviceId')::uuid is distinct from display_id or approved->>'name' is distinct from 'Main display' then
    raise exception 'Repeated approval duplicated the display or lost its name';
  end if;
  if public.approve_display_code(operator_id, 'mens-upstairs', original_code)->>'name' is distinct from 'Main display' then
    raise exception 'Optional name overwrote the existing display name';
  end if;

  camera_session := public.start_named_tv_input(operator_id, 'mens-upstairs', 'input-1', 'camera', 'Teacher phone');
  screen_session := public.start_named_tv_input(operator_id, 'mens-upstairs', 'input-2', 'screen', 'Presenter laptop');
  perform public.join_tv_receiver('mens-upstairs', camera_session, display_id);
  update public.display_connection_codes set expires_at = now() - interval '1 second' where token_hash = display_digest;
  if (public.approve_display_code(operator_id, 'mens-upstairs', original_code)->>'status')::integer is distinct from 404 then
    raise exception 'Expired display code was accepted';
  end if;
  requested := public.request_display_code('mens-upstairs', display_digest, client_digest);
  renewed_code := requested->>'code';
  if renewed_code is null or renewed_code = original_code
     or public.request_display_code('mens-upstairs', display_digest, client_digest) is distinct from requested
     or not exists(select 1 from public.tv_devices where id = display_id and token_hash = display_digest)
     or not exists(select 1 from public.tv_peers where device_id = display_id) then
    raise exception 'Code rotation changed the viewer credential or interrupted playback';
  end if;
  if (public.approve_display_code(operator_id, 'mens-upstairs', original_code)->>'status')::integer is distinct from 404 then
    raise exception 'Previous display code remained usable after rotation';
  end if;

  insert into public.tv_scene_templates(screen_id,name,scene,created_by)
    values ('mens-upstairs','Camera and laptop',config->'scenes'->0,operator_id) returning id into template_id;
  rejected := false;
  begin
    insert into public.tv_scene_templates(screen_id,name,scene) values ('mens-upstairs',repeat('x',81),'{}');
  exception when check_violation then rejected := true;
  end;
  if not rejected then raise exception 'Template accepted an oversized name'; end if;

  -- Converting an input into an empty region releases only that source's lease.
  config := jsonb_set(config, '{scenes,0,layers,1,type}', '"empty"'::jsonb);
  saved := public.save_tv_presentation(operator_id, 'mens-upstairs', config, stamp, null);
  stamp := (saved->>'updated_at')::timestamptz;
  if exists(select 1 from public.tv_inputs where session_id = screen_session)
     or not exists(select 1 from public.tv_inputs where session_id = camera_session)
     or not exists(select 1 from public.tv_devices where id = display_id) then
    raise exception 'Saving configured inputs did not release only the removed source';
  end if;
  saved := public.save_tv_presentation(operator_id, 'mens-upstairs', config, stamp, '11223344', true);
  stamp := (saved->>'updated_at')::timestamptz;
  if exists(select 1 from public.tv_devices where id = display_id)
     or exists(select 1 from public.tv_inputs where screen_id = 'mens-upstairs')
     or not exists(select 1 from public.tv_scene_templates where id = template_id)
     or public.request_display_code('mens-upstairs', display_digest, client_digest)->>'code' is distinct from renewed_code then
    raise exception 'A fresh stream did not clear viewers and inputs while preserving templates and browser codes';
  end if;
  rejected := false;
  begin perform public.join_tv_receiver('mens-upstairs', camera_session, display_id);
  exception when raise_exception then rejected := true;
  end;
  if not rejected then raise exception 'Previous stream receiver retained access'; end if;
  approved := public.approve_display_code(operator_id, 'mens-upstairs', renewed_code);
  if not (approved ? 'deviceId') or (approved->>'presentationId')::uuid = presentation_id then
    raise exception 'A browser could not be explicitly approved for the next stream';
  end if;
  config := config || jsonb_build_object('class_until',now() + interval '30 minutes');
  saved := public.save_tv_presentation(operator_id, 'mens-upstairs', config, stamp, null);
  stamp := (saved->>'updated_at')::timestamptz;
  approved := public.approve_display_code(operator_id, 'mens-upstairs', renewed_code);
  if (approved->>'expiresAt')::timestamptz is distinct from now() + interval '30 minutes' then
    raise exception 'Approval outlived the scheduled stream ending';
  end if;
  update public.tv_presentations set expires_at = now() - interval '1 second' where screen_id = 'mens-upstairs';
  if (public.approve_display_code(operator_id, 'mens-upstairs', renewed_code)->>'status')::integer is distinct from 409 then
    raise exception 'Expired stream admitted a display';
  end if;

  -- Every region may remain in the draft while the displayed stream has ended.
  config := jsonb_set(config, '{scenes,0,layers,0,type}', '"empty"'::jsonb);
  saved := public.save_tv_presentation(operator_id, 'mens-upstairs', config, stamp, '44332211');
  if saved->'settings'->>'scene_mode' is distinct from 'normal'
     or jsonb_array_length(saved->'settings'->'scenes'->0->'layers') is distinct from 2
     or exists(select 1 from public.tv_presentations where screen_id = 'mens-upstairs')
     or exists(select 1 from public.tv_devices where screen_id = 'mens-upstairs')
     or not exists(select 1 from public.tv_scene_templates where id = template_id) then
    raise exception 'Empty draft regions started a stream or removed the saved template';
  end if;

  -- At capacity, existing browsers keep their code; new allocations wait for expiry.
  delete from public.display_connection_codes;
  insert into public.display_connection_codes(token_hash, screen_id, code)
    select lpad(to_hex(i),64,'0'), 'mens-upstairs', lpad(i::text,6,'0') from generate_series(1,2000) i;
  repeated := public.request_display_code('mens-upstairs', lpad(to_hex(1),64,'0'), client_digest);
  if repeated->>'code' is distinct from '000001'
     or (public.request_display_code('mens-upstairs', display_digest, client_digest)->>'status')::integer is distinct from 429 then
    raise exception 'Display allocation limit is incorrect';
  end if;
  update public.display_connection_codes set expires_at = now() - interval '1 second' where screen_id = 'mens-upstairs';
  requested := public.request_display_code('mens-upstairs', display_digest, client_digest);
  if not (requested ? 'code') or (select count(*) from public.display_connection_codes) is distinct from 1745 then
    raise exception 'Expired code cleanup did not remove one bounded batch';
  end if;

  -- One visitor cannot fill the hall queue by repeatedly replacing their secret.
  delete from public.display_connection_codes;
  delete from public.display_code_allocations;
  for i in 1..30 loop
    requested := public.request_display_code('mens-upstairs',lpad(to_hex(i),64,'0'),client_digest);
    if not (requested ? 'code') then raise exception 'New display budget rejected allocation % too soon', i; end if;
  end loop;
  if (public.request_display_code('mens-upstairs',display_digest,client_digest)->>'status')::integer is distinct from 429
     or (select count(*) from public.display_connection_codes) is distinct from 30 then
    raise exception 'One client exhausted the global display queue';
  end if;
  requested := public.request_display_code('mens-upstairs',lpad(to_hex(1),64,'0'),client_digest);
  if not (requested ? 'code') then raise exception 'New display budget blocked a known browser'; end if;
  update public.display_connection_codes set expires_at = now() - interval '1 second'
    where token_hash = lpad(to_hex(1),64,'0');
  repeated := public.request_display_code('mens-upstairs',lpad(to_hex(1),64,'0'),client_digest);
  if not (repeated ? 'code') or repeated->>'code' = requested->>'code'
     or (select allocations from public.display_code_allocations
         where screen_id = 'mens-upstairs' and client_hash = client_digest) is distinct from 30 then
    raise exception 'Renewing a known display consumed new-allocation capacity';
  end if;
  update public.display_code_allocations set window_started_at = now() - interval '20 minutes';
  requested := public.request_display_code('mens-upstairs',display_digest,client_digest);
  if not (requested ? 'code')
     or (select allocations from public.display_code_allocations
         where screen_id = 'mens-upstairs' and client_hash = client_digest) is distinct from 1 then
    raise exception 'Expired client budget did not reset';
  end if;
  if (public.request_display_code('mens-upstairs',other_digest,null)->>'status')::integer is distinct from 400 then
    raise exception 'Missing client identity bypassed the allocation budget';
  end if;
  reset role;
end;
$$;
select 'PASS: display code rotation, bounded allocation, staff approval, hall and session isolation, saved templates and empty regions' as result;
rollback;
