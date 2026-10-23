-- Bring the three original forms into the versioned builder without rewriting
-- their submissions, replies, tasks or legacy permission grants.
begin;
set local lock_timeout='3s';
set local statement_timeout='30s';

alter table public.custom_forms add column built_in_kind text unique
 check(built_in_kind in('contact','madrassah','itikaaf'));

-- The original legacy policy concatenated kind into forms_KIND. Restrict that
-- policy to its original kinds so forms_custom cannot bypass the built-in ACL.
-- The existing custom_submission policies continue to cover ordinary forms.
alter policy forms_read on public.form_submissions using(kind<>'custom' and private.has_permission('forms_'||kind));
alter policy forms_update on public.form_submissions using(kind<>'custom' and private.has_permission('forms_'||kind)) with check(kind<>'custom' and private.has_permission('forms_'||kind));

-- A built-in form retains its original response permission. A broad custom-form
-- permission or a new assignment must never grant access to its sensitive data.
create or replace function private.manage_custom_form(form uuid,account uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$
 select private.active_account(account) and
 (not exists(select 1 from public.custom_forms where id=form and built_in_kind is not null)
  or exists(select 1 from public.custom_forms where id=form and private.account_permission(account,'forms_'||built_in_kind)))
 and (private.account_permission(account,'forms_manage') or exists(select 1 from public.custom_form_staff where form_id=form and user_id=account and role='manager')); $$;
create or replace function private.staff_custom_form(form uuid,account uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$
 select private.active_account(account) and case
 when exists(select 1 from public.custom_forms where id=form and built_in_kind is not null)
 then exists(select 1 from public.custom_forms where id=form and private.account_permission(account,'forms_'||built_in_kind))
 else private.account_permission(account,'forms_custom') or private.manage_custom_form(form,account) or exists(select 1 from public.custom_form_staff where form_id=form and user_id=account) end; $$;

create function private.validate_built_in_staff() returns trigger language plpgsql security definer set search_path='' as $$
 declare legacy_kind text;
 begin
 select built_in_kind into legacy_kind from public.custom_forms where id=new.form_id;
 if legacy_kind is not null and not private.account_permission(new.user_id,'forms_'||legacy_kind) then
 raise exception 'Choose a person with the existing permission for this built-in form'; end if;
 return new;
 end; $$;
create trigger built_in_staff_validate before insert or update on public.custom_form_staff for each row execute function private.validate_built_in_staff();
revoke all on function private.validate_built_in_staff() from public,anon,authenticated;

create or replace function private.custom_form_members(p_form_id uuid) returns table(id uuid,display_name text) language plpgsql stable security definer set search_path='' as $$
 declare legacy_kind text;
 begin
 if not private.manage_custom_form(p_form_id) then raise exception 'Form manager permission required'; end if;
 select built_in_kind into legacy_kind from public.custom_forms where custom_forms.id=p_form_id;
 return query select p.id,p.display_name from public.profiles p where p.is_active and
 (legacy_kind is null or private.account_permission(p.id,'forms_'||legacy_kind)) order by p.display_name limit 500;
 end; $$;

-- Create immutable version 1 for the current public questions. Existing rows
-- keep kind=contact/madrassah/itikaaf; only future builder submissions are custom.
do $$
 declare owner_id uuid; item record; target uuid; flow_assignee uuid; flow_title text; flow_hours integer; flow_enabled boolean;
 begin
 select id into owner_id from public.profiles where is_owner and is_active order by id limit 1;
 if owner_id is null then raise exception 'An active owner is required to initialise the built-in forms'; end if;
 for item in select * from (values
 ('contact','contact-us','Contact Us','Send a message to the centre. The office can reply using the contact details you provide.',
 $schema${"fields":[{"id":"name","label":"Name","type":"text","required":true},{"id":"email","label":"Email address","type":"email","required":true},{"id":"question","label":"Your message","type":"textarea","required":true}]}$schema$::jsonb),
 ('madrassah','madrassah-enquiry','Madrassah enquiry','Enquire about a place at the Madrassah. The team must confirm a place before enrolment is complete.',
 $schema${"fields":[{"id":"name","label":"Parent / guardian","type":"text","required":true},{"id":"email","label":"Email","type":"email","required":true},{"id":"phone","label":"Phone","type":"phone","placeholder":"07700 900000 or +44…"},{"id":"query","label":"Pupil details","type":"textarea","required":true,"help":"Pupil’s name, age and previous learning. Share only what is needed for this enquiry."}]}$schema$::jsonb),
 ('itikaaf','itikaaf-registration','I’tikaf registration','Register your details and confirm attendance arrangements with the centre. Ages 11–16 require parent or guardian consent.',
 $schema${"fields":[{"id":"attendee_name","label":"Full name","type":"text","required":true},{"id":"attendee_age","label":"Age","type":"number","required":true,"minimum":1,"maximum":120,"integer":true},{"id":"attendee_address","label":"Address","type":"textarea","required":true},{"id":"attendee_phone","label":"Phone number","type":"phone","required":true},{"id":"attendee_email","label":"Email","type":"email","required":true},{"id":"emergency_contact_name","label":"Emergency contact name","type":"text","required":true},{"id":"emergency_contact_phone","label":"Emergency contact phone","type":"phone","required":true},{"id":"emergency_contact_relationship","label":"Relationship","type":"text","required":true},{"id":"medical_conditions","label":"Medical conditions","type":"textarea"},{"id":"allergies","label":"Allergies","type":"textarea"},{"id":"medications","label":"Current medications","type":"textarea"},{"id":"parent_name","label":"Parent / guardian name","type":"text","required":true,"show_when":{"field":"attendee_age","operator":"between","value":11,"maximum":16}},{"id":"parent_phone","label":"Parent / guardian phone","type":"phone","required":true,"show_when":{"field":"attendee_age","operator":"between","value":11,"maximum":16}},{"id":"parent_email","label":"Parent / guardian email","type":"email","required":true,"show_when":{"field":"attendee_age","operator":"between","value":11,"maximum":16}},{"id":"parent_consent_signature","label":"Parent / guardian signature","type":"text","required":true,"help":"I consent to my child attending I’tikaf and confirm that this information is accurate. Type your full name as signature.","show_when":{"field":"attendee_age","operator":"between","value":11,"maximum":16}},{"id":"parent_consent_date","label":"Consent date","type":"date","required":true,"show_when":{"field":"attendee_age","operator":"between","value":11,"maximum":16}}]}$schema$::jsonb)
 ) as seed(kind,slug,title,description,schema) loop
 -- Never silently adopt an unrelated existing form using a reserved address.
 if exists(select 1 from public.custom_forms where slug=item.slug and built_in_kind is distinct from item.kind) then
 raise exception 'Reserved built-in form address already exists: %',item.slug; end if;
 flow_assignee=null; flow_title=null; flow_hours=null; flow_enabled=false;
 if to_regclass('public.form_workflows') is not null then
 execute 'select assigned_to,title,due_hours,enabled from public.form_workflows where kind=$1'
 into flow_assignee,flow_title,flow_hours,flow_enabled using item.kind;
 end if;
 insert into public.custom_forms(slug,title,description,schema,published_version,enabled,task_title,due_hours,created_by,built_in_kind)
 values(item.slug,item.title,item.description,item.schema,1,true,coalesce(flow_title,'Reply to form response'),coalesce(flow_hours,48),owner_id,item.kind)
 returning id into target;
 insert into public.custom_form_versions(form_id,version,title,description,schema,published_by)
 values(target,1,item.title,item.description,item.schema,owner_id);
 insert into public.custom_form_staff(form_id,user_id,role) values(target,owner_id,'manager');
 insert into public.custom_form_staff(form_id,user_id,role)
 values(target,case when flow_enabled and private.account_permission(flow_assignee,'forms_'||item.kind) then flow_assignee else owner_id end,'responsible');
 end loop;
 end; $$;

-- Saving, publishing and the optional page association share one transaction.
-- Calling the existing page routine keeps content permission and page locking
-- independent from form management; no extra page grants are introduced.
create function private.save_form_workflow(p_form jsonb,p_publish boolean,p_page jsonb default null) returns jsonb language plpgsql security definer set search_path='' as $$
 declare target uuid; stored public.custom_forms; saved_page jsonb; existing_page public.site_pages;
 begin
 if p_publish is null then raise exception 'Choose whether to publish the form'; end if;
 if p_page is not null then
 if not private.has_permission('content') then raise exception 'Content permission required to add a page'; end if;
 if jsonb_typeof(p_page)<>'object' then raise exception 'Invalid page'; end if;
 if nullif(p_page->>'id','') is not null then
 select * into existing_page from public.site_pages where id=(p_page->>'id')::uuid for update;
 if existing_page.id is null then raise exception 'Choose an existing page'; end if;
 if existing_page.form_id is not null and existing_page.form_id is distinct from (p_form->>'id')::uuid then
 raise exception 'This page already has a form. Choose another page or edit its registration in Website pages.'; end if;
 end if;
 end if;
 target=private.save_custom_form(p_form);
 if p_publish then perform private.publish_custom_form(target,(select updated_at from public.custom_forms where id=target)); end if;
 if p_page is not null then
 saved_page=private.save_site_page(p_page||jsonb_build_object('form_id',target,'registration',coalesce(nullif(p_page->>'registration','none'),'interest')));
 end if;
 select * into stored from public.custom_forms where id=target;
 return jsonb_build_object('form',to_jsonb(stored),'page',saved_page);
 end; $$;
create function public.save_form_workflow(p_form jsonb,p_publish boolean,p_page jsonb default null) returns jsonb language sql security invoker set search_path='' as $$
 select private.save_form_workflow(p_form,p_publish,p_page); $$;
revoke all on function private.save_form_workflow(jsonb,boolean,jsonb),public.save_form_workflow(jsonb,boolean,jsonb) from public,anon;
grant execute on function private.save_form_workflow(jsonb,boolean,jsonb),public.save_form_workflow(jsonb,boolean,jsonb) to authenticated,service_role;

-- RLS still filters every response. A form scope includes its original rows;
-- legacy kind links also include future versioned responses for that form.
create or replace function public.search_form_submissions(p_search text default '',p_kind text default null,p_form_id uuid default null,p_status text default null,p_from timestamptz default null,p_to timestamptz default null,p_offset integer default 0,p_limit integer default 25,p_oldest boolean default false,p_mine boolean default false) returns jsonb language plpgsql stable security invoker set search_path='' as $$
 declare result jsonb;
 begin
 if p_offset is null or p_limit is null or p_offset not between 0 and 25000 or p_limit not between 1 and 100 or length(p_search)>200 then raise exception 'Invalid search bounds'; end if;
 with matching as materialized(select f.* from public.form_submissions f where
 (p_kind is null or f.kind=p_kind or (f.kind='custom' and exists(select 1 from public.custom_forms c where c.id=f.custom_form_id and c.built_in_kind=p_kind)))
 and (p_form_id is null or f.custom_form_id=p_form_id or exists(select 1 from public.custom_forms c where c.id=p_form_id and c.built_in_kind=f.kind))
 and (p_from is null or f.created_at>=p_from) and (p_to is null or f.created_at<p_to)
 and (not p_mine or f.submitter_id=auth.uid()) and (coalesce(p_search,'')='' or position(lower(p_search) in lower(f.payload::text))>0)),
 selected as(select * from matching where p_status is null or status=p_status),
 page as(select * from selected order by case when p_oldest then created_at end asc,case when not p_oldest then created_at end desc,id limit p_limit offset p_offset)
 select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'::jsonb),'total',(select count(*) from selected),'new_count',(select count(*) from matching where status='new'),'done_count',(select count(*) from matching where status='done')) into result;
 return result;
 end; $$;

create or replace function private.admin_forms_overview() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(f)),'[]'::jsonb) from (
 select c.id,c.slug,c.title,c.description,c.enabled,c.published_version,c.updated_at,c.built_in_kind,private.manage_custom_form(c.id) as can_manage,
 (select count(*) from public.form_submissions s where (s.custom_form_id=c.id or s.kind=c.built_in_kind) and s.status='new') as new_count,
 (select count(*) from public.form_submissions s where (s.custom_form_id=c.id or s.kind=c.built_in_kind) and s.status='done') as done_count,
 (select count(*) from public.work_tasks t join public.form_submissions s on s.id=t.form_id where (s.custom_form_id=c.id or s.kind=c.built_in_kind) and t.status<>'done' and private.read_task(t.id)) as open_actions,
 coalesce((select jsonb_agg(jsonb_build_object('user_id',p.id,'display_name',p.display_name,'role',a.role,'active',p.is_active) order by a.role,p.display_name) from public.custom_form_staff a join public.profiles p on p.id=a.user_id where a.form_id=c.id),'[]'::jsonb) as people,
 coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'slug',p.slug,'title',p.title,'placement',p.placement,'published',p.published)) from public.site_pages p where p.form_id=c.id),'[]'::jsonb) as pages
 from public.custom_forms c where private.staff_custom_form(c.id) order by c.updated_at desc,c.id limit 500) f; $$;

-- Preserve the original age validation and conditional consent in the shared renderer.
create or replace function private.validate_custom_schema(p_schema jsonb) returns void language plpgsql immutable set search_path='' as $$
 declare field jsonb; prior jsonb; option jsonb; ids text[]='{}'; option_values text[]; id text; kind text; file_count integer=0;
 begin
 if p_schema is null or jsonb_typeof(p_schema)<>'object' or octet_length(p_schema::text)>48000 or jsonb_typeof(p_schema->'fields') is distinct from 'array' then raise exception 'Invalid form schema'; end if;
 if jsonb_array_length(p_schema->'fields') not between 1 and 40 then raise exception 'Provide 1 to 40 fields'; end if;
 for field in select value from jsonb_array_elements(p_schema->'fields') loop
 id=field->>'id'; kind=field->>'type';
 if jsonb_typeof(field)<>'object' or id is null or id !~ '^[a-z][a-z0-9_]{0,39}$' or id=any(ids) or kind is null or kind<>all(array['text','textarea','email','phone','number','date','select','multiselect','checkbox','image','file']) or jsonb_typeof(field->'label') is distinct from 'string' or coalesce(length(trim(field->>'label')),0) not between 1 and 160 or (field ? 'required' and jsonb_typeof(field->'required')<>'boolean') then raise exception 'Invalid or duplicate field'; end if;
 if (field ? 'help' and (jsonb_typeof(field->'help') is distinct from 'string' or length(field->>'help')>300)) or (field ? 'placeholder' and (jsonb_typeof(field->'placeholder') is distinct from 'string' or length(field->>'placeholder')>160)) then raise exception 'Use short text for question help and examples'; end if;
 if (field ? 'minimum' and (kind<>'number' or jsonb_typeof(field->'minimum')<>'number' or abs((field->>'minimum')::numeric)>1000000000000)) or (field ? 'maximum' and (kind<>'number' or jsonb_typeof(field->'maximum')<>'number' or abs((field->>'maximum')::numeric)>1000000000000)) or (field ? 'integer' and (kind<>'number' or jsonb_typeof(field->'integer')<>'boolean')) then raise exception 'Invalid number limits'; end if;
 if field ? 'minimum' and field ? 'maximum' and (field->>'minimum')::numeric>(field->>'maximum')::numeric then raise exception 'The minimum cannot exceed the maximum'; end if;
 if kind in('file','image') then file_count=file_count+1; if file_count>5 then raise exception 'Maximum 5 upload fields'; end if; end if;
 if kind in('select','multiselect') then
 if jsonb_typeof(field->'options') is distinct from 'array' or jsonb_array_length(field->'options') not between 1 and 50 then raise exception 'Options required'; end if;
 option_values='{}'; for option in select value from jsonb_array_elements(field->'options') loop
 if jsonb_typeof(option)<>'string' or length(trim(option#>>'{}')) not between 1 and 120 or (option#>>'{}')=any(option_values) then raise exception 'Invalid duplicate option'; end if;
 option_values=array_append(option_values,option#>>'{}'); end loop;
 end if;
 if field ? 'show_when' and field->'show_when'<>'null'::jsonb then
 if jsonb_typeof(field->'show_when')<>'object' or not coalesce((field->'show_when'->>'field')=any(ids),false) or coalesce(field->'show_when'->>'operator','') not in('equals','not_equals','between') or coalesce(jsonb_typeof(field->'show_when'->'value'),'null') not in('string','boolean','number') then raise exception 'Invalid visibility condition'; end if;
 select value into prior from jsonb_array_elements(p_schema->'fields') where value->>'id'=field->'show_when'->>'field';
 if field->'show_when'->>'operator'='between' and (prior->>'type'<>'number' or jsonb_typeof(field->'show_when'->'value')<>'number' or jsonb_typeof(field->'show_when'->'maximum') is distinct from 'number' or (field->'show_when'->>'value')::numeric>(field->'show_when'->>'maximum')::numeric or abs((field->'show_when'->>'value')::numeric)>1000000000000 or abs((field->'show_when'->>'maximum')::numeric)>1000000000000) then raise exception 'Invalid number range condition'; end if;
 if prior->>'type' in('file','image','multiselect') or (prior ? 'show_when' and prior->'show_when'<>'null'::jsonb) then raise exception 'Condition must use an earlier unconditioned scalar field'; end if;
 end if;
 ids=array_append(ids,id);
 end loop;
 end; $$;
create or replace function private.custom_field_visible(field jsonb,answers jsonb) returns boolean language sql immutable set search_path='' as $$
 select case when field->'show_when' is null or field->'show_when'='null'::jsonb then true
 when field->'show_when'->>'operator'='between' then case when jsonb_typeof(answers->(field->'show_when'->>'field'))='number' then (answers->>(field->'show_when'->>'field'))::numeric between (field->'show_when'->>'value')::numeric and (field->'show_when'->>'maximum')::numeric else false end
 when field->'show_when'->>'operator'='equals' then coalesce(answers->(field->'show_when'->>'field')=field->'show_when'->'value',false)
 else not coalesce(answers->(field->'show_when'->>'field')=field->'show_when'->'value',false) end; $$;
create or replace function private.validate_custom_answers(p_schema jsonb,p_answers jsonb) returns void language plpgsql immutable set search_path='' as $$
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
 if coalesce((field->>'required')::boolean,false) and (missing or (jsonb_typeof(answer)='string' and length(trim(answer#>>'{}'))=0) or (kind='checkbox' and answer<>'true'::jsonb)) then raise exception 'Required field: %',field->>'label'; end if;
 if missing then continue; end if;
 if kind='checkbox' then if jsonb_typeof(answer)<>'boolean' then raise exception 'Invalid checkbox answer'; end if;
 elsif kind='number' then if jsonb_typeof(answer)<>'number' or abs((answer#>>'{}')::numeric)>1000000000000 or (coalesce((field->>'integer')::boolean,false) and trunc((answer#>>'{}')::numeric)<>(answer#>>'{}')::numeric) or (field ? 'minimum' and (answer#>>'{}')::numeric<(field->>'minimum')::numeric) or (field ? 'maximum' and (answer#>>'{}')::numeric>(field->>'maximum')::numeric) then raise exception 'Invalid number answer'; end if;
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

create or replace function private.admin_form_tasks(p_form_id uuid default null,p_offset integer default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
 declare result jsonb;
 begin
 if not private.active_account(auth.uid()) then raise exception 'Active account required'; end if;
 if p_offset is null or p_offset not between 0 and 25000 then raise exception 'Invalid page'; end if;
 if p_form_id is not null and not private.staff_custom_form(p_form_id) then raise exception 'Form access required'; end if;
 with permitted as materialized (
 select t.*,p.display_name as assignee_name,s.custom_form_id,c.title as form_title,(private.workspace_owner() or private.manage_custom_form(s.custom_form_id) or t.created_by=auth.uid()) as can_reassign
 from public.work_tasks t join public.profiles p on p.id=t.assigned_to left join public.form_submissions s on s.id=t.form_id left join public.custom_forms c on c.id=s.custom_form_id
 where private.read_task(t.id) and (p_form_id is null or s.custom_form_id=p_form_id or exists(select 1 from public.custom_forms c where c.id=p_form_id and c.built_in_kind=s.kind))
 ), page as (select * from permitted order by (status='done'),due_at nulls last,created_at desc,id limit 25 offset p_offset)
 select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'::jsonb),'total',(select count(*) from permitted),'open_count',(select count(*) from permitted where status<>'done')) into result;
 return result; end; $$;
create or replace function private.reassign_form_task(p_task_id uuid,p_assigned_to uuid,p_expected_updated_at timestamptz) returns void language plpgsql security definer set search_path='' as $$
 declare task public.work_tasks; form uuid;
 begin
 select * into task from public.work_tasks where id=p_task_id for update;
 select coalesce(s.custom_form_id,(select id from public.custom_forms where built_in_kind=s.kind)) into form from public.form_submissions s where s.id=task.form_id;
 if task.id is null or not private.read_task(task.id) or not(private.workspace_owner() or private.manage_custom_form(form) or task.created_by=auth.uid()) then raise exception 'Task management access required'; end if;
 if task.updated_at is distinct from p_expected_updated_at then raise exception 'This action changed. Refresh before reassigning.'; end if;
 if form is null or not private.staff_custom_form(form,p_assigned_to) then raise exception 'Choose a person with access to this form'; end if;
 update public.work_tasks set assigned_to=p_assigned_to where id=task.id;
 insert into public.audit_log(actor_id,actor_name,table_name,record_id,action,old_data,new_data) values(auth.uid(),(select display_name from public.profiles where id=auth.uid()),'work_tasks',task.id::text,'REASSIGN',jsonb_build_object('assigned_to',task.assigned_to),jsonb_build_object('assigned_to',p_assigned_to));
 end; $$;
-- A responsible person must retain access as well as an active account.
create or replace function private.get_public_form(p_slug text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',f.id,'slug',f.slug,'title',v.title,'description',v.description,'version',v.version,'schema',v.schema)
 from public.custom_forms f join public.custom_form_versions v on v.form_id=f.id and v.version=f.published_version where f.slug=p_slug and f.enabled and exists(select 1 from public.custom_form_staff s where s.form_id=f.id and s.role='responsible' and private.staff_custom_form(f.id,s.user_id)); $$;

create or replace function private.list_public_forms() returns table(id uuid,slug text,title text,description text,version integer) language sql stable security definer set search_path='' as $$
 select f.id,f.slug,v.title,v.description,v.version from public.custom_forms f join public.custom_form_versions v on v.form_id=f.id and v.version=f.published_version where f.enabled and exists(select 1 from public.custom_form_staff s where s.form_id=f.id and s.role='responsible' and private.staff_custom_form(f.id,s.user_id)) order by v.title limit 200; $$;

create or replace function private.publish_custom_form(p_form_id uuid,p_expected_updated_at timestamptz default null) returns integer language plpgsql security definer set search_path='' as $$
 declare form public.custom_forms; next_version integer;
 begin
 select * into form from public.custom_forms where id=p_form_id for update;
 if form.id is null or not private.manage_custom_form(form.id) then raise exception 'Form manager permission required'; end if;
 if p_expected_updated_at is not null and form.updated_at is distinct from p_expected_updated_at then raise exception 'The form changed. Reload before publishing.'; end if;
 perform private.validate_custom_schema(form.schema);
 if not exists(select 1 from public.custom_form_staff s where s.form_id=form.id and s.role='responsible' and private.staff_custom_form(form.id,s.user_id)) then raise exception 'Assign an active responsible person before publishing'; end if;
 next_version=coalesce(form.published_version,0)+1;
 insert into public.custom_form_versions(form_id,version,title,description,schema,published_by) values(form.id,next_version,form.title,form.description,form.schema,auth.uid());
 update public.custom_forms set published_version=next_version,updated_at=now() where id=form.id;
 return next_version;
 end; $$;

create or replace function public.submit_custom_form(p_slug text,p_version integer,p_answers jsonb,p_source_key text,p_attempt uuid,p_user_id uuid default null,p_uploads jsonb default '[]') returns uuid language plpgsql security definer set search_path='' as $$
 declare form public.custom_forms; version_row public.custom_form_versions; previous private.custom_form_attempts; entry uuid; member record; upload jsonb; file private.form_uploads; field jsonb; expected integer;
 begin
 if p_attempt is null then raise exception 'Attempt required'; end if;
 -- Serialize retries and duplicate attempts even before a response row exists.
 perform pg_advisory_xact_lock(hashtextextended(p_attempt::text,0));
 select * into previous from private.custom_form_attempts where attempt=p_attempt;
 select * into form from public.custom_forms where slug=p_slug for share;
 if previous.submission_id is not null then
 if previous.form_id is distinct from form.id or previous.owner_id is distinct from p_user_id or exists(select 1 from public.form_submissions where id=previous.submission_id and (payload is distinct from p_answers or form_version is distinct from p_version)) then raise exception 'Attempt already used'; end if; return previous.submission_id; end if;
 if form.id is null or not form.enabled or form.published_version is null then raise exception 'Form unavailable'; end if;
 if form.published_version<>p_version then raise exception 'form_version_changed'; end if;
 if p_user_id is not null and not private.active_account(p_user_id) then raise exception 'Active account required'; end if;
 if not exists(select 1 from public.custom_form_staff where form_id=form.id and role='responsible' and private.staff_custom_form(form.id,user_id)) then raise exception 'Form temporarily unavailable: no responsible person'; end if;
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
 if file.id is null or not file.ready or file.submission_id is not null or file.form_id<>form.id or file.version<>p_version or file.attempt<>p_attempt or file.owner_id is distinct from p_user_id or file.expires_at<now() or file.token_hash is distinct from upload->>'token_hash' or p_answers->>file.field_id is distinct from file.id::text then raise exception 'Upload does not belong to this form attempt'; end if;
 insert into public.form_attachments(id,submission_id,field_id,file_name,mime_type,size_bytes) values(file.id,entry,file.field_id,file.file_name,file.mime_type,file.size_bytes);
 update private.form_uploads set submission_id=entry where id=file.id;
 end loop;
 insert into private.custom_form_attempts(source_key,attempt,form_id,submission_id,owner_id) values(p_source_key,p_attempt,form.id,entry,p_user_id);
 for member in select distinct user_id from public.custom_form_staff where form_id=form.id and role='responsible' and private.staff_custom_form(form.id,user_id) loop
 insert into public.work_tasks(form_id,title,assigned_to,created_by,due_at) values(entry,form.task_title,member.user_id,version_row.published_by,now()+make_interval(hours=>form.due_hours));
 end loop;
 for member in select distinct user_id from public.custom_form_staff where form_id=form.id and role in('manager','watcher') and private.staff_custom_form(form.id,user_id) and user_id not in(select user_id from public.custom_form_staff where form_id=form.id and role='responsible') loop
 insert into public.user_notifications(user_id,kind,entity_id) values(member.user_id,'form',entry);
 end loop;
 return entry;
 end; $$;

create or replace function private.save_custom_form(p_form jsonb) returns uuid language plpgsql security definer set search_path='' as $$
 declare target_form uuid=(p_form->>'id')::uuid; actor uuid=auth.uid(); member jsonb; role_name text; members jsonb; member_id uuid;
 begin
 if target_form is null then if not private.account_permission(actor,'forms_manage') then raise exception 'Form manager permission required'; end if; target_form=gen_random_uuid();
 else perform 1 from public.custom_forms where id=target_form for update;
 if not found or not private.manage_custom_form(target_form) then raise exception 'Form manager permission required'; end if;
 if (select published_version is not null and slug is distinct from p_form->>'slug' from public.custom_forms where id=target_form) then raise exception 'The published form address is protected'; end if;
 if p_form ? 'expected_updated_at' and (select updated_at from public.custom_forms where id=target_form) is distinct from (p_form->>'expected_updated_at')::timestamptz then raise exception 'This form changed in another session. Reload before saving.'; end if;
 end if;
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
 if exists(select 1 from public.custom_forms f where f.id=target_form and f.enabled and f.published_version is not null) and not exists(select 1 from public.custom_form_staff s where s.form_id=target_form and s.role='responsible' and private.staff_custom_form(target_form,s.user_id)) then raise exception 'An open form needs an active responsible person'; end if;
 return target_form;
 end; $$;

-- Older open browser tabs may still use submit-form. Enforce the currently
-- published questions and availability there too, and snapshot only new rows.
create function private.guard_legacy_built_in_submission() returns trigger language plpgsql security definer set search_path='' as $$
 declare form public.custom_forms; version_row public.custom_form_versions; field jsonb;
 begin
 select * into form from public.custom_forms where built_in_kind=new.kind for share;
 if form.id is null then return new; end if;
 if not form.enabled or form.published_version is null or not exists(select 1 from public.custom_form_staff where form_id=form.id and role='responsible' and private.account_permission(user_id,'forms_'||new.kind)) then raise exception 'Form is currently closed'; end if;
 select * into version_row from public.custom_form_versions where form_id=form.id and version=form.published_version;
 for field in select value from jsonb_array_elements(version_row.schema->'fields') loop
 if not private.custom_field_visible(field,new.payload) then new.payload=new.payload-(field->>'id'); end if;
 end loop;
 perform private.validate_custom_answers(version_row.schema,new.payload);
 new.schema_snapshot=version_row.schema||jsonb_build_object('title',version_row.title);
 new.form_version=form.published_version;
 return new;
 end; $$;
create trigger legacy_built_in_submission_guard before insert on public.form_submissions for each row when(new.kind<>'custom') execute function private.guard_legacy_built_in_submission();
revoke all on function private.guard_legacy_built_in_submission() from public,anon,authenticated;

create or replace function private.route_form_submission() returns trigger language plpgsql security definer set search_path='' as $$
 declare form public.custom_forms; publisher uuid; member record; flow_assignee uuid; flow_title text; flow_hours integer; flow_configured_by uuid;
 begin
 select * into form from public.custom_forms where built_in_kind=new.kind;
 if form.id is not null then
 select published_by into publisher from public.custom_form_versions where form_id=form.id and version=form.published_version;
 for member in select distinct user_id from public.custom_form_staff where form_id=form.id and role='responsible' and private.account_permission(user_id,'forms_'||new.kind) loop
 insert into public.work_tasks(form_id,title,assigned_to,created_by,due_at) values(new.id,form.task_title,member.user_id,publisher,now()+make_interval(hours=>form.due_hours));
 end loop;
 elsif to_regclass('public.form_workflows') is not null then
 execute 'select assigned_to,title,due_hours,configured_by from public.form_workflows where kind=$1 and enabled'
 into flow_assignee,flow_title,flow_hours,flow_configured_by using new.kind;
 if flow_assignee is not null and private.account_permission(flow_assignee,'forms_'||new.kind) and exists(select 1 from public.profiles where id=flow_configured_by and is_active and is_owner) then
 insert into public.work_tasks(form_id,title,assigned_to,created_by,due_at) values(new.id,flow_title,flow_assignee,flow_configured_by,now()+make_interval(hours=>flow_hours));
 end if;
 end if;
 return new;
 end; $$;
do $$ begin
 if not exists(select 1 from pg_trigger t join pg_proc p on p.oid=t.tgfoid join pg_namespace n on n.oid=p.pronamespace where t.tgrelid='public.form_submissions'::regclass and not t.tgisinternal and n.nspname='private' and p.proname='route_form_submission') then
 create trigger built_in_form_route after insert on public.form_submissions for each row execute function private.route_form_submission();
 end if;
end $$;
revoke all on function private.route_form_submission() from public,anon,authenticated;

-- The older generic task API must use the same per-form access checks.
create or replace function private.create_work_task(p_title text,p_assigned_to uuid,p_form_id uuid,p_due_at timestamptz,p_description text) returns uuid language plpgsql security definer set search_path='' as $$
 declare result uuid; form_kind text; custom_definition uuid; actor uuid=auth.uid();
 begin
 perform 1 from public.profiles where id in(actor,p_assigned_to) order by id for no key update;
 if not private.active_account(actor) or not private.active_account(p_assigned_to) then raise exception 'Active accounts required'; end if;
 if (select count(*) from public.work_tasks where created_by=actor and created_at>now()-interval '1 hour')>=100 then raise exception 'Task creation limit reached; try later'; end if;
 if p_form_id is null then
 if p_assigned_to<>actor and not private.workspace_owner() then raise exception 'Owner permission required for delegation'; end if;
 else
 select kind,custom_form_id into form_kind,custom_definition from public.form_submissions where id=p_form_id;
 if form_kind is null or not(case when form_kind='custom' then private.staff_custom_form(custom_definition,actor) else private.account_permission(actor,'forms_'||form_kind) end) or not(case when form_kind='custom' then private.staff_custom_form(custom_definition,p_assigned_to) else private.account_permission(p_assigned_to,'forms_'||form_kind) end) then raise exception 'Form access required'; end if;
 end if;
 insert into public.work_tasks(title,assigned_to,form_id,due_at,description,created_by) values(trim(p_title),p_assigned_to,p_form_id,p_due_at,coalesce(p_description,''),actor) returning id into result;
 return result;
 end; $$;

create or replace function private.task_assignees(p_form_id uuid) returns table(id uuid,display_name text) language plpgsql stable security definer set search_path='' as $$
 declare form_kind text; custom_definition uuid;
 begin
 if not private.active_account(auth.uid()) then raise exception 'Active account required'; end if;
 if p_form_id is not null then
 select f.kind,f.custom_form_id into form_kind,custom_definition from public.form_submissions f where f.id=p_form_id;
 if form_kind is null or not(case when form_kind='custom' then private.staff_custom_form(custom_definition) else private.account_permission(auth.uid(),'forms_'||form_kind) end) then raise exception 'Form access required'; end if;
 end if;
 return query select p.id,p.display_name from public.profiles p where p.is_active and
 case when p_form_id is null then private.workspace_owner() or p.id=auth.uid() else case when form_kind='custom' then private.staff_custom_form(custom_definition,p.id) else private.account_permission(p.id,'forms_'||form_kind) end end order by p.display_name limit 500;
 end; $$;
commit;
