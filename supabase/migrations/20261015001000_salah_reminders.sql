begin;
create extension if not exists pg_cron;
create extension if not exists pg_net;

create table private.salah_reminder_runtime (
  id boolean primary key default true check(id), enabled boolean not null default false,
  function_url text, public_key text, key_secret_id uuid, dispatch_secret_id uuid not null,
  last_run_at timestamptz
);
insert into private.salah_reminder_runtime(dispatch_secret_id)
values(vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'jic_salah_dispatch','Salah scheduler only'));
create table private.salah_reminder_devices (
  id uuid primary key, token_hash text not null check(token_hash ~ '^[a-f0-9]{64}$'),
  subscription jsonb not null, endpoint text not null unique, preferences jsonb not null,
  updated_at timestamptz not null default clock_timestamp(), last_test_at timestamptz
);
create table private.salah_reminder_deliveries (
  id uuid primary key default gen_random_uuid(), device_id uuid not null references private.salah_reminder_devices on delete cascade,
  prayer text not null, kind text not null, day date not null, event_at timestamptz not null, scheduled_at timestamptz not null,
  status text not null default 'pending' check(status in ('pending','leased','sent','failed')),
  lease uuid, leased_at timestamptz, attempts integer not null default 0,
  unique(device_id,prayer,kind,day)
);
create index salah_reminder_pending on private.salah_reminder_deliveries(status,scheduled_at);
create table private.salah_reminder_limits (bucket text primary key, window_start timestamptz not null, hits integer not null);
alter table private.salah_reminder_runtime enable row level security;
alter table private.salah_reminder_devices enable row level security;
alter table private.salah_reminder_deliveries enable row level security;
alter table private.salah_reminder_limits enable row level security;
revoke all on private.salah_reminder_runtime, private.salah_reminder_devices, private.salah_reminder_deliveries, private.salah_reminder_limits from public,anon,authenticated;
grant usage on schema private to service_role;
grant select,insert,update,delete on private.salah_reminder_runtime, private.salah_reminder_devices, private.salah_reminder_deliveries, private.salah_reminder_limits to service_role;

-- All public-schema RPCs below are service-only and retain caller privileges.
create function public.salah_reminder_runtime(p_keys jsonb default null) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare r private.salah_reminder_runtime;
begin
  select * into r from private.salah_reminder_runtime where id for update;
  if p_keys is not null and r.key_secret_id is null then
    if length(p_keys->>'publicKey')<>87 or length(p_keys->>'privateKey')<>43 then raise exception 'Invalid sender keys'; end if;
    update private.salah_reminder_runtime set public_key=p_keys->>'publicKey',
      key_secret_id=vault.create_secret(p_keys->>'privateKey','jic_salah_vapid','Salah sender signing key') where id;
    select * into r from private.salah_reminder_runtime where id;
  end if;
  return to_jsonb(r) || jsonb_build_object('dispatch_secret',(select decrypted_secret from vault.decrypted_secrets where id=r.dispatch_secret_id),
    'private_key',(select decrypted_secret from vault.decrypted_secrets where id=r.key_secret_id));
end; $$;

create function public.salah_reminder_limit(p_bucket text) returns boolean
language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
  if p_bucket !~ '^[a-f0-9]{64}$' then return false; end if;
  insert into private.salah_reminder_limits values(p_bucket,date_trunc('hour',now()),1)
  on conflict(bucket) do update set
    window_start=date_trunc('hour',now()), hits=case when private.salah_reminder_limits.window_start=date_trunc('hour',now()) then private.salah_reminder_limits.hits+1 else 1 end
  returning hits into n;
  return n<=30;
end; $$;

create function public.salah_reminder_device(p_action text,p_id uuid,p_hash text,p_subscription jsonb default null,p_preferences jsonb default null,p_expected timestamptz default null) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare r private.salah_reminder_devices;
begin
  if p_hash is null or p_hash !~ '^[a-f0-9]{64}$' then raise exception 'Device access required'; end if;
  select * into r from private.salah_reminder_devices where id=p_id for update;
  if r.id is not null and r.token_hash<>p_hash then raise exception 'Device access required'; end if;
  if p_action='status' then
    if r.id is null then return jsonb_build_object('active',false); end if;
  elsif p_action='remove' then
    delete from private.salah_reminder_devices where id=p_id and token_hash=p_hash;
    return jsonb_build_object('active',false);
  elsif p_action='save' then
    if r.id is not null and r.updated_at is distinct from p_expected then raise exception 'Device settings changed; reload before saving'; end if;
    if jsonb_typeof(p_preferences) is distinct from 'object' or
      jsonb_typeof(p_preferences->'start') is distinct from 'boolean' or jsonb_typeof(p_preferences->'jamaah') is distinct from 'boolean' or
      not ((p_preferences->>'start')::boolean or (p_preferences->>'jamaah')::boolean) or
      jsonb_typeof(p_preferences->'startMinutes') is distinct from 'number' or jsonb_typeof(p_preferences->'jamaahMinutes') is distinct from 'number' or
      (p_preferences->>'startMinutes')::integer not between 0 and 60 or (p_preferences->>'jamaahMinutes')::integer not between 0 and 60 or
      jsonb_typeof(p_preferences->'prayers') is distinct from 'array' then raise exception 'Invalid reminder settings'; end if;
    if jsonb_array_length(p_preferences->'prayers') not between 1 and 5 or exists(select 1 from jsonb_array_elements_text(p_preferences->'prayers') p where p not in ('fajr','dhuhr','asr','maghrib','isha')) then raise exception 'Invalid prayers'; end if;
    if jsonb_typeof(p_subscription) is distinct from 'object' or coalesce(p_subscription->>'endpoint','') !~ '^https://' or length(p_subscription::text)>4000 then raise exception 'Invalid subscription'; end if;
    insert into private.salah_reminder_devices(id,token_hash,subscription,endpoint,preferences)
    values(p_id,p_hash,p_subscription,p_subscription->>'endpoint',p_preferences)
    on conflict(id) do update set subscription=excluded.subscription,endpoint=excluded.endpoint,preferences=excluded.preferences,updated_at=clock_timestamp();
    select * into r from private.salah_reminder_devices where id=p_id;
  elsif p_action='test' then
    if r.id is null then raise exception 'Enable reminders first'; end if;
    if r.last_test_at>now()-interval '1 minute' then raise exception 'Wait a minute before another test'; end if;
    update private.salah_reminder_devices set last_test_at=now() where id=p_id;
    return jsonb_build_object('subscription',r.subscription);
  else raise exception 'Unknown device action'; end if;
  return jsonb_build_object('active',true,'id',r.id,'preferences',r.preferences,'updated_at',r.updated_at);
end; $$;

create function public.salah_reminder_claim(p_now timestamptz default now()) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
  if not exists(select 1 from private.salah_reminder_runtime where enabled) then return '[]'::jsonb; end if;
  insert into private.salah_reminder_deliveries(device_id,prayer,kind,day,event_at,scheduled_at)
  select d.id,t.prayer,t.kind,p.d_date,t.event_at,t.event_at-make_interval(mins=>case when t.kind='start' then (d.preferences->>'startMinutes')::integer else (d.preferences->>'jamaahMinutes')::integer end)
  from private.salah_reminder_devices d cross join public.prayer_times p
  cross join lateral(values
    ('fajr','start',(p.d_date+p.fajr_begins) at time zone 'Europe/London'),('fajr','jamaah',(p.d_date+p.fajr_jamah) at time zone 'Europe/London'),
    ('dhuhr','start',(p.d_date+p.zuhr_begins) at time zone 'Europe/London'),('dhuhr','jamaah',(p.d_date+p.zuhr_jamah) at time zone 'Europe/London'),
    ('asr','start',(p.d_date+p.asr_begins) at time zone 'Europe/London'),('asr','jamaah',(p.d_date+p.asr_jamah) at time zone 'Europe/London'),
    ('maghrib','start',(p.d_date+p.maghrib_begins) at time zone 'Europe/London'),('maghrib','jamaah',(p.d_date+p.maghrib_jamah) at time zone 'Europe/London'),
    ('isha','start',(p.d_date+p.isha_begins) at time zone 'Europe/London'),('isha','jamaah',(p.d_date+p.isha_jamah) at time zone 'Europe/London')
  )t(prayer,kind,event_at)
  where p.d_date between (p_now at time zone 'Europe/London')::date-1 and (p_now at time zone 'Europe/London')::date+1
    and d.preferences->'prayers' ? t.prayer and (d.preferences->>t.kind)::boolean and t.event_at>=p_now-interval '1 minute'
    and t.event_at-make_interval(mins=>case when t.kind='start' then (d.preferences->>'startMinutes')::integer else (d.preferences->>'jamaahMinutes')::integer end)
      between p_now-interval '2 minutes' and p_now
  on conflict(device_id,prayer,kind,day) do nothing;
  with chosen as (
    select id from private.salah_reminder_deliveries where scheduled_at>=p_now-interval '2 minutes' and scheduled_at<=p_now and event_at>=p_now-interval '1 minute' and attempts<3
      and (status='pending' or (status='leased' and leased_at<p_now-interval '90 seconds'))
    order by scheduled_at limit 200 for update skip locked
  ), leased as (
    update private.salah_reminder_deliveries j set status='leased',lease=gen_random_uuid(),leased_at=p_now,attempts=attempts+1 from chosen c where c.id=j.id returning j.*
  ) select coalesce(jsonb_agg(to_jsonb(j)||jsonb_build_object('subscription',d.subscription)),'[]'::jsonb) into result
  from leased j join private.salah_reminder_devices d on d.id=j.device_id;
  return result;
end; $$;

create function public.salah_reminder_finish(p_jobs jsonb,p_status text,p_gone_device uuid default null) returns void
language plpgsql security invoker set search_path='' as $$
begin
  if p_status not in ('sent','pending','failed') or jsonb_array_length(p_jobs)>200 then raise exception 'Invalid delivery result'; end if;
  update private.salah_reminder_deliveries j set status=p_status from jsonb_to_recordset(p_jobs) r(id uuid,lease uuid) where j.id=r.id and j.lease=r.lease and j.status='leased';
  if p_gone_device is not null then delete from private.salah_reminder_devices where id=p_gone_device; end if;
end; $$;
create function public.salah_reminder_heartbeat() returns void language sql security invoker set search_path='' as $$
  update private.salah_reminder_runtime set last_run_at=now() where id;
  delete from private.salah_reminder_deliveries where day<current_date-7;
  delete from private.salah_reminder_limits where window_start<now()-interval '1 day';
$$;

do $$ declare f record; begin
  for f in select oid::regprocedure name from pg_proc where pronamespace='public'::regnamespace and proname in
    ('salah_reminder_runtime','salah_reminder_limit','salah_reminder_device','salah_reminder_claim','salah_reminder_finish','salah_reminder_heartbeat') loop
    execute format('revoke all on function %s from public, anon, authenticated',f.name);
    execute format('grant execute on function %s to service_role',f.name);
  end loop;
end $$;

create function private.trigger_salah_reminders() returns bigint language plpgsql security invoker set search_path='' as $$
declare r private.salah_reminder_runtime; token text;
begin
  select * into r from private.salah_reminder_runtime where id;
  if not r.enabled or r.function_url is null then return null; end if;
  select decrypted_secret into token from vault.decrypted_secrets where id=r.dispatch_secret_id;
  return net.http_post(url=>r.function_url,headers=>jsonb_build_object('Content-Type','application/json','x-salah-dispatch',token),body=>'{}'::jsonb,timeout_milliseconds=>60000);
end; $$;
revoke all on function private.trigger_salah_reminders() from public,anon,authenticated;
select cron.schedule('jic-salah-reminders','* * * * *','select private.trigger_salah_reminders()');
commit;
