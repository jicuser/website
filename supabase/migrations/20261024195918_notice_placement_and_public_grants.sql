-- Additive display controls. Existing records keep their current banner placement.
alter table public.announcements add column if not exists display_settings jsonb not null default '{"placement":"before-events","notification":false,"position":"bottom-right"}'::jsonb;
alter table public.livestream_settings add column if not exists display_settings jsonb not null default '{"placement":"before-events","notification":false,"position":"bottom-right"}'::jsonb;
alter table public.announcements add constraint announcements_display_settings_valid check (
 jsonb_typeof(display_settings)='object' and display_settings ?& array['placement','notification','position']
 and display_settings->>'placement' in ('before-events','after-events','after-community')
 and display_settings->>'position' in ('top-left','top-right','bottom-left','bottom-right')
 and jsonb_typeof(display_settings->'notification')='boolean'
 and octet_length(display_settings::text)<512);
alter table public.livestream_settings add constraint livestream_display_settings_valid check (
 jsonb_typeof(display_settings)='object' and display_settings ?& array['placement','notification','position']
 and display_settings->>'placement' in ('before-events','after-events','after-community')
 and display_settings->>'position' in ('top-left','top-right','bottom-left','bottom-right')
 and jsonb_typeof(display_settings->'notification')='boolean'
 and octet_length(display_settings::text)<512);
-- Anonymous visitors only need reads on published content. RLS remains enabled.
revoke insert,update,delete,truncate,references,trigger on public.announcements,public.events,public.livestream_settings,public.page_content,public.page_sections,public.prayer_times,public.team_members,public.audit_log from anon;
revoke select on public.profiles,public.audit_log from anon;
