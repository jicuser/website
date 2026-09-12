# JIC production deployment

## 1. Supabase database/security

1. Back up the existing Supabase database.
2. For a fresh installation, run `supabase/production_schema.sql`, then apply every migration in filename order. For an existing installation, apply only missing migrations. Complete the migrations before creating the first owner.
3. Create or identify the trusted owner in Supabase Authentication.
4. Promote that account once:
   ```sql
   update public.profiles
   set is_owner=true
   where id=(select id from auth.users where email='YOUR_ADMIN_EMAIL');
   ```
5. In Supabase Auth settings, keep public email/password sign-up disabled.
6. Deploy the secure user-management function:
   `supabase functions deploy manage-user`

Do not put `SUPABASE_SERVICE_ROLE_KEY` in Hostinger or any `VITE_*` browser variable. It belongs only in Supabase server-side functions.

## 2. Hostinger environment variables

Configure the build environment with:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

The anon key is designed for browser use; Row Level Security is what protects data.

## 3. GitHub -> Hostinger

Recommended production branch: `main`.

Build:
`npm ci` (or `npm install` if no lockfile exists)
`npm run build`

Publish/output directory:
`dist`

The included `public/.htaccess` is copied into `dist` and provides SPA route fallback on Apache-compatible Hostinger hosting, so `/about`, `/admin`, etc. can be refreshed directly.

## 4. Smoke test after deploy

- `/` loads normally.
- `/prayer-times` loads and shows database rows for today/month.
- `/admin` redirects public users away.
- Admin login works only for an active profile with explicitly granted permissions or owner status.
- Only owners and staff with the users permission can open Staff & access.
- Create a draft event: it must not show publicly.
- Publish it: it must show publicly when its date is today/future.
- Edit a prayer row and confirm public timetable changes.
- Enable a YouTube livestream and confirm player appears.
- Upload an image and confirm it is served from `site-images`.
- Check audit log records the change.

## 5. Daily operation

Normal event/prayer/announcement/team/livestream changes happen in `/admin`. GitHub deployment is only needed when changing layout, components, or application code.

## TV screens and sharing

Apply `supabase/migrations/20260911222221_tv_screens_and_sharing.sql` once to an existing installation, then deploy `supabase functions deploy tv-control`. The function-specific configuration in `supabase/config.toml` is required: the handler authenticates staff JWTs and paired-TV credentials itself, while allowing public poster settings. Deploy the migration and function before publishing the matching frontend.

The function uses Supabase's built-in server environment variables; no new browser secrets are needed. Optional TURN servers can be supplied as the `TV_ICE_SERVERS` Edge secret. See [TV setup](docs/tv-display.md) for pairing, camera relays and device checks.

## Website forms and staff access

Apply `supabase/migrations/20260912010000_website_forms.sql` once, then deploy `supabase functions deploy submit-form` before this frontend. Messages and registrations go to Admin → Forms inbox. No mail provider or extra browser environment variables are required; email notifications are not enabled. See [Forms and staff access](docs/forms-and-staff.md) for editing permissions and operation.

## Staff email return address

Before sending staff invitations, configure the production Site URL and exact `/admin/setup` redirect in Supabase Authentication → URL Configuration. Deploy `manage-user` with its `site-url.mjs` dependency. See [invitation setup](docs/forms-and-staff.md#invitation-and-password-setup-links). The website includes the password-setup page; administrators can send a replacement setup email from Staff & access.

## Scene editor and explicit permissions

The migrations `20260912021743_explicit_staff_permissions.sql` and `20260912021802_tv_scenes_and_independent_inputs.sql` are applied to the connected project. Deploy matching `manage-user` (including `_shared/access.js`) and `tv-control` (including `_shared/access.js`, `_shared/tv.js`, `_shared/tv-scenes.js`) before the frontend. Do not deploy an older role-based frontend against this schema. New databases should apply all migrations in order before creating the first owner.

Keep Node 24 for installs/builds. The router and Vite versions are pinned with the lockfile. Optional `VITE_MEDIA_RELAY_URL` enables the external broadcasting controls only after a separate HTTPS media relay is deployed. See [relay deployment](services/media-relay/README.md) and [Flutter contracts](docs/flutter-shared-backend.md).

The connected Supabase project's security advisor still reports leaked-password protection disabled. Enable it in Supabase Auth settings where supported. The six TV tables intentionally have RLS and no browser grants/policies: only the authenticated Edge service can read them. See [Supabase explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

## Permanent TV address and setup code

Apply `supabase/migrations/20260912083609_tv_browser_setup.sql` before the matching `tv-control` function and frontend. It adds private browser setup and saved-layout acknowledgements. Existing approved TVs keep working; new TVs enter their six-digit code in Admin. See [TV operation](docs/tv-display.md). Normal and Class / Teach are the only modes; an empty or expired class resolves to Normal.
