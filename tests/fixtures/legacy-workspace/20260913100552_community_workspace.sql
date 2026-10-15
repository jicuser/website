-- Additive shared mobile/website workspace. Apply to staging before enabling clients.
begin;
create function private.active_account(account uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=account and is_active); $$;
create function private.workspace_owner() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=(select auth.uid()) and is_active and is_owner); $$;
create function private.account_permission(account uuid, permission text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=account and is_active and (is_owner or permission=any(permissions))); $$;

create table public.learning_courses (
 id uuid primary key default gen_random_uuid(), title text not null check(length(trim(title)) between 1 and 160),
 department text not null check(department in('adult','madrassah')), description text not null default '' check(length(description)<=6000),
 published boolean not null default false, created_at timestamptz not null default now());
create table public.learning_staff (
 course_id uuid references public.learning_courses on delete cascade, user_id uuid references public.profiles on delete cascade,
 role text not null default 'teacher' check(role in('teacher','head_teacher')), primary key(course_id,user_id));
create index learning_staff_user on public.learning_staff(user_id);
create table public.learning_students (
 id uuid primary key default gen_random_uuid(), display_name text not null check(length(trim(display_name)) between 1 and 160),
 user_id uuid references public.profiles on delete set null, guardian_id uuid references public.profiles on delete set null,
 created_at timestamptz not null default now());
create index learning_students_user on public.learning_students(user_id);
create index learning_students_guardian on public.learning_students(guardian_id);
create table public.learning_enrolments (
 course_id uuid references public.learning_courses on delete cascade, student_id uuid references public.learning_students on delete cascade,
 active boolean not null default true, primary key(course_id,student_id));
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

create function private.teaches(course uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.active_account((select auth.uid())) and (private.workspace_owner() or exists(
 select 1 from public.learning_staff where course_id=course and user_id=(select auth.uid()))); $$;
create function private.own_student(student uuid, account uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$
 select private.active_account(account) and exists(select 1 from public.learning_students where id=student and (user_id=account or guardian_id=account)); $$;
create function private.read_student(student uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.workspace_owner() or private.own_student(student) or exists(select 1 from public.learning_enrolments where student_id=student and active and private.teaches(course_id)); $$;
create function private.read_course(course uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.teaches(course) or exists(select 1 from public.learning_enrolments where course_id=course and active and private.own_student(student_id)); $$;
create function private.read_learning_item(course uuid, student uuid, is_published boolean) returns boolean language sql stable security definer set search_path='' as $$
 select private.teaches(course) or (is_published and private.own_student(student) and exists(select 1 from public.learning_enrolments where course_id=course and student_id=student and active)); $$;

create table public.work_tasks (
 id uuid primary key default gen_random_uuid(), form_id uuid references public.form_submissions on delete cascade,
 title text not null check(length(trim(title)) between 1 and 160), description text not null default '' check(length(description)<=6000),
 assigned_to uuid not null references public.profiles, created_by uuid not null references public.profiles,
 status text not null default 'open' check(status in('open','in_progress','waiting','done')),
 due_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create index work_tasks_assigned on public.work_tasks(assigned_to,status,due_at);
create index work_tasks_creator on public.work_tasks(created_by,created_at desc);
create index work_tasks_form on public.work_tasks(form_id);
create table public.user_notifications (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles on delete cascade,
 kind text not null check(kind in('task','learning')), entity_id uuid not null,
 created_at timestamptz not null default now(), read_at timestamptz);
create index user_notifications_user on public.user_notifications(user_id,created_at desc);
create table public.push_devices (
 token text primary key check(length(token) between 20 and 4096), user_id uuid not null references public.profiles on delete cascade,
 platform text not null check(platform in('ios','android')), updated_at timestamptz not null default now());
create index push_devices_user on public.push_devices(user_id,updated_at desc);
create table public.push_outbox (
 id uuid primary key default gen_random_uuid(), notification_id uuid not null unique references public.user_notifications on delete cascade,
 attempts integer not null default 0, available_at timestamptz not null default now(), lease_until timestamptz,
 lease_id uuid, delivered_at timestamptz, last_error text check(length(last_error)<=120));
create index push_outbox_pending on public.push_outbox(available_at) where delivered_at is null;
create table public.form_workflows (
 kind text primary key check(kind in('contact','madrassah','itikaaf')), assigned_to uuid not null references public.profiles,
 title text not null check(length(trim(title)) between 1 and 160), due_hours integer not null default 24 check(due_hours between 1 and 8760),
 enabled boolean not null default true, configured_by uuid not null default auth.uid() references public.profiles);

create function private.read_task(task uuid, account uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$
 select private.active_account(account) and exists(select 1 from public.work_tasks t join public.profiles p on p.id=account
 where t.id=task and (p.is_owner or t.assigned_to=account or t.created_by=account)
 and (t.form_id is null or exists(select 1 from public.form_submissions f where f.id=t.form_id and private.account_permission(account,'forms_'||f.kind)))); $$;
create function private.can_receive_notification(account uuid, kind text, entity uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.active_account(account) and case kind
 when 'task' then private.read_task(entity,account)
 when 'learning' then exists(select 1 from public.learning_records r join public.learning_enrolments e using(course_id,student_id)
 where r.id=entity and r.published and e.active and private.own_student(r.student_id,account)) else false end; $$;

-- Explicit grants plus RLS: a login never implies access to another person/class.
do $$ declare t text; begin
 foreach t in array array['learning_courses','learning_staff','learning_students','learning_enrolments','learning_sessions','learning_attendance','learning_records','learning_meetings','student_contributions','work_tasks','user_notifications','push_devices','push_outbox','form_workflows'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public, anon, authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
grant select on public.learning_courses,public.learning_staff,public.learning_students,public.learning_enrolments,public.learning_sessions,public.learning_attendance,public.learning_records,public.learning_meetings,public.student_contributions,public.work_tasks,public.user_notifications,public.form_workflows to authenticated;
grant insert,update,delete on public.learning_courses,public.learning_staff,public.learning_students,public.learning_enrolments,public.form_workflows to authenticated;
grant insert on public.learning_sessions,public.learning_records to authenticated;
grant update(starts_at,ends_at,title) on public.learning_sessions to authenticated;
grant update(kind,title,body,published) on public.learning_records to authenticated;
grant update(status,proposed_at) on public.learning_meetings to authenticated;
grant update(title,body,published) on public.student_contributions to authenticated;
grant update(status) on public.work_tasks to authenticated;
grant update(read_at) on public.user_notifications to authenticated;

create policy course_read on public.learning_courses for select to authenticated using(private.read_course(id));
create policy course_manage on public.learning_courses for all to authenticated using(private.workspace_owner()) with check(private.workspace_owner());
create policy staff_read on public.learning_staff for select to authenticated using(private.teaches(course_id));
create policy staff_manage on public.learning_staff for all to authenticated using(private.workspace_owner()) with check(private.workspace_owner());
create policy student_read on public.learning_students for select to authenticated using(private.read_student(id));
create policy student_manage on public.learning_students for all to authenticated using(private.workspace_owner()) with check(private.workspace_owner());
create policy enrolment_read on public.learning_enrolments for select to authenticated using(private.teaches(course_id) or private.own_student(student_id));
create policy enrolment_manage on public.learning_enrolments for all to authenticated using(private.workspace_owner()) with check(private.workspace_owner());
create policy session_read on public.learning_sessions for select to authenticated using(private.read_course(course_id));
create policy session_insert on public.learning_sessions for insert to authenticated with check(private.teaches(course_id));
create policy session_update on public.learning_sessions for update to authenticated using(private.teaches(course_id)) with check(private.teaches(course_id));
create policy attendance_read on public.learning_attendance for select to authenticated using(exists(select 1 from public.learning_sessions s where s.id=session_id and (private.teaches(s.course_id) or private.own_student(student_id))));
create policy record_read on public.learning_records for select to authenticated using(private.read_learning_item(course_id,student_id,published));
create policy record_insert on public.learning_records for insert to authenticated with check(private.teaches(course_id));
create policy record_update on public.learning_records for update to authenticated using(private.teaches(course_id)) with check(private.teaches(course_id));
create policy meeting_read on public.learning_meetings for select to authenticated using(private.teaches(course_id) or private.own_student(student_id));
create policy meeting_update on public.learning_meetings for update to authenticated using(private.teaches(course_id)) with check(private.teaches(course_id));
create policy contribution_read on public.student_contributions for select to authenticated using(private.teaches(course_id) or private.own_student(student_id) or (published and private.read_course(course_id)));
create policy contribution_update on public.student_contributions for update to authenticated using(private.teaches(course_id)) with check(private.teaches(course_id));
create policy task_read on public.work_tasks for select to authenticated using(private.read_task(id));
create policy task_update on public.work_tasks for update to authenticated using(private.read_task(id)) with check(private.read_task(id));
create policy notification_read on public.user_notifications for select to authenticated using(user_id=(select auth.uid()) and private.can_receive_notification(user_id,kind,entity_id));
create policy notification_update on public.user_notifications for update to authenticated using(user_id=(select auth.uid()) and private.can_receive_notification(user_id,kind,entity_id)) with check(user_id=(select auth.uid()) and private.can_receive_notification(user_id,kind,entity_id));
create policy workflow_manage on public.form_workflows for all to authenticated using(private.workspace_owner()) with check(private.workspace_owner());

create function private.enqueue_notification() returns trigger language plpgsql security definer set search_path='' as $$
 begin insert into public.push_outbox(notification_id) values(new.id); return new; end; $$;
create trigger notification_enqueue after insert on public.user_notifications for each row execute function private.enqueue_notification();
create function private.task_notification() returns trigger language plpgsql security definer set search_path='' as $$
 begin insert into public.user_notifications(user_id,kind,entity_id) values(new.assigned_to,'task',new.id); return new; end; $$;
create trigger task_notify after insert on public.work_tasks for each row execute function private.task_notification();
create function private.stamp_task() returns trigger language plpgsql set search_path='' as $$
 begin new.updated_at=now(); return new; end; $$;
create trigger task_stamp before update on public.work_tasks for each row execute function private.stamp_task();
create function private.stamp_learning_record() returns trigger language plpgsql set search_path='' as $$
 begin if tg_op='INSERT' then new.created_by=auth.uid(); new.created_at=now(); else new.created_by=old.created_by; new.created_at=old.created_at; end if; return new; end; $$;
create trigger learning_record_stamp before insert or update on public.learning_records for each row execute function private.stamp_learning_record();
create function private.learning_notification() returns trigger language plpgsql security definer set search_path='' as $$
 begin if new.published and (tg_op='INSERT' or not old.published) then
 insert into public.user_notifications(user_id,kind,entity_id)
 select distinct account,'learning',new.id from public.learning_students s cross join lateral unnest(array[s.user_id,s.guardian_id]) account
 where s.id=new.student_id and private.can_receive_notification(account,'learning',new.id);
 end if; return new; end; $$;
create trigger learning_notify after insert or update on public.learning_records for each row execute function private.learning_notification();

create function private.create_work_task(p_title text,p_assigned_to uuid,p_form_id uuid,p_due_at timestamptz,p_description text) returns uuid language plpgsql security definer set search_path='' as $$
 declare result uuid; form_kind text; actor uuid=auth.uid();
 begin
 perform 1 from public.profiles where id in(actor,p_assigned_to) order by id for no key update;
 if not private.active_account(actor) or not private.active_account(p_assigned_to) then raise exception 'Active accounts required'; end if;
 if (select count(*) from public.work_tasks where created_by=actor and created_at>now()-interval '1 hour')>=100 then raise exception 'Task creation limit reached; try later'; end if;
 if p_form_id is null then
 if p_assigned_to<>actor and not private.workspace_owner() then raise exception 'Owner permission required for delegation'; end if;
 else
 select kind into form_kind from public.form_submissions where id=p_form_id;
 if form_kind is null or not private.account_permission(actor,'forms_'||form_kind) or not private.account_permission(p_assigned_to,'forms_'||form_kind) then raise exception 'Form access required'; end if;
 end if;
 insert into public.work_tasks(title,assigned_to,form_id,due_at,description,created_by) values(trim(p_title),p_assigned_to,p_form_id,p_due_at,coalesce(p_description,''),actor) returning id into result;
 return result;
 end; $$;
create function public.create_work_task(p_title text,p_assigned_to uuid,p_form_id uuid default null,p_due_at timestamptz default null,p_description text default '') returns uuid language sql security invoker set search_path='' as $$ select private.create_work_task(p_title,p_assigned_to,p_form_id,p_due_at,p_description); $$;
create function private.task_assignees(p_form_id uuid) returns table(id uuid,display_name text) language plpgsql stable security definer set search_path='' as $$
 declare form_kind text;
 begin
 if not private.active_account(auth.uid()) then raise exception 'Active account required'; end if;
 if p_form_id is not null then
 select f.kind into form_kind from public.form_submissions f where f.id=p_form_id;
 if form_kind is null or not private.account_permission(auth.uid(),'forms_'||form_kind) then raise exception 'Form access required'; end if;
 end if;
 return query select p.id,p.display_name from public.profiles p where p.is_active and
 case when p_form_id is null then private.workspace_owner() or p.id=auth.uid() else private.account_permission(p.id,'forms_'||form_kind) end order by p.display_name limit 500;
 end; $$;
create function public.task_assignees(p_form_id uuid default null) returns table(id uuid,display_name text) language sql stable security invoker set search_path='' as $$ select * from private.task_assignees(p_form_id); $$;
create function private.mark_class_register(p_session_id uuid,p_marks jsonb) returns void language plpgsql security definer set search_path='' as $$
 declare course uuid; mark jsonb; student uuid;
 begin
 select course_id into course from public.learning_sessions where id=p_session_id for update;
 if course is null or not private.teaches(course) then raise exception 'Class teaching permission required'; end if;
 if jsonb_typeof(p_marks)<>'array' or jsonb_array_length(p_marks) not between 1 and 200 then raise exception 'Provide 1 to 200 register marks'; end if;
 for mark in select * from jsonb_array_elements(p_marks) loop
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

create function private.register_push_device(p_token text,p_platform text,p_previous_token text default null) returns void language plpgsql security definer set search_path='' as $$
 begin
 perform 1 from public.profiles where id=auth.uid() for no key update;
 if not private.active_account(auth.uid()) then raise exception 'Active account required'; end if;
 if exists(select 1 from public.push_devices where token=p_token and user_id<>auth.uid()) then raise exception 'Device belongs to another account; unregister before switching'; end if;
 -- Replacement and insertion are one transaction; any error restores the old endpoint.
 delete from public.push_devices where token=p_previous_token and token<>p_token and user_id=auth.uid();
 if not exists(select 1 from public.push_devices where token=p_token) and (select count(*) from public.push_devices where user_id=auth.uid())>=10 then raise exception 'Device limit reached'; end if;
 insert into public.push_devices(token,platform,user_id) values(p_token,p_platform,auth.uid()) on conflict(token) do update set updated_at=now(),platform=excluded.platform where public.push_devices.user_id=auth.uid();
 -- A competing account may have registered this token after the initial check.
 if not found then raise exception 'Device belongs to another account; unregister before switching'; end if;
 end; $$;
create function public.register_push_device(p_token text,p_platform text,p_previous_token text default null) returns void language sql security invoker set search_path='' as $$ select private.register_push_device(p_token,p_platform,p_previous_token); $$;
create function private.unregister_push_device(p_token text) returns void language plpgsql security definer set search_path='' as $$
 begin if auth.uid() is null then raise exception 'Login required'; end if; delete from public.push_devices where token=p_token and user_id=auth.uid(); end; $$;
create function public.unregister_push_device(p_token text) returns void language sql security invoker set search_path='' as $$ select private.unregister_push_device(p_token); $$;
create function private.validate_form_workflow() returns trigger language plpgsql security definer set search_path='' as $$
 begin if not private.workspace_owner() or not private.account_permission(new.assigned_to,'forms_'||new.kind) then raise exception 'Owner and eligible recipient required'; end if; new.configured_by=auth.uid(); return new; end; $$;
create trigger workflow_validate before insert or update on public.form_workflows for each row execute function private.validate_form_workflow();
create function private.route_form_submission() returns trigger language plpgsql security definer set search_path='' as $$
 declare flow public.form_workflows;
 begin select * into flow from public.form_workflows where kind=new.kind and enabled;
 if found and private.account_permission(flow.assigned_to,'forms_'||new.kind) and exists(select 1 from public.profiles where id=flow.configured_by and is_active and is_owner) then
 insert into public.work_tasks(form_id,title,assigned_to,created_by,due_at) values(new.id,flow.title,flow.assigned_to,flow.configured_by,now()+make_interval(hours=>flow.due_hours));
 end if; return new;
 end; $$;
create trigger form_route after insert on public.form_submissions for each row execute function private.route_form_submission();

-- These server-only RPCs lease a bounded batch. A stale worker cannot finish a newer lease.
create function public.claim_push_jobs() returns setof public.push_outbox language sql security invoker set search_path='' as $$
 update public.push_outbox set attempts=attempts+1,lease_until=now()+interval '5 minutes',lease_id=gen_random_uuid()
 where id in(select id from public.push_outbox where delivered_at is null and attempts<8 and available_at<=now()
 and (lease_until is null or lease_until<now()) order by available_at for update skip locked limit 10) returning *; $$;
create function public.push_recipient_allowed(p_notification_id uuid) returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.user_notifications where id=p_notification_id and read_at is null and private.can_receive_notification(user_id,kind,entity_id)); $$;
create function public.finish_push_job(p_id uuid,p_lease_id uuid,p_delivered boolean,p_error text default null) returns void language sql security invoker set search_path='' as $$
 update public.push_outbox set delivered_at=case when p_delivered then now() end,lease_until=null,lease_id=null,
 available_at=now()+make_interval(secs=>least(3600,30*power(2,attempts)::integer)),last_error=left(p_error,120)
 where id=p_id and lease_id=p_lease_id; $$;

-- No implicit PUBLIC function execution. Only deliberate client entry points are exposed.
do $$ declare f record; begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='private' and p.proname=any(array['active_account','workspace_owner','account_permission','teaches','own_student','read_student','read_course','read_learning_item','read_task','can_receive_notification','enqueue_notification','task_notification','stamp_task','stamp_learning_record','learning_notification','create_work_task','task_assignees','mark_class_register','request_learning_meeting','submit_student_contribution','register_push_device','unregister_push_device','validate_form_workflow','route_form_submission']) loop
 execute format('revoke all on function %s from public,anon,authenticated',f.signature);
 end loop;
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname=any(array['create_work_task','task_assignees','mark_class_register','request_learning_meeting','submit_student_contribution','register_push_device','unregister_push_device']) loop
 execute format('revoke all on function %s from public,anon',f.signature);
 execute format('grant execute on function %s to authenticated,service_role',f.signature);
 end loop;
end $$;
grant usage on schema private to authenticated,service_role;
grant execute on function private.active_account(uuid),private.workspace_owner(),private.account_permission(uuid,text),private.teaches(uuid),private.own_student(uuid,uuid),private.read_student(uuid),private.read_course(uuid),private.read_learning_item(uuid,uuid,boolean),private.read_task(uuid,uuid),private.can_receive_notification(uuid,text,uuid),private.create_work_task(text,uuid,uuid,timestamptz,text),private.task_assignees(uuid),private.mark_class_register(uuid,jsonb),private.request_learning_meeting(uuid,uuid,text,timestamptz),private.submit_student_contribution(uuid,uuid,text,text,text),private.register_push_device(text,text,text),private.unregister_push_device(text) to authenticated,service_role;
revoke all on function public.claim_push_jobs(),public.push_recipient_allowed(uuid),public.finish_push_job(uuid,uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.claim_push_jobs(),public.push_recipient_allowed(uuid),public.finish_push_job(uuid,uuid,boolean,text) to service_role;
commit;
