# Website maintenance status

Updated 14 September 2026. Current scope: improve and refine the existing website.
App development, remote push, store delivery and infrastructure migration are deferred.

## Boundaries

- Preserve the desktop/mobile admin design and working casting, TV, radio and prayer flows.
- Keep changes focused; do not replace working components or stack conflicting CSS overrides.
- Coordinate changes to `main`; never overwrite concurrent work or force-push a release.
- No DNS, registrar, mail DNS, hosting or Cloudflare changes in this delivery.
- One production frontend host. Do not assume nonprofit eligibility for Vercel Hobby.
- No paid plan, new SMTP provider, remote-desktop access or external service subscription without approval.
- Preserve real staff accounts, historical records, published content, tests and licences during cleanup.
- Review the whole visible interface in supplied screenshots, but record additional findings before widening a change.

## Accounts and mobile administration

| ID | Item | Source and verification | Remaining acceptance |
| --- | --- | --- | --- |
| WEB-01 | Mobile poster picker | Titles below images; editor brought into view without opening the keyboard. Full-app browser checks pass at 320, 390 and 1280px. | Confirm on the deployed site and physical phone. |
| WEB-02 | Admin section navigation | One Go to selector in the sticky mobile toolbar; desktop sidebar retained. Full-app navigation and publishing checks pass. | Confirm Notices and poster editing on the deployed site. |
| WEB-03 | Owner-only deletion | Typed confirmation; disabled non-owner accounts only; self/owners protected; source and audit checks. `manage-user` version 5 deployed with JWT verification retained. | Real signed-in operator acceptance; no production account deleted by tests. Historical records/uploads can intentionally block deletion. |
| WEB-04 | Invitation destination | Server fallback changed from the retired temporary host to the production JIC setup route and deployed in version 5. | Hosted Site URL, redirect allowlist and existing `JIC_SITE_URL` override still require verification. A fallback change alone does not repair all email links. |
| WEB-05 | Branded invitation/reset email | Templates and configuration instructions committed; verification-link tests pass. | Apply hosted Auth subjects/templates and an approved SMTP sender; fresh-email acceptance remains untested. |
| WEB-06 | Browser connection warning | An uncached external check reached HTTPS `/admin/setup`; HTTP `/admin/login` resolved to HTTPS. Certificate-check bypass was not enabled. | The original phone warning has not been reproduced; inspect its exact details and mixed content before declaring it resolved. |

## Website priorities still outstanding

| ID | Work | Next step |
| --- | --- | --- |
| WEB-07 | Forms area | Replace inbox-only entry with compact current forms, creation and responses views; show placement, linked content and responsible staff. Preserve existing submissions and permission filtering. |
| WEB-08 | Courses, events, posters and pages | Link structured records rather than copying content. Registration can be absent, an existing form or a new form. Draft/preview/publish/archive states must remain explicit. |
| WEB-09 | Education organisation | Education is the parent; Adult Courses & Classes and Madrasah retain separate content, tabs and schedules. Preserve old links and existing posters. |
| WEB-10 | Loading and navigation stability | Measure route downloads, authentication and data requests separately. Preserve visible content on background refresh and keep meaningful errors. Do not weaken access checks or touch casting transport to hide loading. |
| WEB-11 | Repository refinement | Classify personal placeholders, obsolete instructions, temporary URLs, dead code and conflicting styles. Remove only unnecessary material; do not mass-rename persistent IDs or rewrite authorship/history. |
| WEB-12 | TV fit and connection delay | Retain working transport. Obtain actual viewport/source geometry and timings before changing ratios or negotiation. No stretch/crop assumption from a portrait source. |
| WEB-13 | Release hygiene | Keep build/browser validation in CI. Review dependency deprecation and optional large HLS-bundle warnings separately; do not raise the warning limit to hide them. |

### Existing website forms work — reuse, do not duplicate

The larger implementation is already on this repository's `feat/community-workspace`
branch, inspected at `dcd17bee10bd5def2ab035a5d543d98cdec98899`. Relevant references:
`docs/forms-website.md`, `docs/forms-api.md`, `docs/WEBSITE-RELEASE.md` and
`docs/BACKEND-RELEASE.md` on that branch. It contains website forms, assignments,
course materials and additive backend migrations. It is not deployed merely because
those files exist. Its branch diverges from the current live line; preserve the
newer streaming, logo and admin corrections during any integration.

The inspected production backend has the original form-submission tables, not the
extended forms/course schema. Do not enable `VITE_ENABLE_WORKSPACE`, deploy the
whole branch, activate optional workers or apply all migrations just to add a Forms
tile. Review the website subset and staged migration/rollback strategy first.
No further app-repository work is in the current scope.

## Deferred / needs a separate decision

- App work, signing, Apple/Google accounts, TestFlight/Play releases and cloud-build provider selection.
- Remote push and provider configuration; optional email transport, payments and remote media workers.
- Vercel migration, eligible plan and repository connection; do not assume charity/nonprofit status qualifies.
- Cloudflare, DNS or domain changes; preserve existing mail records.
- SMTP identity/provider setup: use an approved organisation-controlled address, not an invented mailbox.
- Retention, historical-account reassignment and permanent data purges: do not remove linked content to force account deletion.

## Verification record

Baseline: `71e323290062514b6f6777c9df601875bdad2107`.
Verified application/test source: `0e0db1e33d180b5d375c700ca3cf172f26bb029f`.
GitHub Actions run: `34795929942`.

- The complete `npm run validate` command passed: ESLint, 269 Node tests and the production Vite build.
- The complete browser suite passed: 13 tests, actual router/providers/components with external data intercepted. No real accounts, emails, form submissions or payments were used.
- Screenshots retained in the `browser-verification` Actions artifact were inspected at phone and desktop sizes. Poster titles are readable beneath their pictures; the original layout is retained.
- Initial CI runs exposed two outdated stream-test server fixtures and an ambiguous save-button locator. The fixtures now retain server state across reloads; the browser test exercises the intended toolbar/editor action. Production streaming code was not changed.
- `manage-user` version 5 was deployed on 14 September with the reviewed repository handler, URL helper, deletion helper and unchanged shared permission definitions. Other Edge Functions and database schema were not deployed or changed.
- Browser/Node substitutes do not prove real email acceptance or physical TV playback. Website hosting deployment is a separate acceptance step from a successful repository build.

Release safety: the application changes are isolated on `maintenance/admin-reliability`
until its validated commit can fast-forward `main`. Keep the previous main commit as
the rollback reference; do not erase history or loosen database constraints. Backend
rollback uses the previous reviewed function source (version 4), not a schema rollback.

See `auth-email-configuration.md` for the hosted email checklist and conservative
account-deletion dependency policy. A future update should change the table statuses,
not add another competing maintenance document.
