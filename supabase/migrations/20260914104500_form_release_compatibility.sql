-- Reconcile the early managed forms deployment with the reviewed website API.
-- No responses, assignments or existing permission grants are removed.
begin;
set local lock_timeout='3s';
set local statement_timeout='30s';

create or replace function private.create_work_task(p_title text,p_assigned_to uuid,p_form_id uuid,p_due_at timestamptz,p_description text) returns uuid language plpgsql security definer set search_path='' as $$
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
create or replace function public.create_work_task(p_title text,p_assigned_to uuid,p_form_id uuid default null,p_due_at timestamptz default null,p_description text default '') returns uuid language sql security invoker set search_path='' as $$ select private.create_work_task(p_title,p_assigned_to,p_form_id,p_due_at,p_description); $$;
create or replace function private.task_assignees(p_form_id uuid) returns table(id uuid,display_name text) language plpgsql stable security definer set search_path='' as $$
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
create or replace function public.task_assignees(p_form_id uuid default null) returns table(id uuid,display_name text) language sql stable security invoker set search_path='' as $$ select * from private.task_assignees(p_form_id); $$;

revoke all on function private.create_work_task(text,uuid,uuid,timestamptz,text),public.create_work_task(text,uuid,uuid,timestamptz,text),private.task_assignees(uuid),public.task_assignees(uuid) from public,anon;
grant execute on function private.create_work_task(text,uuid,uuid,timestamptz,text),public.create_work_task(text,uuid,uuid,timestamptz,text),private.task_assignees(uuid),public.task_assignees(uuid) to authenticated,service_role;

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
 if exists(select 1 from public.custom_forms f where f.id=target_form and f.enabled and f.published_version is not null) and not exists(select 1 from public.custom_form_staff s where s.form_id=target_form and s.role='responsible' and private.active_account(s.user_id)) then raise exception 'An open form needs an active responsible person'; end if;
 return target_form;
 end; $$;
create or replace function public.save_custom_form(p_form jsonb) returns uuid language sql security invoker set search_path='' as $$ select private.save_custom_form(p_form); $$;

-- Replace the earlier one-argument endpoint without leaving ambiguous overloads.
drop function if exists public.publish_custom_form(uuid);
drop function if exists private.publish_custom_form(uuid);

create or replace function private.publish_custom_form(p_form_id uuid,p_expected_updated_at timestamptz default null) returns integer language plpgsql security definer set search_path='' as $$
 declare form public.custom_forms; next_version integer;
 begin
 select * into form from public.custom_forms where id=p_form_id for update;
 if form.id is null or not private.manage_custom_form(form.id) then raise exception 'Form manager permission required'; end if;
 if p_expected_updated_at is not null and form.updated_at is distinct from p_expected_updated_at then raise exception 'The form changed. Reload before publishing.'; end if;
 perform private.validate_custom_schema(form.schema);
 if not exists(select 1 from public.custom_form_staff s where s.form_id=form.id and s.role='responsible' and private.active_account(s.user_id)) then raise exception 'Assign an active responsible person before publishing'; end if;
 next_version=coalesce(form.published_version,0)+1;
 insert into public.custom_form_versions(form_id,version,title,description,schema,published_by) values(form.id,next_version,form.title,form.description,form.schema,auth.uid());
 update public.custom_forms set published_version=next_version,updated_at=now() where id=form.id;
 return next_version;
 end; $$;
create or replace function public.publish_custom_form(p_form_id uuid,p_expected_updated_at timestamptz default null) returns integer language sql security invoker set search_path='' as $$ select private.publish_custom_form(p_form_id,p_expected_updated_at); $$;

revoke all on function private.save_custom_form(jsonb),public.save_custom_form(jsonb),private.publish_custom_form(uuid,timestamptz),public.publish_custom_form(uuid,timestamptz) from public,anon;
grant execute on function private.save_custom_form(jsonb),public.save_custom_form(jsonb),private.publish_custom_form(uuid,timestamptz),public.publish_custom_form(uuid,timestamptz) to authenticated,service_role;
commit;
