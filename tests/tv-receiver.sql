-- Integration check after the receiver migration. Fixtures are always rolled back.
begin;
do $$
declare
  owner uuid;
  slot_name text;
  session uuid;
  device uuid;
  first_peer uuid;
  second_peer uuid;
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
  select id into owner from public.profiles where is_owner and is_active limit 1;
  select slot into slot_name from unnest(array['input-1','input-2','input-3','input-4']) slot
    where not exists(select 1 from public.tv_inputs where screen_id='mens-upstairs' and tv_inputs.slot=slot)
    limit 1;
  if slot_name is null or owner is null then raise exception 'No isolated test fixture available'; end if;
  insert into public.tv_inputs(screen_id,slot,owner_id,kind,expires_at)
    values('mens-upstairs',slot_name,owner,'screen',now()+interval '5 minutes') returning session_id into session;
  insert into public.tv_devices(screen_id,token_hash,expires_at)
    values('mens-upstairs',md5(gen_random_uuid()::text),now()+interval '5 minutes') returning id into device;
  first_peer := public.join_tv_receiver('mens-upstairs',session,device);
  update public.tv_peers set offer='{"type":"offer","sdp":"v=0\r\ntest"}' where id=first_peer;
  second_peer := public.join_tv_receiver('mens-upstairs',session,device);
  if first_peer=second_peer or not exists(select 1 from public.tv_peers where id=first_peer and offer is not null) then
    raise exception 'Second receiver reset the first receiver';
  end if;
  for i in 1..6 loop perform public.join_tv_receiver('mens-upstairs',session,device); end loop;
  begin
    perform public.join_tv_receiver('mens-upstairs',session,device);
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
end;
$$;
select 'PASS: independent receivers, preserved offer, limit, stale cleanup, hall scope and private grants' as result;
rollback;
