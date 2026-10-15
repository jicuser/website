# Website companion for the community app

The website stays on its existing React/Vite stack. It shares Supabase identities and backend contracts with the Flutter app. The code uses organisation-neutral feature names; existing website branding and public content remain configured separately.

## Delivered in this branch

- Adult education overview, classes/courses and weekly schedule. The existing header provides the tabs. Youth and Madrassah posters stay outside adult education; unknown new posters need an explicit adult/all audience. Programme posters remain the single visual catalogue.
- Poster editor adds audience and confirmed weekly sessions (weekday + time or after-prayer label). Known older posters inherit default sessions only while their schedule text remains unchanged. No course start/end dates are inferred.
- App images and approved reading editor under website administration. `mobile_branding` and `reading_library` use public `page_content`; sources and references are mandatory for reading. No private student data belongs there. Publishing uses the existing admin save/unsaved-changes flow.
- `/portal` uses the same account session as the website. Member sign-in is separate from the existing admin-only sign-in guard. Active-account checks gate the portal; database row-level security controls every record.
- Separate adult/Madrassah course views, enrolments, progress/plans/assessment drafts and publication, class sessions and atomic register marking, meeting requests and staff confirmation.
- Student/guardian poetry and reflection submissions, with course staff publication. Published writing is visible inside its course; drafts remain restricted to the submitter’s student/guardian account and assigned teaching team.
- Owner course/student creation, student/guardian account links, enrolment and teacher/head-teacher assignments. Teacher and head-teacher assignments currently have the same course-level capabilities. Account creation continues through the existing website invitation workflow.
- Shared actions: assignment, due dates, status and outstanding/overdue counts; notifications read independently from action completion. Form assignment respects existing form access. Form routing chooses a responsible account, action title and due time; backend validation ensures they can handle that form.
- Existing forms inbox gains server-side type filter/date ordering, search of the displayed page and CSV download of that page, including formula-safe spreadsheet cells. This export is not a full-database export.

## Enable only after staging

Apply and test the companion migration in a staging database, then set `VITE_ENABLE_WORKSPACE=true` for the website build. With the flag absent, `/portal` shows an explanatory availability page and forms do not show an assignment button. Do not enable the flag against an unmigrated production database.

The portal stores private records only in React memory and clears them on account changes or load failure. Queries are bounded to 500 records per table; current summaries therefore describe the loaded records, not database-wide totals. Forms use 25-row pages. Larger operations need server pagination and aggregate count RPCs before scaling beyond those limits.

Use [the API contract](community-workspace-api.md) for exact table columns and RPCs. Push credentials, native Firebase/APNs setup, worker deployment and scheduling are separate deployment tasks; this UI does not send live pushes.

## Validation

- `npm run check`: passed.
- `npm test`: 214 tests passed, including PostgreSQL permissions/workflow tests from the backend companion and five new education/reading/export tests.
- Build with `VITE_ENABLE_WORKSPACE=true`: passed. The existing large HLS bundle warning remains.
- Chromium at 390 × 844: adult overview, courses, weekly schedule and unauthenticated portal rendered without page errors or horizontal overflow. Public Supabase reads were mocked; no authentication request or private write was made.
- After merging main’s salawat and Prayer Times fixes, all seven mobile browser regression tests also passed.
- Authenticated browser workflows need staging accounts for owner, teacher, student and parent before release. Database isolation tests do not replace that sign-off.

## Later additions and release

The initial delivery above has since been extended with the custom form builder, private attachments and ZIP bundles, threaded replies, exports of matching responses, fee records, guardian/department-head links, marks and course resources. Use [current forms](forms-website.md), [learning extensions](learning-extensions-api.md), [fee contracts](fees-api.md) and [website release steps](WEBSITE-RELEASE.md) for the current source. Live account/provider setup and publication are separate from source verification.


## JIC integrated platform delivery brief — 15 October 2026

Product direction: build the JIC website and future iOS/Android app from one permissioned Supabase domain model. The supplied Labbaik screenshots are functional inspiration only, not licensed UI assets or branding. Preserve JIC's navy/gold visual identity, responsive glass material system, and public no-login service enquiry routes.

Implementation rules:
- Build user journeys end to end without requesting approval for routine UI, component and navigation decisions. Do not represent source-only features as deployed or enabled.
- Keep public enquiries available without accounts. Allow applicants to request an account and authorised staff to link verified enquiries to an identity; do not auto-merge based on name/email alone.
- Separate member, parent/guardian, pupil, teacher, office, finance, administrator, and designated safeguarding lead capabilities; enforce server-side permissions and RLS, never rely on hidden tabs.
- Use stable IDs, scoped ownership, idempotent writes, immutable financial and certificate events, secure provider webhooks and audit trails. Build additive, reviewed migrations and test against staging before activating flags.
- Share domain contracts and backend operations between web and app; use native push and deep links only after permission/notification configuration. Support passwordless magic links and optional configured OAuth without bypassing account approval.

Delivery order:
1. Portal foundation: role-aware home, household links, enquiries, bookings, certificates, donations, payments and notifications. Responsive four-item public bottom bar and accessible menu remain distinct from private portal navigation.
2. Madrassah: one-tap session register, parent-reported absences, attendance history, guardian alerts, teacher QR check-in/out (with replay protection), and learning records.
3. Curriculum: configurable Qa'idah and Qur'an levels, Islamic studies units, kitab chapters, Hifz Sabaq/Sabaq Para/Dhor and Juz map, salah steps, assessments, oral/written exams, marks, merits and parent-readable progress.
4. Finance: one ledger linking payer, student, booking and purpose; one-off/weekly/monthly/termly/yearly billing, sibling discount policy, card/cash/bank reconciliation, Stripe-hosted payment methods, verified subscriptions and failure retries. Keep masjid and madrassah settlement entities explicit; never store raw card details.
5. Communications and learning: opt-in WhatsApp/SMS/email event templates, delivery receipts, reminders, online class links, authorised attendance capture, consent-based recording links, optional external Drive/Dropbox OAuth.
6. Restricted operations: safeguarding concerns, designated lead workflow, DBS expiry alerts, staff hours and payroll export. Payroll tax and statutory forms require separately validated UK payroll compliance before release.
7. Optional engagement: merit achievements and age-appropriate educational quizzes/games with safeguarding review.

Definition of done for each module: accessible mobile/desktop flows; permission matrix and RLS tests; audit and error states; staging migrations; browser and API tests; data privacy/retention review; documented release flags and rollback. Do not enable live payments, safeguarding, payroll or child data flows without validated backend and provider configuration.
