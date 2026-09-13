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
- `npm test`: 213 tests passed, including PostgreSQL permissions/workflow tests from the backend companion and five new education/reading/export tests.
- Build with `VITE_ENABLE_WORKSPACE=true`: passed. The existing large HLS bundle warning remains.
- Chromium at 390 × 844: adult overview, courses, weekly schedule and unauthenticated portal rendered without page errors or horizontal overflow. Public Supabase reads were mocked; no authentication request or private write was made.
- Authenticated browser workflows need staging accounts for owner, teacher, student and parent before release. Database isolation tests do not replace that sign-off.

## Still outside this first delivery

Custom form builder, attachment requests/upload/ZIP bundles, threaded replies, all-record exports, financial reconciliation, bulk reminders, advanced head-teacher management, full report generation, record body editing after creation, and student archival tools. Use the app scope document for phone widgets/watch, radio and AI work. These are not represented as completed features.
