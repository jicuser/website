-- Staff labels never grant access. Existing access is converted once; new accounts start empty.
alter table public.profiles add column is_owner boolean not null default false,
 add column permissions text[] not null default '{}', add column staff_kinds text[] not null default '{}';
update public.profiles set is_owner = role = 'super_admin', permissions = case role
 when 'admin' then array['content','media','events','announcements','prayer_times','team','livestream','tv','broadcast','forms_contact','forms_madrassah','forms_itikaaf','audit','delete_content']::text[]
 when 'content_editor' then array['content','media','events','announcements','team','livestream','tv']::text[]
 when 'events_manager' then array['events','announcements','media','forms_itikaaf']::text[]
 when 'teacher' then array['announcements','media','forms_madrassah']::text[]
 when 'tv_operator' then array['tv']::text[] else '{}'::text[] end,
 staff_kinds = case when role='teacher' then array['teacher']::text[] else '{}'::text[] end;
alter table public.profiles add constraint permissions_allowed check (permissions <@ array['content','media','events','announcements','prayer_times','team','livestream','tv','broadcast','forms_contact','forms_madrassah','forms_itikaaf','users','audit','delete_content']::text[] and array_position(permissions,null) is null),
 add constraint staff_kinds_allowed check(staff_kinds <@ array['imam','teacher','volunteer','office','media','tv_team']::text[] and array_position(staff_kinds,null) is null);
create or replace function private.has_permission(required text) returns boolean
 language sql stable security definer set search_path='' as $$
 select coalesce((select is_active and (is_owner or required=any(permissions))
 from public.profiles where id=(select auth.uid())),false); $$;
revoke all on function private.has_permission(text) from public;
grant execute on function private.has_permission(text) to anon, authenticated, service_role;
-- Replace only this application's policies; preserve unrelated storage buckets.
do $$ declare p record; begin for p in select schemaname,tablename,policyname from pg_policies where (schemaname='public' and tablename=any(array['profiles','page_content','page_sections','events','announcements','team_members','prayer_times','livestream_settings','audit_log','form_submissions']::text[])) or (schemaname='storage' and tablename='objects' and policyname like 'JIC site-images %') loop execute format('drop policy %I on %I.%I',p.policyname,p.schemaname,p.tablename); end loop; end $$;
revoke insert,update,delete on public.profiles from anon,authenticated;
create policy profiles_read on public.profiles for select using(id=(select auth.uid()) or (select private.has_permission('users')));
create policy page_content_read on public.page_content for select using(true);
create policy page_content_insert on public.page_content for insert to authenticated with check((select private.has_permission('content')));
create policy page_content_update on public.page_content for update to authenticated using((select private.has_permission('content'))) with check((select private.has_permission('content')));
create policy page_content_delete on public.page_content for delete to authenticated using((select private.has_permission('content')) and (select private.has_permission('delete_content')));
create policy page_sections_read on public.page_sections for select using(published or (select private.has_permission('content')));
create policy page_sections_insert on public.page_sections for insert to authenticated with check((select private.has_permission('content')));
create policy page_sections_update on public.page_sections for update to authenticated using((select private.has_permission('content'))) with check((select private.has_permission('content')));
create policy page_sections_delete on public.page_sections for delete to authenticated using((select private.has_permission('content')) and (select private.has_permission('delete_content')));
create policy events_read on public.events for select using(published or (select private.has_permission('events')));
create policy events_insert on public.events for insert to authenticated with check((select private.has_permission('events')));
create policy events_update on public.events for update to authenticated using((select private.has_permission('events'))) with check((select private.has_permission('events')));
create policy events_delete on public.events for delete to authenticated using((select private.has_permission('events')) and (select private.has_permission('delete_content')));
create policy announcements_read on public.announcements for select using(published or (select private.has_permission('announcements')));
create policy announcements_insert on public.announcements for insert to authenticated with check((select private.has_permission('announcements')));
create policy announcements_update on public.announcements for update to authenticated using((select private.has_permission('announcements'))) with check((select private.has_permission('announcements')));
create policy announcements_delete on public.announcements for delete to authenticated using((select private.has_permission('announcements')) and (select private.has_permission('delete_content')));
create policy team_members_read on public.team_members for select using(published or (select private.has_permission('team')));
create policy team_members_insert on public.team_members for insert to authenticated with check((select private.has_permission('team')));
create policy team_members_update on public.team_members for update to authenticated using((select private.has_permission('team'))) with check((select private.has_permission('team')));
create policy team_members_delete on public.team_members for delete to authenticated using((select private.has_permission('team')) and (select private.has_permission('delete_content')));
create policy prayer_times_read on public.prayer_times for select using(true);
create policy prayer_times_insert on public.prayer_times for insert to authenticated with check((select private.has_permission('prayer_times')));
create policy prayer_times_update on public.prayer_times for update to authenticated using((select private.has_permission('prayer_times'))) with check((select private.has_permission('prayer_times')));
create policy prayer_times_delete on public.prayer_times for delete to authenticated using((select private.has_permission('prayer_times')) and (select private.has_permission('delete_content')));
create policy livestream_settings_read on public.livestream_settings for select using(true);
create policy livestream_settings_update on public.livestream_settings for update to authenticated using((select private.has_permission('livestream'))) with check((select private.has_permission('livestream')));
create policy audit_read on public.audit_log for select to authenticated using((select private.has_permission('audit')));
create policy forms_read on public.form_submissions for select to authenticated using(private.has_permission('forms_' || kind));
create policy forms_update on public.form_submissions for update to authenticated using(private.has_permission('forms_' || kind)) with check(private.has_permission('forms_' || kind));
create policy "JIC site-images public read" on storage.objects for select using(bucket_id='site-images');
create policy "JIC site-images upload" on storage.objects for insert to authenticated with check(bucket_id='site-images' and (select private.has_permission('media')));
create policy "JIC site-images update" on storage.objects for update to authenticated using(bucket_id='site-images' and (select private.has_permission('media'))) with check(bucket_id='site-images' and (select private.has_permission('media')));
create policy "JIC site-images delete" on storage.objects for delete to authenticated using(bucket_id='site-images' and (select private.has_permission('media')) and (select private.has_permission('delete_content')));
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.profiles(id,display_name) values(new.id,left(coalesce(new.raw_user_meta_data->>'display_name',split_part(new.email,'@',1)),120)) on conflict(id) do nothing; return new; end; $$;
revoke all on function public.handle_new_user() from public,anon,authenticated;
drop function public.get_my_profile();
create function public.get_my_profile() returns table(id uuid,display_name text,is_active boolean,is_owner boolean,permissions text[],staff_kinds text[])
language sql stable security invoker set search_path='' as $$ select id,display_name,is_active,is_owner,permissions,staff_kinds from public.profiles where id=(select auth.uid()); $$;
revoke all on function public.get_my_profile() from public,anon;
grant execute on function public.get_my_profile() to authenticated,service_role;
-- Both rows are locked before delegation checks, so concurrent grants cannot bypass the limit.
create function public.manage_staff_access(actor uuid,target uuid,new_permissions text[] default null,new_kinds text[] default null,enabled boolean default null)
returns void language plpgsql security invoker set search_path='' as $$
declare a public.profiles; t public.profiles;
begin
 perform 1 from public.profiles where id in(actor,target) order by id for update;
 select * into a from public.profiles where id=actor;
 select * into t from public.profiles where id=target;
 if a.id is null or t.id is null or not a.is_active or not(a.is_owner or 'users'=any(a.permissions)) then raise exception 'Staff management permission required'; end if;
 if actor=target or t.is_owner then raise exception 'This account is protected'; end if;
 if not a.is_owner and (not(t.permissions <@ a.permissions) or (new_permissions is not null and not(new_permissions <@ a.permissions))) then raise exception 'You can only manage permissions you hold'; end if;
 update public.profiles set permissions=coalesce(new_permissions,permissions),staff_kinds=coalesce(new_kinds,staff_kinds),is_active=coalesce(enabled,is_active),updated_at=now() where id=target;
 insert into public.audit_log(actor_id,actor_name,table_name,record_id,action,old_data,new_data)
 values(actor,coalesce(a.display_name,'Staff'),'profiles',target::text,'UPDATE',to_jsonb(t),(select to_jsonb(p) from public.profiles p where id=target));
end; $$;
revoke all on function public.manage_staff_access(uuid,uuid,text[],text[],boolean) from public,anon,authenticated;
grant execute on function public.manage_staff_access(uuid,uuid,text[],text[],boolean) to service_role;
drop function if exists public.has_role(text[]);
drop function if exists private.has_role(text[]);
drop function if exists public.current_user_role();
drop function if exists private.current_user_role();
alter table public.profiles drop column role;
