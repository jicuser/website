# PR #37 integration review — 30 October 2026

Reconciled `c3c4fa9` with main `5c765b16b8b3ac2a4e9198cb728a37cc58019d77`,
which includes the installed-app navigation, monthly Salah editor, timetable
exports and related-page navigation added after the original validation.

## Decisions

| Area | Decision |
| --- | --- |
| Staff local saves | Retain the pending-save registrations for team, header, app content, permissions and Community Hub. Main has not replaced these fixes. |
| WhatsApp | Retain load/retry gating, saved-row verification and preservation of edits made during a pending save. |
| Public Salah | Retain optional-settings isolation, complete-session validation, clearing stale Jummah, dated overrides, Friday labels and no ordinary Dhuhr substitution. Keep main's dated monthly export fields. |
| Monthly editor | Keep main's editor and export design. Distinguish an unavailable month from a pending save so a failed load does not lock staff navigation forever. Block all task switches during real saves. |
| Daily/weekly/CSV drafts | Restore switching among these mounted panels without losing independent drafts. Reject entry into the overlapping month editor while those drafts exist; reject leaving a dirty month. |
| TV and appearance | Retain the layout ownership correction and accessible high-contrast/login colours. |
| Startup | Keep lazy HomePage. Load optional daily reminders and home-only Salawat through separate Suspense boundaries; retain the existing 240,000-byte budget. |
| Database | Move the new hall write-boundary SQL to `supabase/staged/`. Keep certificate activation staged and its operational permissions intact. |
| Browser validation | Retain all behavioural assertions and feature-suite routing. Update daily-editor entry and pending-load assertions for the monthly default; add installed-app/month/export regressions. |

No new product dependency or permission is introduced. Compatible dependency
patches from the original PR are retained. Other open feature PRs are not merged
as part of this review.

## Hall database release gate — not passed on staging

The candidate is **not in `supabase/migrations/`** and must not be deployed to
production yet. Local PGlite verification is useful evidence, not staging sign-off.

Before promoting the candidate, use an isolated staging database matching the
production schema, roles and grants, with synthetic booking data:

1. Confirm the validated `save_hall_calendar(date[],text,time,time,jsonb,uuid)`
   procedure is installed as `SECURITY DEFINER`, has a trusted owner and a fixed
   search path, and retains its internal active-staff permission check. Inspect
   effective table/column grants, inherited roles, RLS policies and RPC EXECUTE
   privileges; do not assume the local fixture covers deployment drift.
2. Apply only this candidate in staging. As anonymous, unrelated authenticated,
   hall staff and owner accounts, verify direct table INSERT and UPDATE fail,
   including column-specific requests. Verify anonymous RPC calls and unrelated
   authenticated RPC calls are denied.
3. Through the current frontend/Data API, verify permitted staff can create and
   edit bookings via the RPC, adjacent bookings work, overlapping confirmed
   bookings fail, and simultaneous overlapping creates cannot both commit.
   PGlite's single-connection tests do not establish concurrent-request behaviour.
4. Verify public availability still reads successfully, private contact details
   remain inaccessible publicly, and permitted deletion removes private details.
   Verify unauthorized deletion remains denied or affects zero rows.
5. Reapply the candidate to prove idempotence. Record staging project, schema
   revision, role/grant snapshots and observed outcomes before separately approving
   production deployment. Promote with a fresh migration timestamp after checking
   the production migration ledger; do not backfill an old migration blindly.

The website already creates/edits via the RPC and deletes through the table.
No frontend change depends on deploying this staged candidate. The existing
last-write-wins edit contract remains: optimistic revision checks are separate
work. Certificates remain behind their existing activation gate.

## Validation and workflow coordination

The existing `npm run validate` covers lint, type checks, Node/database tests and
an isolated production build. Release validation additionally builds a manifest
and runs `npm run check:startup`; the size threshold is unchanged.

New `pr37-salah-integration.spec.mjs` exercises month-save failure/retry, draft
exports, navigation/sign-out protection, failed-month-load recovery and public
Salah/download flows in ordinary and installed-app modes. It is included in
Chromium's default suite and the existing WebKit mobile suite.

The separate browser-workflow improvement should retain these suite assignments:
- Default Chromium includes prayer-load, admin-local-save and PR37 integration.
- Feature-enabled workspace Chromium includes admin-app-save, custom forms,
  certificates and sitewide learning.
- WebKit mobile includes PR37 integration plus its existing mobile checks.

No workflow timeout, assertion, upload cleanup or startup threshold is relaxed.
`.github/workflows/` is untouched to avoid conflicting with separate workflow
work. That workflow must run all three suites independently and preserve their
failure evidence. Browser success on the final combined revision is required
before merging; old PR validation does not substitute for it.

Local browser execution could not start because Playwright's browser executable
was absent and its download returned an invalid archive. This is an environment
failure, not a passing test. No production data, database migration, Edge Function,
secret or hosting setting has been changed. Builds use dummy public configuration
and must not be deployed.
