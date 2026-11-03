-- Explicit staff-approved extra times, separate from CSV/monthly timetable writes.
begin;
create table public.prayer_day_details (
 d_date date primary key,
 sunset time, zawwal_start time, zawwal_end time,
 source text not null default '' check(length(source)<=250),
 published boolean not null default false, revision integer not null default 1 check(revision>0),
 updated_at timestamptz not null default now(),
 check((zawwal_start is null and zawwal_end is null) or
 (zawwal_start is not null and zawwal_end is not null and zawwal_start<zawwal_end)),
 check(not published or (length(trim(source))>=3 and (sunset is not null or zawwal_start is not null)))
);
create table public.prayer_details_audit (
 id bigint generated always as identity primary key,d_date date not null,
 actor_id uuid not null references public.profiles,old_data jsonb,new_data jsonb not null,
 created_at timestamptz not null default now()
);
alter table public.prayer_day_details enable row level security;
alter table public.prayer_details_audit enable row level security;
revoke all on public.prayer_day_details,public.prayer_details_audit from public,anon,authenticated;
grant select on public.prayer_day_details to anon,authenticated;
grant select on public.prayer_details_audit to authenticated;
grant all on public.prayer_day_details,public.prayer_details_audit to service_role;
create policy prayer_details_published on public.prayer_day_details for select to anon,authenticated using(published);
create policy prayer_details_editor on public.prayer_day_details for select to authenticated using(private.has_permission('prayer_times'));
create policy prayer_details_audit_editor on public.prayer_details_audit for select to authenticated using(private.has_permission('prayer_times'));

create function public.save_prayer_day_details(
 p_date date,p_sunset time,p_zawwal_start time,p_zawwal_end time,p_source text,p_published boolean,p_expected_revision integer
) returns jsonb language plpgsql security definer set search_path='' as $$
declare old_row public.prayer_day_details; saved public.prayer_day_details; clock time;
begin
 if not private.has_permission('prayer_times') then raise exception 'Prayer timetable permission required'; end if;
 if p_date is null or not exists(select 1 from public.prayer_times where d_date=p_date) then raise exception 'Save the main timetable for this date first'; end if;
 if p_published is null or p_expected_revision is null or p_expected_revision<0 then raise exception 'Publication choice and revision required'; end if;
 if (p_zawwal_start is null)<>(p_zawwal_end is null) or p_zawwal_start>=p_zawwal_end then raise exception 'Provide a complete increasing Zawwal interval'; end if;
 foreach clock in array array[p_sunset,p_zawwal_start,p_zawwal_end] loop
  if clock is not null and (clock>='24:00'::time or extract(second from clock)<>0) then raise exception 'Use a valid 24-hour clock time to the minute'; end if;
 end loop;
 if length(coalesce(p_source,''))>250 or (p_published and (coalesce(length(trim(p_source)),0)<3 or (p_sunset is null and p_zawwal_start is null)))
 then raise exception 'Published extra times need a source and at least one time'; end if;
 -- Serialize creation as well as updates; a missing row is revision zero.
 perform pg_advisory_xact_lock(hashtextextended(p_date::text,912));
 select * into old_row from public.prayer_day_details where d_date=p_date for update;
 if coalesce(old_row.revision,0)<>p_expected_revision then raise exception 'These times changed in another editor. Reload before saving'; end if;
 insert into public.prayer_day_details(d_date,sunset,zawwal_start,zawwal_end,source,published,revision)
 values(p_date,p_sunset,p_zawwal_start,p_zawwal_end,trim(coalesce(p_source,'')),p_published,p_expected_revision+1)
 on conflict(d_date) do update set sunset=excluded.sunset,zawwal_start=excluded.zawwal_start,zawwal_end=excluded.zawwal_end,
 source=excluded.source,published=excluded.published,revision=excluded.revision,updated_at=now() returning * into saved;
 insert into public.prayer_details_audit(d_date,actor_id,old_data,new_data) values(p_date,auth.uid(),to_jsonb(old_row),to_jsonb(saved));
 return to_jsonb(saved);
end; $$;
revoke all on function public.save_prayer_day_details(date,time,time,time,text,boolean,integer) from public,anon,authenticated;
grant execute on function public.save_prayer_day_details(date,time,time,time,text,boolean,integer) to authenticated;
commit;
