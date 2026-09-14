begin;

-- Public hall availability contains no personal booking details. The public calendar reads
-- only date/time/status; staff manage those values from Admin > Forms > Schedule.
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
grant insert,update,delete on public.hall_bookings to authenticated;
drop policy if exists hall_bookings_public_read on public.hall_bookings;
create policy hall_bookings_public_read on public.hall_bookings for select to anon,authenticated using (true);
drop policy if exists hall_bookings_staff_insert on public.hall_bookings;
create policy hall_bookings_staff_insert on public.hall_bookings for insert to authenticated
with check (private.has_permission('events'));
drop policy if exists hall_bookings_staff_update on public.hall_bookings;
create policy hall_bookings_staff_update on public.hall_bookings for update to authenticated
using (private.has_permission('events')) with check (private.has_permission('events'));
drop policy if exists hall_bookings_staff_delete on public.hall_bookings;
create policy hall_bookings_staff_delete on public.hall_bookings for delete to authenticated
using (private.has_permission('events'));

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
create index if not exists course_schedule_day_idx on public.course_schedule(day_of_week,start_time) where active;
alter table public.course_schedule enable row level security;
revoke all on public.course_schedule from public,anon,authenticated;
grant select,insert,update,delete on public.course_schedule to authenticated;
drop policy if exists course_schedule_staff_read on public.course_schedule;
create policy course_schedule_staff_read on public.course_schedule for select to authenticated
using (private.has_permission('events'));
drop policy if exists course_schedule_staff_insert on public.course_schedule;
create policy course_schedule_staff_insert on public.course_schedule for insert to authenticated
with check (private.has_permission('events'));
drop policy if exists course_schedule_staff_update on public.course_schedule;
create policy course_schedule_staff_update on public.course_schedule for update to authenticated
using (private.has_permission('events')) with check (private.has_permission('events'));
drop policy if exists course_schedule_staff_delete on public.course_schedule;
create policy course_schedule_staff_delete on public.course_schedule for delete to authenticated
using (private.has_permission('events'));

insert into public.course_schedule(title,day_of_week,start_time,end_time,location)
select seed.title,seed.day_of_week,seed.start_time,seed.end_time,'Jamatia Islamic Centre'
from (values
  ('Open Qur’an Circle',5,'18:30'::time,null::time),
  ('Youth Islamic Studies',1,'17:00'::time,'18:30'::time),
  ('Youth Islamic Studies',2,'17:00'::time,'18:30'::time),
  ('Youth Islamic Studies',4,'17:00'::time,'18:30'::time)
) as seed(title,day_of_week,start_time,end_time)
where not exists (
  select 1 from public.course_schedule c
  where c.title=seed.title and c.day_of_week=seed.day_of_week and c.start_time is not distinct from seed.start_time
);

-- Seed the requested service forms into the existing versioned custom-form system. If the
-- installation has no active owner yet, the forms are left for the normal form builder to create.
do $$
declare
  owner_id uuid;
  form_id uuid;
  definition jsonb;
  item record;
begin
  select id into owner_id
  from public.profiles
  where is_active and is_owner
  order by id
  limit 1;
  if owner_id is null then return; end if;

  for item in
    select * from (values
      (
        'funeral-enquiry',
        'Funeral enquiry',
        'Send the centre the essential information so a member of the team can contact you.',
        'Follow up funeral enquiry',
        jsonb_build_object('fields',jsonb_build_array(
          jsonb_build_object('id','name','type','text','label','Your name','required',true),
          jsonb_build_object('id','phone','type','phone','label','Telephone','required',true),
          jsonb_build_object('id','email','type','email','label','Email'),
          jsonb_build_object('id','deceased_name','type','text','label','Name of deceased'),
          jsonb_build_object('id','relationship','type','text','label','Your relationship to the deceased'),
          jsonb_build_object('id','message','type','textarea','label','How can we help?','required',true)
        ))
      ),
      (
        'nikah-enquiry',
        'Nikah enquiry',
        'Request a Nikah date or ask the centre about the process and requirements.',
        'Follow up Nikah enquiry',
        jsonb_build_object('fields',jsonb_build_array(
          jsonb_build_object('id','name','type','text','label','Your name','required',true),
          jsonb_build_object('id','phone','type','phone','label','Telephone','required',true),
          jsonb_build_object('id','email','type','email','label','Email'),
          jsonb_build_object('id','preferred_date','type','date','label','Preferred date'),
          jsonb_build_object('id','preferred_time','type','text','label','Preferred time'),
          jsonb_build_object('id','message','type','textarea','label','Anything the team should know?')
        ))
      ),
      (
        'hall-booking',
        'Hall booking request',
        'Request a hall date. A submission is a request only and is confirmed by staff after review.',
        'Review hall booking request',
        jsonb_build_object('fields',jsonb_build_array(
          jsonb_build_object('id','name','type','text','label','Your name','required',true),
          jsonb_build_object('id','organisation','type','text','label','Organisation or group'),
          jsonb_build_object('id','phone','type','phone','label','Telephone','required',true),
          jsonb_build_object('id','email','type','email','label','Email'),
          jsonb_build_object('id','preferred_date','type','date','label','Preferred date','required',true),
          jsonb_build_object('id','preferred_time','type','text','label','Preferred time'),
          jsonb_build_object('id','attendees','type','number','label','Approximate number of attendees'),
          jsonb_build_object('id','requirements','type','textarea','label','Event details or requirements')
        ))
      )
    ) as forms(slug,title,description,task_title,schema)
  loop
    select id into form_id from public.custom_forms where slug=item.slug;
    if form_id is null then
      insert into public.custom_forms(
        slug,title,description,schema,published_version,enabled,task_title,due_hours,created_by
      ) values (
        item.slug,item.title,item.description,item.schema,1,true,item.task_title,24,owner_id
      ) returning id into form_id;

      insert into public.custom_form_versions(form_id,version,title,description,schema,published_by)
      values(form_id,1,item.title,item.description,item.schema,owner_id);

      insert into public.custom_form_staff(form_id,user_id,role)
      values(form_id,owner_id,'manager'),(form_id,owner_id,'responsible')
      on conflict do nothing;
    end if;
  end loop;
end $$;

commit;
