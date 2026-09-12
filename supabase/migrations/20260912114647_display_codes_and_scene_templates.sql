-- The short code identifies a browser. Staff approval grants access to one stream.
create table public.display_connection_codes (
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
  screen_id text not null references public.tv_screens(id) on delete cascade,
  code text not null unique check (code ~ '^[0-9]{6}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '10 minutes'
);
create index display_connection_codes_screen_expiry_idx
  on public.display_connection_codes(screen_id, expires_at);

create table public.display_code_allocations (
  screen_id text not null references public.tv_screens(id) on delete cascade,
  client_hash text not null check (client_hash ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null,
  allocations integer not null check (allocations > 0),
  primary key (screen_id, client_hash)
);
create index display_code_allocations_screen_window_idx
  on public.display_code_allocations(screen_id, window_started_at);

create table public.tv_scene_templates (
  id uuid primary key default gen_random_uuid(),
  screen_id text not null references public.tv_screens(id) on delete cascade,
  name text not null check (length(trim(name)) > 0 and length(name) <= 80),
  scene jsonb not null check (jsonb_typeof(scene) = 'object'),
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
create index tv_scene_templates_screen_updated_idx
  on public.tv_scene_templates(screen_id, updated_at desc);
create index tv_scene_templates_created_by_idx on public.tv_scene_templates(created_by);

alter table public.display_connection_codes enable row level security;
alter table public.display_code_allocations enable row level security;
alter table public.tv_scene_templates enable row level security;
revoke all on public.display_connection_codes, public.display_code_allocations,
  public.tv_scene_templates from public, anon, authenticated;
grant select, insert, update, delete on public.display_connection_codes,
  public.display_code_allocations, public.tv_scene_templates to service_role;

create function public.request_display_code(hall text, credential_hash text, client_hash text)
returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  pending public.display_connection_codes;
  next_code text;
  previous_code text;
  issued_at timestamptz := now();
  window_start timestamptz := date_bin(interval '10 minutes', now(), '2000-01-01'::timestamptz);
  allocated integer;
begin
  if hall is null or hall not in ('mens-main', 'mens-upstairs', 'ladies-upstairs')
     or credential_hash is null or credential_hash !~ '^[a-f0-9]{64}$'
     or client_hash is null or client_hash !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('error', 'Invalid display connection request', 'status', 400);
  end if;

  -- One browser's concurrent requests share a code; hall locking also bounds allocation.
  perform pg_advisory_xact_lock(hashtextextended(credential_hash, 0));
  perform 1 from public.tv_screens where id = hall for update;
  if not found then
    return jsonb_build_object('error', 'Hall stream not found', 'status', 404);
  end if;
  select * into pending from public.display_connection_codes
    where token_hash = credential_hash for update;
  if (pending.token_hash is not null and pending.screen_id <> hall)
     or exists(select 1 from public.tv_devices where token_hash = credential_hash and screen_id <> hall) then
    return jsonb_build_object('error', 'Open a separate display connection for this hall', 'status', 409);
  end if;
  if pending.expires_at > issued_at then
    return jsonb_build_object('code', pending.code, 'expires_at', pending.expires_at);
  end if;
  previous_code := pending.code;

  -- Expired idle browsers do not fill the queue; each request removes a bounded batch.
  delete from public.display_connection_codes where token_hash in (
    select token_hash from public.display_connection_codes
    where screen_id = hall and expires_at <= issued_at and token_hash <> credential_hash
    order by expires_at limit 256
  );
  if (select count(*) from public.display_connection_codes
      where screen_id = hall and expires_at > issued_at) >= 2000 then
    return jsonb_build_object('error', 'Too many display connections. Try again in ten minutes.', 'status', 429);
  end if;

  -- New identities consume a client budget. Reopening a known display does not.
  if pending.token_hash is null
     and not exists(select 1 from public.tv_devices where token_hash = credential_hash and screen_id = hall) then
    delete from public.display_code_allocations where (screen_id, display_code_allocations.client_hash) in (
      select screen_id, display_code_allocations.client_hash from public.display_code_allocations
      where screen_id = hall and window_started_at < window_start
      order by window_started_at limit 256
    );
    select allocations into allocated from public.display_code_allocations
      where screen_id = hall and display_code_allocations.client_hash = request_display_code.client_hash
        and window_started_at = window_start;
    if coalesce(allocated, 0) >= 30 then
      return jsonb_build_object('error', 'Too many new displays from this network. Try again in ten minutes.', 'status', 429);
    end if;
    insert into public.display_code_allocations(screen_id, client_hash, window_started_at, allocations)
      values (hall, request_display_code.client_hash, window_start, 1)
      on conflict on constraint display_code_allocations_pkey do update set
        allocations = case when public.display_code_allocations.window_started_at = excluded.window_started_at
          then public.display_code_allocations.allocations + 1 else 1 end,
        window_started_at = excluded.window_started_at;
  end if;

  for attempt in 1..20 loop
    next_code := lpad(((('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))::bit(32)::bigint
      % 1000000))::text, 6, '0');
    if next_code = previous_code then continue; end if;
    begin
      insert into public.display_connection_codes(token_hash, screen_id, code, expires_at)
        values (credential_hash, hall, next_code, issued_at + interval '10 minutes')
        on conflict (token_hash) do update set code = excluded.code, expires_at = excluded.expires_at
        returning * into pending;
      return jsonb_build_object('code', pending.code, 'expires_at', pending.expires_at);
    exception when unique_violation then
      -- A different hall can allocate the same short code while this hall is locked.
      continue;
    end;
  end loop;
  return jsonb_build_object('error', 'Could not create a display code. Please try again.', 'status', 503);
end;
$$;

create function public.approve_display_code(
  actor uuid, hall text, connection_code text, display_name text default null
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  operator public.profiles;
  screen public.tv_screens;
  presentation public.tv_presentations;
  pending public.display_connection_codes;
  existing public.tv_devices;
  approved public.tv_devices;
  chosen_name text;
  ends_at timestamptz;
begin
  select * into operator from public.profiles where id = actor for share;
  if operator.id is null or operator.is_active is not true
     or not (operator.is_owner or 'tv' = any(operator.permissions)) then
    return jsonb_build_object('error', 'Hall stream permission required', 'status', 403);
  end if;
  if hall is null or hall not in ('mens-main', 'mens-upstairs', 'ladies-upstairs')
     or connection_code is null or connection_code !~ '^[0-9]{6}$' then
    return jsonb_build_object('error', 'Enter the six-digit code shown on the display webpage', 'status', 400);
  end if;
  if length(coalesce(display_name, '')) > 60 then
    return jsonb_build_object('error', 'Use up to 60 characters for the display name', 'status', 400);
  end if;

  -- Saving, approval and stream rotation take the hall lock in the same order.
  select * into screen from public.tv_screens where id = hall for update;
  select * into presentation from public.tv_presentations where screen_id = hall;
  if screen.id is null or presentation.id is null or screen.settings->>'scene_mode' <> 'teaching'
     or (presentation.expires_at is not null and presentation.expires_at <= now()) then
    return jsonb_build_object('error', 'Start this hall stream before connecting a display', 'status', 409);
  end if;
  select * into pending from public.display_connection_codes
    where screen_id = hall and code = connection_code and expires_at > now() for update;
  if pending.token_hash is null then
    return jsonb_build_object('error', 'That display code has expired or belongs to another hall. Check the webpage.', 'status', 404);
  end if;
  select * into existing from public.tv_devices where token_hash = pending.token_hash for update;
  if existing.id is not null and (existing.screen_id <> hall or existing.is_preview) then
    return jsonb_build_object('error', 'Open a separate display connection for this hall', 'status', 409);
  end if;
  chosen_name := coalesce(nullif(trim(display_name), ''), nullif(existing.name, ''), 'Display ' || right(pending.code, 3));
  ends_at := least(now() + interval '24 hours', presentation.expires_at);

  if existing.id is not null and existing.presentation_id = presentation.id then
    update public.tv_devices set name = chosen_name, expires_at = ends_at
      where id = existing.id returning * into approved;
  else
    -- A previous stream's receiver rows must not survive approval for a new stream.
    if existing.id is not null then delete from public.tv_devices where id = existing.id; end if;
    insert into public.tv_devices(screen_id, token_hash, name, presentation_id, expires_at, is_preview)
      values (hall, pending.token_hash, chosen_name, presentation.id, ends_at, false)
      returning * into approved;
  end if;
  return jsonb_build_object('deviceId', approved.id, 'name', approved.name,
    'presentationId', presentation.id, 'expiresAt', approved.expires_at);
end;
$$;

revoke all on function public.request_display_code(text,text,text),
  public.approve_display_code(uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.request_display_code(text,text,text),
  public.approve_display_code(uuid,text,text,text) to service_role;

-- Empty regions belong to the draft and do not start a stream on their own.
create or replace function public.save_tv_presentation(
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
    and exists (
      select 1 from jsonb_array_elements(selected_scene->'layers') layer
      where coalesce(layer->>'type', 'empty') <> 'empty'
    )
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
