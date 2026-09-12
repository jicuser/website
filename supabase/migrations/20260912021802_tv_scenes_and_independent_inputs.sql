-- Device inputs belong to a hall, independently of its selected scene.
create table public.tv_inputs (
 screen_id text not null references public.tv_screens(id) on delete cascade,
 slot text not null check(slot in ('input-1','input-2','input-3','input-4')),
 session_id uuid not null unique default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('screen','camera')),
 expires_at timestamptz not null,
 primary key(screen_id,slot)
);
alter table public.tv_inputs enable row level security;
revoke all on public.tv_inputs from anon,authenticated;
grant all on public.tv_inputs to service_role;
create index tv_inputs_owner_idx on public.tv_inputs(owner_id);
-- Single-publisher sessions cannot be continued through this schema change.
delete from public.tv_peers;
alter table public.tv_peers add constraint tv_peers_input_fk foreign key(session_id) references public.tv_inputs(session_id) on delete cascade;
alter table public.tv_screens drop column share_session,drop column share_owner,drop column share_kind,drop column share_expires;
-- Convert the previous selected panels into one editable scene without losing source URLs.
do $$ declare r record; s jsonb; panels jsonb; layers jsonb; item jsonb; kind text; i integer; n integer; begin
for r in select id,settings from public.tv_screens loop
 s=r.settings;
 panels=coalesce(s->'panels','["poster","poster-next"]'::jsonb); n=jsonb_array_length(panels); layers='[]'; i=0;
 for kind in select jsonb_array_elements_text(panels) loop
 item=jsonb_build_object('id','source-'||i,'type',case when kind='share' then 'input' else kind end,'x',100.0*i/greatest(n,1),'y',18,'width',100.0/greatest(n,1),'height',75);
 if kind='camera' then item=item||jsonb_build_object('url',coalesce(s->>'camera_url',''),'protocol',coalesce(s->>'camera_protocol','hls'),'audio',false); end if;
 if kind='youtube' then item=item||jsonb_build_object('url',coalesce(s->>'youtube_url',''),'audio',false); end if;
 if kind='share' then item=item||jsonb_build_object('slot','input-1','audio',false); end if;
 if kind='schedule' then item=item||jsonb_build_object('audio',false); end if;
 layers=layers||jsonb_build_array(item); i=i+1;
 end loop;
 if coalesce((s->>'show_times')::boolean,true) then layers=layers||'[{"id":"times","type":"times","x":0,"y":0,"width":100,"height":18}]'::jsonb; end if;
 if coalesce((s->>'show_next')::boolean,true) then layers=layers||'[{"id":"next","type":"next","x":20,"y":93,"width":56,"height":7}]'::jsonb; end if;
 if coalesce((s->>'show_clock')::boolean,true) then layers=layers||'[{"id":"clock","type":"clock","x":76,"y":93,"width":24,"height":7}]'::jsonb; end if;
 s=s-array['mode','event_title','event_message','youtube_url','camera_url','camera_protocol','panels','layout'];
 s=s||jsonb_build_object('version',2,'scene_mode',case when r.settings->>'scene_mode' in ('class','speech') then 'teaching' else 'normal' end,'active_scene_id','scene-1','scenes',jsonb_build_array(jsonb_build_object('id','scene-1','name','Scene 1','overlap',true,'layers',layers)));
 update public.tv_screens set settings=s,updated_at=now() where id=r.id;
end loop; end $$;
-- Staff identity comes from an authenticated Edge request, never from the public TV browser.
create function public.save_tv_scene(actor uuid,hall text,config jsonb,expected timestamptz)
returns timestamptz language plpgsql security invoker set search_path='' as $$
declare p public.profiles; s public.tv_screens; changed timestamptz; begin
 select * into p from public.profiles where id=actor for share;
 if p.id is null or not p.is_active or not(p.is_owner or 'tv'=any(p.permissions)) then raise exception 'TV permission required'; end if;
 select * into s from public.tv_screens where id=hall for update;
 if s.id is null or expected is null or s.updated_at<>expected then raise exception 'This TV changed on another device. Reload before saving.'; end if;
 update public.tv_screens set settings=config,updated_at=clock_timestamp() where id=hall returning updated_at into changed;
 delete from public.tv_inputs t where t.screen_id=hall and (config->>'scene_mode'='normal' or not exists(select 1 from jsonb_array_elements(config->'scenes') sc, jsonb_array_elements(sc->'layers') l where l->>'type'='input' and l->>'slot'=t.slot));
 return changed;
end; $$;
revoke all on function public.save_tv_scene(uuid,text,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.save_tv_scene(uuid,text,jsonb,timestamptz) to service_role;
create function public.start_tv_input(actor uuid,hall text,input_slot text,input_kind text) returns uuid
language plpgsql security invoker set search_path='' as $$
declare p public.profiles; s public.tv_screens; session uuid; begin
 select * into p from public.profiles where id=actor for share;
 if p.id is null or not p.is_active or not(p.is_owner or 'tv'=any(p.permissions)) then raise exception 'TV permission required'; end if;
 select * into s from public.tv_screens where id=hall for update;
 if hall='shoe-area' or s.settings->>'scene_mode'<>'teaching' or (nullif(s.settings->>'class_until','') is not null and (s.settings->>'class_until')::timestamptz<=now()) then raise exception 'Save Class / Teach mode first'; end if;
 if not exists(select 1 from jsonb_array_elements(s.settings->'scenes') sc,jsonb_array_elements(sc->'layers') l where l->>'type'='input' and l->>'slot'=input_slot) then raise exception 'Add this device input to a scene and save first'; end if;
 delete from public.tv_inputs where screen_id=hall and slot=input_slot and expires_at<=now();
 if exists(select 1 from public.tv_inputs where screen_id=hall and slot=input_slot) then raise exception 'This input is in use. Choose another input or stop it first.'; end if;
 insert into public.tv_inputs(screen_id,slot,owner_id,kind,expires_at) values(hall,input_slot,actor,input_kind,now()+interval '90 seconds') returning session_id into session;
 return session;
end; $$;
revoke all on function public.start_tv_input(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.start_tv_input(uuid,text,text,text) to service_role;
