create table if not exists public.account_access_requests (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(trim(display_name)) between 2 and 120),
  email text not null check (char_length(email) between 5 and 254),
  requested_role text not null check (requested_role in ('parent_guardian','student','teacher','volunteer','imam','office')),
  requested_features text[] not null default '{}',
  message text not null default '' check (char_length(message) <= 2000),
  requested_permissions text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  auth_user_id uuid references public.profiles(id) on delete set null
);

create index if not exists account_access_requests_status_created
  on public.account_access_requests(status, created_at desc);

alter table public.account_access_requests enable row level security;

revoke all on public.account_access_requests from anon, authenticated;
