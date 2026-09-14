-- Published programme pages and their private admin workflow.
begin;
create table public.site_pages (
 id uuid primary key default gen_random_uuid(),
 slug text not null unique check(slug ~ '^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$'),
 title text not null check(length(trim(title)) between 1 and 160),
 body text not null default '' check(length(body)<=12000), image_url text not null default '' check(length(image_url)<=2000),
 placement text not null check(placement in('/education','/education/courses','/madrassah','/youth','/youth/classes-skills','/worship','/services','/about','/projects')),
 kind text not null default 'page' check(kind in('page','course','activity','talk','event','announcement')),
 schedule text not null default '' check(length(schedule)<=400), source_poster_id text unique check(source_poster_id ~ '^[a-zA-Z0-9_-]{1,64}$'),
 form_id uuid references public.custom_forms,
 registration text not null default 'none' check(registration in('none','interest','application','registration')),
 published boolean not null default false, created_by uuid references public.profiles, updated_by uuid references public.profiles,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index site_pages_placement on public.site_pages(placement) where published;
create index site_pages_form on public.site_pages(form_id) where form_id is not null;
alter table public.site_pages enable row level security;
revoke all on public.site_pages from public,anon,authenticated;
grant all on public.site_pages to service_role;
grant select on public.site_pages to authenticated;
create policy site_pages_editors on public.site_pages for select to authenticated using((select private.has_permission('content')));

create function private.save_site_page(p_page jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
 declare previous public.site_pages; saved public.site_pages; target uuid=coalesce((p_page->>'id')::uuid,gen_random_uuid()); linked uuid=(nullif(p_page->>'form_id',''))::uuid; image text=coalesce(p_page->>'image_url','');
 begin
 if not private.has_permission('content') then raise exception 'Content permission required'; end if;
 if p_page is null or jsonb_typeof(p_page)<>'object' or octet_length(p_page::text)>20000 then raise exception 'Invalid page'; end if;
 if image<>'' and (image ~ '[[:space:]\\]' or not(image ~ '^https://[a-zA-Z0-9.-]+(:[0-9]+)?(/.*)?$' or image ~ '^/[^/].*$')) then raise exception 'Use an HTTPS or site image address'; end if;
 select * into previous from public.site_pages where id=target for update;
 if previous.id is not null then
 if previous.updated_at is distinct from (p_page->>'expected_updated_at')::timestamptz then raise exception 'This page changed in another session. Reload before saving.'; end if;
 if previous.slug is distinct from p_page->>'slug' then raise exception 'The saved page address is protected; change placement without breaking links'; end if;
 end if;
 if linked is not null and not exists(select 1 from public.custom_forms f where f.id=linked and (f.published_version is not null or private.staff_custom_form(f.id))) then raise exception 'Choose an available form'; end if;
 if coalesce(p_page->>'registration','none')='none' then linked=null; end if;
 insert into public.site_pages(id,slug,title,body,image_url,placement,kind,schedule,source_poster_id,form_id,registration,published,created_by,updated_by)
 values(target,p_page->>'slug',trim(p_page->>'title'),coalesce(p_page->>'body',''),image,p_page->>'placement',coalesce(p_page->>'kind','page'),coalesce(p_page->>'schedule',''),nullif(p_page->>'source_poster_id',''),linked,coalesce(p_page->>'registration','none'),coalesce((p_page->>'published')::boolean,false),auth.uid(),auth.uid())
 on conflict(id) do update set title=excluded.title,body=excluded.body,image_url=excluded.image_url,placement=excluded.placement,kind=excluded.kind,schedule=excluded.schedule,source_poster_id=excluded.source_poster_id,form_id=excluded.form_id,registration=excluded.registration,published=excluded.published,updated_by=auth.uid(),updated_at=clock_timestamp()
 returning * into saved;
 insert into public.audit_log(actor_id,actor_name,table_name,record_id,action) values(auth.uid(),(select display_name from public.profiles where id=auth.uid()),'site_pages',target::text,case when previous.id is null then 'INSERT' else 'UPDATE' end);
 return to_jsonb(saved); end; $$;
create function public.save_site_page(p_page jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.save_site_page(p_page); $$;
create function private.public_site_page(p_slug text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',p.id,'slug',p.slug,'title',p.title,'body',p.body,'image_url',p.image_url,'placement',p.placement,'kind',p.kind,'schedule',p.schedule,'registration',p.registration,'source_poster_id',p.source_poster_id,
 'form',case when f.id is null then null else jsonb_build_object('id',f.id,'slug',case when f.published_version is not null then f.slug end,'open',f.enabled and f.published_version is not null and exists(select 1 from public.custom_form_staff s where s.form_id=f.id and s.role='responsible' and private.active_account(s.user_id))) end)
 from public.site_pages p left join public.custom_forms f on f.id=p.form_id where p.slug=p_slug and p.published; $$;
create function public.get_site_page(p_slug text) returns jsonb language sql stable security invoker set search_path='' as $$ select private.public_site_page(p_slug); $$;
create function private.list_site_pages(p_placement text default null) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(p)),'[]'::jsonb) from (select id,slug,title,image_url,placement,kind,schedule,registration,source_poster_id from public.site_pages where published and (p_placement is null or placement=p_placement) order by title,id limit 200) p; $$;
create function public.list_site_pages(p_placement text default null) returns jsonb language sql stable security invoker set search_path='' as $$ select private.list_site_pages(p_placement); $$;

create or replace function private.read_task(task uuid,account uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$
 select private.active_account(account) and exists(select 1 from public.work_tasks t join public.profiles p on p.id=account
 where t.id=task and (p.is_owner or t.assigned_to=account or t.created_by=account or exists(select 1 from public.form_submissions f where f.id=t.form_id and f.kind='custom' and private.manage_custom_form(f.custom_form_id,account)))
 and (t.form_id is null or exists(select 1 from public.form_submissions f where f.id=t.form_id and case when f.kind='custom' then private.staff_custom_form(f.custom_form_id,account) else private.account_permission(account,'forms_'||f.kind) end))); $$;
create function private.admin_forms_overview() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(f)),'[]'::jsonb) from (
 select c.id,c.slug,c.title,c.description,c.enabled,c.published_version,c.updated_at,private.manage_custom_form(c.id) as can_manage,
 (select count(*) from public.form_submissions s where s.custom_form_id=c.id and s.status='new') as new_count,
 (select count(*) from public.form_submissions s where s.custom_form_id=c.id and s.status='done') as done_count,
 (select count(*) from public.work_tasks t join public.form_submissions s on s.id=t.form_id where s.custom_form_id=c.id and t.status<>'done' and private.read_task(t.id)) as open_actions,
 coalesce((select jsonb_agg(jsonb_build_object('user_id',p.id,'display_name',p.display_name,'role',a.role,'active',p.is_active) order by a.role,p.display_name) from public.custom_form_staff a join public.profiles p on p.id=a.user_id where a.form_id=c.id),'[]'::jsonb) as people,
 coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'slug',p.slug,'title',p.title,'placement',p.placement,'published',p.published)) from public.site_pages p where p.form_id=c.id),'[]'::jsonb) as pages
 from public.custom_forms c where private.staff_custom_form(c.id) order by c.updated_at desc,c.id limit 500) f; $$;
create function public.admin_forms_overview() returns jsonb language sql security invoker stable set search_path='' as $$ select private.admin_forms_overview(); $$;
create function private.set_custom_form_open(p_form_id uuid,p_enabled boolean) returns void language plpgsql security definer set search_path='' as $$
 begin
 perform 1 from public.custom_forms where id=p_form_id for update;
 if not found or not private.manage_custom_form(p_form_id) then raise exception 'Form manager permission required'; end if;
 if p_enabled is null then raise exception 'Choose open or closed'; end if;
 update public.custom_forms set enabled=p_enabled,updated_at=clock_timestamp() where id=p_form_id;
 end; $$;
create function public.set_custom_form_open(p_form_id uuid,p_enabled boolean) returns void language sql security invoker set search_path='' as $$ select private.set_custom_form_open(p_form_id,p_enabled); $$;
create function private.admin_form_tasks(p_form_id uuid default null,p_offset integer default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
 declare result jsonb;
 begin
 if not private.active_account(auth.uid()) then raise exception 'Active account required'; end if;
 if p_offset is null or p_offset not between 0 and 25000 then raise exception 'Invalid page'; end if;
 if p_form_id is not null and not private.staff_custom_form(p_form_id) then raise exception 'Form access required'; end if;
 with permitted as materialized (
 select t.*,p.display_name as assignee_name,s.custom_form_id,c.title as form_title,(private.workspace_owner() or private.manage_custom_form(s.custom_form_id) or t.created_by=auth.uid()) as can_reassign
 from public.work_tasks t join public.profiles p on p.id=t.assigned_to left join public.form_submissions s on s.id=t.form_id left join public.custom_forms c on c.id=s.custom_form_id
 where private.read_task(t.id) and (p_form_id is null or s.custom_form_id=p_form_id)
 ), page as (select * from permitted order by (status='done'),due_at nulls last,created_at desc,id limit 25 offset p_offset)
 select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'::jsonb),'total',(select count(*) from permitted),'open_count',(select count(*) from permitted where status<>'done')) into result;
 return result; end; $$;
create function public.admin_form_tasks(p_form_id uuid default null,p_offset integer default 0) returns jsonb language sql stable security invoker set search_path='' as $$ select private.admin_form_tasks(p_form_id,p_offset); $$;
create function private.reassign_form_task(p_task_id uuid,p_assigned_to uuid,p_expected_updated_at timestamptz) returns void language plpgsql security definer set search_path='' as $$
 declare task public.work_tasks; form uuid;
 begin
 select * into task from public.work_tasks where id=p_task_id for update;
 select custom_form_id into form from public.form_submissions where id=task.form_id;
 if task.id is null or not private.read_task(task.id) or not(private.workspace_owner() or private.manage_custom_form(form) or task.created_by=auth.uid()) then raise exception 'Task management access required'; end if;
 if task.updated_at is distinct from p_expected_updated_at then raise exception 'This action changed. Refresh before reassigning.'; end if;
 if form is null or not private.staff_custom_form(form,p_assigned_to) then raise exception 'Choose a person with access to this form'; end if;
 update public.work_tasks set assigned_to=p_assigned_to where id=task.id;
 insert into public.audit_log(actor_id,actor_name,table_name,record_id,action,old_data,new_data) values(auth.uid(),(select display_name from public.profiles where id=auth.uid()),'work_tasks',task.id::text,'REASSIGN',jsonb_build_object('assigned_to',task.assigned_to),jsonb_build_object('assigned_to',p_assigned_to));
 end; $$;
create function public.reassign_form_task(p_task_id uuid,p_assigned_to uuid,p_expected_updated_at timestamptz) returns void language sql security invoker set search_path='' as $$ select private.reassign_form_task(p_task_id,p_assigned_to,p_expected_updated_at); $$;
create or replace function private.task_notification() returns trigger language plpgsql security definer set search_path='' as $$
 begin
 if tg_op='INSERT' or new.assigned_to is distinct from old.assigned_to or new.status is distinct from old.status then insert into public.user_notifications(user_id,kind,entity_id) values(new.assigned_to,'task',new.id); end if;
 return new; end; $$;
drop trigger task_notify on public.work_tasks;
create trigger task_notify after insert or update of assigned_to,status on public.work_tasks for each row execute function private.task_notification();

-- A per-form assignment opens Forms, not every custom response or a wider admin role.
drop function if exists public.get_my_profile();
create function public.get_my_profile() returns table(id uuid,display_name text,is_active boolean,is_owner boolean,permissions text[],staff_kinds text[],has_assigned_forms boolean) language sql stable security invoker set search_path='' as $$
 select p.id,p.display_name,p.is_active,p.is_owner,p.permissions,p.staff_kinds,exists(select 1 from public.custom_form_staff s where s.user_id=p.id) from public.profiles p where p.id=(select auth.uid()); $$;
revoke all on function public.get_my_profile() from public,anon;
grant execute on function public.get_my_profile() to authenticated,service_role;
do $$ declare f record; begin
 for f in select p.oid::regprocedure signature,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','private') and p.proname=any(array['save_site_page','public_site_page','get_site_page','list_site_pages','admin_forms_overview','set_custom_form_open','admin_form_tasks','reassign_form_task']) loop
 execute format('revoke all on function %s from public,anon,authenticated',f.signature);
 execute format('grant execute on function %s to authenticated,service_role',f.signature);
 if f.proname in('public_site_page','get_site_page','list_site_pages') then execute format('grant execute on function %s to anon',f.signature); end if;
 end loop; end $$;
commit;
