# Learning production activation — 3 November 2026

## Live status

The three additive learning/admissions/additional-prayer migrations have been applied to the production JIC website database. The server-controlled `private.learning_release.enabled` switch was set to `true` and independently verified at 14:50:55 UTC on 3 November 2026. This supersedes the implementation-time statement in `2026-11-03-learning-release.md` that production migrations and activation had not yet happened.

The existing active owner passes `get_learning_access()` using the authenticated database role. All tables queried by the learning-only portal, the admissions list, fee list and account-assignee lookup were exercised under that role after activation without errors.

The live site already serves the new frontend. A fresh UK-region request to `/portal` returned HTTP 200 and loaded `CommunityPortalPage-dExrVRGl.js` and `useLearningAccess-BNFewTnn.js`. A separate fresh request for the hook bundle confirmed it calls `get_learning_access`. A fresh request to `/prayer-times` returned HTTP 200, the existing 3 November timetable, and Sunset/Zawwal marked **Not published**. No unapproved extra times were inserted.

## Where staff use it

- Sign in to `/portal` with the existing owner account, then open **Family & learning**.
- `/portal?tab=manage`: classes, students, teacher/guardian links and registration-form links.
- `/portal?tab=admissions`: review applications, inspect fees, activate or withdraw places.
- `/portal?tab=learning`: assigned teaching, registers and learning records.
- `/portal?tab=fees`: fees and receipts; manual receipt confirmation requires owner/finance permission.
- `/admin?section=prayer`: **Sunset & Zawwal**, with an explicit source and publication choice.

Teachers and families gain access only through verified assignments/account links. Staff labels alone confer no access. Refresh an already-open account page to recheck the server switch. This release does not enable the historical combined `VITE_ENABLE_WORKSPACE` module or change the separate account-request release gates.

## Applied migrations

The migration service assigned deployment-time versions. The SQL hashes below are MD5 of the exact SQL text after trimming leading/trailing whitespace; all matched the corresponding repository source before activation.

| Repository migration | Recorded production version | SQL checksum |
| --- | --- | --- |
| `20261103090000_learning_foundation.sql` | `20261103144249` | `b96e24aaed5678c8d6a3127c94db09fa` |
| `20261103091000_learning_admissions.sql` | `20261103144359` | `4ad24d424e7b1e6ab0854e010697596f` |
| `20261103092000_additional_prayer_times.sql` | `20261103144425` | `bce377d08482899e7657127a9a428d3b` |

Do not reapply these migrations because their repository timestamp differs from the recorded production version. Before a future CLI migration push, reconcile these exact mappings with migration-history tooling and review its dry run. Do not replay historical workspace fixtures.

## Verification performed

1. GitHub Actions run [41655682256](https://github.com/jicuser/website/actions/runs/41655682256) passed `npm run validate` on the merged source, including lint, type checking, the unit/database suite and production build. All six connected-flow browser scenarios passed in Chromium and again in WebKit. The ops branch changes only verification workflows relative to merged source `36821b785472cec4fc7cd7f4e15f21c89a733341`.
2. A fresh local focused run of learning production, additional prayer times and their presentation-model suites passed **20 tests, zero failures**, using the identical lockfile and dependencies.
3. Production SQL tests exercised effective authenticated/anonymous roles with synthetic teacher, guardian, student, finance, unrelated and disabled accounts inside one transaction that was rolled back. Assertions covered idempotent approvals/receipts, unpaid/partial-payment blocking, full-payment activation, class capacity, real existing form metadata linkage, atomic attendance, published versus draft progress, file-policy scope, stale prayer-time edits and withdrawal revocation. No synthetic accounts, students, fees, receipts or prayer values were retained. An initial test-script variable-name collision was corrected before the full successful run.
4. All **21 new public tables** have RLS enabled. Anonymous SELECT is denied on the new private learning/fee/audit tables; only published prayer-day details are deliberately public. The `course-resources` bucket is private with a 25 MiB file limit and the declared MIME allowlist. File-policy decisions were tested; an actual binary upload through the Storage HTTP endpoint was not performed.
5. Live HTTP checks in [run 41658037531](https://github.com/jicuser/website/actions/runs/41658037531) passed: the published additional-times endpoint returned a list, and anonymous requests to learning students, classes, fee receipts, learning access and admissions were denied with PostgreSQL permission code `42501`. These checks used only a publishable API key and no private data or writes.
6. Existing counts remained 2 profiles, 14 form responses, 7 custom forms and 91 main timetable dates. The aggregate definition hash for the existing form/task/auth permission helpers remained `c884fe852feaad5dc7007d91407fb903` before and after the upgrade. Existing form/task functions were not replaced.

The focused browser suite uses synthetic API fixtures. It is not a signed-in browser test against a real owner account and is not a claim that the separate full-site browser suite passed. Production permission and workflow checks were performed directly in PostgreSQL; public HTTP boundaries and the deployed public pages were checked independently.

## Remaining operational setup, not hidden activation steps

The learning module is enabled, but real classes/students/teacher assignments have not been invented or imported. Create the actual class structures and link verified accounts before inviting families to use them. An enquiry does not prove identity or guardianship.

The fee ledger and manual receipt workflow are live. **Online card checkout is not live.** Production Edge Function inventory contained no `payment-webhook` function at rollout, and the repository webhook alone is not a checkout-session integration. Payment-account configuration, verified webhook secrets and end-to-end provider testing are required before offering card charging. No real money was charged or refunded during this rollout.

Sunset/Zawwal tools and public fields are live, but actual values remain unpublished until staff supply approved times and their source. Existing main prayer times, Sunrise and Jama'ah data were preserved.

Supabase security/performance advisors were checked before activation. There were no ERROR-level security findings, but the advisory list is not empty: existing leaked-password protection and extension placement warnings remain, and four new permission-checked authenticated SECURITY DEFINER functions are flagged for review by the generic linter. Index and overlapping-policy performance advisories also remain. Do not remove intentional grants/policies or unused new indexes solely to silence these notices. See the [security-definer advisory](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) and [password protection guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Availability rollback

An authorised database operator can close the learning module without deleting any records:

```sql
update private.learning_release set enabled = false where singleton = true;
```

Do not drop learning, fee, receipt or audit tables to roll back availability. Sunset/Zawwal publication is controlled separately per date in the prayer editor.
