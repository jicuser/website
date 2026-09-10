-- JIC production CMS + security migration
-- Run once in Supabase SQL Editor after taking a database backup.
-- This file is idempotent where practical.

create extension if not exists pgcrypto;

-- ---------- Roles / profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'viewer' check (role in ('viewer','teacher','events_manager','content_editor','admin','super_admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)), 'viewer')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

insert into public.profiles (id, display_name, role)
select id, coalesce(raw_user_meta_data->>'display_name', split_part(email,'@',1)), 'viewer'
from auth.users
on conflict (id) do nothing;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case when p.is_active then p.role else 'viewer' end
  from public.profiles p where p.id = auth.uid();
$$;

grant execute on function public.current_user_role() to anon, authenticated;

create or replace function public.has_role(allowed text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = any(allowed), false);
$$;

grant execute on function public.has_role(text[]) to anon, authenticated;

alter table public.profiles enable row level security;
drop policy if exists "profiles own read" on public.profiles;
drop policy if exists "profiles admin read" on public.profiles;
drop policy if exists "profiles superadmin update" on public.profiles;
create policy "profiles own read" on public.profiles for select using (id = auth.uid());
create policy "profiles admin read" on public.profiles for select using (public.has_role(array['admin','super_admin']));
create policy "profiles superadmin update" on public.profiles for update using (public.has_role(array['super_admin'])) with check (public.has_role(array['super_admin']));

-- ---------- Page content ----------
create table if not exists public.page_content (
  id uuid primary key default gen_random_uuid(),
  content_key text unique not null,
  content_value text,
  content_type text not null default 'text',
  page text,
  updated_at timestamptz default now(),
  updated_by uuid references auth.users(id)
);
alter table public.page_content enable row level security;
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='page_content' loop
    execute format('drop policy if exists %I on public.page_content', p.policyname);
  end loop;
end $$;
create policy "page content public read" on public.page_content for select using (true);
create policy "page content authorised insert" on public.page_content for insert with check (public.has_role(array['content_editor','admin','super_admin']));
create policy "page content authorised update" on public.page_content for update using (public.has_role(array['content_editor','admin','super_admin'])) with check (public.has_role(array['content_editor','admin','super_admin']));
create policy "page content authorised delete" on public.page_content for delete using (public.has_role(array['admin','super_admin']));

-- ---------- Events ----------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_date date not null,
  start_time time,
  end_time time,
  location text,
  speaker text,
  poster_url text,
  registration_url text,
  livestream_url text,
  category text default 'community',
  featured boolean not null default false,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.events enable row level security;
create policy "events public read" on public.events for select using (published or public.has_role(array['events_manager','content_editor','admin','super_admin']));
create policy "events authorised insert" on public.events for insert with check (public.has_role(array['events_manager','content_editor','admin','super_admin']));
create policy "events authorised update" on public.events for update using (public.has_role(array['events_manager','content_editor','admin','super_admin'])) with check (public.has_role(array['events_manager','content_editor','admin','super_admin']));
create policy "events authorised delete" on public.events for delete using (public.has_role(array['admin','super_admin']));

-- ---------- Announcements ----------
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  kind text not null default 'info' check (kind in ('info','important','urgent')),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.announcements enable row level security;
create policy "announcements public read" on public.announcements for select using (published or public.has_role(array['teacher','events_manager','content_editor','admin','super_admin']));
create policy "announcements authorised insert" on public.announcements for insert with check (public.has_role(array['teacher','events_manager','content_editor','admin','super_admin']));
create policy "announcements authorised update" on public.announcements for update using (public.has_role(array['teacher','events_manager','content_editor','admin','super_admin'])) with check (public.has_role(array['teacher','events_manager','content_editor','admin','super_admin']));
create policy "announcements admin delete" on public.announcements for delete using (public.has_role(array['admin','super_admin']));

-- ---------- Livestream ----------
create table if not exists public.livestream_settings (
  id smallint primary key default 1 check (id = 1),
  enabled boolean not null default false,
  provider text not null default 'youtube' check (provider in ('youtube','facebook','vimeo','other')),
  title text default 'JIC Live',
  stream_url text,
  scheduled_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
insert into public.livestream_settings (id) values (1) on conflict (id) do nothing;
alter table public.livestream_settings enable row level security;
create policy "livestream public read" on public.livestream_settings for select using (true);
create policy "livestream authorised update" on public.livestream_settings for update using (public.has_role(array['content_editor','admin','super_admin'])) with check (public.has_role(array['content_editor','admin','super_admin']));

-- ---------- Team ----------
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role_title text,
  bio text,
  image_url text,
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.team_members enable row level security;
create policy "team public read" on public.team_members for select using (published or public.has_role(array['content_editor','admin','super_admin']));
create policy "team authorised write" on public.team_members for all using (public.has_role(array['content_editor','admin','super_admin'])) with check (public.has_role(array['content_editor','admin','super_admin']));

-- ---------- Prayer timetable ----------
create table if not exists public.prayer_times (
  id bigint generated by default as identity primary key,
  d_date date unique not null,
  fajr_begins time, fajr_jamah time, sunrise time,
  zuhr_begins time, zuhr_jamah time,
  asr_begins time, asr_jamah time,
  maghrib_begins time, maghrib_jamah time,
  isha_begins time, isha_jamah time,
  jummah_1_start time, jummah_1_jamah time,
  jummah_2_begins time, jummah_2_jamah time,
  is_ramadan boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.prayer_times add column if not exists updated_at timestamptz not null default now();
alter table public.prayer_times add column if not exists updated_by uuid references auth.users(id);
create unique index if not exists prayer_times_d_date_unique on public.prayer_times(d_date);
alter table public.prayer_times enable row level security;
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='prayer_times' loop
    execute format('drop policy if exists %I on public.prayer_times', p.policyname);
  end loop;
end $$;
create policy "prayer public read" on public.prayer_times for select using (true);
create policy "prayer admin insert" on public.prayer_times for insert with check (public.has_role(array['admin','super_admin']));
create policy "prayer admin update" on public.prayer_times for update using (public.has_role(array['admin','super_admin'])) with check (public.has_role(array['admin','super_admin']));
create policy "prayer admin delete" on public.prayer_times for delete using (public.has_role(array['super_admin']));

-- ---------- Audit log ----------
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id),
  actor_name text,
  table_name text not null,
  record_id text,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
alter table public.audit_log add column if not exists actor_name text;
alter table public.audit_log enable row level security;
drop policy if exists "audit admin read" on public.audit_log;
create policy "audit admin read" on public.audit_log for select using (public.has_role(array['admin','super_admin']));

create or replace function public.set_update_metadata()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end; $$;

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  audit_actor_name text;
begin
  select coalesce(
    nullif(auth.jwt()->'user_metadata'->>'audit_name', ''),
    nullif(p.display_name, ''),
    'Staff'
  )
  into audit_actor_name
  from (select 1) seed
  left join public.profiles p on p.id = auth.uid();

  if tg_op = 'INSERT' then
    insert into public.audit_log(actor_id, actor_name, table_name, record_id, action, new_data)
    values(auth.uid(), audit_actor_name, tg_table_name, coalesce(to_jsonb(new)->>'id', to_jsonb(new)->>'d_date', ''), tg_op, to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_log(actor_id, actor_name, table_name, record_id, action, old_data, new_data)
    values(auth.uid(), audit_actor_name, tg_table_name, coalesce(to_jsonb(new)->>'id', to_jsonb(new)->>'d_date', ''), tg_op, to_jsonb(old), to_jsonb(new));
    return new;
  else
    insert into public.audit_log(actor_id, actor_name, table_name, record_id, action, old_data)
    values(auth.uid(), audit_actor_name, tg_table_name, coalesce(to_jsonb(old)->>'id', to_jsonb(old)->>'d_date', ''), tg_op, to_jsonb(old));
    return old;
  end if;
end; $$;

-- Attach update metadata to content tables and named audit logging to all managed writes.
do $$
declare t text;
begin
  foreach t in array array['page_content','events','announcements','livestream_settings','team_members','prayer_times'] loop
    execute format('drop trigger if exists set_update_metadata on public.%I', t);
    execute format('create trigger set_update_metadata before update on public.%I for each row execute function public.set_update_metadata()', t);
  end loop;

  foreach t in array array['page_content','events','announcements','livestream_settings','team_members','prayer_times','profiles'] loop
    execute format('drop trigger if exists audit_changes on public.%I', t);
    execute format('create trigger audit_changes after insert or update or delete on public.%I for each row execute function public.write_audit_log()', t);
  end loop;
end $$;

-- ---------- Storage ----------
insert into storage.buckets (id, name, public) values ('site-images','site-images',true) on conflict (id) do update set public=true;
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'JIC site-images%' loop
    execute format('drop policy if exists %I on storage.objects', p.policyname);
  end loop;
end $$;
create policy "JIC site-images public read" on storage.objects for select using (bucket_id='site-images');
create policy "JIC site-images upload" on storage.objects for insert with check (bucket_id='site-images' and public.has_role(array['teacher','events_manager','content_editor','admin','super_admin']));
create policy "JIC site-images update" on storage.objects for update using (bucket_id='site-images' and public.has_role(array['content_editor','admin','super_admin'])) with check (bucket_id='site-images' and public.has_role(array['content_editor','admin','super_admin']));
create policy "JIC site-images delete" on storage.objects for delete using (bucket_id='site-images' and public.has_role(array['admin','super_admin']));

-- IMPORTANT BOOTSTRAP STEP:
-- 1) Create/login the trusted owner account in Supabase Auth.
-- 2) Promote exactly that account with:
--    update public.profiles set role='super_admin' where id=(select id from auth.users where email='YOUR_EMAIL');
-- 3) Keep public email/password signup disabled in Supabase Auth settings.
