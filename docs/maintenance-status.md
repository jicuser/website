# Website maintenance status

Updated 14 September 2026. Current scope: refine the existing website and admin.
Apps, remote push and hosting migration are deferred.

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

| Area | Released work | Remaining acceptance or limitation |
| --- | --- | --- |
| Admin Forms | Current forms, creation and Responses & actions tiles; live/draft/closed filtering; named responsibility; linked-page information. | Test with the organisation's real operator accounts. No live form was published on an invented staff assignment. |
| Form builder | Fields, conditions, optional attachments, responsible people, editors/followers, draft and published versions. | Choose the actual responsible people and review questions before opening registration. |
| Responses and actions | Shared private records, notes/replies, completion, eligible reassignment and refreshed summaries. | Changing default responsibility affects future responses; reassign existing actions explicitly. Completing a task is not admission to a course. |
| Poster management | Poster selection opens overview, artwork editing, Page & registration, Responses and Actions. | Responses/actions require a linked form and authorised staff access. |
| Page creation | Create from a poster or Pages & programmes; choose type, placement, picture, optional existing/new form, preview and visibility. | Visibility controls apply to these created content pages, not protected system routes or every existing fixed page. |
| Public detail pages | Stable /pages/:slug addresses, selected section listings and /forms/:slug registration. Hidden pages are unavailable; hiding does not delete or close a shared form. | Real public submission-to-operator acceptance remains a separate live test. |
| Adult Education | Separate /education/courses route and navigation; legacy /madrassah/classes-courses redirects there. Madrasah remains separate. | A structured weekly-schedule editor and wider categorisation of existing content remain refinements. |

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

| ID | Work | Status |
| --- | --- | --- |
| WEB-01/02 | Mobile poster/admin navigation | Previously released and retained. Confirm physical-phone editing. |
| WEB-03 | Owner account deletion | Released and retained. Related history/uploads can intentionally block deletion. |
| WEB-04/05 | Invitation destination and branded emails | Production fallback and templates saved. Hosted URL override/allowlist, Auth templates and approved SMTP sender still need configuration verification and a fresh email test. |
| WEB-06 | Original phone security warning | Not reproduced; exact cause still unconfirmed. No TLS verification bypass used. |
| WEB-10 | Loading/navigation performance | Global route/auth timing investigation remains open. Do not hide errors or weaken permission checks. |
| WEB-11 | Repository refinement | Remove unnecessary personal placeholders, obsolete instructions and conflicting code only after classification; no blanket rename or history rewrite. Temporary integration generators were removed. |
| WEB-12 | TV fit/delay | Obtain real viewport/source geometry and timings; preserve working transport. |
| WEB-13 | Dependencies/release hygiene | CI remains enabled. Review deprecation and optional HLS size warnings separately; do not hide them by raising limits. |

Deferred: apps/store signing/cloud builds, remote push, payment/media workers,
Vercel/Cloudflare/DNS migration, new paid services and retention/deletion policy changes.
Frontend rollback reference: `86c881ea8e36fc8983a7706056a17752972e5801`. Revert focused
source changes instead of erasing Git history or collected data. Keep this tracker
current rather than creating competing progress documents.
