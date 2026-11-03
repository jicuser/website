# Connected learning, admissions and extra prayer times

## Delivered code

The normal account home can expose a server-approved Family & learning area without enabling the historical workspace. Owners manage adult/Madrasah classes, student accounts, extra guardians, teaching assignments, department heads, class capacity and archived classes/students. Assigned teachers use existing attendance, progress, plans, assessments, meeting and course-resource screens. Families see only their own linked student records and published teaching records. A teacher label does not grant teaching or finance access.

Forms remain the existing unified inbox. Owners can link a registration form under Manage learning, then open a response and choose **Review class application**. Review selects an existing student, a linked class, a fee (including an explicit no-fee decision) and a review note. The source response remains intact. There is no automatic identity matching, account creation or consent inference.

Approval creates an inactive place. Fees and receipts use integer pence, immutable audit records and idempotent writes. Only finance staff/owners can record manual receipts. The service-only provider reconciliation RPC requires the exact amount/currency and unique event/payment identifiers. Payment alone does not activate a place: an owner explicitly activates it and the database rechecks payment, capacity and archival state while holding a class lock. Withdrawal preserves history. Reversed payments are shown as requiring attention rather than silently expelling a student.

Sunrise remains in the uploaded daily timetable. Sunset and the Zawwal interval have a separate dated editor under **Prayer timetable → Sunset & Zawwal**. Publication requires a source/approval reference. Missing times stay unconfirmed; no offset is inferred from Dhuhr/Maghrib. Conflicting edits are rejected by revision and keep the local draft. CSV imports do not erase these extra times.

## Release procedure

1. Back up and inspect the target schema. Confirm no `learning_*`, `fee_*` or `prayer_day_details` tables exist, and current unified forms, active profiles and private permission helpers are installed. These are new migrations, not repeatable imports over an existing learning installation.
2. Test on an isolated database with current forms, community operations and unified-form migrations. Run `node --test tests/learning-production.test.mjs tests/additional-prayer-times.test.mjs`; the tests snapshot existing form/task helpers to detect unintended replacement. Run the full validation and the connected-learning browser checks.
3. Apply, in order, `20261103090000_learning_foundation.sql`, `20261103091000_learning_admissions.sql`, and `20261103092000_additional_prayer_times.sql`. The first creates a default-off private release switch. No existing response, task, staff permission, payment or timetable row is changed.
4. Run Supabase security/performance advisors. Verify role-scoped reads using representative owner, assigned/unassigned teacher, finance, parent, student and disabled accounts. Verify a real teacher-owned resource upload in the private `course-resources` bucket.
5. Deploy the frontend from the same verified revision, keeping `VITE_ENABLE_WORKSPACE=false` and account requests disabled. The read-only `get_learning_access()` probe fails closed on old databases.
6. After those checks, an operator may enable the server-controlled learning area with `update private.learning_release set enabled=true where singleton=true;`. Reload the account page. The switch cannot be changed by public or authenticated clients. Disable it to close all new learning reads/writes without deleting data.

## External configuration that code cannot establish

This release does not configure Stripe credentials, create payment checkout sessions, send invitations automatically, set payment policy, import real students, confirm guardianship, or publish unapproved prayer times. Manual receipt confirmation records a staff-verified payment; it is not a bank API verification. The existing Stripe webhook must be separately configured and tested before real provider events are accepted. Do not label it live on the basis of local SQL tests.

Do not enable the old combined workspace: its task routing, talk processing and notification integrations have separate release requirements. This upgrade deliberately does not replace live form workflows or notification authorization.

## Maintenance

- Staff access: existing **Admin → Staff & access**. Link an account only after its identity is checked.
- Class registers: **Portal → Family & learning → Learning & teaching**; choose area, class, student and register session.
- Class applications: **Forms → response → Review class application**; walk-in applications can be reviewed directly in Admissions & places.
- Payment corrections: use reversal/void procedures, never edit or delete receipts. A paid provider receipt is not the same as a refund instruction.
- Lists: admission pages are bounded to 50 entries; teaching/family summaries load at most 500 records per area. They are not exhaustive record exports.
- Source map: `src/features/learning/`, existing `src/components/workspace/`, `src/features/prayer-details/`, and the three dated SQL migrations.
- Roll back availability with the private switch. Keep the additive schema and historical records; do not drop tables to roll back the UI.

## Verification record

On 3 November 2026, the complete local `npm run validate` passed lint, type-checking, 889 unit/database tests and the production build. The focused learning/prayer suites also passed 20 tests on a subsequent run.

GitHub Actions run `41602421540` passed complete source validation and all six connected-flow browser tests in Chromium and again in WebKit for source revision `ed1e5c50bc8232bafe47ef090d7c72add8bd663f`. The browser tests cover phone/desktop application approval without activation, disabled release access, parent-only family controls, published/unpublished additional times and draft preservation after conflicting edits. Test accounts and API fixtures are synthetic; this does not establish a successful real payment or a production rollout.

An earlier browser run exposed incorrect test dropdown selectors and the wrong admin query parameter. Those tests were corrected to use accessible combobox names and `/admin?section=prayer`, without removing the underlying assertions. Local browser navigation is administratively restricted, so browser verification runs on GitHub Actions.

The existing full website browser workflow is separate from these focused checks. Consult its latest result before production release; do not represent the focused checks as a passing full-site browser suite. Production migrations, learning activation and live checkout have not been performed by this implementation.
