# Forms and staff access

Open **Admin → Forms inbox** to read contact messages, Madrassah enquiries and I’tikaf registrations. Expand a submission to see its details. Reply using your normal contact process, then choose **Mark completed**. Completed forms can be reopened.

| Staff role                                     | Forms visible         |
| ---------------------------------------------- | --------------------- |
| Super administrator / Administrator            | All three forms       |
| Teacher                                        | Madrassah enquiries   |
| Events manager                                 | I’tikaf registrations |
| Website editor / TV operator / No admin access | None                  |

These permissions are enforced by database Row Level Security. Hidden menu items alone do not provide security. Disabled profiles lose database access to forms even if their browser session remains open.

**Admin → Users & roles** lets a super administrator invite staff, select a role and enable or disable access. The descriptions explain each role. Access switches save immediately; role changes use the Save button at the top. Your own account cannot be disabled or demoted through this screen. No invitation is sent until you press **Send invitation**.

## Code and setup

- `src/lib/submitWebsiteForm.js`: one submission client for all three forms.
- `supabase/functions/submit-form/validation.mjs`: field allowlist, lengths, email and existing consent validation.
- `supabase/functions/submit-form/index.ts`: bounded JSON input, daily salted network fingerprint and generic database errors.
- `supabase/migrations/20260912010000_website_forms.sql`: private inbox permissions and atomic rate limit of ten successful submissions per ten-minute network bucket. Rate fingerprints expire after one day.
- `src/components/admin/FormsInbox.jsx`: paginated inbox, with text rendered by React rather than inserted as HTML.
- `src/components/admin/StaffAccess.jsx`: staff invitations, role descriptions and access switches.

Apply the migration once, then deploy `supabase functions deploy submit-form` before publishing this frontend. The public Supabase anon JWT permits anonymous form submission through the function; visitors cannot read or write the table directly. The service-role key stays in Supabase. There is no SQL constructed from form fields. Basic rate limits reduce repeated submissions; they are not a complete bot-prevention service.

The old optional spreadsheet submission path was removed. New submissions go to this inbox. No existing external spreadsheet records are imported or deleted. Saving a form does **not** send an email notification; staff should check the inbox. Submissions remain until an authorised database administrator removes them under the centre’s retention process.

Use a separate test project for end-to-end form submissions and email invitations. Production permission checks can use a transaction that is rolled back; do not leave test registrations or real medical details in logs.
