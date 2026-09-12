# Forms and staff access

Open **Admin → Forms inbox** to read contact messages, Madrassah enquiries and I’tikaf registrations. Expand a submission to see its details. Reply using your normal contact process, then choose **Mark completed**. Completed forms can be reopened.

| Permission checkbox   | Forms visible         |
| --------------------- | --------------------- |
| Contact messages      | Contact enquiries     |
| Madrassah enquiries   | Madrassah submissions |
| I’tikaf registrations | I’tikaf submissions   |
| Owner                 | All submissions       |

**Admin → Staff & access** uses separate staff-label and editing-permission checkboxes. No permission is selected automatically. Labels never grant access. Account enable/disable switches save immediately; permission changes use Save. Delegated managers can only grant permissions they hold and cannot change an owner or their own access. Invitations are sent only when you press **Send invitation**. See [the staff and TV guide](tv-display.md).

## Code and setup

- `src/lib/submitWebsiteForm.js`: one submission client for all three forms.
- `supabase/functions/submit-form/validation.mjs`: field allowlist, lengths, email and existing consent validation.
- `supabase/functions/submit-form/index.ts`: bounded JSON input, daily salted network fingerprint and generic database errors.
- `supabase/migrations/20260912010000_website_forms.sql`: private inbox permissions and atomic rate limit of ten successful submissions per ten-minute network bucket. Rate fingerprints expire after one day.
- `src/components/admin/FormsInbox.jsx`: paginated inbox, with text rendered by React rather than inserted as HTML.
- `src/components/admin/StaffAccess.jsx`: staff invitations, explicit permission checkboxes and access switches.

Apply the migration once, then deploy `supabase functions deploy submit-form` before publishing this frontend. The public Supabase anon JWT permits anonymous form submission through the function; visitors cannot read or write the table directly. The service-role key stays in Supabase. There is no SQL constructed from form fields. Basic rate limits reduce repeated submissions; they are not a complete bot-prevention service.

The old optional spreadsheet submission path was removed. New submissions go to this inbox. No existing external spreadsheet records are imported or deleted. Saving a form does **not** send an email notification; staff should check the inbox. Submissions remain until an authorised database administrator removes them under the centre’s retention process.

Use a separate test project for end-to-end form submissions and email invitations. Production permission checks can use a transaction that is rolled back; do not leave test registrations or real medical details in logs.

## Invitation and password setup links

Staff email links return to `/admin/setup`, where the recipient chooses their own password. **Send setup email** on an enabled account sends a fresh password-setup link; use it when an invitation expired or went to the old deployment. Passwords are never shown to administrators.

In Supabase **Authentication → URL Configuration**, set:

- **Site URL:** `https://lawngreen-kangaroo-881113.hostingersite.com`
- **Redirect URLs:** add the exact `https://lawngreen-kangaroo-881113.hostingersite.com/admin/setup`

Keep other redirects only if they are still intentionally used. An invite destination must be on this allowlist; otherwise Supabase can fall back to Site URL. The deployed `manage-user` function now specifies the setup destination explicitly for both invitations and setup emails. Its optional server-only `JIC_SITE_URL` setting supports a future production-domain change; update the Supabase URL settings at the same time. Never accept an invitation destination from a browser request.

Already-sent email links cannot be rewritten. Finish the URL configuration, then send a fresh setup email from the existing staff account. Opening that email and choosing a password must be done by its recipient.

References: [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls) and [updating a password](https://supabase.com/docs/reference/javascript/auth-updateuser).
