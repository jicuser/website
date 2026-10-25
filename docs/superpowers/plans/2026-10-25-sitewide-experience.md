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
- Light, dark and glass disabled: text remains readable and keyboard focus visible.

## Tasks
- [x] 1. Add rendering regressions for heading context and featured/hidden choices; observe RED. Enhance shared components and public CSS owners; observe GREEN.
- [x] 2. Add pupil/adult separation regressions; observe RED. Update education/Madrasah entry points and compact course content, retaining published supplements. Verify routes and responsive layout.
- [x] 3. Add staff-finder and learning-panel regressions; observe RED. Reuse permitted task selectors, existing action guards and learning handlers. Update admin/portal CSS owners. Verify panel draft preservation and roles.
- [ ] 4. Run full Node suite, ESLint, TypeScript and production build. Run browser smoke across public families, staff sections and feature-enabled learning; check affected existing flows. Review diff for unintended backend/display changes.
- [ ] 5. Push tested patch on isolated branch, run repository checks, then merge to main with an expected-head check. Confirm commit and distinguish pushed status from live-host deployment.

## Execution ledger
- Baseline source: 09b22b530da582b29fb35e43142238674d3589a1. Isolated source/dependency snapshot; bootstrap workflow is never part of the intended final tree.
- Baseline full unit suite: 826 passed, 0 failed. Local Node 22; repository CI uses Node 24.
- Ruling: no new setup questions: user explicitly approved the visual direction and delegated site-wide planning/implementation.

- Shared component and Madrasah RED: four regressions failed before implementation; GREEN: four passed.
- Workspace RED: two missing-component assertions failed; GREEN: six targeted rendering tests passed.
- Full modified unit suite: 832 passed, 0 failed. ESLint and TypeScript passed.
- Production build: passed using test-only HTTPS configuration, with public preview network fetching disabled. Initial unset-environment build was correctly rejected by the existing build guard.
- Local Chromium blocks all URL navigation by managed policy (ERR_BLOCKED_BY_ADMINISTRATOR). No browser policy was changed. Full browser checks and visual evidence move to the GitHub runner.
