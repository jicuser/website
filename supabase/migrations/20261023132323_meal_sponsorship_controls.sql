begin;

alter table private.ramadan_request_limits enable row level security;

alter table public.ramadan_seasons add column suhoor_target_pence integer not null default 0 check(suhoor_target_pence between 0 and 100000000);
alter table public.ramadan_sponsorships drop constraint ramadan_sponsorships_kind_check;
alter table public.ramadan_sponsorships add constraint ramadan_sponsorships_kind_check check(kind in('iftar','suhoor','daily'));
-- A meal request reserves that meal only. Iftar and Suhoor remain independent.
create unique index ramadan_one_meal_booking on public.ramadan_sponsorships(season_id,kind,day_date) where kind in('iftar','suhoor') and status in('pending','confirmed');

create table public.ramadan_settings (
 id boolean primary key default true check(id),
 website_enabled boolean not null default true,
 iftar_enabled boolean not null default true,
 suhoor_enabled boolean not null default true,
 daily_enabled boolean not null default true,
 home_enabled boolean not null default false,
 home_layout text not null default 'card' check(home_layout in('card','days')),
 tv_enabled boolean not null default true
);
insert into public.ramadan_settings(id,website_enabled,iftar_enabled,suhoor_enabled,daily_enabled)
select true,
 not exists(select 1 from public.page_content where content_key='page-visibility:/ramadan' and content_value='false'),
 not exists(select 1 from public.page_content where content_key='page-visibility:/ramadan/iftar' and content_value='false'),
 not exists(select 1 from public.page_content where content_key='page-visibility:/ramadan/suhoor' and content_value='false'),
 not exists(select 1 from public.page_content where content_key='page-visibility:/ramadan/daily-giving' and content_value='false');
alter table public.ramadan_settings enable row level security;
revoke all on public.ramadan_settings from public,anon,authenticated;
grant select on public.ramadan_settings to authenticated;
create policy ramadan_options_read on public.ramadan_settings for select to authenticated using((select private.has_permission('fundraising')) or (select private.has_permission('finance')) or (select private.has_permission('content')));

create table public.ramadan_day_settings (
 season_id uuid not null references public.ramadan_seasons(id),
 kind text not null check(kind in('iftar','suhoor','daily')),
 day_date date not null,
 enabled boolean not null default true,
 primary key(season_id,kind,day_date)
);
alter table public.ramadan_day_settings enable row level security;
revoke all on public.ramadan_day_settings from public,anon,authenticated;
grant select on public.ramadan_day_settings to authenticated;
create policy ramadan_days_read on public.ramadan_day_settings for select to authenticated using((select private.has_permission('fundraising')) or (select private.has_permission('finance')));
grant all on public.ramadan_settings,public.ramadan_day_settings to service_role;

create function private.site_control_audit(p_table text,p_record text) returns void language sql security definer set search_path='' as $$
 insert into public.audit_log(actor_id,actor_name,table_name,record_id,action)
 select id,display_name,p_table,p_record,'UPDATE' from public.profiles where id=auth.uid()
$$;
revoke all on function private.site_control_audit(text,text) from public,anon,authenticated;

create function public.save_ramadan_options(p_body jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare saved public.ramadan_settings;
begin
 if not (private.has_permission('fundraising') or private.has_permission('finance')) then raise exception 'Ramadan management access required.';end if;
 if jsonb_typeof(p_body) is distinct from 'object' then raise exception 'Choose a sponsorship option.';end if;
 select * into saved from public.ramadan_settings where id for update;
 update public.ramadan_settings set
  website_enabled=coalesce((p_body->>'website_enabled')::boolean,saved.website_enabled),
  iftar_enabled=coalesce((p_body->>'iftar_enabled')::boolean,saved.iftar_enabled),
  suhoor_enabled=coalesce((p_body->>'suhoor_enabled')::boolean,saved.suhoor_enabled),
  daily_enabled=coalesce((p_body->>'daily_enabled')::boolean,saved.daily_enabled),
  home_enabled=coalesce((p_body->>'home_enabled')::boolean,saved.home_enabled),
  home_layout=coalesce(p_body->>'home_layout',saved.home_layout),
  tv_enabled=coalesce((p_body->>'tv_enabled')::boolean,saved.tv_enabled)
 where id returning * into saved;
 insert into public.page_content(content_key,content_value,content_type,updated_by,updated_at)
 select key,value,'text',auth.uid(),now() from (values
 ('page-visibility:/ramadan',saved.website_enabled::text),('page-visibility:/ramadan/iftar',saved.iftar_enabled::text),
 ('page-visibility:/ramadan/suhoor',saved.suhoor_enabled::text),('page-visibility:/ramadan/daily-giving',saved.daily_enabled::text),
 ('ramadan:home-enabled',saved.home_enabled::text)) v(key,value)
 on conflict(content_key) do update set content_value=excluded.content_value,updated_by=excluded.updated_by,updated_at=excluded.updated_at;
 perform private.site_control_audit('ramadan_settings','options');
 return to_jsonb(saved);
end;$$;
revoke all on function public.save_ramadan_options(jsonb) from public,anon,authenticated;
grant execute on function public.save_ramadan_options(jsonb) to authenticated;

create function public.save_site_visibility(p_path text,p_visible boolean,p_page_id uuid default null) returns boolean language plpgsql security definer set search_path='' as $$
declare is_ramadan boolean:=p_path in('/ramadan','/ramadan/iftar','/ramadan/suhoor','/ramadan/daily-giving');
begin
 if p_visible is null or p_path is null or char_length(p_path)>200 or p_path !~ '^/[a-z0-9/_-]+$' or p_path in('/privacy') then raise exception 'Choose a public page.';end if;
 if not(private.has_permission('content') or (p_page_id is null and is_ramadan and (private.has_permission('finance') or private.has_permission('fundraising')))) then raise exception 'Website pages access required.';end if;
 if p_page_id is not null then
  update public.site_pages set published=p_visible,updated_at=now(),updated_by=auth.uid() where id=p_page_id;
  if not found then raise exception 'This page no longer exists.';end if;
  perform private.site_control_audit('site_pages',p_page_id::text);return p_visible;
 end if;
 if is_ramadan then perform 1 from public.ramadan_settings where id for update;end if;
 insert into public.page_content(content_key,content_value,content_type,updated_by,updated_at) values('page-visibility:'||p_path,p_visible::text,'text',auth.uid(),now())
 on conflict(content_key) do update set content_value=excluded.content_value,updated_by=excluded.updated_by,updated_at=excluded.updated_at;
 if is_ramadan then update public.ramadan_settings set
  website_enabled=case when p_path='/ramadan' then p_visible else website_enabled end,
  iftar_enabled=case when p_path='/ramadan/iftar' then p_visible else iftar_enabled end,
  suhoor_enabled=case when p_path='/ramadan/suhoor' then p_visible else suhoor_enabled end,
  daily_enabled=case when p_path='/ramadan/daily-giving' then p_visible else daily_enabled end where id;end if;
 perform private.site_control_audit('page_content','page-visibility:'||p_path);return p_visible;
end;$$;
revoke all on function public.save_site_visibility(text,boolean,uuid) from public,anon,authenticated;
grant execute on function public.save_site_visibility(text,boolean,uuid) to authenticated;

create function public.save_ramadan_days(p_season uuid,p_kind text,p_dates date[],p_enabled boolean) returns integer language plpgsql security definer set search_path='' as $$
declare s public.ramadan_seasons;v_day date;total integer:=0;
begin
 if not(private.has_permission('fundraising') or private.has_permission('finance')) then raise exception 'Ramadan management access required.';end if;
 if p_kind is null or p_kind not in('iftar','suhoor','daily') or p_enabled is null or coalesce(cardinality(p_dates),0) not between 1 and 30 or array_position(p_dates,null) is not null then raise exception 'Choose sponsorship days.';end if;
 select * into s from public.ramadan_seasons where id=p_season for share;
 if not found or exists(select 1 from unnest(p_dates) d where d<s.start_date or d>=s.start_date+s.day_count) then raise exception 'Choose days within this Ramadan.';end if;
 for v_day in select distinct unnest(p_dates) order by 1 loop
  perform pg_advisory_xact_lock(hashtextextended('ramadan:'||s.id::text||':'||p_kind||':'||v_day::text,0));
  insert into public.ramadan_day_settings(season_id,kind,day_date,enabled) values(s.id,p_kind,v_day,p_enabled)
  on conflict(season_id,kind,day_date) do update set enabled=excluded.enabled;
  total:=total+1;
 end loop;
 perform private.calendar_audit('ramadan_day_settings',s.id,'UPDATE');return total;
end;$$;
revoke all on function public.save_ramadan_days(uuid,text,date[],boolean) from public,anon,authenticated;
grant execute on function public.save_ramadan_days(uuid,text,date[],boolean) to authenticated;

create or replace function public.ramadan_calendar_public() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('settings',to_jsonb(o),'season',to_jsonb(s),'days',coalesce((
  select jsonb_agg(jsonb_build_object('day_date',d.day_date,'kind',d.kind,'confirmed',d.confirmed,'pending',d.pending,'amount_pence',d.amount_pence,'received_pence',d.received_pence,'names',d.names) order by d.day_date,d.kind)
  from(select day_date,kind,count(*) filter(where status='confirmed') confirmed,count(*) filter(where status='pending') pending,
   coalesce(sum(amount_pence) filter(where status='confirmed'),0) amount_pence,coalesce(sum(amount_pence) filter(where status='confirmed' and paid),0) received_pence,
   coalesce(jsonb_agg(public_name) filter(where status='confirmed' and public_name<>''),'[]'::jsonb) names
   from public.ramadan_sponsorships where season_id=s.id and status<>'cancelled' group by day_date,kind)d
 ),'[]'::jsonb),'day_settings',coalesce((select jsonb_agg(jsonb_build_object('day_date',day_date,'kind',kind,'enabled',enabled)) from public.ramadan_day_settings where season_id=s.id),'[]'::jsonb))
 from public.ramadan_settings o left join lateral(select * from public.ramadan_seasons where published limit 1)s on true where o.id
$$;

create or replace function public.save_ramadan_season(p_body jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid:=nullif(p_body->>'id','')::uuid; v_start date:=(p_body->>'start_date')::date; v_days integer:=(p_body->>'day_count')::integer; v_published boolean:=coalesce((p_body->>'published')::boolean,false);
begin
  if not (private.has_permission('fundraising') or private.has_permission('finance')) then raise exception 'Ramadan management access required.';end if;
  if v_start is null or v_days is null or v_days not in(29,30) then raise exception 'Choose a start date and 29 or 30 days.';end if;
  perform pg_advisory_xact_lock(hashtextextended('ramadan-settings',0));
  if v_id is not null then
    perform 1 from public.ramadan_seasons where id=v_id for update;
    if not found then raise exception 'This Ramadan sponsorship setup no longer exists.';end if;
  end if;
  if v_id is not null and exists(select 1 from public.ramadan_sponsorships where season_id=v_id and (day_date<v_start or day_date>=v_start+v_days)) then raise exception 'These dates would exclude existing sponsorships. Keep the dates or move those records first.';end if;
  if v_id is not null then delete from public.ramadan_day_settings where season_id=v_id and (day_date<v_start or day_date>=v_start+v_days);end if;
  if v_published then update public.ramadan_seasons set published=false where published and id is distinct from v_id;end if;
  if v_id is null then
    insert into public.ramadan_seasons(title,start_date,day_count,iftar_target_pence,daily_target_pence,suhoor_target_pence,published)
    values(trim(p_body->>'title'),v_start,v_days,coalesce((p_body->>'iftar_target_pence')::integer,0),coalesce((p_body->>'daily_target_pence')::integer,0),coalesce((p_body->>'suhoor_target_pence')::integer,0),v_published) returning id into v_id;
  else
    update public.ramadan_seasons set title=trim(p_body->>'title'),start_date=v_start,day_count=v_days,iftar_target_pence=coalesce((p_body->>'iftar_target_pence')::integer,0),daily_target_pence=coalesce((p_body->>'daily_target_pence')::integer,0),suhoor_target_pence=coalesce((p_body->>'suhoor_target_pence')::integer,suhoor_target_pence),published=v_published,updated_at=now() where id=v_id;
    if not found then raise exception 'This Ramadan sponsorship setup no longer exists.';end if;
  end if;
  perform private.calendar_audit('ramadan_seasons',v_id,'UPDATE');return v_id;
end;$$;

create or replace function public.save_ramadan_sponsorship(p_body jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid:=nullif(p_body->>'id','')::uuid; s public.ramadan_seasons; v_day date:=(p_body->>'day_date')::date; v_reference text;
begin
  if not (private.has_permission('fundraising') or private.has_permission('finance')) then raise exception 'Ramadan management access required.';end if;
  select * into s from public.ramadan_seasons where id=(p_body->>'season_id')::uuid for share;
  if not found or v_day is null or v_day<s.start_date or v_day>=s.start_date+s.day_count then raise exception 'Choose a sponsorship day within this Ramadan.';end if;
  if v_id is null then
    v_reference:='RAM-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
    insert into public.ramadan_sponsorships(season_id,day_date,kind,reference,sponsor_name,phone,email,public_name,amount_pence,status,paid,notes)
    values(s.id,v_day,p_body->>'kind',v_reference,trim(p_body->>'sponsor_name'),trim(coalesce(p_body->>'phone','')),trim(coalesce(p_body->>'email','')),trim(coalesce(p_body->>'public_name','')),coalesce((p_body->>'amount_pence')::integer,0),coalesce(p_body->>'status','pending'),coalesce((p_body->>'paid')::boolean,false),trim(coalesce(p_body->>'notes',''))) returning id into v_id;
  else
    update public.ramadan_sponsorships set day_date=v_day,kind=p_body->>'kind',sponsor_name=trim(p_body->>'sponsor_name'),phone=trim(coalesce(p_body->>'phone','')),email=trim(coalesce(p_body->>'email','')),public_name=trim(coalesce(p_body->>'public_name','')),amount_pence=coalesce((p_body->>'amount_pence')::integer,0),status=coalesce(p_body->>'status','pending'),paid=coalesce((p_body->>'paid')::boolean,false),notes=trim(coalesce(p_body->>'notes','')),updated_at=now() where id=v_id and season_id=s.id;
    if not found then raise exception 'This sponsorship no longer exists.';end if;
  end if;
  perform private.calendar_audit('ramadan_sponsorships',v_id,'UPDATE');return v_id;
exception when unique_violation then raise exception 'That meal day already has a booking.';
end;$$;

create or replace function public.submit_ramadan_request(p_body jsonb,p_source_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.ramadan_seasons; options public.ramadan_settings; key uuid:=(p_body->>'request_key')::uuid; day date; dates date[]; ref text; n integer; v_kind text:=p_body->>'kind'; amount integer:=coalesce((p_body->>'amount_pence')::integer,0);
begin
  if p_source_key is null or p_source_key !~ '^[a-f0-9]{64}$' or key is null then raise exception 'invalid_request';end if;
  if v_kind is null or v_kind not in('iftar','suhoor','daily') or coalesce(char_length(trim(p_body->>'sponsor_name')),0) not between 2 and 120 or char_length(coalesce(p_body->>'phone',''))>80 or char_length(coalesce(p_body->>'email',''))>254 or (trim(coalesce(p_body->>'phone',''))='' and trim(coalesce(p_body->>'email',''))='') or (coalesce(p_body->>'email','')<>'' and p_body->>'email' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') or amount not between 0 and 100000000 or (v_kind='daily' and amount=0) or coalesce((p_body->>'consent')::boolean,false)=false then raise exception 'invalid_request';end if;
  if jsonb_typeof(p_body->'dates') is distinct from 'array' or jsonb_array_length(p_body->'dates') not between 1 and 30 then raise exception 'invalid_request';end if;
  select array_agg(distinct value::date) into dates from jsonb_array_elements_text(p_body->'dates');
  select * into s from public.ramadan_seasons where id=(p_body->>'season_id')::uuid and published for share;
  if not found or exists(select 1 from unnest(dates) d where d is null or d<s.start_date or d>=s.start_date+s.day_count) then raise exception 'Sponsorship dates changed. Refresh and choose your days again.';end if;
  select reference into ref from public.ramadan_sponsorships where request_key=key limit 1;
  if ref is not null then return jsonb_build_object('reference',ref);end if;
  select * into options from public.ramadan_settings where id for share;
  if not options.website_enabled or not coalesce((to_jsonb(options)->>(v_kind||'_enabled'))::boolean,false) or exists(select 1 from public.page_content where content_key in('page-visibility:/ramadan','page-visibility:/ramadan/'||case when v_kind='daily' then 'daily-giving' else v_kind end) and content_value='false') then raise exception 'These sponsorship bookings are closed.';end if;
  for day in select unnest(dates) order by 1 loop perform pg_advisory_xact_lock(hashtextextended('ramadan:'||s.id::text||':'||v_kind||':'||day::text,0));end loop;
  if exists(select 1 from public.ramadan_day_settings d where d.season_id=s.id and d.kind=v_kind and d.day_date=any(dates) and not d.enabled) then raise exception 'One of those sponsorship days is closed. Choose another day.';end if;
  delete from private.ramadan_request_limits where window_at<now()-interval '2 days';
  insert into private.ramadan_request_limits as r(source_key) values(p_source_key) on conflict(source_key) do update set count=case when r.window_at<now()-interval '1 hour' then 1 else r.count+1 end,window_at=case when r.window_at<now()-interval '1 hour' then now() else r.window_at end returning count into n;
  if n>10 then raise exception 'request_rate_limit';end if;
  if v_kind in('iftar','suhoor') and exists(select 1 from public.ramadan_sponsorships r where r.season_id=s.id and r.day_date=any(dates) and r.status in('pending','confirmed') and r.kind=v_kind) then raise exception 'One of those meal days is already reserved. Choose another day.';end if;
  ref:='RAM-'||upper(substr(replace(key::text,'-',''),1,10));
  foreach day in array dates loop
    insert into public.ramadan_sponsorships(season_id,day_date,kind,request_key,reference,sponsor_name,phone,email,public_name,amount_pence)
    values(s.id,day,v_kind,key,ref,trim(p_body->>'sponsor_name'),trim(coalesce(p_body->>'phone','')),lower(trim(coalesce(p_body->>'email',''))),case when coalesce((p_body->>'show_name')::boolean,false) then trim(p_body->>'sponsor_name') else '' end,amount)
    on conflict(request_key,kind,day_date) do nothing;
  end loop;
  return jsonb_build_object('reference',ref);
exception when unique_violation then raise exception 'One of those meal days is already reserved. Choose another day.';
end;$$;
commit;
