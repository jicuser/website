-- Versioned forms share the existing private inbox, accounts, tasks and push outbox.
begin;
alter table public.profiles drop constraint if exists permissions_allowed;
alter table public.profiles add constraint permissions_allowed check (permissions <@ array['content','media','events','announcements','prayer_times','team','livestream','tv','broadcast','forms_contact','forms_madrassah','forms_itikaaf','forms_manage','forms_custom','users','audit','delete_content']::text[] and array_position(permissions,null) is null);

create table public.custom_forms (
 id uuid primary key default gen_random_uuid(), slug text not null unique check(slug ~ '^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$'),
 title text not null check(length(trim(title)) between 1 and 160), description text not null default '' check(length(description)<=4000),
 schema jsonb not null check(jsonb_typeof(schema)='object' and octet_length(schema::text)<=48000),
 published_version integer, enabled boolean not null default true,
 task_title text not null default 'Follow up response' check(length(trim(task_title)) between 1 and 160),
 due_hours integer not null default 24 check(due_hours between 1 and 8760),
 created_by uuid not null references public.profiles, updated_at timestamptz not null default now());
create table public.custom_form_versions (
 form_id uuid references public.custom_forms on delete cascade, version integer check(version>0),
 title text not null, description text not null, schema jsonb not null, published_by uuid not null references public.profiles,
 created_at timestamptz not null default now(), primary key(form_id,version));
create table public.custom_form_staff (
 form_id uuid references public.custom_forms on delete cascade, user_id uuid references public.profiles on delete cascade,
 role text check(role in('manager','responsible','watcher')), primary key(form_id,user_id,role));
create index custom_form_staff_user on public.custom_form_staff(user_id,form_id);
alter table public.form_submissions drop constraint if exists form_submissions_kind_check;
alter table public.form_submissions add constraint form_submissions_kind_check check(kind in('contact','madrassah','itikaaf','custom'));
alter table public.form_submissions add column custom_form_id uuid references public.custom_forms,
 add column form_version integer, add column schema_snapshot jsonb,
 add column submitter_id uuid references public.profiles on delete set null,
 add constraint form_submissions_version foreign key(custom_form_id,form_version) references public.custom_form_versions(form_id,version),
 add constraint form_submissions_custom_shape check((kind='custom')=(custom_form_id is not null) and (kind<>'custom' or (form_version is not null and schema_snapshot is not null)));
create index form_submissions_custom on public.form_submissions(custom_form_id,created_at desc);
create index form_submissions_submitter on public.form_submissions(submitter_id,created_at desc) where submitter_id is not null;
create table public.form_replies (
 id uuid primary key default gen_random_uuid(), submission_id uuid not null references public.form_submissions on delete cascade,
 author_id uuid not null references public.profiles, body text not null check(length(trim(body)) between 1 and 6000),
 internal boolean not null default false, created_at timestamptz not null default now());
create index form_replies_submission on public.form_replies(submission_id,created_at);
create table public.form_attachments (
 id uuid primary key, submission_id uuid not null references public.form_submissions on delete cascade,
 field_id text not null, file_name text not null check(length(file_name) between 1 and 160),
 mime_type text not null, size_bytes integer not null check(size_bytes between 1 and 10485760), created_at timestamptz not null default now());
create index form_attachments_submission on public.form_attachments(submission_id);
create table private.form_uploads (
 id uuid primary key default gen_random_uuid(), form_id uuid not null references public.custom_forms,
 version integer not null, field_id text not null, attempt uuid not null, source_key text not null,
 owner_id uuid references public.profiles on delete set null, token_hash text not null check(token_hash ~ '^[a-f0-9]{64}$'),
 object_key text not null unique, file_name text not null, mime_type text not null, size_bytes integer not null check(size_bytes between 1 and 10485760),
 ready boolean not null default false, submission_id uuid references public.form_submissions on delete cascade,
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '2 hours');
create index form_uploads_attempt on private.form_uploads(source_key,attempt);
create index form_uploads_cleanup on private.form_uploads(expires_at) where submission_id is null;
create table private.custom_form_limits (
 source_key text not null, bucket timestamptz not null, action text not null, hits integer not null,
 primary key(source_key,bucket,action));
create table private.custom_form_attempts (
 source_key text not null, attempt uuid not null, form_id uuid not null references public.custom_forms,
 submission_id uuid not null references public.form_submissions on delete cascade,
 owner_id uuid references public.profiles on delete set null, primary key(source_key,attempt));

create function private.manage_custom_form(form uuid,account uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$
 select private.active_account(account) and (private.account_permission(account,'forms_manage') or exists(select 1 from public.custom_form_staff where form_id=form and user_id=account and role='manager')); $$;
create function private.staff_custom_form(form uuid,account uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$
 select private.active_account(account) and (private.account_permission(account,'forms_custom') or private.manage_custom_form(form,account) or exists(select 1 from public.custom_form_staff where form_id=form and user_id=account)); $$;
create function private.read_custom_submission(submission uuid,account uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$
 select private.active_account(account) and exists(select 1 from public.form_submissions where id=submission and kind='custom' and (submitter_id=account or private.staff_custom_form(custom_form_id,account))); $$;
create function private.staff_custom_submission(submission uuid,account uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.form_submissions where id=submission and kind='custom' and private.staff_custom_form(custom_form_id,account)); $$;

-- Existing response policies remain effective for legacy forms; custom grants are per definition.
create policy custom_submission_read on public.form_submissions for select to authenticated using(kind='custom' and private.read_custom_submission(id));
create policy custom_submission_update on public.form_submissions for update to authenticated using(kind='custom' and private.staff_custom_form(custom_form_id)) with check(kind='custom' and private.staff_custom_form(custom_form_id));
create or replace function private.read_task(task uuid,account uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$
 select private.active_account(account) and exists(select 1 from public.work_tasks t join public.profiles p on p.id=account
 where t.id=task and (p.is_owner or t.assigned_to=account or t.created_by=account)
 and (t.form_id is null or exists(select 1 from public.form_submissions f where f.id=t.form_id and
 case when f.kind='custom' then private.staff_custom_form(f.custom_form_id,account) else private.account_permission(account,'forms_'||f.kind) end))); $$;
alter table public.user_notifications drop constraint if exists user_notifications_kind_check;
alter table public.user_notifications add constraint user_notifications_kind_check check(kind in('task','learning','form'));
create or replace function private.can_receive_notification(account uuid,kind text,entity uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.active_account(account) and case kind when 'task' then private.read_task(entity,account)
 when 'form' then private.read_custom_submission(entity,account)
 when 'learning' then exists(select 1 from public.learning_records r join public.learning_enrolments e using(course_id,student_id)
 where r.id=entity and r.published and e.active and private.own_student(r.student_id,account)) else false end; $$;

do $$ declare t text; begin
 foreach t in array array['custom_forms','custom_form_versions','custom_form_staff','form_replies','form_attachments'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
 foreach t in array array['form_uploads','custom_form_limits','custom_form_attempts'] loop
 execute format('alter table private.%I enable row level security',t);
 execute format('revoke all on private.%I from public,anon,authenticated',t);
 execute format('grant all on private.%I to service_role',t);
 end loop;
end $$;
create policy custom_forms_read on public.custom_forms for select to authenticated using(private.staff_custom_form(id));
create policy custom_versions_read on public.custom_form_versions for select to authenticated using(private.staff_custom_form(form_id));
create policy custom_staff_read on public.custom_form_staff for select to authenticated using(private.staff_custom_form(form_id));
create policy form_replies_read on public.form_replies for select to authenticated using(private.read_custom_submission(submission_id) and (not internal or private.staff_custom_submission(submission_id)));
create policy form_attachments_read on public.form_attachments for select to authenticated using(private.read_custom_submission(submission_id));

-- Strict declarative schema, only an earlier unconditioned scalar field can control visibility.
create function private.validate_custom_schema(p_schema jsonb) returns void language plpgsql immutable set search_path='' as $$
 declare field jsonb; prior jsonb; option jsonb; ids text[]='{}'; option_values text[]; id text; kind text; file_count integer=0;
 begin
 if p_schema is null or jsonb_typeof(p_schema)<>'object' or octet_length(p_schema::text)>48000 or jsonb_typeof(p_schema->'fields') is distinct from 'array' then raise exception 'Invalid form schema'; end if;
 if jsonb_array_length(p_schema->'fields') not between 1 and 40 then raise exception 'Provide 1 to 40 fields'; end if;
 for field in select value from jsonb_array_elements(p_schema->'fields') loop
 id=field->>'id'; kind=field->>'type';
 if jsonb_typeof(field)<>'object' or id is null or id !~ '^[a-z][a-z0-9_]{0,39}$' or id=any(ids) or kind is null or kind<>all(array['text','textarea','email','phone','number','date','select','multiselect','checkbox','image','file']) or coalesce(length(trim(field->>'label')),0) not between 1 and 160 or (field ? 'required' and jsonb_typeof(field->'required')<>'boolean') then raise exception 'Invalid or duplicate field'; end if;
 if kind in('file','image') then file_count=file_count+1; if file_count>5 then raise exception 'Maximum 5 upload fields'; end if; end if;
 if kind in('select','multiselect') then
 if jsonb_typeof(field->'options') is distinct from 'array' or jsonb_array_length(field->'options') not between 1 and 50 then raise exception 'Options required'; end if;
 option_values='{}'; for option in select value from jsonb_array_elements(field->'options') loop
 if jsonb_typeof(option)<>'string' or length(trim(option#>>'{}')) not between 1 and 120 or (option#>>'{}')=any(option_values) then raise exception 'Invalid duplicate option'; end if;
 option_values=array_append(option_values,option#>>'{}'); end loop;
 end if;
 if field ? 'show_when' and field->'show_when'<>'null'::jsonb then
 if jsonb_typeof(field->'show_when')<>'object' or not coalesce((field->'show_when'->>'field')=any(ids),false) or coalesce(field->'show_when'->>'operator','') not in('equals','not_equals') or coalesce(jsonb_typeof(field->'show_when'->'value'),'null') not in('string','boolean','number') then raise exception 'Invalid visibility condition'; end if;
 select value into prior from jsonb_array_elements(p_schema->'fields') where value->>'id'=field->'show_when'->>'field';
 if prior->>'type' in('file','image','multiselect') or (prior ? 'show_when' and prior->'show_when'<>'null'::jsonb) then raise exception 'Condition must use an earlier unconditioned scalar field'; end if;
 end if;
 ids=array_append(ids,id);
 end loop;
 end; $$;
create function private.custom_field_visible(field jsonb,answers jsonb) returns boolean language sql immutable set search_path='' as $$
 select case when field->'show_when' is null or field->'show_when'='null'::jsonb then true
 when field->'show_when'->>'operator'='equals' then coalesce(answers->(field->'show_when'->>'field')=field->'show_when'->'value',false)
 else not coalesce(answers->(field->'show_when'->>'field')=field->'show_when'->'value',false) end; $$;
create function private.validate_custom_answers(p_schema jsonb,p_answers jsonb) returns void language plpgsql immutable set search_path='' as $$
 declare field jsonb; answer jsonb; item jsonb; id text; kind text; val text; keys text[]; item_values text[]; limit_length integer; missing boolean;
 begin
 if p_answers is null or jsonb_typeof(p_answers)<>'object' or octet_length(p_answers::text)>24000 then raise exception 'Invalid form answers'; end if;
 select array_agg(value->>'id') into keys from jsonb_array_elements(p_schema->'fields');
 if exists(select 1 from jsonb_object_keys(p_answers) k where not(k=any(keys))) then raise exception 'Unknown field answer'; end if;
 for field in select value from jsonb_array_elements(p_schema->'fields') loop
 id=field->>'id'; kind=field->>'type'; answer=p_answers->id;
 if not private.custom_field_visible(field,p_answers) then
 if p_answers ? id then raise exception 'Omit hidden field answers'; end if; continue;
 end if;
 missing=answer is null or answer='null'::jsonb or answer='""'::jsonb or answer='[]'::jsonb;
 if coalesce((field->>'required')::boolean,false) and (missing or (kind='checkbox' and answer<>'true'::jsonb)) then raise exception 'Required field: %',field->>'label'; end if;
 if missing then continue; end if;
 if kind='checkbox' then if jsonb_typeof(answer)<>'boolean' then raise exception 'Invalid checkbox answer'; end if;
 elsif kind='number' then if jsonb_typeof(answer)<>'number' or abs((answer#>>'{}')::numeric)>1000000000000 then raise exception 'Invalid number answer'; end if;
 elsif kind='multiselect' then
 if jsonb_typeof(answer)<>'array' or jsonb_array_length(answer)>50 then raise exception 'Invalid selection'; end if;
 item_values='{}'; for item in select value from jsonb_array_elements(answer) loop
 if jsonb_typeof(item)<>'string' or not(field->'options' @> jsonb_build_array(item)) or (item#>>'{}')=any(item_values) then raise exception 'Invalid selection'; end if;
 item_values=array_append(item_values,item#>>'{}'); end loop;
 else
 if jsonb_typeof(answer)<>'string' then raise exception 'Expected text answer'; end if;
 val=answer#>>'{}'; limit_length=case kind when 'textarea' then 6000 when 'email' then 254 when 'phone' then 40 else 500 end;
 if length(val)>limit_length then raise exception 'Answer too long'; end if;
 if kind='email' and val !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Invalid email'; end if;
 if kind='date' then if val !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Invalid date'; end if; perform val::date; end if;
 if kind='select' and not(field->'options' @> jsonb_build_array(val)) then raise exception 'Invalid selection'; end if;
 if kind in('image','file') and val !~ '^[a-f0-9-]{36}$' then raise exception 'Invalid upload'; end if;
 end if;
 end loop;
 end; $$;

create function private.save_custom_form(p_form jsonb) returns uuid language plpgsql security definer set search_path='' as $$
 declare target_form uuid=(p_form->>'id')::uuid; actor uuid=auth.uid(); member jsonb; role_name text; members jsonb; member_id uuid;
 begin
 if target_form is null then if not private.account_permission(actor,'forms_manage') then raise exception 'Form manager permission required'; end if; target_form=gen_random_uuid();
 else perform 1 from public.custom_forms where id=target_form for update;
 if not found or not private.manage_custom_form(target_form) then raise exception 'Form manager permission required'; end if; end if;
 perform private.validate_custom_schema(p_form->'schema');
 if coalesce(length(p_form::text),0)>64000 then raise exception 'Form too large'; end if;
 insert into public.custom_forms(id,slug,title,description,schema,task_title,due_hours,enabled,created_by)
 values(target_form,p_form->>'slug',trim(p_form->>'title'),coalesce(p_form->>'description',''),p_form->'schema',coalesce(p_form->>'task_title','Follow up response'),coalesce((p_form->>'due_hours')::integer,24),coalesce((p_form->>'enabled')::boolean,true),actor)
 on conflict(id) do update set slug=excluded.slug,title=excluded.title,description=excluded.description,schema=excluded.schema,task_title=excluded.task_title,due_hours=excluded.due_hours,enabled=excluded.enabled,updated_at=now();
 delete from public.custom_form_staff where custom_form_staff.form_id=target_form;
 foreach role_name in array array['manager','responsible','watcher'] loop
 members=coalesce(p_form->(role_name||'_ids'),'[]'::jsonb);
 if jsonb_typeof(members)<>'array' or jsonb_array_length(members)>50 then raise exception 'Maximum 50 members per role'; end if;
 for member in select value from jsonb_array_elements(members) loop
 member_id=(member#>>'{}')::uuid;
 if not private.active_account(member_id) then raise exception 'Active form members required'; end if;
 insert into public.custom_form_staff(form_id,user_id,role) values(target_form,member_id,role_name) on conflict do nothing;
 end loop; end loop;
 -- Per-form managers cannot accidentally remove their own management access.
 if not private.account_permission(actor,'forms_manage') then insert into public.custom_form_staff(form_id,user_id,role) values(target_form,actor,'manager') on conflict do nothing; end if;
 return target_form;
 end; $$;
create function public.save_custom_form(p_form jsonb) returns uuid language sql security invoker set search_path='' as $$ select private.save_custom_form(p_form); $$;
create function private.publish_custom_form(p_form_id uuid) returns integer language plpgsql security definer set search_path='' as $$
 declare form public.custom_forms; next_version integer;
 begin
 select * into form from public.custom_forms where id=p_form_id for update;
 if form.id is null or not private.manage_custom_form(form.id) then raise exception 'Form manager permission required'; end if;
 perform private.validate_custom_schema(form.schema);
 if not exists(select 1 from public.custom_form_staff s where s.form_id=form.id and s.role='responsible' and private.active_account(s.user_id)) then raise exception 'Assign an active responsible person before publishing'; end if;
 next_version=coalesce(form.published_version,0)+1;
 insert into public.custom_form_versions(form_id,version,title,description,schema,published_by) values(form.id,next_version,form.title,form.description,form.schema,auth.uid());
 update public.custom_forms set published_version=next_version,updated_at=now() where id=form.id;
 return next_version;
 end; $$;
create function public.publish_custom_form(p_form_id uuid) returns integer language sql security invoker set search_path='' as $$ select private.publish_custom_form(p_form_id); $$;
create function private.get_public_form(p_slug text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',f.id,'slug',f.slug,'title',v.title,'description',v.description,'version',v.version,'schema',v.schema)
 from public.custom_forms f join public.custom_form_versions v on v.form_id=f.id and v.version=f.published_version where f.slug=p_slug and f.enabled; $$;
create function public.get_public_form(p_slug text) returns jsonb language sql stable security invoker set search_path='' as $$ select private.get_public_form(p_slug); $$;
create function private.list_public_forms() returns table(id uuid,slug text,title text,description text,version integer) language sql stable security definer set search_path='' as $$
 select f.id,f.slug,v.title,v.description,v.version from public.custom_forms f join public.custom_form_versions v on v.form_id=f.id and v.version=f.published_version where f.enabled order by v.title limit 200; $$;
create function public.list_public_forms() returns table(id uuid,slug text,title text,description text,version integer) language sql stable security invoker set search_path='' as $$ select * from private.list_public_forms(); $$;
create function private.custom_form_members(p_form_id uuid) returns table(id uuid,display_name text) language plpgsql stable security definer set search_path='' as $$
 begin if not private.manage_custom_form(p_form_id) then raise exception 'Form manager permission required'; end if;
 return query select p.id,p.display_name from public.profiles p where p.is_active order by p.display_name limit 500; end; $$;
create function public.custom_form_members(p_form_id uuid default null) returns table(id uuid,display_name text) language sql stable security invoker set search_path='' as $$ select * from private.custom_form_members(p_form_id); $$;
create function private.custom_form_assignees(p_form_id uuid) returns table(id uuid,display_name text) language plpgsql stable security definer set search_path='' as $$
 begin if not private.staff_custom_form(p_form_id) then raise exception 'Form access required'; end if;
 return query select p.id,p.display_name from public.profiles p where private.staff_custom_form(p_form_id,p.id) order by p.display_name limit 500; end; $$;
create function public.custom_form_assignees(p_form_id uuid) returns table(id uuid,display_name text) language sql stable security invoker set search_path='' as $$ select * from private.custom_form_assignees(p_form_id); $$;

create function private.custom_form_rate(p_source_key text,p_action text,p_limit integer) returns void language plpgsql security definer set search_path='' as $$
 declare request_hits integer; window_bucket timestamptz=to_timestamp(floor(extract(epoch from now())/600)*600);
 begin
 if p_source_key is null or p_source_key !~ '^[a-f0-9]{64}$' then raise exception 'Invalid source'; end if;
 delete from private.custom_form_limits where custom_form_limits.bucket<now()-interval '1 day';
 insert into private.custom_form_limits(source_key,bucket,action,hits) values(p_source_key,window_bucket,p_action,1)
 on conflict(source_key,bucket,action) do update set hits=custom_form_limits.hits+1 returning custom_form_limits.hits into request_hits;
 if request_hits>p_limit then raise exception 'submission_rate_limit'; end if;
 end; $$;
-- Service role only: user identity and salted network fingerprint come from the Edge handler.
create function public.submit_custom_form(p_slug text,p_version integer,p_answers jsonb,p_source_key text,p_attempt uuid,p_user_id uuid default null,p_uploads jsonb default '[]') returns uuid language plpgsql security definer set search_path='' as $$
 declare form public.custom_forms; version_row public.custom_form_versions; previous private.custom_form_attempts; entry uuid; member record; upload jsonb; file private.form_uploads; field jsonb; expected integer;
 begin
 if p_attempt is null then raise exception 'Attempt required'; end if;
 -- Serialize retries and duplicate attempts even before a response row exists.
 perform pg_advisory_xact_lock(hashtextextended(p_source_key||p_attempt::text,0));
 select * into previous from private.custom_form_attempts where source_key=p_source_key and attempt=p_attempt;
 select * into form from public.custom_forms where slug=p_slug for share;
 if previous.submission_id is not null then
 if previous.form_id is distinct from form.id or previous.owner_id is distinct from p_user_id or exists(select 1 from public.form_submissions where id=previous.submission_id and (payload is distinct from p_answers or form_version is distinct from p_version)) then raise exception 'Attempt already used'; end if; return previous.submission_id; end if;
 if form.id is null or not form.enabled or form.published_version is null then raise exception 'Form unavailable'; end if;
 if form.published_version<>p_version then raise exception 'form_version_changed'; end if;
 if p_user_id is not null and not private.active_account(p_user_id) then raise exception 'Active account required'; end if;
 select * into version_row from public.custom_form_versions where form_id=form.id and version=p_version;
 perform private.validate_custom_answers(version_row.schema,p_answers);
 if jsonb_typeof(p_uploads)<>'array' or jsonb_array_length(p_uploads)>5 then raise exception 'Invalid uploads'; end if;
 select count(*) into expected from jsonb_array_elements(version_row.schema->'fields') f where f->>'type' in('image','file') and coalesce(p_answers->>(f->>'id'),'')<>'';
 if expected<>jsonb_array_length(p_uploads) then raise exception 'Upload answers do not match'; end if;
 perform private.custom_form_rate(p_source_key,'submit',10);
 insert into public.form_submissions(kind,payload,custom_form_id,form_version,schema_snapshot,submitter_id)
 values('custom',p_answers,form.id,p_version,version_row.schema||jsonb_build_object('title',version_row.title),p_user_id) returning id into entry;
 for upload in select value from jsonb_array_elements(p_uploads) loop
 select * into file from private.form_uploads where id=(upload->>'id')::uuid for update;
 if file.id is null or not file.ready or file.submission_id is not null or file.form_id<>form.id or file.version<>p_version or file.attempt<>p_attempt or file.source_key<>p_source_key or file.owner_id is distinct from p_user_id or file.expires_at<now() or file.token_hash is distinct from upload->>'token_hash' or p_answers->>file.field_id is distinct from file.id::text then raise exception 'Upload does not belong to this form attempt'; end if;
 insert into public.form_attachments(id,submission_id,field_id,file_name,mime_type,size_bytes) values(file.id,entry,file.field_id,file.file_name,file.mime_type,file.size_bytes);
 update private.form_uploads set submission_id=entry where id=file.id;
 end loop;
 insert into private.custom_form_attempts(source_key,attempt,form_id,submission_id,owner_id) values(p_source_key,p_attempt,form.id,entry,p_user_id);
 for member in select distinct user_id from public.custom_form_staff where form_id=form.id and role='responsible' and private.active_account(user_id) loop
 insert into public.work_tasks(form_id,title,assigned_to,created_by,due_at) values(entry,form.task_title,member.user_id,version_row.published_by,now()+make_interval(hours=>form.due_hours));
 end loop;
 for member in select distinct user_id from public.custom_form_staff where form_id=form.id and role in('manager','watcher') and private.active_account(user_id) and user_id not in(select user_id from public.custom_form_staff where form_id=form.id and role='responsible') loop
 insert into public.user_notifications(user_id,kind,entity_id) values(member.user_id,'form',entry);
 end loop;
 return entry;
 end; $$;

create function private.reply_custom_form(p_submission_id uuid,p_body text,p_internal boolean) returns uuid language plpgsql security definer set search_path='' as $$
 declare submission public.form_submissions; result uuid; recipient uuid; staff boolean;
 begin
 select * into submission from public.form_submissions where id=p_submission_id for update;
 staff=private.staff_custom_submission(p_submission_id);
 if not private.read_custom_submission(p_submission_id) or (p_internal and not staff) then raise exception 'Response access required'; end if;
 if (select count(*) from public.form_replies where author_id=auth.uid() and created_at>now()-interval '1 hour')>=100 then raise exception 'Reply limit reached'; end if;
 insert into public.form_replies(submission_id,author_id,body,internal) values(p_submission_id,auth.uid(),trim(p_body),p_internal) returning id into result;
 for recipient in select distinct user_id from public.custom_form_staff where form_id=submission.custom_form_id and user_id<>auth.uid() and private.active_account(user_id) loop
 insert into public.user_notifications(user_id,kind,entity_id) values(recipient,'form',p_submission_id); end loop;
 if not p_internal and submission.submitter_id is not null and submission.submitter_id<>auth.uid() and private.active_account(submission.submitter_id) then
 insert into public.user_notifications(user_id,kind,entity_id) values(submission.submitter_id,'form',p_submission_id); end if;
 return result;
 end; $$;
create function public.reply_custom_form(p_submission_id uuid,p_body text,p_internal boolean default false) returns uuid language sql security invoker set search_path='' as $$ select private.reply_custom_form(p_submission_id,p_body,p_internal); $$;
create function private.set_custom_form_status(p_submission_id uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$
 begin if not private.staff_custom_submission(p_submission_id) then raise exception 'Form staff access required'; end if;
 if p_status is null or p_status not in('new','done') then raise exception 'Invalid response status'; end if;
 update public.form_submissions set status=p_status where id=p_submission_id; end; $$;
create function public.set_custom_form_status(p_submission_id uuid,p_status text) returns void language sql security invoker set search_path='' as $$ select private.set_custom_form_status(p_submission_id,p_status); $$;
create function private.assign_custom_form_task(p_submission_id uuid,p_assigned_to uuid,p_title text,p_due_at timestamptz) returns uuid language plpgsql security definer set search_path='' as $$
 declare result uuid;
 begin
 perform 1 from public.profiles where id in(auth.uid(),p_assigned_to) order by id for no key update;
 if not private.staff_custom_submission(p_submission_id) or not private.staff_custom_submission(p_submission_id,p_assigned_to) then raise exception 'Form staff access required'; end if;
 if (select count(*) from public.work_tasks where created_by=auth.uid() and created_at>now()-interval '1 hour')>=100 then raise exception 'Task creation limit reached'; end if;
 insert into public.work_tasks(form_id,title,assigned_to,created_by,due_at) values(p_submission_id,trim(p_title),p_assigned_to,auth.uid(),p_due_at) returning id into result;
 return result; end; $$;
create function public.assign_custom_form_task(p_submission_id uuid,p_assigned_to uuid,p_title text,p_due_at timestamptz default null) returns uuid language sql security invoker set search_path='' as $$ select private.assign_custom_form_task(p_submission_id,p_assigned_to,p_title,p_due_at); $$;

create function public.search_form_submissions(p_search text default '',p_kind text default null,p_form_id uuid default null,p_status text default null,p_from timestamptz default null,p_to timestamptz default null,p_offset integer default 0,p_limit integer default 25,p_oldest boolean default false,p_mine boolean default false) returns jsonb language plpgsql stable security invoker set search_path='' as $$
 declare result jsonb;
 begin
 if p_offset not between 0 and 25000 or p_limit not between 1 and 100 or length(p_search)>200 then raise exception 'Invalid search bounds'; end if;
 with matching as materialized(select f.* from public.form_submissions f where (p_kind is null or f.kind=p_kind) and (p_form_id is null or f.custom_form_id=p_form_id) and (p_from is null or f.created_at>=p_from) and (p_to is null or f.created_at<p_to) and (not p_mine or f.submitter_id=auth.uid()) and (coalesce(p_search,'')='' or position(lower(p_search) in lower(f.payload::text))>0)),
 selected as(select * from matching where p_status is null or status=p_status),
 page as(select * from selected order by case when p_oldest then created_at end asc,case when not p_oldest then created_at end desc,id limit p_limit offset p_offset)
 select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'::jsonb),'total',(select count(*) from selected),'new_count',(select count(*) from matching where status='new'),'done_count',(select count(*) from matching where status='done')) into result;
 return result; end; $$;

-- Storage bucket never public; only server generated signed upload/download capabilities.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('form-attachments','form-attachments',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf','application/zip'])
 on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

-- Service-only upload metadata RPCs keep object keys and claim tokens outside the public schema.
create function public.prepare_custom_form_upload(p_slug text,p_version integer,p_field_id text,p_attempt uuid,p_source_key text,p_user_id uuid,p_token_hash text,p_file_name text,p_mime_type text,p_size_bytes integer) returns jsonb language plpgsql security definer set search_path='' as $$
 declare form public.custom_forms; field jsonb; result uuid=gen_random_uuid(); key text;
 begin
 perform pg_advisory_xact_lock(hashtextextended(p_source_key||p_attempt::text,0));
 select * into form from public.custom_forms where slug=p_slug for share;
 if form.id is null or not form.enabled or form.published_version is null then raise exception 'Form unavailable'; end if;
 if form.published_version<>p_version then raise exception 'form_version_changed'; end if;
 if p_user_id is not null and not private.active_account(p_user_id) then raise exception 'Active account required'; end if;
 select value into field from public.custom_form_versions v,jsonb_array_elements(v.schema->'fields') where v.form_id=form.id and v.version=p_version and value->>'id'=p_field_id;
 if field is null or field->>'type' not in('image','file') then raise exception 'Invalid upload field'; end if;
 if p_mime_type is null or p_mime_type not in('image/jpeg','image/png','image/webp','application/pdf','application/zip') or (field->>'type'='image' and p_mime_type not in('image/jpeg','image/png','image/webp')) or p_size_bytes not between 1 and 10485760 or p_file_name is null or length(p_file_name) not between 1 and 160 or p_file_name ~ '[/\\]' or p_attempt is null then raise exception 'Invalid file'; end if;
 if (select count(*) from private.form_uploads where source_key=p_source_key and attempt=p_attempt and expires_at>now())>=5 then raise exception 'Maximum 5 uploads per attempt'; end if;
 perform private.custom_form_rate(p_source_key,'upload',20);
 key=form.id::text||'/'||result::text;
 insert into private.form_uploads(id,form_id,version,field_id,attempt,source_key,owner_id,token_hash,object_key,file_name,mime_type,size_bytes) values(result,form.id,p_version,p_field_id,p_attempt,p_source_key,p_user_id,p_token_hash,key,p_file_name,p_mime_type,p_size_bytes);
 return jsonb_build_object('id',result,'object_key',key); end; $$;
create function public.get_custom_form_upload(p_id uuid,p_token_hash text) returns jsonb language sql stable security definer set search_path='' as $$
 select to_jsonb(u) from private.form_uploads u where id=p_id and token_hash=p_token_hash and expires_at>now() and submission_id is null; $$;
create function public.finish_custom_form_upload(p_id uuid,p_token_hash text) returns void language plpgsql security definer set search_path='' as $$
 begin update private.form_uploads set ready=true where id=p_id and token_hash=p_token_hash and expires_at>now() and submission_id is null; if not found then raise exception 'Upload expired'; end if; end; $$;
create function public.custom_attachment_object(p_id uuid,p_user_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('object_key',u.object_key,'file_name',u.file_name,'mime_type',u.mime_type,'size_bytes',u.size_bytes,'submission_id',u.submission_id)
 from private.form_uploads u where id=p_id and submission_id is not null and private.read_custom_submission(u.submission_id,p_user_id); $$;
create function public.custom_form_export(p_form_id uuid,p_user_id uuid,p_ids uuid[] default null) returns jsonb language plpgsql stable security definer set search_path='' as $$
 declare result jsonb;
 begin
 if not private.staff_custom_form(p_form_id,p_user_id) then raise exception 'Form staff access required'; end if;
 if coalesce(array_length(p_ids,1),0)>100 then raise exception 'Maximum 100 responses per export'; end if;
 with entries as materialized(select * from public.form_submissions where custom_form_id=p_form_id and (p_ids is null or id=any(p_ids)) order by created_at desc,id limit 100)
 select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(entries)) from entries),'[]'::jsonb),'attachments',coalesce((select jsonb_agg(to_jsonb(a)||jsonb_build_object('object_key',u.object_key)) from public.form_attachments a join private.form_uploads u using(id) where a.submission_id in(select id from entries)),'[]'::jsonb)) into result;
 return result; end; $$;
create function public.expired_custom_form_uploads() returns table(id uuid,object_key text) language sql stable security invoker set search_path='' as $$
 select id,object_key from private.form_uploads where submission_id is null and expires_at<now() order by expires_at limit 100; $$;
create function public.delete_expired_custom_form_upload(p_id uuid) returns void language sql security invoker set search_path='' as $$
 delete from private.form_uploads where id=p_id and submission_id is null and expires_at<now(); $$;

-- Default PUBLIC execute must never make privileged mutations available to visitors.
do $$ declare f record; begin
 for f in select p.oid::regprocedure signature,p.proname,n.nspname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where
 (n.nspname='private' and p.proname=any(array['manage_custom_form','staff_custom_form','read_custom_submission','staff_custom_submission','validate_custom_schema','custom_field_visible','validate_custom_answers','save_custom_form','publish_custom_form','get_public_form','list_public_forms','custom_form_members','custom_form_assignees','custom_form_rate','reply_custom_form','set_custom_form_status','assign_custom_form_task'])) or
 (n.nspname='public' and p.proname=any(array['save_custom_form','publish_custom_form','get_public_form','list_public_forms','custom_form_members','custom_form_assignees','submit_custom_form','reply_custom_form','set_custom_form_status','assign_custom_form_task','search_form_submissions','prepare_custom_form_upload','get_custom_form_upload','finish_custom_form_upload','custom_attachment_object','custom_form_export','expired_custom_form_uploads','delete_expired_custom_form_upload'])) loop
 execute format('revoke all on function %s from public,anon,authenticated',f.signature);
 execute format('grant execute on function %s to service_role',f.signature);
 if f.proname=any(array['manage_custom_form','staff_custom_form','read_custom_submission','staff_custom_submission','save_custom_form','publish_custom_form','get_public_form','list_public_forms','custom_form_members','custom_form_assignees','reply_custom_form','set_custom_form_status','assign_custom_form_task','search_form_submissions']) then execute format('grant execute on function %s to authenticated',f.signature); end if;
 if f.proname in('get_public_form','list_public_forms') then execute format('grant execute on function %s to anon',f.signature); end if;
 end loop;
end $$;
grant usage on schema private to anon;
commit;
