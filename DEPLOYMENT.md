# JIC production deployment

## 1. Supabase database/security

1. Back up the existing Supabase database.
2. Run `supabase/production_schema.sql` in the Supabase SQL Editor.
3. Create or identify the trusted owner in Supabase Authentication.
4. Promote that account once:
   ```sql
   update public.profiles
   set role='super_admin'
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
- optional `VITE_ITIKAAF_SHEETS_WEBHOOK_URL`

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
- Admin login works only for an active profile with an allowed role.
- Super Admin can see Users & Roles; lower roles cannot.
- Create a draft event: it must not show publicly.
- Publish it: it must show publicly when its date is today/future.
- Edit a prayer row and confirm public timetable changes.
- Enable a YouTube livestream and confirm player appears.
- Upload an image and confirm it is served from `site-images`.
- Check audit log records the change.

## 5. Daily operation

Normal event/prayer/announcement/team/livestream changes happen in `/admin`. GitHub deployment is only needed when changing layout, components, or application code.
