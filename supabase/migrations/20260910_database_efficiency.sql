-- JIC database efficiency cleanup. Safe to run repeatedly.

-- Cover foreign keys used by audit/update metadata.
create index if not exists announcements_updated_by_idx on public.announcements(updated_by);
create index if not exists audit_log_actor_id_idx on public.audit_log(actor_id);
create index if not exists events_updated_by_idx on public.events(updated_by);
create index if not exists livestream_settings_updated_by_idx on public.livestream_settings(updated_by);
create index if not exists page_content_updated_by_idx on public.page_content(updated_by);
create index if not exists prayer_times_updated_by_idx on public.prayer_times(updated_by);
create index if not exists team_members_updated_by_idx on public.team_members(updated_by);

-- d_date already has a unique constraint/index from the table definition.
drop index if exists public.prayer_times_d_date_unique;

-- One SELECT policy is cheaper and clearer than overlapping permissive policies.
drop policy if exists "profiles own read" on public.profiles;
drop policy if exists "profiles admin read" on public.profiles;
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles
for select using (id = auth.uid() or public.has_role(array['admin','super_admin']));

-- Avoid FOR ALL overlapping the public SELECT policy on team_members.
drop policy if exists "team authorised write" on public.team_members;
drop policy if exists "team authorised insert" on public.team_members;
drop policy if exists "team authorised update" on public.team_members;
drop policy if exists "team authorised delete" on public.team_members;
create policy "team authorised insert" on public.team_members
for insert with check (public.has_role(array['content_editor','admin','super_admin']));
create policy "team authorised update" on public.team_members
for update using (public.has_role(array['content_editor','admin','super_admin']))
with check (public.has_role(array['content_editor','admin','super_admin']));
create policy "team authorised delete" on public.team_members
for delete using (public.has_role(array['content_editor','admin','super_admin']));
