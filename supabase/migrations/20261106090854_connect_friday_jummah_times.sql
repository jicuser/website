begin;

-- Weekly settings and dated exceptions use the same resolution rule everywhere.
create function private.jummah_clock(value text) returns time
language sql immutable security invoker set search_path='' as $$
  select case when value ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9](:00)?$' then value::time else null end;
$$;
create function private.jummah_settings(value text) returns jsonb
language plpgsql immutable security invoker set search_path='' as $$
declare parsed jsonb;
begin
  begin parsed := value::jsonb; exception when invalid_text_representation then parsed := '{}'::jsonb; end;
  return (select jsonb_object_agg(k, to_char(private.jummah_clock(parsed->>k),'HH24:MI'))
    from unnest(array['jummah_1_start','jummah_1_jamah','jummah_2_begins','jummah_2_jamah']) k);
end; $$;
revoke all on function private.jummah_clock(text), private.jummah_settings(text) from public,anon;
grant execute on function private.jummah_clock(text), private.jummah_settings(text) to authenticated,service_role;

-- Timetable staff may edit this one content record; other page content stays protected.
create policy jummah_settings_insert on public.page_content for insert to authenticated
  with check(content_key='jummah_settings' and (select private.has_permission('prayer_times')));
create policy jummah_settings_update on public.page_content for update to authenticated
  using(content_key='jummah_settings' and (select private.has_permission('prayer_times')))
  with check(content_key='jummah_settings' and (select private.has_permission('prayer_times')));

create function public.save_jummah_settings(p_settings jsonb,p_expected jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare old_value jsonb; new_value jsonb; day_start date := (now() at time zone 'Europe/London')::date;
begin
  if not private.has_permission('prayer_times') then raise exception 'Prayer timetable permission required'; end if;
  if jsonb_typeof(p_settings) is distinct from 'object' or jsonb_typeof(p_expected) is distinct from 'object' then raise exception 'Jummah settings required'; end if;
  new_value := private.jummah_settings(p_settings::text);
  if new_value->>'jummah_1_jamah' is null or new_value->>'jummah_2_jamah' is null or
    (new_value->>'jummah_1_jamah') >= (new_value->>'jummah_2_jamah') then
    raise exception 'Enter both Jamaat times, with the second after the first';
  end if;
  if exists(select 1 from jsonb_each_text(p_settings) x where x.value is not null and x.value<>'' and private.jummah_clock(x.value) is null) then
    raise exception 'Use valid 24-hour times';
  end if;
  if (new_value->>'jummah_1_start') > (new_value->>'jummah_1_jamah') or
    (new_value->>'jummah_2_begins') > (new_value->>'jummah_2_jamah') then raise exception 'Khutbah must not follow its Jamaat'; end if;
  perform pg_advisory_xact_lock(60061106);
  select private.jummah_settings(content_value) into old_value from public.page_content where content_key='jummah_settings' for update;
  old_value := coalesce(old_value,private.jummah_settings('{}'));
  if old_value is distinct from private.jummah_settings(p_expected::text) then raise exception 'Jummah settings changed in another editor. Reload before saving'; end if;

  -- Identical imported copies follow the new weekly setting. Different dated
  -- exceptions and historical rows remain explicit, preserving the published record.
  update public.prayer_times p set jummah_1_start=null,jummah_1_jamah=null,jummah_2_begins=null,jummah_2_jamah=null
  where p.d_date>=day_start and extract(isodow from p.d_date)=5
    and (p.jummah_1_start is not null or p.jummah_1_jamah is not null or p.jummah_2_begins is not null or p.jummah_2_jamah is not null)
    and (p.jummah_1_start is null or p.jummah_1_start=private.jummah_clock(old_value->>'jummah_1_start'))
    and (p.jummah_1_jamah is null or p.jummah_1_jamah=private.jummah_clock(old_value->>'jummah_1_jamah'))
    and (p.jummah_2_begins is null or p.jummah_2_begins=private.jummah_clock(old_value->>'jummah_2_begins'))
    and (p.jummah_2_jamah is null or p.jummah_2_jamah=private.jummah_clock(old_value->>'jummah_2_jamah'));
  insert into public.page_content(content_key,content_value,content_type,page)
    values('jummah_settings',new_value::text,'json','prayer-times')
    on conflict(content_key) do update set content_value=excluded.content_value,content_type=excluded.content_type,page=excluded.page;
  return new_value;
end; $$;
revoke all on function public.save_jummah_settings(jsonb,jsonb) from public,anon;
grant execute on function public.save_jummah_settings(jsonb,jsonb) to authenticated;

-- Read-only event resolution is separate from delivery claims, so it can be
-- checked without enqueueing or sending a notification.
create function private.salah_reminder_events(p_date date)
returns table(prayer text,kind text,event_at timestamptz,preference text)
language sql stable security invoker set search_path='' as $$
  with settings as (
    select private.jummah_settings((select content_value from public.page_content where content_key='jummah_settings')) j
  )
  select t.prayer,t.kind,(p.d_date+t.at_time) at time zone 'Europe/London',
    case when t.prayer in ('jummah_1','jummah_2') then 'dhuhr' else t.prayer end
  from public.prayer_times p cross join settings s
  cross join lateral(values
    ('fajr','start',p.fajr_begins),('fajr','jamaah',p.fajr_jamah),
    ('dhuhr','start',p.zuhr_begins),('dhuhr','jamaah',case when extract(isodow from p.d_date)<>5 then p.zuhr_jamah end),
    ('jummah_1','jamaah',case when extract(isodow from p.d_date)=5 then coalesce(p.jummah_1_jamah,private.jummah_clock(s.j->>'jummah_1_jamah')) end),
    ('jummah_2','jamaah',case when extract(isodow from p.d_date)=5 then coalesce(p.jummah_2_jamah,private.jummah_clock(s.j->>'jummah_2_jamah')) end),
    ('asr','start',p.asr_begins),('asr','jamaah',p.asr_jamah),
    ('maghrib','start',p.maghrib_begins),('maghrib','jamaah',p.maghrib_jamah),
    ('isha','start',p.isha_begins),('isha','jamaah',p.isha_jamah)
  )t(prayer,kind,at_time)
  where p.d_date=p_date and t.at_time is not null
    and (t.prayer not in ('jummah_1','jummah_2') or p.zuhr_begins is null or t.at_time>=p.zuhr_begins);
$$;
revoke all on function private.salah_reminder_events(date) from public,anon,authenticated;
grant execute on function private.salah_reminder_events(date) to service_role;

create or replace function public.salah_reminder_claim(p_now timestamptz default now()) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
  if not exists(select 1 from private.salah_reminder_runtime where enabled) then return '[]'::jsonb; end if;
  insert into private.salah_reminder_deliveries(device_id,prayer,kind,day,event_at,scheduled_at)
  select d.id,t.prayer,t.kind,p.d_date,t.event_at,t.event_at-make_interval(mins=>case when t.kind='start' then (d.preferences->>'startMinutes')::integer else (d.preferences->>'jamaahMinutes')::integer end)
  from private.salah_reminder_devices d cross join public.prayer_times p
  cross join lateral private.salah_reminder_events(p.d_date) t
  where p.d_date between (p_now at time zone 'Europe/London')::date-1 and (p_now at time zone 'Europe/London')::date+1
    and d.preferences->'prayers' ? t.preference and (d.preferences->>t.kind)::boolean and t.event_at>=p_now-interval '1 minute'
    and t.event_at-make_interval(mins=>case when t.kind='start' then (d.preferences->>'startMinutes')::integer else (d.preferences->>'jamaahMinutes')::integer end)
      between p_now-interval '2 minutes' and p_now
  on conflict(device_id,prayer,kind,day) do update set event_at=excluded.event_at,scheduled_at=excluded.scheduled_at,status='pending',lease=null,leased_at=null,attempts=0
    where private.salah_reminder_deliveries.status in ('pending','leased')
      and (private.salah_reminder_deliveries.status='pending' or private.salah_reminder_deliveries.leased_at<p_now-interval '90 seconds')
      and (private.salah_reminder_deliveries.event_at<>excluded.event_at or private.salah_reminder_deliveries.scheduled_at<>excluded.scheduled_at);
  with chosen as (
    select j.id from private.salah_reminder_deliveries j
    join private.salah_reminder_devices d on d.id=j.device_id
    where j.scheduled_at>=p_now-interval '2 minutes' and j.scheduled_at<=p_now and j.event_at>=p_now-interval '1 minute' and j.attempts<3
      and (j.status='pending' or (j.status='leased' and j.leased_at<p_now-interval '90 seconds'))
      and exists(select 1 from private.salah_reminder_events(j.day) e
        where e.prayer=j.prayer and e.kind=j.kind and e.event_at=j.event_at
          and d.preferences->'prayers' ? e.preference and (d.preferences->>e.kind)::boolean
          and j.scheduled_at=e.event_at-make_interval(mins=>case when e.kind='start' then (d.preferences->>'startMinutes')::integer else (d.preferences->>'jamaahMinutes')::integer end))
    order by j.scheduled_at limit 200 for update of j skip locked
  ), leased as (
    update private.salah_reminder_deliveries j set status='leased',lease=gen_random_uuid(),leased_at=p_now,attempts=attempts+1 from chosen c where c.id=j.id returning j.*
  ) select coalesce(jsonb_agg(to_jsonb(j)||jsonb_build_object('subscription',d.subscription)),'[]'::jsonb) into result
  from leased j join private.salah_reminder_devices d on d.id=j.device_id;
  return result;
end; $$;
revoke all on function public.salah_reminder_claim(timestamptz) from public,anon,authenticated;
grant execute on function public.salah_reminder_claim(timestamptz) to service_role;
commit;
