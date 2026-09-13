-- Keep existing profiles unassigned until an editor chooses their team section.
-- The existing team permissions continue to control all reads and writes.
alter table public.team_members
  add column member_group text constraint team_members_member_group_check check (
    member_group in ('founder_members', 'management_committee', 'trustees', 'staff')
  );
