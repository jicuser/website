begin;

-- Availability remains public. Names, contact details and booking notes have a
-- separate staff-only relation, so the existing public hall API stays safe.
create table public.hall_booking_details (
  booking_id uuid primary key references public.hall_bookings(id) on delete cascade,
  event_title text not null default '' check(char_length(event_title)<=160),
  contact_name text not null default '' check(char_length(contact_name)<=120),
  contact_phone text not null default '' check(char_length(contact_phone)<=80),
  contact_email text not null default '' check(char_length(contact_email)<=254),
  notes text not null default '' check(char_length(notes)<=3000)
);
alter table public.hall_booking_details enable row level security;
revoke all on public.hall_booking_details from public,anon,authenticated;
grant select on public.hall_booking_details to authenticated;
create policy hall_details_staff_read on public.hall_booking_details for select to authenticated using((select private.has_permission('events')));

create unique index hall_one_whole_day on public.hall_bookings(booking_date) where start_time is null and end_time is null;
create table public.hall_calendar_settings (
  id boolean primary key default true check(id),
  available text not null default '#21835b' check(available ~ '^#[0-9a-fA-F]{6}$'),
  pending text not null default '#b77900' check(pending ~ '^#[0-9a-fA-F]{6}$'),
  booked text not null default '#c43b48' check(booked ~ '^#[0-9a-fA-F]{6}$'),
  closed text not null default '#68758a' check(closed ~ '^#[0-9a-fA-F]{6}$')
);
insert into public.hall_calendar_settings(id) values(true);
alter table public.hall_calendar_settings enable row level security;
revoke all on public.hall_calendar_settings from public,anon,authenticated;
grant select on public.hall_calendar_settings to anon,authenticated;
grant update on public.hall_calendar_settings to authenticated;
create policy hall_colours_read on public.hall_calendar_settings for select to anon,authenticated using(true);
create policy hall_colours_update on public.hall_calendar_settings for update to authenticated using((select private.has_permission('events'))) with check((select private.has_permission('events')));

create function private.calendar_audit(p_table text,p_id uuid,p_action text) returns void language sql security definer set search_path='' as $$
  insert into public.audit_log(actor_id,actor_name,table_name,record_id,action)
  select id,display_name,p_table,p_id::text,p_action from public.profiles where id=auth.uid()
$$;
revoke all on function private.calendar_audit(text,uuid,text) from public,anon,authenticated;

create function public.save_hall_calendar(p_dates date[],p_status text,p_start_time time default null,p_end_time time default null,p_details jsonb default null,p_id uuid default null) returns integer
language plpgsql security definer set search_path='' as $$
declare day date; saved uuid; count_saved integer:=0;
begin
  if not private.has_permission('events') then raise exception 'Hall bookings access required.';end if;
  if coalesce(cardinality(p_dates),0) not between 1 and 366 or array_position(p_dates,null) is not null then raise exception 'Select at least one day.';end if;
  if p_status is null or p_status not in ('available','pending','booked','closed') then raise exception 'Choose an availability status.';end if;
  if (p_start_time is null)<>(p_end_time is null) or p_end_time<=p_start_time then raise exception 'Choose a start and finish time, or leave both empty for the whole day.';end if;
  if p_id is not null and cardinality(p_dates)<>1 then raise exception 'Edit one booking at a time.';end if;
  if p_details is not null and (jsonb_typeof(p_details)<>'object' or char_length(coalesce(p_details->>'event_title',''))>160 or char_length(coalesce(p_details->>'contact_name',''))>120 or char_length(coalesce(p_details->>'contact_phone',''))>80 or char_length(coalesce(p_details->>'contact_email',''))>254 or char_length(coalesce(p_details->>'notes',''))>3000) then raise exception 'Keep booking details within the field limits.';end if;
  for day in select distinct unnest(p_dates) order by 1 loop
    perform pg_advisory_xact_lock(hashtextextended('hall:'||day::text,0));
    saved:=p_id;
    if saved is null and p_start_time is null then select id into saved from public.hall_bookings where booking_date=day and start_time is null and end_time is null;end if;
    if p_status='booked' and exists(select 1 from public.hall_bookings h where h.booking_date=day and h.status='booked' and h.id is distinct from saved and coalesce(h.start_time,'00:00'::time)<coalesce(p_end_time,'24:00'::time) and coalesce(h.end_time,'24:00'::time)>coalesce(p_start_time,'00:00'::time)) then raise exception 'There is already a booking during this time on %. Edit that booking or choose another time.',day;end if;
    if saved is null then
      insert into public.hall_bookings(booking_date,start_time,end_time,status) values(day,p_start_time,p_end_time,p_status) returning id into saved;
    else
      update public.hall_bookings set booking_date=day,start_time=p_start_time,end_time=p_end_time,status=p_status,updated_at=now() where id=saved;
      if not found then raise exception 'This booking no longer exists. Refresh the calendar.';end if;
    end if;
    if p_details is not null then
      insert into public.hall_booking_details(booking_id,event_title,contact_name,contact_phone,contact_email,notes)
      values(saved,trim(coalesce(p_details->>'event_title','')),trim(coalesce(p_details->>'contact_name','')),trim(coalesce(p_details->>'contact_phone','')),trim(coalesce(p_details->>'contact_email','')),trim(coalesce(p_details->>'notes','')))
      on conflict(booking_id) do update set event_title=excluded.event_title,contact_name=excluded.contact_name,contact_phone=excluded.contact_phone,contact_email=excluded.contact_email,notes=excluded.notes;
    end if;
    perform private.calendar_audit('hall_bookings',saved,'UPDATE');count_saved:=count_saved+1;
  end loop;
  return count_saved;
end;$$;
revoke all on function public.save_hall_calendar(date[],text,time,time,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.save_hall_calendar(date[],text,time,time,jsonb,uuid) to authenticated;

create table public.ramadan_seasons (
  id uuid primary key default gen_random_uuid(),
  title text not null check(char_length(trim(title)) between 1 and 120),
  start_date date not null,
  day_count integer not null default 30 check(day_count in(29,30)),
  iftar_target_pence integer not null default 0 check(iftar_target_pence between 0 and 100000000),
  daily_target_pence integer not null default 0 check(daily_target_pence between 0 and 100000000),
  published boolean not null default false,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create unique index ramadan_one_published on public.ramadan_seasons(published) where published;
alter table public.ramadan_seasons enable row level security;
revoke all on public.ramadan_seasons from public,anon,authenticated;
grant select on public.ramadan_seasons to authenticated;
create policy ramadan_season_read on public.ramadan_seasons for select to authenticated using((select private.has_permission('fundraising')) or (select private.has_permission('finance')));

create table public.ramadan_sponsorships (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.ramadan_seasons(id),
  day_date date not null,kind text not null check(kind in('iftar','daily')),
  request_key uuid not null default gen_random_uuid(),
  reference text not null,
  sponsor_name text not null check(char_length(trim(sponsor_name)) between 2 and 120),
  phone text not null default '' check(char_length(phone)<=80),
  email text not null default '' check(char_length(email)<=254),
  public_name text not null default '' check(char_length(public_name)<=120),
  amount_pence integer not null default 0 check(amount_pence between 0 and 100000000),
  status text not null default 'pending' check(status in('pending','confirmed','cancelled')),
  paid boolean not null default false,
  notes text not null default '' check(char_length(notes)<=3000),
  created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  unique(request_key,kind,day_date)
);
create unique index ramadan_one_iftar_sponsor on public.ramadan_sponsorships(season_id,day_date) where kind='iftar' and status='confirmed';
create index ramadan_sponsorship_calendar on public.ramadan_sponsorships(season_id,kind,day_date);
alter table public.ramadan_sponsorships enable row level security;
revoke all on public.ramadan_sponsorships from public,anon,authenticated;
grant select on public.ramadan_sponsorships to authenticated;
create policy ramadan_staff_read on public.ramadan_sponsorships for select to authenticated using((select private.has_permission('fundraising')) or (select private.has_permission('finance')));
grant all on public.hall_booking_details,public.hall_calendar_settings,public.ramadan_seasons,public.ramadan_sponsorships to service_role;

create function public.save_ramadan_season(p_body jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid:=nullif(p_body->>'id','')::uuid; v_start date:=(p_body->>'start_date')::date; v_days integer:=(p_body->>'day_count')::integer; v_published boolean:=coalesce((p_body->>'published')::boolean,false);
begin
  if not (private.has_permission('fundraising') or private.has_permission('finance')) then raise exception 'Ramadan management access required.';end if;
  if v_start is null or v_days is null or v_days not in(29,30) then raise exception 'Choose a start date and 29 or 30 days.';end if;
  perform pg_advisory_xact_lock(hashtextextended('ramadan-settings',0));
  if v_id is not null then
    perform 1 from public.ramadan_seasons where id=v_id for update;
    if not found then raise exception 'This Ramadan calendar no longer exists.';end if;
  end if;
  if v_id is not null and exists(select 1 from public.ramadan_sponsorships where season_id=v_id and (day_date<v_start or day_date>=v_start+v_days)) then raise exception 'These dates would exclude existing sponsorships. Keep the dates or move those records first.';end if;
  if v_published then update public.ramadan_seasons set published=false where published and id is distinct from v_id;end if;
  if v_id is null then
    insert into public.ramadan_seasons(title,start_date,day_count,iftar_target_pence,daily_target_pence,published)
    values(trim(p_body->>'title'),v_start,v_days,coalesce((p_body->>'iftar_target_pence')::integer,0),coalesce((p_body->>'daily_target_pence')::integer,0),v_published) returning id into v_id;
  else
    update public.ramadan_seasons set title=trim(p_body->>'title'),start_date=v_start,day_count=v_days,iftar_target_pence=coalesce((p_body->>'iftar_target_pence')::integer,0),daily_target_pence=coalesce((p_body->>'daily_target_pence')::integer,0),published=v_published,updated_at=now() where id=v_id;
    if not found then raise exception 'This Ramadan calendar no longer exists.';end if;
  end if;
  perform private.calendar_audit('ramadan_seasons',v_id,'UPDATE');return v_id;
end;$$;
revoke all on function public.save_ramadan_season(jsonb) from public,anon,authenticated;
grant execute on function public.save_ramadan_season(jsonb) to authenticated;

create function public.save_ramadan_sponsorship(p_body jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid:=nullif(p_body->>'id','')::uuid; s public.ramadan_seasons; v_day date:=(p_body->>'day_date')::date; v_reference text;
begin
  if not (private.has_permission('fundraising') or private.has_permission('finance')) then raise exception 'Ramadan management access required.';end if;
  select * into s from public.ramadan_seasons where id=(p_body->>'season_id')::uuid for share;
  if not found or v_day is null or v_day<s.start_date or v_day>=s.start_date+s.day_count then raise exception 'Choose a day within this Ramadan calendar.';end if;
  if v_id is null then
    v_reference:='RAM-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
    insert into public.ramadan_sponsorships(season_id,day_date,kind,reference,sponsor_name,phone,email,public_name,amount_pence,status,paid,notes)
    values(s.id,v_day,p_body->>'kind',v_reference,trim(p_body->>'sponsor_name'),trim(coalesce(p_body->>'phone','')),trim(coalesce(p_body->>'email','')),trim(coalesce(p_body->>'public_name','')),coalesce((p_body->>'amount_pence')::integer,0),coalesce(p_body->>'status','pending'),coalesce((p_body->>'paid')::boolean,false),trim(coalesce(p_body->>'notes',''))) returning id into v_id;
  else
    update public.ramadan_sponsorships set day_date=v_day,kind=p_body->>'kind',sponsor_name=trim(p_body->>'sponsor_name'),phone=trim(coalesce(p_body->>'phone','')),email=trim(coalesce(p_body->>'email','')),public_name=trim(coalesce(p_body->>'public_name','')),amount_pence=coalesce((p_body->>'amount_pence')::integer,0),status=coalesce(p_body->>'status','pending'),paid=coalesce((p_body->>'paid')::boolean,false),notes=trim(coalesce(p_body->>'notes','')),updated_at=now() where id=v_id and season_id=s.id;
    if not found then raise exception 'This sponsorship no longer exists.';end if;
  end if;
  perform private.calendar_audit('ramadan_sponsorships',v_id,'UPDATE');return v_id;
exception when unique_violation then raise exception 'That Iftar day already has a confirmed sponsor.';
end;$$;
revoke all on function public.save_ramadan_sponsorship(jsonb) from public,anon,authenticated;
grant execute on function public.save_ramadan_sponsorship(jsonb) to authenticated;

-- A public projection deliberately excludes all contact fields and private notes.
create function public.ramadan_calendar_public() returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('season',to_jsonb(s),'days',coalesce((
    select jsonb_agg(jsonb_build_object('day_date',d.day_date,'kind',d.kind,'confirmed',d.confirmed,'pending',d.pending,'amount_pence',d.amount_pence,'received_pence',d.received_pence,'names',d.names) order by d.day_date,d.kind)
    from (select day_date,kind,count(*) filter(where status='confirmed') as confirmed,count(*) filter(where status='pending') as pending,
      coalesce(sum(amount_pence) filter(where status='confirmed'),0) as amount_pence,coalesce(sum(amount_pence) filter(where status='confirmed' and paid),0) as received_pence,
      coalesce(jsonb_agg(public_name) filter(where status='confirmed' and public_name<>''),'[]'::jsonb) as names
      from public.ramadan_sponsorships where season_id=s.id and status<>'cancelled' group by day_date,kind) d
  ),'[]'::jsonb)) from public.ramadan_seasons s where published limit 1
$$;
revoke all on function public.ramadan_calendar_public() from public,anon,authenticated;
grant execute on function public.ramadan_calendar_public() to anon,authenticated;

create table private.ramadan_request_limits(source_key text primary key,window_at timestamptz not null default now(),count integer not null default 1);
revoke all on private.ramadan_request_limits from public,anon,authenticated;
create function public.submit_ramadan_request(p_body jsonb,p_source_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.ramadan_seasons; key uuid:=(p_body->>'request_key')::uuid; day date; dates date[]; ref text; n integer; v_kind text:=p_body->>'kind'; amount integer:=coalesce((p_body->>'amount_pence')::integer,0);
begin
  if p_source_key is null or p_source_key !~ '^[a-f0-9]{64}$' or key is null then raise exception 'invalid_request';end if;
  if v_kind is null or v_kind not in('iftar','daily') or coalesce(char_length(trim(p_body->>'sponsor_name')),0) not between 2 and 120 or char_length(coalesce(p_body->>'phone',''))>80 or char_length(coalesce(p_body->>'email',''))>254 or (trim(coalesce(p_body->>'phone',''))='' and trim(coalesce(p_body->>'email',''))='') or (coalesce(p_body->>'email','')<>'' and p_body->>'email' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') or amount not between 0 and 100000000 or (v_kind='daily' and amount=0) or coalesce((p_body->>'consent')::boolean,false)=false then raise exception 'invalid_request';end if;
  if jsonb_typeof(p_body->'dates') is distinct from 'array' or jsonb_array_length(p_body->'dates') not between 1 and 30 then raise exception 'invalid_request';end if;
  select array_agg(distinct value::date) into dates from jsonb_array_elements_text(p_body->'dates');
  select * into s from public.ramadan_seasons where id=(p_body->>'season_id')::uuid and published for share;
  if not found or exists(select 1 from unnest(dates) d where d is null or d<s.start_date or d>=s.start_date+s.day_count) then raise exception 'Calendar dates changed. Refresh and choose your days again.';end if;
  select reference into ref from public.ramadan_sponsorships where request_key=key limit 1;
  if ref is not null then return jsonb_build_object('reference',ref);end if;
  delete from private.ramadan_request_limits where window_at<now()-interval '2 days';
  insert into private.ramadan_request_limits as r(source_key) values(p_source_key) on conflict(source_key) do update set count=case when r.window_at<now()-interval '1 hour' then 1 else r.count+1 end,window_at=case when r.window_at<now()-interval '1 hour' then now() else r.window_at end returning count into n;
  if n>10 then raise exception 'request_rate_limit';end if;
  if v_kind='iftar' and exists(select 1 from public.ramadan_sponsorships where season_id=s.id and day_date=any(dates) and status='confirmed' and ramadan_sponsorships.kind='iftar') then raise exception 'One of those Iftar days is already sponsored. Choose another day.';end if;
  ref:='RAM-'||upper(substr(replace(key::text,'-',''),1,10));
  foreach day in array dates loop
    insert into public.ramadan_sponsorships(season_id,day_date,kind,request_key,reference,sponsor_name,phone,email,public_name,amount_pence)
    values(s.id,day,v_kind,key,ref,trim(p_body->>'sponsor_name'),trim(coalesce(p_body->>'phone','')),lower(trim(coalesce(p_body->>'email',''))),case when coalesce((p_body->>'show_name')::boolean,false) then trim(p_body->>'sponsor_name') else '' end,amount)
    on conflict(request_key,kind,day_date) do nothing;
  end loop;
  return jsonb_build_object('reference',ref);
end;$$;
revoke all on function public.submit_ramadan_request(jsonb,text) from public,anon,authenticated;
grant execute on function public.submit_ramadan_request(jsonb,text) to service_role;
commit;
