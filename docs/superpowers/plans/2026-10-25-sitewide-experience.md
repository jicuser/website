# Site-wide Experience Implementation Plan

> Execute inline using the executing-plans workflow.

**Goal:** Extend the approved JIC visual language across public, education, portal and staff interfaces without replacing their data workflows.
**Architecture:** Enhance PageHeading/PageChoices and existing CSS owners. Refine education landing/content, add a permission-filtered staff finder, and group existing learning content into persistent panels.
**Tech Stack:** Existing React/Vite, lucide, CSS tokens, Node tests and Playwright. No dependencies or backend changes.
**Spec:** ../specs/2026-10-25-sitewide-experience.md

## Global constraints
Preserve published content, routes, visibility, booking payloads, permissions, draft/save behaviour, release flags and live TV geometry. Public headings may be serif; forms, data and Arabic reading retain their fonts. Never invent photos, metrics or availability.

## Review focus
- Long labels and 320px screens: no page overflow or clipped controls.
- Hidden pages and restricted accounts: no newly exposed destinations.
- Learning panel switches: retain drafts; course changes clear old form context.
- Missing images/data: honest empty state, not fake content or false success.
- Light, dark and glass disabled: retain shared theme controls and visible keyboard focus.

## Tasks
- [x] 1. Add rendering regressions for heading context and featured/hidden choices; observe RED. Enhance shared components and public CSS owners; observe GREEN.
- [x] 2. Add pupil/adult separation regressions; observe RED. Update education/Madrasah entry points and compact course content, retaining published supplements. Verify routes and responsive layout.
- [x] 3. Add staff-finder and learning-panel regressions; observe RED. Reuse permitted task selectors, existing action guards and learning handlers. Update admin/portal CSS owners. Verify panel draft preservation and roles.
- [x] 4. Run full Node suite, ESLint, TypeScript and production build. Run targeted browser checks across public families, staff sections and feature-enabled learning. Review diff for unintended backend/display changes.
- [x] 5. Push verified code to the isolated branch and prepare main integration. The pull request and merge commit record the subsequent main-branch operation; live-host deployment is a separate check.

## Execution ledger
- Baseline source: 09b22b530da582b29fb35e43142238674d3589a1. Isolated source/dependency snapshot; bootstrap workflows and transport files are absent from the final tree.
- Baseline full unit suite: 826 passed, 0 failed. Local Node 22; repository CI uses Node 24.
- Ruling: no new setup questions: user explicitly approved the visual direction and delegated site-wide planning/implementation.
- Shared component and Madrasah RED: four regressions failed before implementation; GREEN: four passed.
- Workspace RED: two missing-component assertions failed; GREEN: six targeted rendering tests passed.
- Initial local production build without environment variables was correctly rejected by the existing build guard; rerunning with test-only HTTPS configuration passed.
- Local Chromium blocks URL navigation by managed policy. No browser policy was changed. Browser verification was performed on the isolated GitHub runner.
- Runner audit: the first workflow's green status was misleading because shell pipelines masked non-zero Playwright exits. Raw artifacts showed one restricted-staff fixture used the invalid permission forms (correct ID: forms_custom), and four learning tests used exact label locators including select option text. Fixtures and role locators were corrected; explicit bash failure handling and JSON result-count gates were required. No production permission rules were weakened.
- Visual review found that shared glass styling overrode featured gold borders. A component-scoped state selector and computed-colour regression now preserve the highlight.

## Final verification
- Verified source commit: 7e62905959dcd4acbc7d08f567fdffaa21722368.
- Authoritative runner: https://github.com/jicuser/website/actions/runs/40145516182 ; artifact sitewide-final-verification (12580920878).
- ESLint, TypeScript, all 832 Node tests and production build passed. Zero unit failures/skips/cancellations. Build retains the existing large-chunk advisory.
- Parsed public browser JSON: 5 expected passes, 0 unexpected, 0 skipped, 0 flaky. Covers 31 public routes at dark 390px, light 320px and dark 1280px, plus restricted staff tool discovery and owner unsaved-change cancellation/confirmation.
- Parsed learning browser JSON: 4 expected passes, 0 unexpected, 0 skipped, 0 flaky. Covers 320/390/1280px drafts, panel visibility, keyboard navigation, course-context reset and parent-versus-teacher controls.
- Screenshots reviewed for light/dark public education, Madrassah, staff overview, and narrow learning layout. Browser tests use mocked records; no real submissions, payments or production records were written.
- Review confirmed all 9 Learning and 19 AdminPage Supabase call expressions were unchanged. No backend schemas, RLS rules, permission definitions, feature-flag defaults or TV renderer files changed.
- Limits: targeted browser verification is Chromium, not an exhaustive device/Safari or all-admin-screen audit. Existing private-learning release flags remain authoritative. Main-repository integration does not by itself confirm deployment to jicmasjid.org.
