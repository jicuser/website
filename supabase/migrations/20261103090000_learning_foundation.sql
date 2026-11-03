-- Learning-only upgrade for the current website forms schema. No legacy workspace activation.
begin;
create table private.learning_release (
 singleton boolean primary key default true check(singleton), enabled boolean not null default false
);
insert into private.learning_release default values;
revoke all on private.learning_release from public,anon,authenticated;
grant select,update on private.learning_release to service_role;
create function private.learning_live() returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select enabled from private.learning_release where singleton),false); $$;
create function private.learning_owner() returns boolean language sql stable security definer set search_path='' as $$
 select private.learning_live() and private.workspace_owner(); $$;
create table public.learning_courses (
 id uuid primary key default gen_random_uuid(), title text not null check(length(trim(title)) between 1 and 160),
 department text not null check(department in('adult','madrassah')), description text not null default '' check(length(description)<=6000),
 published boolean not null default false, archived boolean not null default false, capacity integer check(capacity between 1 and 1000), created_at timestamptz not null default now());
create table public.learning_staff (
 course_id uuid references public.learning_courses on delete cascade, user_id uuid references public.profiles on delete cascade,
 role text not null default 'teacher' check(role in('teacher','head_teacher')), primary key(course_id,user_id));
create index learning_staff_user on public.learning_staff(user_id);
create table public.learning_students (
 id uuid primary key default gen_random_uuid(), display_name text not null check(length(trim(display_name)) between 1 and 160),
 user_id uuid references public.profiles on delete set null, guardian_id uuid references public.profiles on delete set null,
 archived boolean not null default false, created_at timestamptz not null default now());
create index learning_students_user on public.learning_students(user_id);
create index learning_students_guardian on public.learning_students(guardian_id);
create table public.learning_enrolments (
 course_id uuid references public.learning_courses on delete cascade, student_id uuid references public.learning_students on delete cascade,
 active boolean not null default false, primary key(course_id,student_id));
create index learning_enrolments_student on public.learning_enrolments(student_id);
create table public.learning_sessions (
 id uuid primary key default gen_random_uuid(), course_id uuid not null references public.learning_courses on delete cascade,
 starts_at timestamptz not null, ends_at timestamptz, title text not null default '' check(length(title)<=160),
 created_at timestamptz not null default now(), check(ends_at is null or ends_at>starts_at));
create index learning_sessions_course on public.learning_sessions(course_id,starts_at);
create table public.learning_attendance (
 session_id uuid references public.learning_sessions on delete cascade, student_id uuid references public.learning_students on delete cascade,
 status text not null check(status in('present','absent','late','excused')), note text not null default '' check(length(note)<=2000),
 marked_by uuid not null references public.profiles, marked_at timestamptz not null default now(), primary key(session_id,student_id));
create index learning_attendance_student on public.learning_attendance(student_id);
create table public.learning_records (
 id uuid primary key default gen_random_uuid(), course_id uuid not null, student_id uuid not null,
 kind text not null check(kind in('progress','plan','assessment')), title text not null check(length(trim(title)) between 1 and 160),
 body text not null default '' check(length(body)<=16000), published boolean not null default false,
 created_by uuid not null default auth.uid() references public.profiles, created_at timestamptz not null default now(),
 foreign key(course_id,student_id) references public.learning_enrolments(course_id,student_id) on delete cascade);
create index learning_records_student on public.learning_records(student_id,created_at desc);
create table public.learning_meetings (
 id uuid primary key default gen_random_uuid(), student_id uuid not null, course_id uuid not null,
 requested_by uuid not null default auth.uid() references public.profiles, requested_at timestamptz not null default now(),
 proposed_at timestamptz, notes text not null default '' check(length(notes)<=4000),
 status text not null default 'requested' check(status in('requested','confirmed','completed','cancelled')),
 foreign key(course_id,student_id) references public.learning_enrolments(course_id,student_id) on delete cascade);
create index learning_meetings_course on public.learning_meetings(course_id,requested_at desc);
create table public.student_contributions (
 id uuid primary key default gen_random_uuid(), student_id uuid not null, course_id uuid not null,
 title text not null check(length(trim(title)) between 1 and 160), body text not null check(length(trim(body)) between 1 and 16000),
 kind text not null default 'poetry' check(kind in('poetry','reflection')), published boolean not null default false,
 created_by uuid not null default auth.uid() references public.profiles, created_at timestamptz not null default now(),
 foreign key(course_id,student_id) references public.learning_enrolments(course_id,student_id) on delete cascade);
create index student_contributions_course on public.student_contributions(course_id,created_at desc);

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

create function private.own_student(student uuid,account uuid default auth.uid()) returns boolean
language sql stable security definer set search_path='' as $$
 select private.learning_live() and private.active_account(account) and exists(select 1 from public.learning_students s
 where s.id=student and not s.archived and (s.user_id=account or s.guardian_id=account or exists(
 select 1 from public.learning_guardians g where g.student_id=s.id and g.user_id=account))); $$;
create function private.teaches(course uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.learning_live() and private.active_account(auth.uid()) and exists(select 1 from public.learning_courses c where c.id=course
 and (private.learning_owner() or (not c.archived and (exists(select 1 from public.learning_staff where course_id=c.id and user_id=auth.uid())
 or exists(select 1 from public.learning_department_heads where department=c.department and user_id=auth.uid()))))); $$;
create function private.read_student(student uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.learning_owner() or private.own_student(student) or exists(select 1 from public.learning_students s join public.learning_enrolments e on e.student_id=s.id
 where s.id=student and not s.archived and e.active and private.teaches(e.course_id)); $$;
create function private.read_course(course uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.teaches(course) or exists(select 1 from public.learning_enrolments e join public.learning_courses c on c.id=e.course_id
 where e.course_id=course and not c.archived and e.active and private.own_student(e.student_id)); $$;
create function private.read_learning_item(course uuid,student uuid,is_published boolean) returns boolean language sql stable security definer set search_path='' as $$
 select private.teaches(course) or (is_published and private.own_student(student) and private.read_course(course) and exists(
 select 1 from public.learning_enrolments where course_id=course and student_id=student and active)); $$;
create function public.get_learning_access() returns boolean language sql stable security definer set search_path='' as $$
 select private.learning_live() and private.active_account(auth.uid()) and (private.learning_owner() or private.account_permission(auth.uid(),'finance')
 or exists(select 1 from public.learning_staff where user_id=auth.uid())
 or exists(select 1 from public.learning_department_heads where user_id=auth.uid())
 or exists(select 1 from public.learning_students where private.own_student(id))); $$;
do $$ declare t text; begin foreach t in array array['learning_courses','learning_staff','learning_students','learning_enrolments','learning_sessions','learning_attendance','learning_records','learning_meetings','student_contributions'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop; end $$;
grant insert,update on public.learning_courses,public.learning_students,public.learning_staff to authenticated;
grant delete on public.learning_staff to authenticated;
grant insert on public.learning_sessions,public.learning_records to authenticated;
grant update(starts_at,ends_at,title) on public.learning_sessions to authenticated;
grant update(kind,title,body,published) on public.learning_records to authenticated;
grant update(status,proposed_at) on public.learning_meetings to authenticated;
grant update(title,body,published) on public.student_contributions to authenticated;
create policy course_read on public.learning_courses for select to authenticated using(private.read_course(id));
create policy course_manage on public.learning_courses for all to authenticated using(private.learning_owner()) with check(private.learning_owner());
create policy staff_read on public.learning_staff for select to authenticated using(private.teaches(course_id));
create policy staff_manage on public.learning_staff for all to authenticated using(private.learning_owner()) with check(private.learning_owner());
create policy student_read on public.learning_students for select to authenticated using(private.read_student(id));
create policy student_manage on public.learning_students for all to authenticated using(private.learning_owner()) with check(private.learning_owner());
create policy enrolment_read on public.learning_enrolments for select to authenticated using(private.read_learning_item(course_id,student_id,true));
create policy session_read on public.learning_sessions for select to authenticated using(private.read_course(course_id));
create policy session_insert on public.learning_sessions for insert to authenticated with check(private.teaches(course_id));
create policy session_update on public.learning_sessions for update to authenticated using(private.teaches(course_id)) with check(private.teaches(course_id));
create policy attendance_read on public.learning_attendance for select to authenticated using(exists(select 1 from public.learning_sessions s where s.id=session_id and (private.teaches(s.course_id) or (private.own_student(student_id) and exists(select 1 from public.learning_enrolments e where e.course_id=s.course_id and e.student_id=learning_attendance.student_id and e.active)))));
create policy record_read on public.learning_records for select to authenticated using(private.read_learning_item(course_id,student_id,published));
create policy record_insert on public.learning_records for insert to authenticated with check(private.teaches(course_id));
create policy record_update on public.learning_records for update to authenticated using(private.teaches(course_id)) with check(private.teaches(course_id));
create policy meeting_read on public.learning_meetings for select to authenticated using(private.read_learning_item(course_id,student_id,true));
create policy meeting_update on public.learning_meetings for update to authenticated using(private.teaches(course_id)) with check(private.teaches(course_id));
create policy contribution_read on public.student_contributions for select to authenticated using(private.read_learning_item(course_id,student_id,true));
create policy contribution_update on public.student_contributions for update to authenticated using(private.teaches(course_id)) with check(private.teaches(course_id));
create function private.stamp_learning_record() returns trigger language plpgsql set search_path='' as $$
 begin if tg_op='INSERT' then new.created_by=auth.uid(); new.created_at=now(); else new.created_by=old.created_by; new.created_at=old.created_at; end if; return new; end; $$;
create trigger learning_record_stamp before insert or update on public.learning_records for each row execute function private.stamp_learning_record();
create function private.mark_class_register(p_session_id uuid,p_marks jsonb) returns void language plpgsql security definer set search_path='' as $$
 declare course uuid; mark jsonb; student uuid;
 begin
 select course_id into course from public.learning_sessions where id=p_session_id for update;
 if course is null or not private.teaches(course) then raise exception 'Class teaching permission required'; end if;
 if p_marks is null or jsonb_typeof(p_marks)<>'array' or jsonb_array_length(p_marks) not between 1 and 200 then raise exception 'Provide 1 to 200 register marks'; end if;
 if (select count(distinct x->>'student_id') from jsonb_array_elements(p_marks) x)<>jsonb_array_length(p_marks) then raise exception 'Duplicate register student'; end if;
 for mark in select * from jsonb_array_elements(p_marks) loop
 if jsonb_typeof(mark)<>'object' or exists(select 1 from jsonb_object_keys(mark) k where k not in('student_id','status','note')) then raise exception 'Invalid register fields'; end if;
 student=(mark->>'student_id')::uuid;
 if not exists(select 1 from public.learning_enrolments where course_id=course and student_id=student and active) then raise exception 'Student not enrolled in this class'; end if;
 insert into public.learning_attendance(session_id,student_id,status,note,marked_by)
 values(p_session_id,student,mark->>'status',coalesce(mark->>'note',''),auth.uid())
 on conflict(session_id,student_id) do update set status=excluded.status,note=excluded.note,marked_by=excluded.marked_by,marked_at=now();
 end loop;
 end; $$;
create function public.mark_class_register(p_session_id uuid,p_marks jsonb) returns void language sql security invoker set search_path='' as $$ select private.mark_class_register(p_session_id,p_marks); $$;
create function private.request_learning_meeting(p_student_id uuid,p_course_id uuid,p_notes text,p_proposed_at timestamptz) returns uuid language plpgsql security definer set search_path='' as $$
 declare result uuid;
 begin
 if not(private.teaches(p_course_id) or private.own_student(p_student_id)) or not exists(select 1 from public.learning_enrolments where course_id=p_course_id and student_id=p_student_id and active) then raise exception 'Student access required'; end if;
 insert into public.learning_meetings(student_id,course_id,notes,proposed_at,requested_by) values(p_student_id,p_course_id,p_notes,p_proposed_at,auth.uid()) returning id into result; return result;
 end; $$;
create function public.request_learning_meeting(p_student_id uuid,p_course_id uuid,p_notes text,p_proposed_at timestamptz default null) returns uuid language sql security invoker set search_path='' as $$ select private.request_learning_meeting(p_student_id,p_course_id,p_notes,p_proposed_at); $$;
create function private.submit_student_contribution(p_student_id uuid,p_course_id uuid,p_title text,p_body text,p_kind text) returns uuid language plpgsql security definer set search_path='' as $$
 declare result uuid;
 begin
 if not(private.teaches(p_course_id) or private.own_student(p_student_id)) or not exists(select 1 from public.learning_enrolments where course_id=p_course_id and student_id=p_student_id and active) then raise exception 'Student access required'; end if;
 insert into public.student_contributions(student_id,course_id,title,body,kind,created_by) values(p_student_id,p_course_id,p_title,p_body,p_kind,auth.uid()) returning id into result; return result;
 end; $$;
create function public.submit_student_contribution(p_student_id uuid,p_course_id uuid,p_title text,p_body text,p_kind text default 'poetry') returns uuid language sql security invoker set search_path='' as $$ select private.submit_student_contribution(p_student_id,p_course_id,p_title,p_body,p_kind); $$;

alter table public.learning_guardians enable row level security;
alter table public.learning_department_heads enable row level security;
revoke all on public.learning_guardians,public.learning_department_heads from public,anon,authenticated;
grant all on public.learning_guardians,public.learning_department_heads to service_role;
grant select,insert,delete on public.learning_guardians,public.learning_department_heads to authenticated;
create policy guardian_read on public.learning_guardians for select to authenticated using(private.read_student(student_id));
create policy guardian_add on public.learning_guardians for insert to authenticated with check(private.learning_owner() and private.active_account(user_id));
create policy guardian_remove on public.learning_guardians for delete to authenticated using(private.learning_owner());
create policy heads_read on public.learning_department_heads for select to authenticated using(private.learning_owner() or (private.active_account(auth.uid()) and user_id=(select auth.uid())));
create policy heads_add on public.learning_department_heads for insert to authenticated with check(private.learning_owner() and private.active_account(user_id));
create policy heads_remove on public.learning_department_heads for delete to authenticated using(private.learning_owner());

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
 using(bucket_id='course-resources' and (private.learning_owner() or private.can_write_course_file(name)));

revoke all on function private.set_learning_plan_complete(uuid,boolean),private.can_write_course_file(text),private.can_read_course_file(text),private.stamp_learning_resource() from public,anon,authenticated;
grant execute on function private.set_learning_plan_complete(uuid,boolean),private.can_write_course_file(text),private.can_read_course_file(text) to authenticated,service_role;
revoke all on function public.set_learning_plan_complete(uuid,boolean),public.can_teach_course(uuid) from public,anon;
grant execute on function public.set_learning_plan_complete(uuid,boolean),public.can_teach_course(uuid) to authenticated,service_role;


create unique index learning_student_account_unique on public.learning_students(user_id) where user_id is not null;
create function private.validate_learning_links() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='learning_students' then
  if (new.user_id is not null and not private.active_account(new.user_id)) or (new.guardian_id is not null and not private.active_account(new.guardian_id)) then raise exception 'Choose an active account'; end if;
 elsif not private.active_account(new.user_id) then raise exception 'Choose an active teaching account'; end if;
 return new;
end; $$;
create trigger learning_student_links before insert or update of user_id,guardian_id on public.learning_students for each row execute function private.validate_learning_links();
create trigger learning_staff_links before insert or update on public.learning_staff for each row execute function private.validate_learning_links();
create table public.learning_audit (
 id bigint generated always as identity primary key, actor_id uuid references public.profiles, entity_table text not null,
 entity_id text, action text not null, created_at timestamptz not null default now()
);
alter table public.learning_audit enable row level security;
revoke all on public.learning_audit from public,anon,authenticated;
grant select on public.learning_audit to authenticated;
grant all on public.learning_audit to service_role;
create policy learning_audit_owner on public.learning_audit for select to authenticated using(private.learning_owner());
create function private.audit_learning_change() returns trigger language plpgsql security definer set search_path='' as $$
declare item jsonb;
begin
 item=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 insert into public.learning_audit(actor_id,entity_table,entity_id,action)
 values(auth.uid(),tg_table_name,coalesce(item->>'id',concat_ws('/',item->>'course_id',item->>'student_id',item->>'user_id',item->>'department')),tg_op);
 return coalesce(new,old);
end; $$;
do $$ declare t text;begin foreach t in array array['learning_courses','learning_students','learning_staff','learning_enrolments','learning_guardians','learning_department_heads','learning_records'] loop
 execute format('create trigger learning_change_audit after insert or update or delete on public.%I for each row execute function private.audit_learning_change()',t);
end loop;end $$;
-- No default PUBLIC execution; grant only the selected learning entry points.
do $$ declare f record; begin
 for f in select p.oid::regprocedure signature,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname in('public','private') and p.proname=any(array['learning_live','learning_owner','get_learning_access','teaches','own_student','read_student','read_course','read_learning_item','mark_class_register','request_learning_meeting','submit_student_contribution','stamp_learning_record','validate_learning_links','audit_learning_change']) loop
 execute format('revoke all on function %s from public,anon,authenticated',f.signature);
 if f.proname not in('stamp_learning_record','validate_learning_links','audit_learning_change') then execute format('grant execute on function %s to authenticated,service_role',f.signature); end if;
 end loop;end $$;
commit;
