-- A hall keeps its permanent address. Private viewing belongs to one presentation.
create table public.tv_presentations (
  screen_id text primary key references public.tv_screens(id) on delete cascade,
  id uuid not null default gen_random_uuid() unique,
  code text not null check (code ~ '^[0-9]{8}$'),
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  unique (id, screen_id)
);

-- Fixed ten-minute counters keep failed code guesses bounded without storing IPs.
create table public.tv_join_attempts (
  screen_id text not null references public.tv_screens(id) on delete cascade,
  client_hash text not null check (client_hash = '*' or client_hash ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null,
  attempts integer not null check (attempts >= 0),
  primary key (screen_id, client_hash)
);
alter table public.tv_presentations enable row level security;
alter table public.tv_join_attempts enable row level security;
revoke all on public.tv_presentations, public.tv_join_attempts from public, anon, authenticated;
grant select, insert, update, delete on public.tv_presentations, public.tv_join_attempts to service_role;

-- The rollout ends old connections; saved content and staff accounts are retained.
delete from public.tv_inputs;
delete from public.tv_devices;
update public.tv_screens
  set settings = settings || '{"scene_mode":"normal","class_until":""}'::jsonb,
      updated_at = clock_timestamp();
alter table public.tv_devices
  add column presentation_id uuid not null,
  add column is_preview boolean not null default false,
  add constraint tv_devices_presentation_fk foreign key (presentation_id, screen_id)
    references public.tv_presentations(id, screen_id) on delete cascade;
create index tv_devices_presentation_idx on public.tv_devices(presentation_id, screen_id);

-- These approvals were tied to a browser instead of the current presentation.
drop function public.approve_named_tv_browser(text, text, text);
drop function public.approve_tv_browser_setup(text, text);
drop function public.begin_tv_browser_setup(text, text);
drop table public.tv_browser_setup;
drop table public.tv_pairing_codes;
drop function public.save_tv_scene(uuid, text, jsonb, timestamptz);

create function public.save_tv_presentation(
  actor uuid, hall text, config jsonb, expected timestamptz,
  new_code text, restart boolean default false
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  operator public.profiles;
  screen public.tv_screens;
  presentation public.tv_presentations;
  saved jsonb := config;
  selected_scene jsonb;
  ends_at timestamptz;
  changed_at timestamptz;
  presenting boolean;
begin
  select * into operator from public.profiles where id = actor for share;
  if operator.id is null or operator.is_active is not true
     or not (operator.is_owner or 'tv' = any(operator.permissions)) then
    raise exception 'Hall stream permission required';
  end if;
  select * into screen from public.tv_screens where id = hall for update;
  if screen.id is null or expected is null or screen.updated_at <> expected then
    raise exception 'This hall stream changed on another device. Reload before saving.';
  end if;
  if saved is null or jsonb_typeof(saved) <> 'object'
     or coalesce(saved->>'scene_mode', '') not in ('normal', 'teaching')
     or jsonb_typeof(saved->'scenes') is distinct from 'array' then
    raise exception using errcode = '22023', message = 'Choose a valid hall stream layout';
  end if;
  if nullif(saved->>'class_until', '') is not null then
    begin
      ends_at := (saved->>'class_until')::timestamptz;
    exception when invalid_datetime_format or datetime_field_overflow then
      raise exception using errcode = '22023', message = 'Choose a valid presentation end time';
    end;
  end if;
  select scene into selected_scene from jsonb_array_elements(saved->'scenes') scene
    where scene->>'id' = saved->>'active_scene_id' limit 1;
  presenting := hall <> 'shoe-area' and saved->>'scene_mode' = 'teaching'
    and jsonb_typeof(selected_scene->'layers') = 'array'
    and jsonb_array_length(selected_scene->'layers') > 0
    and (ends_at is null or ends_at > now());
  select * into presentation from public.tv_presentations where screen_id = hall;

  if coalesce(presenting, false) then
    if presentation.id is null or screen.settings->>'scene_mode' <> 'teaching'
       or (presentation.expires_at is not null and presentation.expires_at <= now())
       or restart then
      if new_code is null or new_code !~ '^[0-9]{8}$' then
        raise exception using errcode = '22023', message = 'A new presentation needs an eight-digit session code';
      end if;
      if new_code = presentation.code then
        raise exception using errcode = '22023', message = 'Choose a fresh code for the new presentation';
      end if;
      delete from public.tv_inputs where screen_id = hall;
      delete from public.tv_presentations where screen_id = hall;
      insert into public.tv_presentations(screen_id, code, expires_at)
        values (hall, new_code, ends_at) returning * into presentation;
    else
      update public.tv_presentations set expires_at = ends_at where screen_id = hall
        returning * into presentation;
      -- Shortening a session also shortens existing viewer credentials.
      if ends_at is not null then
        update public.tv_devices set expires_at = least(expires_at, ends_at)
          where screen_id = hall;
      end if;
    end if;
    delete from public.tv_inputs input where input.screen_id = hall
      and not exists (
        select 1 from jsonb_array_elements(saved->'scenes') scene,
          jsonb_array_elements(scene->'layers') layer
        where layer->>'type' = 'input' and layer->>'slot' = input.slot
      );
  else
    saved := saved || '{"scene_mode":"normal","class_until":""}'::jsonb;
    delete from public.tv_inputs where screen_id = hall;
    delete from public.tv_presentations where screen_id = hall;
    presentation := null;
  end if;
  update public.tv_screens set settings = saved, updated_at = clock_timestamp()
    where id = hall returning updated_at into changed_at;
  return jsonb_build_object(
    'settings', saved, 'updated_at', changed_at,
    'presentation', case when presentation.id is null then null else jsonb_build_object(
      'id', presentation.id, 'code', presentation.code, 'expires_at', presentation.expires_at
    ) end
  );
end;
$$;
revoke all on function public.save_tv_presentation(uuid,text,jsonb,timestamptz,text,boolean)
  from public, anon, authenticated;
grant execute on function public.save_tv_presentation(uuid,text,jsonb,timestamptz,text,boolean)
  to service_role;

create function public.join_tv_presentation(
  hall text, session_code text, viewer_name text, credential_hash text, client_hash text
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  screen public.tv_screens;
  presentation public.tv_presentations;
  existing public.tv_devices;
  joined public.tv_devices;
  window_start timestamptz := date_bin(interval '10 minutes', now(), '2000-01-01'::timestamptz);
  client_attempts integer;
  hall_attempts integer;
  ends_at timestamptz;
begin
  if hall is null or hall not in ('mens-main', 'mens-upstairs', 'ladies-upstairs')
     or credential_hash is null or credential_hash !~ '^[a-f0-9]{64}$'
     or client_hash is null or client_hash !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('error', 'Invalid connection request', 'status', 400);
  end if;
  if viewer_name is null or length(trim(viewer_name)) = 0 or length(viewer_name) > 60 then
    return jsonb_build_object('error', 'Enter a device name using up to 60 characters', 'status', 400);
  end if;
  -- Lock order matches saving and receiver creation, so session rotation is atomic.
  select * into screen from public.tv_screens where id = hall for update;
  if screen.id is null then
    return jsonb_build_object('error', 'Hall stream not found', 'status', 404);
  end if;
  delete from public.tv_join_attempts where screen_id = hall and window_started_at < window_start;
  select attempts into hall_attempts from public.tv_join_attempts
    where screen_id = hall and tv_join_attempts.client_hash = '*';
  select attempts into client_attempts from public.tv_join_attempts
    where screen_id = hall and tv_join_attempts.client_hash = join_tv_presentation.client_hash;
  if coalesce(client_attempts, 0) >= 20 or coalesce(hall_attempts, 0) >= 300 then
    return jsonb_build_object('error', 'Too many code attempts. Try again in ten minutes.', 'status', 429);
  end if;
  select * into presentation from public.tv_presentations where screen_id = hall;
  if presentation.id is null or screen.settings->>'scene_mode' <> 'teaching'
     or (presentation.expires_at is not null and presentation.expires_at <= now()) then
    return jsonb_build_object('error', 'This presentation has ended', 'status', 410);
  end if;
  if session_code is null or session_code !~ '^[0-9]{8}$' or session_code <> presentation.code then
    insert into public.tv_join_attempts(screen_id, client_hash, window_started_at, attempts)
      values (hall, '*', window_start, 1)
      on conflict on constraint tv_join_attempts_pkey do update
        set attempts = public.tv_join_attempts.attempts + 1;
    insert into public.tv_join_attempts(screen_id, client_hash, window_started_at, attempts)
      values (hall, join_tv_presentation.client_hash, window_start, 1)
      on conflict on constraint tv_join_attempts_pkey do update
        set attempts = public.tv_join_attempts.attempts + 1;
    -- Return instead of raising, so failed guesses retain their rate-limit counters.
    return jsonb_build_object('error', 'That session code is not correct. Check with the presenter.', 'status', 403);
  end if;
  ends_at := least(now() + interval '24 hours', presentation.expires_at);
  select * into existing from public.tv_devices where token_hash = credential_hash;
  if existing.id is not null then
    if existing.screen_id <> hall or existing.presentation_id <> presentation.id or existing.is_preview then
      return jsonb_build_object('error', 'Start a new display connection', 'status', 409);
    end if;
    update public.tv_devices set name = trim(viewer_name), expires_at = ends_at, last_seen_at = now()
      where id = existing.id returning * into joined;
  else
    insert into public.tv_devices(screen_id, token_hash, name, presentation_id, expires_at, last_seen_at)
      values (hall, credential_hash, trim(viewer_name), presentation.id, ends_at, now())
      returning * into joined;
  end if;
  return jsonb_build_object(
    'deviceId', joined.id, 'presentationId', presentation.id, 'expiresAt', joined.expires_at
  );
end;
$$;
revoke all on function public.join_tv_presentation(text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.join_tv_presentation(text,text,text,text,text) to service_role;

-- A publisher can start only while an authorized presentation is active.
create or replace function public.start_tv_input(actor uuid,hall text,input_slot text,input_kind text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  operator public.profiles;
  screen public.tv_screens;
  input_session uuid;
begin
  select * into operator from public.profiles where id = actor for share;
  if operator.id is null or operator.is_active is not true
     or not (operator.is_owner or 'tv' = any(operator.permissions)) then
    raise exception 'Hall stream permission required';
  end if;
  select * into screen from public.tv_screens where id = hall for update;
  if screen.id is null or hall = 'shoe-area' or screen.settings->>'scene_mode' <> 'teaching'
     or not exists(select 1 from public.tv_presentations where screen_id = hall
       and (expires_at is null or expires_at > now())) then
    raise exception 'Present this hall stream before sharing a device';
  end if;
  if input_slot is null or input_slot not in ('input-1', 'input-2', 'input-3', 'input-4')
     or input_kind is null or input_kind not in ('screen', 'camera') then
    raise exception using errcode = '22023', message = 'Choose a camera or screen input';
  end if;
  if not exists(select 1 from jsonb_array_elements(screen.settings->'scenes') scene,
    jsonb_array_elements(scene->'layers') layer where layer->>'type' = 'input' and layer->>'slot' = input_slot) then
    raise exception 'Add this device input to a scene and present it first';
  end if;
  delete from public.tv_inputs where screen_id = hall and slot = input_slot and expires_at <= now();
  if exists(select 1 from public.tv_inputs where screen_id = hall and slot = input_slot) then
    raise exception 'This input is in use. Choose another input or stop it first.';
  end if;
  insert into public.tv_inputs(screen_id,slot,owner_id,kind,expires_at)
    values(hall,input_slot,actor,input_kind,now()+interval '90 seconds') returning session_id into input_session;
  return input_session;
end;
$$;

create or replace function public.join_tv_receiver(hall text, input_session uuid, receiver_device uuid)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  receiver_id uuid;
begin
  -- The hall lock serializes joins with rotation; the device lock bounds parallel tabs.
  perform 1 from public.tv_screens where id = hall for share;
  perform 1 from public.tv_devices device
    join public.tv_presentations presentation on presentation.id = device.presentation_id
      and presentation.screen_id = device.screen_id
    join public.tv_screens screen on screen.id = presentation.screen_id
    where device.id = receiver_device and device.screen_id = hall and device.expires_at > now()
      and screen.settings->>'scene_mode' = 'teaching'
      and (presentation.expires_at is null or presentation.expires_at > now())
    for update of device;
  if not found then raise exception 'Join the current presentation before watching'; end if;
  perform 1 from public.tv_inputs where session_id = input_session and screen_id = hall and expires_at > now();
  if not found then raise exception 'This input has ended'; end if;
  delete from public.tv_peers where device_id = receiver_device and screen_id = hall
    and last_seen_at < now() - interval '90 seconds';
  if (select count(*) from public.tv_peers where device_id = receiver_device and screen_id = hall) >= 8 then
    raise exception 'Close an unused display tab before opening another receiver';
  end if;
  insert into public.tv_peers(screen_id, session_id, device_id, receiver_state)
    values(hall, input_session, receiver_device, 'waiting') returning id into receiver_id;
  return receiver_id;
end;
$$;
