begin;

-- Creation and edits must use save_hall_calendar, which checks overlapping
-- confirmed bookings under a per-day lock. Older table and column grants let
-- staff bypass that check through the Data API. Keep public availability reads
-- and the existing staff delete flow available.
revoke insert, update on public.hall_bookings from public, anon, authenticated;
revoke insert (booking_date, start_time, end_time, status),
       update (booking_date, start_time, end_time, status)
on public.hall_bookings from public, anon, authenticated;

drop policy if exists hall_bookings_staff_insert on public.hall_bookings;
drop policy if exists hall_bookings_staff_update on public.hall_bookings;

commit;
