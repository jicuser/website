-- TV operators receive only TV-panel access; existing content RLS role lists stay unchanged.
alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('viewer','teacher','events_manager','content_editor','admin','super_admin','tv_operator'));
update public.tv_screens set settings = settings || '{"prayer_enabled":true,"class_until":""}'::jsonb;
update public.tv_screens set settings = settings || '{"mode":"posters","camera_url":"","youtube_url":"","prayer_enabled":false,"class_until":""}'::jsonb,
 share_session=null,share_owner=null,share_kind=null,share_expires=null where id='shoe-area';
delete from public.tv_peers where screen_id='shoe-area';
delete from public.tv_pairing_codes where screen_id='shoe-area';
