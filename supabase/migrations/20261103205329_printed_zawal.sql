-- A printed timetable can give one Zawal time or an explicit interval.
alter table public.prayer_day_details
  drop constraint prayer_day_details_check,
  add constraint prayer_day_details_zawal_order
    check (zawwal_end is null or (zawwal_start is not null and zawwal_start < zawwal_end));

create or replace function public.save_prayer_day_details(
 p_date date,p_sunset time,p_zawwal_start time,p_zawwal_end time,p_source text,p_published boolean,p_expected_revision integer
) returns jsonb language plpgsql security definer set search_path='' as $$
declare old_row public.prayer_day_details; saved public.prayer_day_details; clock time;
begin
 if not private.has_permission('prayer_times') then raise exception 'Prayer timetable permission required'; end if;
 if p_date is null or not exists(select 1 from public.prayer_times where d_date=p_date) then raise exception 'Save the main timetable for this date first'; end if;
 if p_published is null or p_expected_revision is null or p_expected_revision<0 then raise exception 'Publication choice and revision required'; end if;
 if p_zawwal_end is not null and (p_zawwal_start is null or p_zawwal_start>=p_zawwal_end) then
  raise exception 'A Zawal interval needs a start and a later end';
 end if;
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

-- Jamatia Islamic Centre's November 2026 printed sheet. Each span below is one
-- printed time followed by ditto marks. Sunrise is already in prayer_times.
-- Use only existing timetable dates. Preserve any detail a staff member has saved.
do $november$
declare
  entry record;
begin
  for entry in
    select p.d_date, printed.zawal
    from public.prayer_times p
    join (values
      (date '2026-11-01', date '2026-11-10', time '11:46'),
      (date '2026-11-11', date '2026-11-16', time '11:47'),
      (date '2026-11-17', date '2026-11-21', time '11:48'),
      (date '2026-11-22', date '2026-11-24', time '11:49'),
      (date '2026-11-25', date '2026-11-27', time '11:50'),
      (date '2026-11-28', date '2026-11-30', time '11:51')
    ) as printed(first_date, last_date, zawal)
      on p.d_date between printed.first_date and printed.last_date
    order by p.d_date
  loop
    perform pg_advisory_xact_lock(hashtextextended(entry.d_date::text, 912));
    insert into public.prayer_day_details (d_date, zawwal_start, published, source)
      values (entry.d_date, entry.zawal, true, 'Jamatia Islamic Centre, printed November 2026 timetable.')
      on conflict (d_date) do nothing;
  end loop;
end;
$november$;
