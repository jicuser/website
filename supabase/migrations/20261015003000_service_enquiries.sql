begin;

-- Restore the service workflow without importing unverified example class times.
-- The CLI is unavailable in the maintenance environment; this is an additive migration.
create table if not exists public.hall_bookings (
  id uuid primary key default gen_random_uuid(),
  booking_date date not null,
  start_time time,
  end_time time,
  status text not null default 'available' check (status in ('available','pending','booked','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time is null or start_time is null or end_time > start_time)
);
create index if not exists hall_bookings_date_idx on public.hall_bookings(booking_date,start_time);
alter table public.hall_bookings enable row level security;
revoke all on public.hall_bookings from public,anon,authenticated;
grant select on public.hall_bookings to anon,authenticated;
grant insert(booking_date,start_time,end_time,status),update(booking_date,start_time,end_time,status),delete on public.hall_bookings to authenticated;
drop policy if exists hall_bookings_public_read on public.hall_bookings;
create policy hall_bookings_public_read on public.hall_bookings for select to anon,authenticated using (true);
drop policy if exists hall_bookings_staff_insert on public.hall_bookings;
create policy hall_bookings_staff_insert on public.hall_bookings for insert to authenticated with check ((select private.has_permission('events')));
drop policy if exists hall_bookings_staff_update on public.hall_bookings;
create policy hall_bookings_staff_update on public.hall_bookings for update to authenticated using ((select private.has_permission('events'))) with check ((select private.has_permission('events')));
drop policy if exists hall_bookings_staff_delete on public.hall_bookings;
create policy hall_bookings_staff_delete on public.hall_bookings for delete to authenticated using ((select private.has_permission('events')));

create table if not exists public.course_schedule (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 160),
  day_of_week smallint not null check (day_of_week between 1 and 7),
  start_time time,
  end_time time,
  location text not null default 'Jamatia Islamic Centre' check (length(location) <= 240),
  active boolean not null default true,
  planner_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time is null or start_time is null or end_time > start_time)
);
alter table public.course_schedule enable row level security;
revoke all on public.course_schedule from public,anon,authenticated;
grant select,delete on public.course_schedule to authenticated;
grant insert(title,day_of_week,start_time,end_time,location,active,planner_visible),update(title,day_of_week,start_time,end_time,location,active,planner_visible) on public.course_schedule to authenticated;
drop policy if exists course_schedule_staff_read on public.course_schedule;
create policy course_schedule_staff_read on public.course_schedule for select to authenticated using ((select private.has_permission('events')));
drop policy if exists course_schedule_staff_insert on public.course_schedule;
create policy course_schedule_staff_insert on public.course_schedule for insert to authenticated with check ((select private.has_permission('events')));
drop policy if exists course_schedule_staff_update on public.course_schedule;
create policy course_schedule_staff_update on public.course_schedule for update to authenticated using ((select private.has_permission('events'))) with check ((select private.has_permission('events')));
drop policy if exists course_schedule_staff_delete on public.course_schedule;
create policy course_schedule_staff_delete on public.course_schedule for delete to authenticated using ((select private.has_permission('events')));

do $$
declare
  owner_id uuid;
  new_form uuid;
  fields jsonb;
  item record;
begin
  select id into owner_id from public.profiles where is_active and is_owner order by id limit 1;
  if owner_id is null then raise exception 'An active owner is required to receive service enquiries'; end if;
  for item in select * from (values
    ('nikah-enquiry','Nikah enquiry','Ask about a Nikah date or requirements. Your date is not confirmed until the centre agrees it.','Review Nikah enquiry',24),
    ('funeral-enquiry','Funeral support','Send a message about funeral support. This inbox is not continuously monitored and is not an emergency service.','Review funeral support enquiry',4),
    ('hall-booking','Hall booking enquiry','Send your preferred date and event details. This is an enquiry, not a confirmed booking.','Review hall booking enquiry',24),
    ('community-enquiry','Community enquiry','Ask about support or community activities at Jamatia Islamic Centre.','Review community enquiry',48)
  ) as forms(slug,title,description,task_title,due_hours)
  loop
    -- Never overwrite an existing form, its closure, assignments or published questions.
    if exists(select 1 from public.custom_forms where slug=item.slug) then continue; end if;
    fields := jsonb_build_array(
      jsonb_build_object('id','name','type','text','label','Your name','required',true),
      jsonb_build_object('id','email','type','email','label','Email for our reply','required',true),
      jsonb_build_object('id','phone','type','phone','label','Phone number (optional)')
    );
    if item.slug in ('nikah-enquiry','hall-booking') then
      fields := fields || jsonb_build_array(
        jsonb_build_object('id','preferred_date','type','date','label','Preferred date','required',item.slug='hall-booking'),
        jsonb_build_object('id','preferred_time','type','text','label','Preferred time')
      );
    end if;
    if item.slug='hall-booking' then
      fields := fields || jsonb_build_array(
        jsonb_build_object('id','event_type','type','select','label','Type of event','required',true,'options',jsonb_build_array('Family event','Class or meeting','Community event','Other')),
        jsonb_build_object('id','attendees','type','number','label','Approximate number of guests')
      );
    end if;
    fields := fields || jsonb_build_array(jsonb_build_object('id','message','type','textarea','label','How can we help?','required',true));
    insert into public.custom_forms(slug,title,description,schema,published_version,enabled,task_title,due_hours,created_by)
    values(item.slug,item.title,item.description,jsonb_build_object('fields',fields),1,true,item.task_title,item.due_hours,owner_id) returning id into new_form;
    insert into public.custom_form_versions(form_id,version,title,description,schema,published_by)
    values(new_form,1,item.title,item.description,jsonb_build_object('fields',fields),owner_id);
    insert into public.custom_form_staff(form_id,user_id,role)
    values(new_form,owner_id,'manager'),(new_form,owner_id,'responsible');
  end loop;
end $$;

commit;
