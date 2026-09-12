-- A TV keeps its own random credential. Staff approve the short code shown on
-- that browser once; neither the code nor the TV address grants public access.
create table public.tv_browser_setup (
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
  screen_id text not null references public.tv_screens(id) on delete cascade,
  code text not null unique check (code ~ '^[0-9]{6}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '10 minutes'
);
create index tv_browser_setup_screen_idx on public.tv_browser_setup(screen_id);
alter table public.tv_browser_setup enable row level security;
revoke all on public.tv_browser_setup from public, anon, authenticated;
grant select, insert, update, delete on public.tv_browser_setup to service_role;

alter table public.tv_devices add column last_seen_at timestamptz;
alter table public.tv_devices add column applied_revision timestamptz;

create function public.begin_tv_browser_setup(hall text, token_digest text)
returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
  pending public.tv_browser_setup%rowtype;
  approved public.tv_devices%rowtype;
  new_code text;
begin
  if token_digest is null or token_digest !~ '^[a-f0-9]{64}$'
     or hall is null or hall not in ('mens-main', 'mens-upstairs', 'ladies-upstairs') then
    raise exception using errcode = '22023', message = 'Invalid TV setup request';
  end if;
  -- Serialize retries for one credential, then enforce the per-hall queue limit.
  perform pg_advisory_xact_lock(hashtextextended(token_digest, 0));
  perform 1 from public.tv_screens where id = hall for update;
  if not found then
    raise exception using errcode = '22023', message = 'Unknown TV';
  end if;

  select * into approved from public.tv_devices where token_hash = token_digest;
  if found then
    if approved.screen_id <> hall then
      raise exception using errcode = '22023', message = 'Credential belongs to another TV';
    end if;
    if approved.expires_at > now() then return jsonb_build_object('approved', true); end if;
    -- Expired credentials require staff approval again; they are never renewed here.
    delete from public.tv_devices where id = approved.id;
  end if;

  delete from public.tv_browser_setup where screen_id = hall and expires_at <= now();
  select * into pending from public.tv_browser_setup where token_hash = token_digest;
  if found then
    if pending.screen_id <> hall then
      raise exception using errcode = '22023', message = 'Credential belongs to another TV';
    end if;
    return jsonb_build_object('code', pending.code, 'expires_at', pending.expires_at);
  end if;
  if (select count(*) from public.tv_browser_setup where screen_id = hall) >= 20 then
    raise exception 'Too many pending TVs';
  end if;

  for attempt in 1..10 loop
    new_code := lpad(((('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))::bit(32)::bigint
      % 1000000))::text, 6, '0');
    insert into public.tv_browser_setup(token_hash, screen_id, code)
      values (token_digest, hall, new_code)
      on conflict (code) do nothing returning * into pending;
    if found then
      return jsonb_build_object('code', pending.code, 'expires_at', pending.expires_at);
    end if;
  end loop;
  raise exception using errcode = '22023', message = 'Could not allocate a setup code';
end;
$$;

create function public.approve_tv_browser_setup(hall text, setup_code text)
returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  pending public.tv_browser_setup%rowtype;
  device_id uuid;
begin
  if setup_code is null or setup_code !~ '^[0-9]{6}$'
     or hall is null or hall not in ('mens-main', 'mens-upstairs', 'ladies-upstairs') then
    raise exception using errcode = '22023', message = 'Invalid TV setup request';
  end if;
  perform 1 from public.tv_screens where id = hall for update;
  -- Claim and approval share one transaction, so a code cannot approve two TVs.
  delete from public.tv_browser_setup
    where screen_id = hall and code = setup_code and expires_at > now()
    returning * into pending;
  if not found then
    raise exception using errcode = '22023', message = 'Setup code expired or not found';
  end if;
  insert into public.tv_devices(screen_id, token_hash, expires_at)
    values (hall, pending.token_hash, now() + interval '90 days')
    returning id into device_id;
  return device_id;
end;
$$;

revoke all on function public.begin_tv_browser_setup(text,text) from public, anon, authenticated;
revoke all on function public.approve_tv_browser_setup(text,text) from public, anon, authenticated;
grant execute on function public.begin_tv_browser_setup(text,text) to service_role;
grant execute on function public.approve_tv_browser_setup(text,text) to service_role;
