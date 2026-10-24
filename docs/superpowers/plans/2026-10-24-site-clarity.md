# Website and staff clarity implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the public and admin crawl findings through consistent, compact journeys using JIC's brand and Labbaik's useful interaction patterns.

**Architecture:** Reuse the existing form renderer, CMS navigation and publication model. Give long staff tools focused views and simplify public composition in the owning components and styles, keeping new behavior within route-local bundles wherever possible.

**Tech Stack:** React 18, React Router 7, Vite 6, existing shared CSS and local Playwright fixtures.

**Spec:** `docs/superpowers/specs/2026-10-24-site-clarity.md`

## Global constraints

- Do not change production records, permissions, authentication, database schema or payment configuration for this UI work.
- Preserve CMS content keys, page visibility, custom menu labels/order, form versions and backend routing.
- Do not invent people, schedules, prices, project progress, payment support or active portal features.
- Keep JIC's script branding, navy/gold/ivory tokens and published prayer/radio behavior.
- Keep Ramadan meal sponsorship, Daily Giving and prayer timetable distinct, and preserve timetable coming-soon copy.
- Support 320px and 390px phones, desktop, both themes, increased contrast and reduced motion/transparency.
- Keep keyboard/focus behavior and minimum 44px controls; do not rely on colour alone for status.
- Add no dependencies and keep startup gzip at or below 240000 bytes.
- Edit the owning components/styles, avoiding stacked override patches and unrelated refactors.
- Use focused behavioral checks; avoid a prolonged screenshot suite. No production form submissions or real record mutations during validation.

## Review focus

- A service form can be edited/closed by staff: inline and standalone routes must both use the managed published form and honor its closed/error state (Task 1).
- About menu children can be renamed, reordered, moved or hidden, with added pages: keep section order consistent and additional page links correct (Task 1).
- Staff can switch prayer tasks with unsaved data: retain input, register the same pending save and preserve import/weekly/day writes (Task 2).
- Search/filter and collapsed visibility groups: matching toggles must be discoverable and keep existing visibility behavior (Task 2).
- Mobile dock, page picker and passive reminders: no hidden focused control, duplicate announcements, viewport overflow or preference regression (Task 3).

### Task 1: Consistent public service and content journeys

**Files:** `src/components/services/ServiceJourney.jsx`, `src/content/serviceJourneys.js`, `src/lib/serviceEnquiries.js`, `src/pages/SectionPage.jsx`, `src/pages/AboutPage.jsx`, `src/features/projects/ProjectTimeline.jsx`, plus a small relevant content helper if needed. Existing tests under `tests/browser/` and `tests/` for these paths.

**Interfaces:** Consume existing `BuiltInForm({slug,subject,title})`, `serviceEnquiryForPath(path)`, `visibleNavigation(...)`, `navigationName(...)` and project statuses. Produce shared inline/direct service form identity and ordered About sections; no new backend interfaces.

- [x] Use dedicated published Nikah, funeral and community forms in their guides instead of the generic Contact Us renderer. Leave volunteer/general enquiries on Contact Us unless a published dedicated schema already exists. Simplify duplicated enquiry explanation while keeping urgent funeral contact and confirmation limitations clear.
- [x] Give thin SectionPage routes useful concise contextual descriptions/actions pointing to existing relevant destinations, especially youth and Madrassah contact/policies/portal. Preserve their CMS title/body and content keys; avoid indiscriminate redirects or fabricated information.
- [x] Order About body sections from configured visible About children, then preserve any visible built-in section moved elsewhere as appropriate. Keep custom added-page links as links, preserve previews and legacy anchors. Replace a founder-members invitation that implies populated profiles with accurate neutral wording if no profiles are known.
- [x] Display neutral unpublished-progress copy when all project statuses are `update_pending`; show counts only for explicitly published statuses with an accurate denominator. Keep every project area selectable.
- [x] Add focused behavior coverage for service slug/schema equivalence and closed managed forms, configured About order/hidden/extra sections, and unpublished project status. Run relevant existing tests, lint the changed source, and commit this task. Do not run the full suite/build; the controller runs release checks once.

### Task 2: Focused admin workspaces and readable booking days

**Files:** `src/components/admin/PrayerEditor.jsx`, `src/features/content/SiteVisibility.jsx`, `src/features/content/ContentPages.jsx`, `src/components/admin/PageEditor.jsx`, `src/features/admin/AdminOverview.jsx`, `src/features/operations/Safeguarding.jsx`, current TV screen chooser in `src/features/tv` or `src/components/admin`, `src/components/calendar/MonthCalendar.jsx`, owning styles `admin.css`, `admin-overview.css`, `tv-admin.css`, `booking-calendars.css`, `operations.css`, plus targeted browser tests.

**Interfaces:** Keep prayer form state/save callbacks, visibility saves, auth filtering, real TV scene previews and MonthCalendar props unchanged. Existing `useRegisterAdminSave` must continue to report pending state across views. No RPC contract changes.

- [x] Make staff home's needs-attention summary compact with an obvious count/action while retaining unavailable/error totals and permission filtering; avoid redundant account links already in Account. Preserve the separate small tool tiles and task search.
- [x] Simplify page editing hierarchy: keep one clear page title and one website-open action within the embedded workspace. Retain the existing mobile Edit page/Live preview tabs and real desktop preview, draft behavior and publish confirmation. Move secondary catalogue settings after the page finder rather than placing multiple long panels before the primary task.
- [x] Render page visibility groups as compact expandable summaries with page counts/on-off counts. Searching or selecting On/Off reveals matching rows immediately. Keep original toggles, always-on restrictions, feedback and added pages. Use native disclosures or accessible buttons.
- [x] Recompose PrayerEditor into accessible Daily times (default), Jummah and CSV import views. Daily start/Jama'ah are paired by prayer, sunrise separate. Show concise current weekly Jummah summary and stored date coverage. Retain all fields, overrides, CSV preview/validation, save and unsaved-change behavior. Keep loading/error fields disabled as currently appropriate.
- [x] Make safeguarding New/Edit deliberate actions, display the review queue first, protect dirty input when cancelling, and restore focus after close. Keep existing privacy explanation and backend workflow.
- [x] Make the TV first screen chooser more compact using real preview thumbnails, clear screen name/status and one edit action. Retain Fixed/Rotation description, separate Live presentation entry, real editor, device settings and permissions. Do not add another TV settings layer.
- [x] Give calendar day statuses an explicit short display label if needed while retaining full accessible labels, colour and selected state. Prevent broken words at 320/390px in both Hall and Ramadan; no page-level horizontal overflow. Keep sponsorship/print/private detail logic unchanged.
- [x] Add meaningful checks for prayer task persistence and correct saves, search/filter reveal and visibility persistence, safeguarding cancel, and readable calendar labels. Reuse local fixture patterns, run relevant existing browser checks and lint changed source, then commit. No full suite/build yet.

### Task 3: Calm public surfaces, compact navigation and non-blocking reminders

**Files:** `src/components/shell/UnifiedHeader.jsx`, `src/styles/subnav.css`, `src/layouts/MainLayout.jsx`, `src/components/shell/SpiritualOverlays.jsx`, relevant spiritual style owner, `src/styles/home.css`, homepage component, `src/components/PageChoices.jsx`, `src/styles/public-sections.css`, service finder styles in `src/styles/services.css`, existing dock hook/policy if needed, plus focused browser tests.

**Interfaces:** Keep header menu paths/configuration, the prayer dock hide/reveal dataset, published prayer source, radio status, DailyReminder, CMS navigation and footer intact. Use one explicit route policy for booking/form dock treatment if needed; no additional scrolling listeners or broad CSS material overrides.

- [x] Use a single compact section picker on mobile when section links exist, including parent context so redundant breadcrumb can be omitted in that state. Keep standalone breadcrumbs, desktop section links, current page, direct programme links and menu configuration accessible.
- [x] Make hub PageChoices and full service-directory choices compact, legible rows or proportionate cards with clear icon/title/description/action, theme tokens and visible focus. Preserve search/category filtering and published page visibility.
- [x] Keep the home photo as the introduction, then use calm theme-aware section surfaces below it. Avoid a fixed photograph behind the full length of content. Preserve equal compact home tiles and existing What's on, service, prayer, Ramadan and CMS sections; no invented visuals or programme details.
- [x] Keep the prayer dock's distinctive appearance and scroll controls, but avoid obscuring calendar/form task controls through explicit task-aware placement/suppression. Preserve safe-area space, top-of-page return, focus visibility and existing daily reminder scroll state.
- [x] Replace first-visit full-page blur and random spotlight interruption with a compact passive, dismissible salawat/reminder treatment, retaining the authentic multilingual content, session behavior, reduced-motion/transparency preferences and no focus theft. The page should be usable immediately on a first visit.
- [x] Add focused first-visit usability, mobile navigation, dock task/focus and preference checks. Run appropriate existing header/scroll/public tests and lint changed source; commit. Controller then runs release lint/type/unit/build/startup checks once, fixes justified failures, and publishes the reviewed branch.

## Release verification

Source lint, types, all 761 unit checks, focused browser workflows and production build pass on `38314b4`. Startup JavaScript is 239536 gzip bytes within the unchanged 240000-byte limit. All three task reviews and focused fixes are clean. Public crawling was live and read-only; staff workflows used isolated local data, with no production record mutations. Native iPhone Smart Invert has not been verified.
