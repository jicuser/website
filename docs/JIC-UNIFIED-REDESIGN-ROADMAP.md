# JIC unified redesign — staged delivery

## Design goal
A coherent contemporary Islamic visual identity across the public website, installed bookmark/PWA, Flutter app, admin and portrait/landscape TV displays. Deep midnight navy, slate, restrained warm brass, ivory and teal. Use translucent glass sparingly and preserve strong contrast for prayer times. This is a multi-phase change, **not a complete redesign in this PR**.

## Implemented in this branch
- Opt-in `jic-modern` foundation styles (not applied globally).
- Pure TV layout model for full, side-by-side, stacked and three-zone display arrangements; orientation-aware grid templates and input sanitisation. Not yet wired to the live TV editor.
- Plain-English admin action search routes common requests to existing permission-controlled editors, without performing changes automatically.
- Focused Node regression tests for TV layouts and permission-aware task navigation.

## Next implementation milestones
1. Apply the design foundation to an admin dashboard and homepage behind preview-only rollout controls. Compare mobile, tablet and desktop screenshots with the approved concept. Keep existing public routes and PWA navigation intact.
2. Introduce TV layout presets in the existing TV workspace, with preview, per-display schedules, and manual override. Validate portrait/landscape, offline and live transition states.
3. Unify published prayer state across homepage, app and TV. Distinguish current Salah, next Salah start, next Jamaat, and prayer-in-progress; support Friday, Maghrib same-time and tomorrow's Fajr without guessing unpublished values.
4. Forms library: create, edit, close, archive and link/unlink forms to multiple pages. Never delete stored responses merely by removing a page link. Add explicit response retention/export and restricted deletion workflows.
5. Class lifecycle: interest → reviewed application → enrolment → student/family account → register → teacher allocation → fee invoice → payment reconciliation. Each transition requires server-side permissions and idempotency.
6. Per-role dashboards for owner, admin, teacher, volunteer, TV operator and finance. Preserve RLS and separate public profile records from login accounts.
7. TV Adhan/Jamaat takeover scheduling and restore, plus phone-silencing reminder; no autoplay audio without a verified hardware/display policy.
8. Full accessibility, security, Supabase migrations, browser E2E, CI and staged release checks before production.

## Release gates
Do not enable public account requests, unreviewed student data flows, automatic payments or destructive form deletion by default. Preserve existing TV and prayer editing behavior until new workflows pass integration tests. Verify `npm run validate` and browser suites in CI. Do not merge to production based solely on focused tests.
