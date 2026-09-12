-- Database-owner integration check. All fixtures and hall changes roll back.
begin;
do $$
declare
  operator_id uuid := gen_random_uuid();
  session uuid;
  device uuid;
  first_peer uuid;
  second_peer uuid;
  settings jsonb;
  stamp timestamptz;
  saved jsonb;
  rejected boolean := false;
begin
  if has_function_privilege('anon', 'public.join_tv_receiver(text,uuid,uuid)', 'execute')
     or has_function_privilege('authenticated', 'public.join_tv_receiver(text,uuid,uuid)', 'execute')
     or has_table_privilege('anon', 'public.tv_peers', 'select')
     or has_table_privilege('authenticated', 'public.tv_peers', 'select') then
    raise exception 'Private receiver access is exposed';
  end if;
  if not has_function_privilege('service_role', 'public.join_tv_receiver(text,uuid,uuid)', 'execute') then
    raise exception 'The Edge service cannot create receivers';
  end if;
  insert into auth.users(id,email) values(operator_id,operator_id||'@example.invalid');
  update public.profiles set is_active=true,permissions=array['tv'] where id=operator_id;
  select tv_screens.settings,updated_at into settings,stamp from public.tv_screens where id='mens-upstairs';
  settings := settings || '{"scene_mode":"teaching","class_until":"","active_scene_id":"receiver-test","scenes":[{"id":"receiver-test","name":"Receiver test","overlap":false,"layers":[{"id":"laptop","type":"input","slot":"input-1","capture":"screen","name":"Teacher laptop","audio":true,"x":0,"y":0,"width":100,"height":100}]}]}'::jsonb;
  set local role service_role;
  saved := public.save_tv_presentation(operator_id,'mens-upstairs',settings,stamp,'55667788',true);
  session := public.start_named_tv_input(operator_id,'mens-upstairs','input-1','screen','Teacher laptop');
  insert into public.tv_devices(screen_id,token_hash,name,presentation_id,expires_at)
    values('mens-upstairs',repeat('d',64),'Test display',(saved->'presentation'->>'id')::uuid,now()+interval '5 minutes')
    returning id into device;
  first_peer := public.join_tv_receiver('mens-upstairs',session,device);
  update public.tv_peers set offer='{"type":"offer","sdp":"v=0\r\ntest"}' where id=first_peer;
  second_peer := public.join_tv_receiver('mens-upstairs',session,device);
  if first_peer=second_peer or not exists(select 1 from public.tv_peers where id=first_peer and offer is not null) then
    raise exception 'Second receiver reset the first receiver';
  end if;
  for i in 1..6 loop perform public.join_tv_receiver('mens-upstairs',session,device); end loop;
  begin perform public.join_tv_receiver('mens-upstairs',session,device);
  exception when raise_exception then rejected := true;
  end;
  if not rejected then raise exception 'Receiver limit failed'; end if;
  update public.tv_peers set last_seen_at=now()-interval '2 minutes' where id=first_peer;
  perform public.join_tv_receiver('mens-upstairs',session,device);
  if exists(select 1 from public.tv_peers where id=first_peer) then raise exception 'Stale receiver not removed'; end if;
  rejected := false;
  begin perform public.join_tv_receiver('mens-main',session,device);
  exception when raise_exception then rejected := true;
  end;
  if not rejected then raise exception 'Cross-hall receiver allowed'; end if;
  update public.tv_presentations set expires_at=now()-interval '1 second' where screen_id='mens-upstairs';
  rejected := false;
  begin perform public.join_tv_receiver('mens-upstairs',session,device);
  exception when raise_exception then rejected := true;
  end;
  if not rejected then raise exception 'Expired presentation allowed another receiver'; end if;
  reset role;
end;
$$;
select 'PASS: independent receivers, preserved offer, limit, stale cleanup, hall scope, presentation expiry and private grants' as result;
rollback;
