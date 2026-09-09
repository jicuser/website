-- Security hardening applied to the JIC Supabase project on 2026-09-09.
-- Keeps privileged role helpers out of the exposed public API schema,
-- preserves RLS enforcement, and restricts public CMS image uploads.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, anon;

create or replace function private.current_user_role()
returns text
language sql
stable
security definer
set search_path = public, private
as $$
  select case when p.is_active then p.role else 'viewer' end
  from public.profiles p
  where p.id = (select auth.uid());
$$;

create or replace function private.has_role(allowed text[])
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select coalesce(private.current_user_role() = any(allowed), false);
$$;

revoke all on function public.has_role(text[]) from public, anon, authenticated;
revoke all on function public.current_user_role() from public, anon, authenticated;
grant execute on function private.current_user_role() to anon, authenticated;
grant execute on function private.has_role(text[]) to anon, authenticated;

-- Profiles
drop policy if exists "profiles own read" on public.profiles;
drop policy if exists "profiles admin read" on public.profiles;
drop policy if exists "profiles superadmin update" on public.profiles;
create policy "profiles own read" on public.profiles for select using (id = (select auth.uid()));
create policy "profiles admin read" on public.profiles for select using (private.has_role(array['admin','super_admin']));
create policy "profiles superadmin update" on public.profiles for update using (private.has_role(array['super_admin'])) with check (private.has_role(array['super_admin']));

-- Page content
drop policy if exists "page content authorised insert" on public.page_content;
drop policy if exists "page content authorised update" on public.page_content;
drop policy if exists "page content authorised delete" on public.page_content;
create policy "page content authorised insert" on public.page_content for insert with check (private.has_role(array['content_editor','admin','super_admin']));
create policy "page content authorised update" on public.page_content for update using (private.has_role(array['content_editor','admin','super_admin'])) with check (private.has_role(array['content_editor','admin','super_admin']));
create policy "page content authorised delete" on public.page_content for delete using (private.has_role(array['admin','super_admin']));

-- Events
drop policy if exists "events public read" on public.events;
drop policy if exists "events authorised insert" on public.events;
drop policy if exists "events authorised update" on public.events;
drop policy if exists "events authorised delete" on public.events;
create policy "events public read" on public.events for select using (published or private.has_role(array['events_manager','content_editor','admin','super_admin']));
create policy "events authorised insert" on public.events for insert with check (private.has_role(array['events_manager','content_editor','admin','super_admin']));
create policy "events authorised update" on public.events for update using (private.has_role(array['events_manager','content_editor','admin','super_admin'])) with check (private.has_role(array['events_manager','content_editor','admin','super_admin']));
create policy "events authorised delete" on public.events for delete using (private.has_role(array['admin','super_admin']));

-- Announcements
drop policy if exists "announcements public read" on public.announcements;
drop policy if exists "announcements authorised insert" on public.announcements;
drop policy if exists "announcements authorised update" on public.announcements;
drop policy if exists "announcements admin delete" on public.announcements;
create policy "announcements public read" on public.announcements for select using (published or private.has_role(array['teacher','events_manager','content_editor','admin','super_admin']));
create policy "announcements authorised insert" on public.announcements for insert with check (private.has_role(array['teacher','events_manager','content_editor','admin','super_admin']));
create policy "announcements authorised update" on public.announcements for update using (private.has_role(array['teacher','events_manager','content_editor','admin','super_admin'])) with check (private.has_role(array['teacher','events_manager','content_editor','admin','super_admin']));
create policy "announcements admin delete" on public.announcements for delete using (private.has_role(array['admin','super_admin']));

-- Livestream
drop policy if exists "livestream authorised update" on public.livestream_settings;
create policy "livestream authorised update" on public.livestream_settings for update using (private.has_role(array['content_editor','admin','super_admin'])) with check (private.has_role(array['content_editor','admin','super_admin']));

-- Team
drop policy if exists "team public read" on public.team_members;
drop policy if exists "team authorised write" on public.team_members;
create policy "team public read" on public.team_members for select using (published or private.has_role(array['content_editor','admin','super_admin']));
create policy "team authorised write" on public.team_members for all using (private.has_role(array['content_editor','admin','super_admin'])) with check (private.has_role(array['content_editor','admin','super_admin']));

-- Prayer times
drop policy if exists "prayer admin insert" on public.prayer_times;
drop policy if exists "prayer admin update" on public.prayer_times;
drop policy if exists "prayer admin delete" on public.prayer_times;
create policy "prayer admin insert" on public.prayer_times for insert with check (private.has_role(array['admin','super_admin']));
create policy "prayer admin update" on public.prayer_times for update using (private.has_role(array['admin','super_admin'])) with check (private.has_role(array['admin','super_admin']));
create policy "prayer admin delete" on public.prayer_times for delete using (private.has_role(array['super_admin']));

-- Audit log
drop policy if exists "audit admin read" on public.audit_log;
create policy "audit admin read" on public.audit_log for select using (private.has_role(array['admin','super_admin']));

-- Storage
drop policy if exists "JIC site-images upload" on storage.objects;
drop policy if exists "JIC site-images update" on storage.objects;
drop policy if exists "JIC site-images delete" on storage.objects;
create policy "JIC site-images upload" on storage.objects for insert with check (bucket_id='site-images' and private.has_role(array['teacher','events_manager','content_editor','admin','super_admin']));
create policy "JIC site-images update" on storage.objects for update using (bucket_id='site-images' and private.has_role(array['content_editor','admin','super_admin'])) with check (bucket_id='site-images' and private.has_role(array['content_editor','admin','super_admin']));
create policy "JIC site-images delete" on storage.objects for delete using (bucket_id='site-images' and private.has_role(array['admin','super_admin']));

update storage.buckets
set file_size_limit = 8388608,
    allowed_mime_types = array['image/jpeg','image/png','image/webp']
where id = 'site-images';
