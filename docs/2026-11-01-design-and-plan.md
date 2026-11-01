# JIC November update — design and implementation plan

## Purpose
Keep the existing React/Vite/Supabase site and compact glass design. Improve the public bookmark-app home, donation appeals, and configurable staff/teacher dashboards. Preserve the working TV editor. Import the supplied November timetable and Fundamentals of Arabic class.

## Decisions
- Extend existing components and data services; do not replace the application or introduce a page-builder dependency.
- Dashboard drag-and-drop arranges approved widgets. Keyboard/touch Move earlier/later controls do the same job. Layout never grants access or impersonates another user.
- Keep personal data out of layout previews. Show illustrative labels, never another account's records.
- Use explicit Save, Cancel/Undo and Reset; no automatic publishing. Protect pending changes and reject stale saves.
- Use confirmed payments as fundraising totals. Do not invent past campaigns, targets, money raised, photographs or outcomes.
- Keep layouts compact without shrinking touch targets or hiding essential labels. Respect reduced motion and light/dark modes.
- Publish timetable/class data independently from the reviewed interface branch. Never claim a code push is a production deployment.

## Implementation tasks
1. Transcribe all 30 November dates; validate ordering, weekly congregation changes, Maghrib and Jummah against the supplied image. Preserve existing months. Store the supplied Hijri mapping and Zawal values as source metadata. Do not invent khutbah times.
2. Add the Arabic class through existing programme/page/schedule infrastructure. Preserve its free price, Monday/Tuesday 18:30–20:00 times, 2 November start, one year/two terms, and call window 17:00–18:15. Do not invent term dates or enrolment eligibility.
3. Introduce a tested London-time prayer-state helper. Distinguish current prayer period from next congregation; stop Fajr highlighting at sunrise. No current highlight on a different selected date.
4. Improve the existing homepage prayer card and bookmark-app shortcuts. Keep radio and three-row activities. Add a compact appeals disclosure on Donate; lazy-load its contents.
5. Add a compact current/past appeals component, drawing totals from the existing public campaign RPC. Add photos/outcome metadata editing inside Fundraising; preserve payment permissions and audit rules.
6. Introduce role-based dashboard layouts and a compact designer: select audience, drag/reorder, show/hide, preview, undo, save. Apply only after the user's actual capability checks. Keep feature flags unchanged.
7. Add focused unit/contract tests, SQL access tests, release notes and a short owner editing guide. Run available tests and report separately any full-build/browser checks that cannot run.

## Wider page review plan
| Area | Consistent pattern | Acceptance check |
|---|---|---|
| Home / installed app | Prayer, radio, quick actions, activities, expandable giving | Useful content first; no oversized hero in installed mode |
| Community Hub / worship | Small grouped tiles, sticky section tabs | Back and section labels remain visible |
| Prayer / Ramadan | Month → day → edit → preview → save | Correct timezone, source dates, clean exports |
| Education / teachers | Course → register → learner → progress | Assigned records only; no duplicate forms |
| Nikah / Janazah / hall | Facilities, availability, short guided questions | Essential contact and next action obvious |
| Appeals / projects | Current vs completed, honest totals, photo captions | No placeholder accomplishments published |
| Forms / inbox | List → response → action; unsaved protection | Permission checks and safe text rendering |
| People / access | Audience layout separate from capability grants | Preview cannot grant data access |
| TV | Preserve current editor and screen controls | No global CSS affects canvas geometry |
| Footer / menus / search | Compact shared spacing and named buttons | Keyboard, mobile safe areas, readable text |

## Review focus
Missing timetable rows; sunrise/midnight/DST boundaries; malformed layout JSON; stale or revoked access; simultaneous saves; campaigns without photos/targets; offline refresh; mobile drag alternatives; preserving TV geometry and account-request default-off flags.

## Environment note
Direct git/HTTP downloads initially failed. The exact current source was then exported through a read-only GitHub Actions artifact and inspected locally. No old uploaded ZIP is used as the current source baseline. The first implementation revision passed the complete lint, typecheck, Node test and Vite build stage in CI; browser verification is a separate release gate. Original source photos are retained in the handover bundle and are not yet published media.
