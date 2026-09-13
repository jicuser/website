begin;

create table public.learning_guardians (
 student_id uuid not null references public.learning_students on delete cascade,
 user_id uuid not null references public.profiles on delete cascade,
 relationship text not null default 'Guardian' check(length(trim(relationship)) between 1 and 80),
 created_at timestamptz not null default now(), primary key(student_id,user_id));
create index learning_guardians_user on public.learning_guardians(user_id);
-- This stores additional guardians only; guardian_id remains the primary link.
-- Do not copy that link here: changing it must revoke the previous primary guardian.

create table public.learning_department_heads (
 department text not null check(department in('adult','madrassah')),
 user_id uuid not null references public.profiles on delete cascade,
 created_at timestamptz not null default now(), primary key(department,user_id));
create index learning_department_heads_user on public.learning_department_heads(user_id);

create or replace function private.own_student(student uuid, account uuid default auth.uid())
 returns boolean language sql stable security definer set search_path='' as $$
 select private.active_account(account) and exists(select 1 from public.learning_students s
 where s.id=student and (s.user_id=account or s.guardian_id=account or exists(
 select 1 from public.learning_guardians g where g.student_id=s.id and g.user_id=account))); $$;
create or replace function private.teaches(course uuid) returns boolean
 language sql stable security definer set search_path='' as $$
 select private.active_account(auth.uid()) and (private.workspace_owner() or exists(
 select 1 from public.learning_staff where course_id=course and user_id=auth.uid()) or exists(
 select 1 from public.learning_department_heads h join public.learning_courses c on c.department=h.department
 where c.id=course and h.user_id=auth.uid())); $$;

alter table public.learning_guardians enable row level security;
alter table public.learning_department_heads enable row level security;
revoke all on public.learning_guardians,public.learning_department_heads from public,anon,authenticated;
grant all on public.learning_guardians,public.learning_department_heads to service_role;
grant select,insert,delete on public.learning_guardians,public.learning_department_heads to authenticated;
create policy guardian_read on public.learning_guardians for select to authenticated using(private.read_student(student_id));
create policy guardian_add on public.learning_guardians for insert to authenticated with check(private.workspace_owner() and private.active_account(user_id));
create policy guardian_remove on public.learning_guardians for delete to authenticated using(private.workspace_owner());
create policy heads_read on public.learning_department_heads for select to authenticated using(private.workspace_owner() or (private.active_account(auth.uid()) and user_id=(select auth.uid())));
create policy heads_add on public.learning_department_heads for insert to authenticated with check(private.workspace_owner() and private.active_account(user_id));
create policy heads_remove on public.learning_department_heads for delete to authenticated using(private.workspace_owner());

alter table public.learning_records add column score numeric(10,2),
 add column max_score numeric(10,2), add column due_on date, add column completed_at timestamptz,
 add constraint learning_score_pair check((score is null and max_score is null) or
 (kind='assessment' and score is not null and max_score is not null and max_score>0 and max_score<=1000000 and score>=0 and score<=max_score)),
 add constraint learning_plan_completion check(completed_at is null or kind='plan');
grant update(score,max_score,due_on) on public.learning_records to authenticated;
create or replace function private.stamp_learning_record() returns trigger language plpgsql set search_path='' as $$
 begin if tg_op='INSERT' then new.created_by=auth.uid(); new.created_at=now(); new.completed_at=null;
 else new.created_by=old.created_by; new.created_at=old.created_at; end if; return new; end; $$;
create function private.set_learning_plan_complete(p_id uuid,p_complete boolean) returns void
 language plpgsql security definer set search_path='' as $$
 declare item public.learning_records;
 begin
 select * into item from public.learning_records where id=p_id for update;
 if not found or item.kind<>'plan' or not private.read_learning_item(item.course_id,item.student_id,item.published)
 then raise exception 'Learning plan access required'; end if;
 update public.learning_records set completed_at=case when p_complete then now() end where id=p_id;
 end; $$;
create function public.set_learning_plan_complete(p_id uuid,p_complete boolean) returns void
 language sql security invoker set search_path='' as $$ select private.set_learning_plan_complete(p_id,p_complete); $$;
create function public.can_teach_course(p_course_id uuid) returns boolean
 language sql stable security invoker set search_path='' as $$ select private.teaches(p_course_id); $$;

create table public.learning_resources (
 id uuid primary key default gen_random_uuid(), course_id uuid not null references public.learning_courses on delete cascade,
 title text not null check(length(trim(title)) between 1 and 160), description text not null default '' check(length(description)<=6000),
 url text, object_path text, file_name text, mime_type text,
 published boolean not null default false, created_by uuid not null default auth.uid() references public.profiles,
 created_at timestamptz not null default now(),
 check((url is null)<>(object_path is null)),
 check(url is null or (length(url)<=2000 and url ~ '^https://[^/@[:space:]]+([/?#]|$)' and url !~ '[[:space:]\\]')),
 check(object_path is null or (length(object_path)<=220 and object_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[a-zA-Z0-9_-]{16,80}$')),
 check(file_name is null or (length(file_name) between 1 and 200)),
 check(mime_type is null or mime_type in('application/pdf','image/jpeg','image/png','image/webp','audio/mpeg','audio/mp4','video/mp4')));
create index learning_resources_course on public.learning_resources(course_id,published,created_at desc);
create unique index learning_resources_object on public.learning_resources(object_path) where object_path is not null;
alter table public.learning_resources enable row level security;
revoke all on public.learning_resources from public,anon,authenticated;
grant all on public.learning_resources to service_role;
grant select,insert,delete on public.learning_resources to authenticated;
grant update(title,description,published) on public.learning_resources to authenticated;
create policy resource_read on public.learning_resources for select to authenticated using(private.teaches(course_id) or (published and private.read_course(course_id)));
create policy resource_add on public.learning_resources for insert to authenticated with check(private.teaches(course_id) and created_by=(select auth.uid()) and
 (object_path is null or (split_part(object_path,'/',1)=course_id::text and split_part(object_path,'/',2)=(select auth.uid())::text)));
create policy resource_update on public.learning_resources for update to authenticated using(private.teaches(course_id)) with check(private.teaches(course_id));
create policy resource_delete on public.learning_resources for delete to authenticated using(private.teaches(course_id));
create function private.stamp_learning_resource() returns trigger language plpgsql set search_path='' as $$
 begin new.created_by=auth.uid(); new.created_at=now(); return new; end; $$;
create trigger resource_stamp before insert on public.learning_resources for each row execute function private.stamp_learning_resource();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('course-resources','course-resources',false,26214400,array['application/pdf','image/jpeg','image/png','image/webp','audio/mpeg','audio/mp4','video/mp4']);
create function private.can_write_course_file(object_name text) returns boolean
 language plpgsql stable security definer set search_path='' as $$
 declare course uuid;
 begin
 if object_name !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[a-zA-Z0-9_-]{16,80}$' then return false; end if;
 begin course=split_part(object_name,'/',1)::uuid; exception when invalid_text_representation then return false; end;
 return split_part(object_name,'/',2)=auth.uid()::text and private.teaches(course);
 end; $$;
create function private.can_read_course_file(object_name text) returns boolean
 language sql stable security definer set search_path='' as $$
 select private.can_write_course_file(object_name) or exists(select 1 from public.learning_resources r
 where r.object_path=object_name and (private.teaches(r.course_id) or (r.published and private.read_course(r.course_id)))); $$;
create policy course_file_insert on storage.objects for insert to authenticated
 with check(bucket_id='course-resources' and private.can_write_course_file(name));
create policy course_file_read on storage.objects for select to authenticated
 using(bucket_id='course-resources' and private.can_read_course_file(name));
create policy course_file_delete on storage.objects for delete to authenticated
 using(bucket_id='course-resources' and (private.workspace_owner() or private.can_write_course_file(name)));

revoke all on function private.set_learning_plan_complete(uuid,boolean),private.can_write_course_file(text),private.can_read_course_file(text),private.stamp_learning_resource() from public,anon,authenticated;
grant execute on function private.set_learning_plan_complete(uuid,boolean),private.can_write_course_file(text),private.can_read_course_file(text) to authenticated,service_role;
revoke all on function public.set_learning_plan_complete(uuid,boolean),public.can_teach_course(uuid) from public,anon;
grant execute on function public.set_learning_plan_complete(uuid,boolean),public.can_teach_course(uuid) to authenticated,service_role;

-- Every active linked guardian receives a published record update, once per event.
create or replace function private.learning_notification() returns trigger language plpgsql security definer set search_path='' as $$
 begin if new.published and (tg_op='INSERT' or not old.published) then
 insert into public.user_notifications(user_id,kind,entity_id)
 select distinct account,'learning',new.id from (
 select s.user_id as account from public.learning_students s where s.id=new.student_id
 union select s.guardian_id from public.learning_students s where s.id=new.student_id
 union select g.user_id from public.learning_guardians g where g.student_id=new.student_id) people
 where private.can_receive_notification(account,'learning',new.id);
 end if; return new; end; $$;
commit;
