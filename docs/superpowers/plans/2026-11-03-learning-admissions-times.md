# Connected learning, admissions and additional times

> Implementation: inline, in an isolated feature branch. User has authorised implementation and push.

**Goal:** Make teacher/student management, reviewed form-to-fee-to-enrolment and approved additional prayer times work together without replacing the deployed forms system.

**Architecture:** Add learning-only tables/RPCs to the current forms schema. Reuse existing teaching, resources, family and fee screens behind a separate server readiness switch; do not enable the legacy workspace. Keep extra times in a separate dated, versioned table so timetable imports cannot erase them.

**Tech stack:** React/Vite, Supabase/PostgreSQL, Node tests/PGlite, Playwright.

**Spec:** The user's approved outstanding items from PR #41 and this conversation. No new payment provider, automatic account creation, guessed prayer times or destructive record deletion.

## Constraints and review focus

- Active explicit assignments, not staff labels, govern access; disablement and withdrawal revoke pupil records.
- Submitted interest is not admission. An owner reviews a real student/class link. No copying private form payloads into public pages.
- Enrolment activation checks a linked immutable fee ledger on the server. Manual receipts are explicitly staff-confirmed; provider receipts require the signed webhook. Partial/void fees cannot activate.
- Network retries cannot create duplicate places or charges; stale publication cannot overwrite another editor.
- Additional sunset/Zawwal times require the centre's source and explicit publication; missing times stay missing.

## Tasks

1. Write failing migration tests against current website forms plus unified-form upgrade. Add learning-only foundation and resource/progress functionality, preserve all existing forms/tasks functions and policies.
2. Write failing admission/payment tests. Add versioned review records, form/class links, idempotent fee creation and server-checked enrol/withdraw actions; implement the management UI and inbox shortcut.
3. Write failing extra-times permission/publication tests and input tests. Add independent daily editor and public display with optimistic conflict handling.
4. Verify lint, typecheck, complete Node suite, production build and focused browser workflows. Review access boundaries and diff. Push only scoped files; remove the temporary verification export workflow before the PR.

## Release

The learning release switch defaults off. No historical workspace SQL may be deployed. Production database activation and Hostinger deployment are separate from a GitHub push; record each verified state rather than assuming it.
