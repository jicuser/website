begin;

-- Optional offers preserve existing sponsorships and unconfigured legacy days.
alter table public.ramadan_day_settings
 add column menu_title text not null default '',
 add column dishes jsonb not null default '[]'::jsonb,
 add column price_pence integer check(price_pence between 1 and 100000000),
 add column people_fed integer check(people_fed between 1 and 100000),
 add column menu_notes text not null default '',
 add column offer_version integer not null default 0 check(offer_version>=0),
 add constraint ramadan_complete_open_meal check(kind='daily' or offer_version=0 or not enabled or (jsonb_array_length(dishes)>0 and price_pence is not null and people_fed is not null));
alter table public.ramadan_sponsorships add column offer_snapshot jsonb;

create function public.save_ramadan_meal(p_body jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.ramadan_seasons; saved public.ramadan_day_settings; v_day date; v_kind text; v_dishes jsonb; v_price integer; v_people integer; v_enabled boolean; v_version integer;
begin
 if not(private.has_permission('fundraising') or private.has_permission('finance')) then raise exception 'Ramadan management access required.';end if;
 if jsonb_typeof(p_body) is distinct from 'object' or coalesce(p_body->>'kind','') not in('iftar','suhoor') then raise exception 'Choose an Iftar or Suhoor meal.';end if;
 v_day:=(p_body->>'day_date')::date; v_kind:=p_body->>'kind';
 select * into s from public.ramadan_seasons where id=(p_body->>'season_id')::uuid for share;
 if not found or v_day is null or v_day<s.start_date or v_day>=s.start_date+s.day_count then raise exception 'Choose a day within this Ramadan.';end if;
 perform pg_advisory_xact_lock(hashtextextended('ramadan:'||s.id::text||':'||v_kind||':'||v_day::text,0));
 select * into saved from public.ramadan_day_settings where season_id=s.id and kind=v_kind and day_date=v_day for update;
 v_version:=coalesce(saved.offer_version,0);
 if (p_body->>'expected_version')::integer is distinct from v_version then raise exception 'This meal changed. Please refresh before saving.';end if;
 v_dishes:=coalesce(p_body->'dishes','[]'::jsonb); v_price:=(p_body->>'price_pence')::integer; v_people:=(p_body->>'people_fed')::integer; v_enabled:=coalesce((p_body->>'enabled')::boolean,false);
 if jsonb_typeof(v_dishes) is distinct from 'array' then raise exception 'Add the meal dishes.';end if;
 if jsonb_array_length(v_dishes)>30 or exists(select 1 from jsonb_array_elements(v_dishes) d where jsonb_typeof(d) is distinct from 'object' or coalesce(char_length(trim(d->>'name')),0) not between 1 and 120 or (d->>'cost_pence' is not null and (d->>'cost_pence' !~ '^[0-9]{1,9}$' or (d->>'cost_pence')::bigint>100000000))) then raise exception 'Check the dish names and costs.';end if;
 if (v_price is not null and v_price not between 1 and 100000000) or (v_people is not null and v_people not between 1 and 100000) then raise exception 'Enter a positive meal price and number of people.';end if;
 if v_enabled and (jsonb_array_length(v_dishes)=0 or v_price is null or v_people is null) then raise exception 'Add dishes, a total price and people fed before opening this meal.';end if;
 if char_length(coalesce(p_body->>'menu_title',''))>120 or char_length(coalesce(p_body->>'menu_notes',''))>1000 then raise exception 'Keep the meal title and notes short.';end if;
 select coalesce(jsonb_agg(jsonb_build_object('name',trim(d->>'name'),'cost_pence',(d->>'cost_pence')::integer)),'[]'::jsonb) into v_dishes from jsonb_array_elements(v_dishes) d;
 insert into public.ramadan_day_settings(season_id,kind,day_date,enabled,menu_title,dishes,price_pence,people_fed,menu_notes,offer_version)
 values(s.id,v_kind,v_day,v_enabled,trim(coalesce(p_body->>'menu_title','')),v_dishes,v_price,v_people,trim(coalesce(p_body->>'menu_notes','')),v_version+1)
 on conflict(season_id,kind,day_date) do update set enabled=excluded.enabled,menu_title=excluded.menu_title,dishes=excluded.dishes,price_pence=excluded.price_pence,people_fed=excluded.people_fed,menu_notes=excluded.menu_notes,offer_version=excluded.offer_version returning * into saved;
 perform private.calendar_audit('ramadan_day_settings',s.id,'UPDATE');return to_jsonb(saved);
end;$$;
revoke all on function public.save_ramadan_meal(jsonb) from public,anon,authenticated;
grant execute on function public.save_ramadan_meal(jsonb) to authenticated;

-- Capture the offer for staff-entered and public bookings without rewriting history.
create function private.capture_ramadan_offer() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.kind in('iftar','suhoor') then
  perform pg_advisory_xact_lock(hashtextextended('ramadan:'||new.season_id::text||':'||new.kind||':'||new.day_date::text,0));
  select jsonb_build_object('menu_title',menu_title,'dishes',dishes,'price_pence',price_pence,'people_fed',people_fed,'menu_notes',menu_notes,'offer_version',offer_version)
   into new.offer_snapshot from public.ramadan_day_settings where season_id=new.season_id and kind=new.kind and day_date=new.day_date and offer_version>0;
 end if;
 return new;
end;$$;
revoke all on function private.capture_ramadan_offer() from public,anon,authenticated;
create trigger ramadan_offer_at_booking before insert on public.ramadan_sponsorships for each row execute function private.capture_ramadan_offer();

create or replace function public.save_ramadan_days(p_season uuid,p_kind text,p_dates date[],p_enabled boolean) returns integer language plpgsql security definer set search_path='' as $$
declare s public.ramadan_seasons;v_day date;total integer:=0;
begin
 if not(private.has_permission('fundraising') or private.has_permission('finance')) then raise exception 'Ramadan management access required.';end if;
 if p_kind is null or p_kind not in('iftar','suhoor','daily') or p_enabled is null or coalesce(cardinality(p_dates),0) not between 1 and 30 or array_position(p_dates,null) is not null then raise exception 'Choose sponsorship days.';end if;
 select * into s from public.ramadan_seasons where id=p_season for share;
 if not found or exists(select 1 from unnest(p_dates) d where d<s.start_date or d>=s.start_date+s.day_count) then raise exception 'Choose days within this Ramadan.';end if;
 for v_day in select distinct unnest(p_dates) order by 1 loop
  perform pg_advisory_xact_lock(hashtextextended('ramadan:'||s.id::text||':'||p_kind||':'||v_day::text,0));
  if p_enabled and exists(select 1 from public.ramadan_day_settings where season_id=s.id and kind=p_kind and day_date=v_day and offer_version>0 and (jsonb_array_length(dishes)=0 or price_pence is null or people_fed is null)) then raise exception 'Complete the meal menu before opening this day.';end if;
  insert into public.ramadan_day_settings(season_id,kind,day_date,enabled) values(s.id,p_kind,v_day,p_enabled)
  on conflict(season_id,kind,day_date) do update set enabled=excluded.enabled,offer_version=case when ramadan_day_settings.offer_version>0 and ramadan_day_settings.enabled is distinct from excluded.enabled then ramadan_day_settings.offer_version+1 else ramadan_day_settings.offer_version end;
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
 ),'[]'::jsonb),'day_settings',coalesce((select jsonb_agg(jsonb_build_object('day_date',day_date,'kind',kind,'enabled',enabled,'menu_title',menu_title,'dishes',dishes,'price_pence',price_pence,'people_fed',people_fed,'menu_notes',menu_notes,'offer_version',offer_version)) from public.ramadan_day_settings where season_id=s.id),'[]'::jsonb))
 from public.ramadan_settings o left join lateral(select * from public.ramadan_seasons where published limit 1)s on true where o.id
$$;

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
  if v_kind in('iftar','suhoor') and exists(select 1 from public.ramadan_day_settings d where d.season_id=s.id and d.kind=v_kind and d.day_date=any(dates) and d.offer_version>0 and (d.price_pence is distinct from amount or coalesce(p_body->'offer_versions'->>d.day_date::text,'')<>d.offer_version::text or d.people_fed is null or jsonb_array_length(d.dishes)=0)) then raise exception 'Meal details changed. Review the menu and price, then try again.';end if;
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
