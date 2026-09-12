-- Run as the database owner. Every fixture and status change is rolled back.
begin;
do $$
declare
  fixture_user uuid := gen_random_uuid();
  fixture_ids uuid[];
  staff_permission text;
  visible_count integer;
  changed_count integer;
  expected integer;
  fingerprint text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
begin
  insert into auth.users(id, email) values (fixture_user, fixture_user::text || '@example.invalid');
  insert into public.profiles(id, is_active) values (fixture_user, true)
    on conflict(id) do nothing;
  with fixtures as (
    insert into public.form_submissions(kind, payload)
      values ('contact', '{"test":"rollback-only"}'), ('madrassah', '{"test":"rollback-only"}'), ('itikaaf', '{"test":"rollback-only"}')
      returning id
  ) select array_agg(id) into fixture_ids from fixtures;
  perform set_config('request.jwt.claim.sub', fixture_user::text, true);

  foreach staff_permission in array array['tv','content','forms_contact','forms_madrassah','forms_itikaaf'] loop
    update public.profiles set permissions = array[staff_permission], is_active = true where id = fixture_user;
    expected := case when staff_permission like 'forms_%' then 1 else 0 end;
    set local role authenticated;
    select count(*) into visible_count from public.form_submissions where id = any(fixture_ids);
    if visible_count <> expected then raise exception 'Wrong form access for %', staff_permission; end if;
    if staff_permission = 'forms_madrassah' and exists(select 1 from public.form_submissions where id = any(fixture_ids) and kind <> 'madrassah') then raise exception 'Teacher saw an unrelated form'; end if;
    if staff_permission = 'forms_itikaaf' and exists(select 1 from public.form_submissions where id = any(fixture_ids) and kind <> 'itikaaf') then raise exception 'Events manager saw an unrelated form'; end if;
    update public.form_submissions set status = 'done' where id = any(fixture_ids);
    get diagnostics changed_count = row_count;
    if changed_count <> expected then raise exception 'Wrong update access for %', staff_permission; end if;
    begin
      update public.form_submissions set payload = '{}' where id = any(fixture_ids);
      raise exception 'Staff could alter a submitted form';
    exception when insufficient_privilege then null;
    end;
    reset role;
  end loop;

  update public.profiles set is_active = false where id = fixture_user;
  set local role authenticated;
  if exists(select 1 from public.form_submissions where id = any(fixture_ids)) then raise exception 'Disabled staff could read forms'; end if;
  reset role;
  set local role anon;
  begin
    perform id from public.form_submissions limit 1;
    raise exception 'Anonymous visitor could read forms';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.form_submissions(kind,payload) values ('contact','{}');
    raise exception 'Anonymous visitor could bypass the function';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.submit_website_form('contact', '{}', fingerprint);
    raise exception 'Anonymous visitor could call the service RPC';
  exception when insufficient_privilege then null;
  end;
  reset role;

  set local role service_role;
  for i in 1..10 loop perform public.submit_website_form('contact', '{"test":"rollback-only"}', fingerprint); end loop;
  begin
    perform public.submit_website_form('contact', '{}', fingerprint);
    raise exception 'Rate limit did not reject submission eleven';
  exception when raise_exception then
    if sqlerrm <> 'submission_rate_limit' then raise; end if;
  end;
  reset role;
end;
$$;
rollback;
select 'Form permissions and rate limit passed; all fixtures rolled back.' as result;
