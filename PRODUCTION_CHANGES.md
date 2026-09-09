# JIC production foundation — changes made

- Removed Hostinger Horizons editor/runtime plugins from the Vite build.
- Removed hard-coded Supabase credentials; all browser configuration now uses `.env` variables.
- Replaced `logged in = admin` with profile/role-based authorization.
- Added role-protected `/admin` dashboard.
- Added secure database migration with Row Level Security.
- Added roles: viewer, teacher, events_manager, content_editor, admin, super_admin.
- Added events CMS with publish/draft, dates, posters, registration and livestream URLs.
- Added prayer-time editor and CSV timetable importer.
- Removed fake/default Jummah and Taraweeh times from public prayer logic.
- Added announcements CMS and homepage announcement banner.
- Added livestream settings and homepage YouTube embed support.
- Added team-member CMS and converted the public Team page from placeholder content to database content.
- Added audit log and database triggers for managed content.
- Added secure Supabase Edge Function for Super Admin user invitations/role changes.
- Added image uploads to the `site-images` bucket with role-based storage policies.
- Added SPA `.htaccess` fallback and security headers for Hostinger-compatible static hosting.
- Fixed a pre-existing JavaScript syntax error on the Financial History page (`£` used as an identifier).
- Added `DEPLOYMENT.md` with production setup and smoke-test steps.
- Source tree was parsed after edits: 78 JS/JSX files, zero syntax errors.

## Important before production
Run `supabase/production_schema.sql`, promote one trusted account to `super_admin`, deploy the `manage-user` Edge Function, configure Hostinger environment variables, then deploy the GitHub branch. Keep the current live site unchanged until the smoke tests in `DEPLOYMENT.md` pass.
