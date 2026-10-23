# Forms and staff access

Open **Admin → Forms** for Contact Us, registrations and applications. **Live**, **Draft** and **Closed** tabs show how many forms are in each state. Choose **Open form** to review its details and responses; authorised editors can use **Edit form** directly, including on a live form. Reply to a contact submission using the sender’s email or phone, then choose **Mark completed**. Completed submissions can be reopened. Staff home shows one combined response total; older Contact Us inbox links open the same responses inside Forms.

**New form** groups the work into Basics, Questions and Responses. Choose a direct form link, create a named page in a menu section, or add the form to an existing page. Page options require the separate website-content permission. **Save draft** keeps a new page hidden; **Save and publish** saves the form and new page together. When returning to a form with a linked draft page, a website editor can explicitly choose **Publish linked page with this form**. Existing pages retain their current visibility unless that option is selected.

Contact Us, Madrassah and I’tikaf use the same versioned question builder. Their existing response permissions still apply; editing additionally requires form-management access. A global custom-response permission does not grant access to these built-in forms. All earlier submissions remain under their original identities and appear beside future responses. Saved drafts preserve live questions, publication creates a new snapshot, and published form addresses stay fixed. I’tikaf retains whole-number age checks and required guardian consent for ages 11–16.

| Permission checkbox   | Forms visible         |
| --------------------- | --------------------- |
| Contact messages      | Contact Us responses  |
| Madrassah enquiries   | Madrassah submissions |
| I’tikaf registrations | I’tikaf submissions   |
| Owner                 | All submissions       |

**Admin → Staff & access** uses separate staff-label and editing-permission checkboxes. No permission is selected automatically. Labels never grant access. Account enable/disable switches save immediately; permission changes use Save. Delegated managers can only grant permissions they hold and cannot change an owner or their own access. Invitations are sent only when you press **Send invitation**. See [the staff and TV guide](tv-display.md).

## Code and setup

- `src/components/sections/BuiltInForm.jsx`: loads the shared public versioned form renderer on demand.
- `src/lib/submitWebsiteForm.js`: compatibility client for older deployments using the original endpoint.
- `supabase/functions/submit-form/validation.mjs`: field allowlist, lengths, email and existing consent validation.
- `supabase/functions/submit-form/index.ts`: bounded JSON input, daily salted network fingerprint and generic database errors.
- `supabase/migrations/20260912010000_website_forms.sql`: private inbox permissions and atomic rate limit of ten successful submissions per ten-minute network bucket. Rate fingerprints expire after one day.
- `src/features/forms/FormsManager.jsx`: shared form catalogue, including built-in forms.
- `src/components/workspace/CustomFormsInbox.jsx`: shared paginated response inbox, with text rendered by React rather than inserted as HTML.
- `src/components/admin/StaffAccess.jsx`: staff invitations, explicit permission checkboxes and access switches.

For the unified builder release, deploy the backwards-compatible `custom-forms` Edge function, apply `20261023193349_unified_form_workflow.sql`, then publish the website. See [the API release notes](forms-api.md#unified-built-in-form-release). Public endpoints validate and rate-limit anonymous submissions; both legacy anon and publishable client keys are supported. Visitors cannot read or write the table directly. The service-role key stays in Supabase. There is no SQL constructed from form fields. Basic rate limits reduce repeated submissions; they are not a complete bot-prevention service.

The old optional spreadsheet submission path was removed. New submissions go to this inbox. No existing external spreadsheet records are imported or deleted. Saving a form does **not** send an email notification; staff should check the inbox. Submissions remain until an authorised database administrator removes them under the centre’s retention process.

The companion workspace adds shared actions, portal replies, exports and optional app alerts after its backend is activated. Use [the release guide](WEBSITE-RELEASE.md), [current form contracts](forms-api.md) and [optional reply email setup](EMAIL.md). Public contact forms remain available while the workspace flag is disabled.

Use a separate test project for end-to-end form submissions and email invitations. Production permission checks can use a transaction that is rolled back; do not leave test registrations or real medical details in logs.

## Invitation and password setup links

Staff email links return to `/admin/setup`, where the recipient chooses their own password. **Send setup email** on an enabled account sends a fresh password-setup link; use it when an invitation expired or went to the old deployment. Passwords are never shown to administrators.

Use the actual live website origin in Supabase **Authentication → URL Configuration** and the `JIC_SITE_URL` Edge secret. The original temporary-host configuration was:

- **Site URL:** `https://lawngreen-kangaroo-881113.hostingersite.com`
- **Redirect URLs:** add the exact `https://lawngreen-kangaroo-881113.hostingersite.com/admin/setup`

For the production domain, replace that origin consistently as described in [the current release guide](WEBSITE-RELEASE.md#invitations-and-forgotten-passwords). Keep other redirects only if they are still intentionally used. An invite destination must be on this allowlist; otherwise Supabase can fall back to Site URL. `manage-user` specifies the setup destination explicitly for invitations and setup emails. Never accept an invitation destination from a browser request.

Members and staff can request a reset at `/account/recovery`; both email paths finish at `/admin/setup`. Custom SMTP is required for normal production recipients outside the Supabase project team. This is separate from the optional form reply email worker.

Already-sent email links cannot be rewritten. Finish the URL configuration, then send a fresh setup email from the existing staff account. Opening that email and choosing a password must be done by its recipient.

References: [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls) and [updating a password](https://supabase.com/docs/reference/javascript/auth-updateuser).
