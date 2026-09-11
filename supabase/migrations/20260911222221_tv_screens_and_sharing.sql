-- TV control is accessed only through the tv-control Edge Function. Its handler
-- verifies an active staff profile or a hashed, expiring device credential.
create table public.tv_screens (
  id text primary key check (id in ('mens-main', 'mens-upstairs', 'ladies-upstairs', 'shoe-area')),
  label text not null,
  settings jsonb not null default '{"mode":"schedule","youtube_url":"","camera_url":"","camera_protocol":"hls","poster_ids":["open-quran-circle","youth-islamic-studies","seekers-gateway","after-maghrib"],"include_events":true,"rotation_seconds":20,"muted":true}'::jsonb,
  share_session uuid,
  share_owner uuid references auth.users(id) on delete set null,
  share_kind text check (share_kind in ('screen', 'camera')),
  share_expires timestamptz,
  updated_at timestamptz not null default now()
);
insert into public.tv_screens (id, label) values
  ('mens-main', 'Men’s Main Hall'), ('mens-upstairs', 'Men’s Upstairs Hall'),
  ('ladies-upstairs', 'Ladies’ Upstairs Hall'), ('shoe-area', 'Shoe Area');
create table public.tv_pairing_codes (
  screen_id text primary key references public.tv_screens(id) on delete cascade,
  code_hash text not null unique,
  expires_at timestamptz not null
);
create table public.tv_devices (
  id uuid primary key default gen_random_uuid(),
  screen_id text not null references public.tv_screens(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create table public.tv_peers (
  id uuid primary key default gen_random_uuid(),
  screen_id text not null references public.tv_screens(id) on delete cascade,
  session_id uuid not null,
  device_id uuid not null references public.tv_devices(id) on delete cascade,
  offer jsonb,
  answer jsonb,
  unique (session_id, device_id)
);
create index tv_screens_owner_idx on public.tv_screens(share_owner);
create index tv_devices_screen_idx on public.tv_devices(screen_id);
create index tv_peers_screen_idx on public.tv_peers(screen_id);
create index tv_peers_device_idx on public.tv_peers(device_id);
alter table public.tv_screens enable row level security;
alter table public.tv_pairing_codes enable row level security;
alter table public.tv_devices enable row level security;
alter table public.tv_peers enable row level security;
revoke all on public.tv_screens, public.tv_pairing_codes, public.tv_devices, public.tv_peers from public, anon, authenticated;
grant select, insert, update, delete on public.tv_screens, public.tv_pairing_codes, public.tv_devices, public.tv_peers to service_role;
