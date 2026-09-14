# Website maintenance status

Updated 14 September 2026. Current scope: improve and refine the existing website.
App development, remote push, store delivery and infrastructure migration are deferred.

## Boundaries

- Preserve the desktop/mobile admin design and working casting, TV, radio and prayer flows.
- Keep changes focused; do not replace working components or stack conflicting CSS overrides.
- Coordinate changes to `main`; never overwrite concurrent work or force-push a release.
- No DNS, registrar, mail DNS, hosting or Cloudflare configuration changes in this work.
- One production frontend host. Do not assume nonprofit eligibility for Vercel Hobby.
- No paid plan, new SMTP provider, remote-desktop access or external subscription without approval.
- Preserve real staff accounts, historical records, published content, tests and licences.
- Review the whole visible interface in supplied screenshots; record additional findings before widening a change.
- Save code checkpoints to the maintenance branch regularly. A checkpoint is not a live release.

## Previously released accounts and mobile administration

| ID | Item | Saved/released work | Remaining acceptance |
| --- | --- | --- | --- |
| WEB-01 | Mobile poster picker | Titles below images; editor brought into view without opening the keyboard. Browser checks at 320, 390 and 1280px passed. | Physical-phone editing with the live account. |
| WEB-02 | Admin section navigation | One Go to selector in the sticky mobile toolbar; desktop sidebar retained. The new toolbar was verified in the live bundle. | Physical-phone Notices and poster editing. |
| WEB-03 | Owner-only deletion | Disabled non-owner accounts only; typed confirmation, self/owner protection, source and audit checks. manage-user version 5 was deployed. | No production account was deleted by tests. Retained records/uploads can intentionally block deletion. |
| WEB-04 | Invitation destination | Production JIC setup route is the deployed server fallback. | Hosted Site URL, redirect allowlist and existing JIC_SITE_URL override still require verification. |
| WEB-05 | Branded authentication emails | Invitation/reset templates and instructions are saved. | Apply hosted subjects/templates and approved SMTP sender; test a fresh email. |
| WEB-06 | Browser connection warning | HTTPS login/setup rendered during read-only checks; HTTP login redirected to HTTPS. | The original phone warning was not reproduced; its cause remains unconfirmed. |

## Content/forms checkpoint — not released

Working branch: `maintenance/content-workflow`.
Latest implementation checkpoint: `6d2e3ad5e5d67b6a9f9fcc0557da76ac9cba20a8`.
The last confirmed production branch is `86c881ea8e36fc8983a7706056a17752972e5801`.

The following source is now committed in GitHub, rather than existing only in a local runtime:

| Part | Saved source | Verification/status |
| --- | --- | --- |
| Content metadata | src/lib/pageContent.js and tests/page-content.test.mjs | Four focused Node tests pass. |
| Reused form primitives | Field renderer, strict schema/answer/upload validation, bounded export helpers | Six validation tests pass. No new runtime dependency; PGlite is test-only. |
| Website-only form backend | 20260914040000_website_forms.sql; custom-forms Edge handler and maintenance-secret helper | Nine database assertions/tests pass as part of the 15-test form-backend suite. No learning, payment or remote-push tables are created. |
| Page and action linkage | 20260914041000_content_pages.sql plus content-workflow database tests | Eight local tests pass: publication/privacy, stable URLs, stale-edit rejection, named responsibility, eligible reassignment, and retained responses. |
| Form editor and response inbox | CustomFormsBuilder.jsx, CustomFormsInbox.jsx, PublicFormPage.jsx | Adapted from the existing website branch; optional app, fee-ledger and remote-email UI dependencies removed. Local ESLint and dependency bundling pass. |
| Admin Forms hub | FormsManager.jsx, FormActions.jsx, useAdminRecords.js and content-workflow.css | Current-form catalogue, information/people/responses/actions, guarded reassignment and bounded visible-tab refresh are saved. Not connected to AdminPage yet. |

GitHub Actions run `34804928067` passed full validation and the existing browser
suite against backend checkpoint `6e0a60352afd0972228d71764f33e2e87d33dafb`.
That existing browser suite does not prove the new Forms user journey; it was not
connected at that checkpoint. Later component bundling is also not a browser test.

No new migrations or custom-forms Edge Function have been deployed to production.
No real responses, assignments, invitations, staff accounts or published pages were
created or changed by this checkpoint work.

### Next integration steps

1. Connect FormsManager to AdminPage and add the two new form permission IDs to
   the shared catalogue. Use the trusted profile RPC's assigned-form flag for entry
   without granting wider access. Keep all database permission checks.
2. Implement the content-page editor and catalogue, poster-management tabs, public
   detail-page route and section placement. Reuse one form and its response/action
   records from both the poster and Admin Forms. Add appropriate image upload.
3. Prepare existing poster pages from the published poster facts. The Youth Islamic
   Studies poster explicitly asks to register interest. Do not invent registration
   requirements for other posters, course dates, fees or responsible staff. Keep
   new registration forms draft until an authorised person chooses responsibility.
4. Keep page visibility and form acceptance separate, with clear wording. Turning
   off a page must not delete responses or silently close a form used elsewhere.
5. Add browser regression coverage for create/publish/link/submit/respond/reassign/
   close/hide, including mobile layout, failed saves and unsaved-change protection.
6. Inspect the live schema again before applying the two website-only migrations.
   Deploy the custom-forms handler and compatible manage-user permission catalogue
   only after verification. Anonymous form submission and authenticated private
   actions must be tested separately. Do not apply the entire older workspace branch.
7. Remove temporary checkpoint-generation scripts/workflows before release. The
   final application uses ordinary source modules and SQL migrations, not a runtime
   patching step. Check `main` again and fast-forward only the verified release.

## Presentation Stream — requested, still outstanding

After the forms/page integration:

- Rename Hall streams to Presentation Stream in the admin UI.
- Add Quick Present: choose the input, then Start. No name prompt. Request browser
  capture permission synchronously from that click, then publish only after capture
  succeeds. A cancelled/denied permission request must not start a blank session.
- Keep the existing capture controllers mounted when switching views. Preserve
  transport, display approval, recovery and Advanced layouts.
- Show the server's normal/active session state with a compact status control.
  Starting still requires an explicit source/Start action; ending an active session
  uses the existing guarded End action. An active session is not proof of playback.
- Allow confirmed deletion of saved settings through the existing delete-template
  action. Deleting a template must not end the active presentation or erase its draft.
- Add permission-denial, start/end/recovery, template-deletion and mount-preservation
  regression tests. Physical iPhone/TV playback remains separate acceptance.

## Other website priorities

| ID | Work | Status / next step |
| --- | --- | --- |
| WEB-07 | Forms area | Source checkpoint above; route integration and release remain outstanding. |
| WEB-08 | Courses, events, posters and pages | Backend and metadata saved; page/poster UI and public route still required. |
| WEB-09 | Education organisation | Education remains parent; separate Adult Courses & Classes from Madrasah, preserving links and posters. Not yet changed in this checkpoint. |
| WEB-10 | Loading/navigation | The new record reader preserves ordinary refresh content. Global route/auth loading investigation is still separate and outstanding. |
| WEB-11 | Repository refinement | Classify personal placeholders, obsolete instructions, temporary URLs, dead code and conflicting styles. No blanket renaming or authorship/history rewrite. |
| WEB-12 | TV fit/delay | Retain working transport; obtain physical viewport/source geometry and timings before changing ratios or negotiation. |
| WEB-13 | Release hygiene | Keep CI/build/browser checks. Review deprecation and optional large HLS-bundle warnings separately; do not hide them by raising limits. |

## Deferred / separate decisions

App signing/releases/cloud builds; remote push; payment and media workers; Vercel
migration, eligible plan and repository connection; Cloudflare/DNS/domain changes;
SMTP identity/provider setup; retention decisions and historical-account reassignment.
Do not assume a charity/nonprofit qualifies for a particular Vercel plan, invent a
mailbox or delete linked content to force an account deletion.

## Previous release evidence

The admin-reliability release was based on `71e323290062514b6f6777c9df601875bdad2107`.
Application/test source: `0e0db1e33d180b5d375c700ca3cf172f26bb029f`.
Release/scope commit: `c8cfcc736a665b3cb92e26dc965d84f45e9aa063`.
Successful Actions runs: `34795929942` and `34796339248`.

That release passed ESLint, 269 Node tests, the Vite production build and 13 browser
tests using intercepted external data. Screenshots were inspected. manage-user version
5 was deployed without other Edge Functions or schema changes. A read-only live check
fetched AdminPage-DENwNEw2.js with the deletion controls and mobile toolbar class.
No real email acceptance, live deletion or physical TV test was claimed.

Rollback by reverting focused commits, not rewriting history or relaxing constraints.
Backend rollback uses the previous reviewed function source; do not drop the new form
schema after it contains responses. See auth-email-configuration.md for hosted email
prerequisites. Update this tracker rather than creating a competing progress document.
