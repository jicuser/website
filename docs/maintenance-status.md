# Website maintenance status

Updated 15 October 2026. Current scope: refine the existing website and admin.
Opt-in Salah web push is approved; native apps and hosting migration remain deferred.

## October service enquiries and public controls

The live website linked to three absent service forms; both schedule tables were
also missing. Source `20261015003000_service_enquiries.sql` was applied as managed
`20261015010658 service_enquiries`. It creates four separately named forms (Nikah,
funeral support, hall booking, community) using the existing versioned engine and
assigns the active owner as manager/responsible person. Existing forms, closures,
staff assignments and responses are never overwritten. No example classes were
published, and no test enquiry was submitted to production.

Service buttons now open these forms instead of call-number buttons. Admin → Forms
can filter service enquiries/bookings separately from registrations. General contact
messages stay separate. The hall calendar loads only the selected month's four
public status fields, distinguishes unknown/part-day dates, carries a selected date
into the enquiry, and never treats an enquiry as a confirmed booking. Staff schedule
mutations use explicit fields and confirm a returned row before claiming success.
The database restricts writes to Events-authorised staff, including column grants;
course planning is not public and no visitor details appear in hall availability.

Mobile controls are Home/Back, Donate, Prayer times and Menu. Search/appearance sit
below the branding and float after that row scrolls away. Prayer times hide after
12px of page movement and return after 700ms idle, except while typing or the footer
is visible. The explicit Prayer times toggle can reveal them there. The daily
religious reminder remains in document flow; unrelated posters/pop-ups are omitted
on enquiry, contact, hall-booking and notification-setup pages. Footer rows keep the
icons together and logo beside the legal line; mobile bottom padding reserves only
the persistent navigation, avoiding a blank prayer-panel-sized gap. The floating
back-to-top control also yields to the footer so it cannot cover Privacy.

Salah and Janazah guide cards link to the official Dawat-e-Islami English PDFs and
Urdu library editions, with publisher-hosted book thumbnails and attribution. Full
books are neither copied nor repackaged. Sources verified 15 October 2026:
[Laws of Salah](https://www.dawateislami.net/bookslibrary/en/laws-of-salah) and
[Method of Funeral Salah](https://www.dawateislami.net/bookslibrary/en/method-of-funeral-salah).

Performance checks: timetable refreshes now use two requests instead of four (or
five with tomorrow), selecting only needed fields and sharing one date-range
snapshot. Overlapping refreshes are deduplicated and unmount aborts requests.
Donation code loads only when requested. Initial JavaScript measured with
`npm run build -- --manifest` and `node scripts/measure-entry-bundle.mjs` went from
819,299 bytes / 267,441 gzip to 816,432 bytes / 266,843 gzip at this checkpoint.
This is a small bundle saving, not a demonstrated Core Web Vitals improvement.
The optional HLS size warning remains. Production dependency audit: zero findings.

Validation passed lint, 494 Node/database tests and a production build. All 32
browser flows passed in [CI run 38667211528](https://github.com/jicuser/website/actions/runs/38667211528),
including narrow timetable previews, mobile footer/toggle, enquiry submission and
admin workflows with mocked external data. CI exposed monthly-table overflow:
absolutely positioned screen-reader labels needed a containing block inside the
scroll area. That is now explicit; time labels and horizontal scrolling remain.
Preview restoration is checked from the actual pointer-opening position, accounting
for browser click scrolling around floating controls. Physical iPhone/Android
delivery, keyboard behaviour and visual acceptance remain separate checks.
The reminder scheduler is enabled and its live heartbeat is recent; opening the
homepage or settings still never requests notification permission automatically.
The public-page fetch was denied by the site's country-access restriction (HTTP
403), so serving the latest frontend on the public domain must be checked from an
allowed location. No geographic block or TLS/security setting was bypassed.

Security review found no new advisor warnings for this migration. Existing warnings
remain: two intentionally authenticated-callable form SECURITY DEFINER functions,
disabled leaked-password protection, and pg_net's non-relocatable extension metadata.
Private backend tables intentionally have no client RLS policies. Do not describe
this bounded review as a whole-site penetration test or full security certification.

## October admin page-workspace refinement

The section/page navigator and programme catalogue use existing public navigation
names. Programme placement, page visibility and form acceptance remain distinct.
The content-block workspace uses a single page draft with reorder, move, visibility,
undo and explicit save; built-in page features are not presented as freely movable
blocks. See `content-workflow.md` for the model and next-phase boundaries.

Managed migration `20261014232721 atomic_page_sections` maps to source
`20261014231930_atomic_page_sections.sql`. It adds a caller-permission atomic save
RPC and timestamp hardening, and revokes TRUNCATE/REFERENCES/TRIGGER from public
client roles. Post-deployment queries confirmed RLS remains enabled, anonymous
execution is denied, authenticated execution is available, and broad truncate
grants are absent. The table was empty before and after deployment; no visitor
content, form responses or staff accounts were changed as a test.

The security advisor returned the same pre-existing findings before and after:
two authenticated-callable form SECURITY DEFINER functions, disabled leaked-password
protection, and informational RLS-without-policy notices for deliberately restricted
backend tables. These findings were not silently “fixed” by opening permissions.
Review the form functions' intended internal authorisation and the Auth setting
separately; this release is not a whole-project security certification.

- [SECURITY DEFINER review guidance](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
- [Password protection guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
- [RLS policy notice guidance](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)

Real-phone drag behaviour and visual acceptance remain separate checks; local
browser execution is unavailable in this environment. Database and component
tests are used here without claiming physical-device acceptance.
Final local `npm run validate` passed lint, all 455 tests and the production build.
The existing optional HLS chunk-size warning remains; no limits were raised to hide it.

The follow-up menu-style refinement on 15 October 2026 replaces the admin's two
dropdowns with an inline section/page directory using the complete public menu
order. Saved-page view links are separate from guarded editing actions. Madrassah
and Social Media have their explicit shortcut groups. Fresh validation passed lint,
457 tests and the production build. Public-control relocation is covered above.
The subsequent opt-in Salah reminder release is documented in `salah-reminders.md`.

## Boundaries

Preserve the current desktop/mobile appearance and working casting, TV, radio and
prayer flows. Keep focused commits, checkpoint progress regularly, check the remote
branch before release and never force-push over concurrent work. Do not change DNS,
mail DNS, hosting, Cloudflare, service subscriptions or Vercel plans without separate
approval. Do not assume nonprofit eligibility. Preserve real records, licences,
tests and useful documentation during code cleanup.

## Forms and content release

Application/backend release: `e55e393cd0411e9e1bc496160546511db96ec5bb`.
Poster detail-page seed and regression: `2e1ed986b7cd6aa8770f16772e6d6f25f8af12bc`.
Both were fast-forwarded to `main` after successful CI. The maintenance branch
retains the checkpoints; no code-generation or write-back workflow runs in production.

| Area                  | Released work                                                                                                                                                        | Remaining acceptance or limitation                                                                                                              |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin Forms           | Current forms, creation and Responses & actions tiles; live/draft/closed filtering; named responsibility; linked-page information.                                   | Test with the organisation's real operator accounts. No live form was published on an invented staff assignment.                                |
| Form builder          | Fields, conditions, optional attachments, responsible people, editors/followers, draft and published versions.                                                       | Choose the actual responsible people and review questions before opening registration.                                                          |
| Responses and actions | Shared private records, notes/replies, completion, eligible reassignment and refreshed summaries.                                                                    | Changing default responsibility affects future responses; reassign existing actions explicitly. Completing a task is not admission to a course. |
| Poster management     | Poster selection opens overview, artwork editing, Page & registration, Responses and Actions.                                                                        | Responses/actions require a linked form and authorised staff access.                                                                            |
| Page creation         | Create from a poster or Pages & programmes; choose type, placement, picture, optional existing/new form, preview and visibility.                                     | Visibility controls apply to these created content pages, not protected system routes or every existing fixed page.                             |
| Public detail pages   | Stable /pages/:slug addresses, selected section listings and /forms/:slug registration. Hidden pages are unavailable; hiding does not delete or close a shared form. | Real public submission-to-operator acceptance remains a separate live test.                                                                     |
| Adult Education       | Separate /education/courses route and navigation; legacy /madrassah/classes-courses redirects there. Madrasah remains separate.                                      | A structured weekly-schedule editor and wider categorisation of existing content remain refinements.                                            |

### Existing poster pages

The detail-page migration read the saved programme catalogue rather than replacing
it with defaults. It created pages for Open Qur'an Circle, Youth Islamic Studies,
The Seeker's Gateway, After Maghrib, and Adhan & Iqamah Course. The last stays hidden,
matching the source poster's empty placement list. Existing page conflicts are
preserved; rerunning cannot overwrite staff edits. Original poster artwork, display
selection and TV settings are unchanged.

Youth Islamic Studies explicitly advertises registration of interest. Its page
reflects this, but online registration is not open until an authorised editor creates
or links a form, selects actual responsible staff and publishes it. No registration
requirement was inferred for other posters. No forms, real submissions, user accounts
or responsible-person assignments were created as seed data.

To enable the Youth form: Admin → Posters → Youth Islamic Studies → Page & registration
→ Create linked form → choose questions and responsible people → publish the form
→ save the page link. The same form then appears in Admin → Forms.

## Backend deployment and compatibility

The live project already contained an earlier website_forms deployment when this
release resumed. It was inspected, not blindly reapplied. No response tables were
recreated. Managed migration records:

- `20260914050501 website_forms`: existing earlier forms foundation.
- `20260914105826 content_pages`: maps to source `20260914041000_content_pages.sql`.
- `20260914105903 form_release_compatibility`: maps to `20260914104500_form_release_compatibility.sql`.
- `20260914110939 poster_detail_pages`: maps to `20260914112000_poster_detail_pages.sql`.

The compatibility migration preserves published form addresses, checks revisions,
retains the active-responsible-person safeguard and adds missing legacy response-task
endpoints. Its publication API accepts the expected revision with a default for older
callers. Existing user permission values and stored responses are preserved.

`custom-forms` version 1 is deployed. Public submission and upload proofs are validated
by the handler/database; private download/export requires a verified user and scoped
SQL authorisation. `manage-user` version 6 adds the two reviewed form permission IDs
while retaining account-deletion safeguards and JWT verification. TV-control version
15 and submit-form version 1 were not redeployed.

Do not replay all repository migrations into the managed project without reconciling
these version mappings. A future fresh installation uses the source migration sequence;
the deployed project's early foundation was upgraded explicitly. Do not drop the forms
schema as a rollback after it contains responses.

## Verification

- CI run `34835730621` passed the full lint, Node/database tests, production build and
  17-browser-test suite for the application release.
- CI run `34836749694` passed full validation and browser tests after adding poster-page
  seeding. The seed test covers saved content, hidden items, duplicate avoidance and
  retaining staff edits. Database tests cover privacy, versions, assignments and safe
  failure; browser tests run the real router/components with external requests intercepted.
- A fresh read-only fetch of production /pages/youth-islamic-studies rendered the new
  page, saved poster details and the accurate not-open-yet registration message.
- The initial live /education/courses scrape caught a loading state; do not treat that
  snapshot as proof of either completed rendering or a persistent failure.
- Public response-table access was denied by grants; the attachment bucket is private;
  the deployed profile and publish-function contracts were inspected after migration.
- No real response, outgoing email, payment or staff deletion was used as test data.
  Physical phone/TV operation and a real authenticated form journey are not claimed.

## Presentation Stream — next, not included in this release

Rename Hall streams to Presentation Stream. Add Quick Present with input selection
and an explicit Start click, no name prompt: request capture permission from that
click, and publish only after capture succeeds. Cancellation must not start a blank
session. Keep capture controllers mounted and preserve transport, display approval,
recovery and Advanced layouts. Add a compact normal/active status control using the
existing guarded End action, and confirmed deletion of saved templates without ending
the stream or discarding its draft. Test permission denial, recovery, start/end,
template deletion and mount preservation before release.

## Other remaining work

| ID        | Work                                      | Status                                                                                                                                                                                               |
| --------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WEB-01/02 | Mobile poster/admin navigation            | Previously released and retained. Confirm physical-phone editing.                                                                                                                                    |
| WEB-03    | Owner account deletion                    | Released and retained. Related history/uploads can intentionally block deletion.                                                                                                                     |
| WEB-04/05 | Invitation destination and branded emails | Production fallback and templates saved. Hosted URL override/allowlist, Auth templates and approved SMTP sender still need configuration verification and a fresh email test.                        |
| WEB-06    | Original phone security warning           | Not reproduced; exact cause still unconfirmed. No TLS verification bypass used.                                                                                                                      |
| WEB-10    | Loading/navigation performance            | Global route/auth timing investigation remains open. Do not hide errors or weaken permission checks.                                                                                                 |
| WEB-11    | Repository refinement                     | Remove unnecessary personal placeholders, obsolete instructions and conflicting code only after classification; no blanket rename or history rewrite. Temporary integration generators were removed. |
| WEB-12    | TV fit/delay                              | Obtain real viewport/source geometry and timings; preserve working transport.                                                                                                                        |
| WEB-13    | Dependencies/release hygiene              | CI remains enabled. Review deprecation and optional HLS size warnings separately; do not hide them by raising limits.                                                                                |

Deferred: apps/store signing/cloud builds, payment/media workers,
Vercel/Cloudflare/DNS migration, new paid services and retention/deletion policy changes.
Frontend rollback reference: `86c881ea8e36fc8983a7706056a17752972e5801`. Revert focused
source changes instead of erasing Git history or collected data. Keep this tracker
current rather than creating competing progress documents.
