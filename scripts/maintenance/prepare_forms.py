from pathlib import Path
import shutil
import sys
r=Path(sys.argv[1]).resolve();c=r/'current';o=r/'existing'
def part(s,a,b): return s[s.index(a):s.index(b)]
base=(o/'supabase/migrations/20260913100552_community_workspace.sql').read_text()
custom=(o/'supabase/migrations/20260913111401_custom_forms.sql').read_text()
s='-- Website forms, private submissions and in-admin actions.\nbegin;\n'
s+=part(base,'create function private.active_account','create table public.learning_courses')
s+=part(base,'create table public.work_tasks','create table public.push_devices')
s=s.replace("kind in('task','learning')","kind in('task','form')")
s+=part(base,'create table public.form_workflows','create function private.can_receive_notification')
s+="""create function private.can_receive_notification(account uuid,kind text,entity uuid) returns boolean language sql stable security definer set search_path='' as $$ select kind='task' and private.read_task(entity,account); $$;
do $$ declare t text; begin
 foreach t in array array['work_tasks','user_notifications','form_workflows'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 execute format('grant select on public.%I to authenticated',t);
 end loop; end $$;
grant update(status) on public.work_tasks to authenticated;
grant update(read_at) on public.user_notifications to authenticated;
grant insert,update,delete on public.form_workflows to authenticated;
"""
s+=part(base,'create policy task_read','create function private.enqueue_notification')
s+=part(base,'create function private.task_notification','create function private.stamp_learning_record')
s+=part(base,'create function private.create_work_task','create function private.mark_class_register')
s+=part(base,'create function private.validate_form_workflow','-- These server-only RPCs')
s+="""do $$ declare f record; begin
 for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname=any(array['active_account','workspace_owner','account_permission','read_task','can_receive_notification','task_notification','stamp_task','create_work_task','task_assignees','validate_form_workflow','route_form_submission']) loop
 execute format('revoke all on function %s from public,anon,authenticated',f.signature);
 end loop; end $$;
grant usage on schema private to authenticated,service_role;
grant execute on function private.active_account(uuid),private.workspace_owner(),private.account_permission(uuid,text),private.read_task(uuid,uuid),private.can_receive_notification(uuid,text,uuid),private.create_work_task(text,uuid,uuid,timestamptz,text),private.task_assignees(uuid) to authenticated,service_role;
revoke all on function public.create_work_task(text,uuid,uuid,timestamptz,text),public.task_assignees(uuid) from public,anon;
grant execute on function public.create_work_task(text,uuid,uuid,timestamptz,text),public.task_assignees(uuid) to authenticated,service_role;
"""
custom=custom[custom.index('alter table'):].rsplit('commit;',1)[0]
custom=custom.replace("kind in('task','learning','form')","kind in('task','form')")
old="when 'learning' then exists(select 1 from public.learning_records r join public.learning_enrolments e using(course_id,student_id)\n where r.id=entity and r.published and e.active and private.own_student(r.student_id,account)) else false end; $$;"
assert old in custom; custom=custom.replace(old,'else false end; $$;')
old="if not found or not private.manage_custom_form(target_form) then raise exception 'Form manager permission required'; end if; end if;"
assert old in custom
custom=custom.replace(old,"""if not found or not private.manage_custom_form(target_form) then raise exception 'Form manager permission required'; end if;
 if (select published_version is not null and slug is distinct from p_form->>'slug' from public.custom_forms where id=target_form) then raise exception 'The published form address is protected'; end if;
 if p_form ? 'expected_updated_at' and (select updated_at from public.custom_forms where id=target_form) is distinct from (p_form->>'expected_updated_at')::timestamptz then raise exception 'This form changed in another session. Reload before saving.'; end if;
 end if;""")
custom=custom.replace('private.publish_custom_form(p_form_id uuid)','private.publish_custom_form(p_form_id uuid,p_expected_updated_at timestamptz default null)')
custom=custom.replace('public.publish_custom_form(p_form_id uuid)','public.publish_custom_form(p_form_id uuid,p_expected_updated_at timestamptz default null)')
custom=custom.replace('select private.publish_custom_form(p_form_id);','select private.publish_custom_form(p_form_id,p_expected_updated_at);')
custom=custom.replace('perform private.validate_custom_schema(form.schema);',"if p_expected_updated_at is not null and form.updated_at is distinct from p_expected_updated_at then raise exception 'The form changed. Reload before publishing.'; end if;\n perform private.validate_custom_schema(form.schema);")
custom=custom.replace('where f.slug=p_slug and f.enabled;',"where f.slug=p_slug and f.enabled and exists(select 1 from public.custom_form_staff s where s.form_id=f.id and s.role='responsible' and private.active_account(s.user_id));")
custom=custom.replace('where f.enabled order by v.title limit 200;',"where f.enabled and exists(select 1 from public.custom_form_staff s where s.form_id=f.id and s.role='responsible' and private.active_account(s.user_id)) order by v.title limit 200;")
(c/'supabase/migrations/20260914040000_website_forms.sql').write_text(s+custom+'\ncommit;\n')
shutil.copy(o/'supabase/functions/custom-forms/index.ts',c/'supabase/functions/custom-forms/index.ts')
p=c/'supabase/functions/custom-forms/index.ts';p.write_text(p.read_text().replace("'../push-worker/message.mjs'","'./maintenance.mjs'"))
secret=(o/'supabase/functions/push-worker/message.mjs').read_text();secret=secret[secret.index('/** Compare fixed-size'):]
(c/'supabase/functions/custom-forms/maintenance.mjs').write_text(secret)
shutil.copy(o/'tests/custom-forms.test.mjs',c/'tests/custom-forms.test.mjs')
p=c/'tests/custom-forms.test.mjs';s=p.read_text().replace("['20260913100552_community_workspace.sql', '20260913111401_custom_forms.sql']","['20260914040000_website_forms.sql']").replace('select count(*) n from push_outbox','select count(*) n from user_notifications');p.write_text(s)

# Refuse to commit an unexpected transformation of the pinned source.
import hashlib
expected={'supabase/migrations/20260914040000_website_forms.sql': '8bb5edd97db253a2d8cf58faa81e73f777ea47e345f31140ca74265fc67f5657', 'supabase/functions/custom-forms/index.ts': '7e467f4584dcd537ffc4ed5a7d922d4539595683ef845a851abf77b51361ceac', 'supabase/functions/custom-forms/maintenance.mjs': '5928dec6ee63bad9ede8c50844e6538b08bd3f6b883930b5029e5a32d2768d9d', 'tests/custom-forms.test.mjs': '529dfd51c6794b016196b5a272721496cf39d68fcb22142148c63a0bd804382d'}
for name,digest in expected.items():
    assert hashlib.sha256((c/name).read_bytes()).hexdigest()==digest, name
print("Prepared and hash-checked", len(expected), "files")
