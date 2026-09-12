-- Database-owner integration test. Fixtures, display edits and inputs are rolled back.
begin;
do $$
declare owner_id uuid:=gen_random_uuid(); manager_id uuid:=gen_random_uuid(); helper_id uuid:=gen_random_uuid();
 conf jsonb; stamp timestamptz; first_session uuid; second_session uuid; rejected boolean;
begin
 insert into auth.users(id,email) values(owner_id,owner_id||'@example.invalid'),(manager_id,manager_id||'@example.invalid'),(helper_id,helper_id||'@example.invalid');
 update public.profiles set is_owner=true where id=owner_id;
 update public.profiles set permissions=array['users','tv'] where id=manager_id;
 update public.profiles set staff_kinds=array['teacher'] where id=helper_id;
 perform set_config('request.jwt.claim.sub',helper_id::text,true);
 set local role authenticated;
 if private.has_permission('tv') then raise exception 'Staff label granted permission'; end if;
 rejected=false;begin update public.profiles set is_owner=true where id=helper_id; exception when insufficient_privilege then rejected=true; end;
 if not rejected then raise exception 'Client could grant owner'; end if;
 rejected=false;begin perform public.manage_staff_access(helper_id,manager_id,array['users'],null,null); exception when insufficient_privilege then rejected=true; end;
 if not rejected then raise exception 'Client could invoke service-only staff RPC'; end if;
 reset role;
 set local role service_role;
 perform public.manage_staff_access(manager_id,helper_id,array['tv'],array['volunteer'],true);
 rejected=false;begin perform public.manage_staff_access(manager_id,helper_id,array['tv','content'],null,null); exception when raise_exception then rejected=true; end;
 if not rejected then raise exception 'Delegated manager exceeded own access'; end if;
 rejected=false;begin perform public.manage_staff_access(manager_id,owner_id,array[]::text[],null,false); exception when raise_exception then rejected=true; end;
 if not rejected then raise exception 'Delegated manager changed owner'; end if;
 select settings,updated_at into conf,stamp from public.tv_screens where id='mens-main';
 conf=conf||'{"scene_mode":"teaching","class_until":"","active_scene_id":"test-scene","scenes":[{"id":"test-scene","name":"Test","overlap":false,"layers":[{"id":"pc","type":"input","slot":"input-1","audio":false,"x":0,"y":0,"width":50,"height":100},{"id":"phone","type":"input","slot":"input-2","audio":true,"x":50,"y":0,"width":50,"height":100}]}]}'::jsonb;
 stamp=public.save_tv_scene(manager_id,'mens-main',conf,stamp);
 if has_function_privilege('authenticated', 'public.start_named_tv_input(uuid,text,text,text,text)', 'execute')
    or has_function_privilege('anon', 'public.start_named_tv_input(uuid,text,text,text,text)', 'execute') then
   raise exception 'Named source start exposed';
 end if;
 first_session=public.start_named_tv_input(manager_id,'mens-main','input-1','screen','Office laptop');
 if (select device_name from public.tv_inputs where session_id=first_session) <> 'Office laptop' then
   raise exception 'Publisher name was not saved';
 end if;
 second_session=public.start_tv_input(helper_id,'mens-main','input-2','camera');
 if first_session=second_session or (select count(*) from public.tv_inputs where screen_id='mens-main')<>2 then raise exception 'Separate devices did not get separate inputs'; end if;
 rejected=false;begin perform public.start_named_tv_input(helper_id,'mens-main','input-1','camera','Another phone'); exception when raise_exception then rejected=true; end;
 if not rejected then raise exception 'A second publisher replaced a live input'; end if;
 rejected=false;begin perform public.save_tv_scene(manager_id,'mens-main',conf,stamp-interval '1 second'); exception when raise_exception then rejected=true; end;
 if not rejected then raise exception 'Stale draft overwrote saved scene'; end if;
 stamp=public.save_tv_scene(manager_id,'mens-main',conf||'{"scene_mode":"normal"}'::jsonb,stamp);
 if exists(select 1 from public.tv_inputs where screen_id='mens-main') then raise exception 'Normal left private inputs active'; end if;
 rejected=false;begin perform public.start_tv_input(helper_id,'mens-main','input-2','camera'); exception when raise_exception then rejected=true; end;
 if not rejected then raise exception 'Normal allowed a camera input'; end if;
 reset role;
 update public.profiles set is_active=false where id=helper_id;
 perform set_config('request.jwt.claim.sub',helper_id::text,true);
 set local role authenticated;
 if private.has_permission('tv') then raise exception 'Disabled staff retained TV access'; end if;
 rejected=false;begin perform * from public.tv_inputs; exception when insufficient_privilege then rejected=true; end;
 if not rejected then raise exception 'Private input table was exposed'; end if;
 reset role;
end $$;
rollback;
select 'Staff delegation, private tables and simultaneous TV inputs passed; fixtures rolled back.' as result;
