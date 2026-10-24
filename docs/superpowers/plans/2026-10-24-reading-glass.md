# Reading and Glass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Apply remaining inventory findings while restoring JIC's full public background and glass style.
**Architecture:** Existing public layout owns one photo layer; liquid-glass.css owns shared materials. Independent feature owners retain CMS identity, reader content and admin contracts.
**Tech Stack:** React, existing CSS tokens, Lucide icons, Playwright and Node tests.
**Spec:** docs/superpowers/specs/2026-10-24-reading-glass-design.md

## Global Constraints

No dependencies, fabricated published facts, religious-text edits, production submissions or backend changes. Preserve 240000-byte startup budget, real CMS labels/visibility and accessible solid/high-contrast modes.

## Review Focus

- Background must cover long pages without becoming a scrolling image or obscuring body copy.
- Glass off/high contrast must stay opaque, including the restored rows.
- Menu defaults must not overwrite staff-renamed destinations or break About anchors.
- Arabic direction, transliteration/translation controls and source links must survive reader changes.
- Staff catalogue actions must preserve published versions and unpublished drafts.

### Task 1: Full public background and shared material

Files: MainLayout.jsx, HomePage.jsx, home.css, public-sections.css, services.css, styles/README.md; home-header.spec.mjs and public-surfaces.spec.mjs.

- [x] Move PublicBackdrop from hero into PublicLayout and anchor it to the viewport. Keep home content transparent and restore shared material variables on compact public rows.
- [x] Verify photo remains visible after scrolling and on inner routes; verify glass and solid/high-contrast behavior, focus, safe areas and no overflow at narrow widths.

### Task 2: Navigation/About and reading resources

Files: nav.js, publicNavigation.js, About components/styles, WorshipPage and worship readers/styles; owning browser/unit checks.

- [x] Apply meaningful hub labels, remove redundant About self-link and add useful original visual navigation.
- [x] Improve real reading choices, previews and reader navigation without changing source texts.
- [x] Check custom labels/hidden pages, About anchors, reader controls and phone overflow.

### Task 3: Admin inventory reconciliation and forms

Files: forms catalogue source, dedicated custom-forms.css and focused checks; external admin-coverage.md.

- [x] Record disposition of every enabled admin area. Improve direct response access and saved-draft cues only if backed by actual metadata.
- [x] Verify draft/published distinctions and routing using isolated local fixtures.

### Task 4: Integrate and publish

- [x] Inspect combined diff, run lint/types/units, relevant browser journeys and one production build/startup check.
- [ ] Publish an exact reviewed head and confirm fresh live pages. Keep native iPhone and authenticated-production limitations explicit.
