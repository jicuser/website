# Visitor fixes — 11 September 2026

Base: main, 01a3e72. This change is intended for jicuser/website main.

## Implemented
- Added the exact supplied aerial sunset photograph as public/jic-aerial-sunset.jpg. The homepage uses this approved local photo directly, independent of stale stored hero-image overrides. Existing hero title/body editing remains. Future homepage photo changes currently require updating this source asset/registry; other page image editing is unchanged.
- Replaced the hero CSS background with a full-cover image layer. Removed legacy gradient-only declarations that erased the photo. The image registry's missing default asset was also corrected for other pages.
- Added stronger glass surfaces, blur (including Safari prefix), visible dividers, theme-aware live card and scroll arrow, contrasting active tabs and solid-mode fallbacks. Video iframe contents retain the player's own styling.
- Added shared related-content cards after page content on existing main sections and descendants. Community lives at /services/community; Trips & Events at /youth/trips-events. There are no standalone /community or /events pages in the current router; no broken links or duplicate replacement pages were introduced.
- Completed building-works labels in footer, subpage breadcrumbs, support copy and admin tile defaults. Old saved home tile title "Projects" is normalised for display. Existing /projects URLs remain valid; Youth Projects is preserved.

## Checks completed
- npm run check: passed.
- npm run build: passed (existing large bundle warning remains).
- node --test tests/content-validation.test.mjs: 3 passed (image validation and timetable parsing).
- git diff --check: passed.
- Supplied photograph visually inspected and copied without alteration.

## Earlier requirements: source audit, not live sign-off
- Current navigation already uses shared UnifiedHeader, active subtab calculation and body scroll locking for the menu. Menu stability and mobile spacing require real browser verification.
- Reminder/Islamic date is rendered after the section tabs; reminder changes on click. Header retains both Jummah entries and hides duplicate daily prayer cells on prayer pages.
- Radio controls are labelled Radio with play/pause/loading/error logic. Playback itself is not verified.
- Visit the Centre targets /contact#map; ScrollToTop includes hash handling.
- One Download phone wallpaper action uses monthly timetable data and produces JPEG. Actual downloading/layout remains unverified.
- Current logo is /jic-logo-horizontal.svg. Header/footer placement exists; the earlier persistent lower-left logo behaviour is NOT implemented by this patch and still needs reconciling with the latest approved logo design.
- Existing admin route protection and content/image editing remain except homepage photo selection noted above. No authenticated editing/upload test, staff invitation, Edge Function, I'tikaf submission, or live Supabase data verification was performed.

## Remaining verification
The remote browser rejected the local preview URL with ERR_BLOCKED_BY_CLIENT. No before/after browser screenshots or visual sign-off are claimed. Local UI preview had placeholder configuration only, not production Supabase credentials; build output is not deployed from this workspace.

On the deployed site, check 375/390/430px, tablet and desktop, both themes and glass modes; photo loading/crop, button text, menu open/close and scroll, current-tab contrast, light live card and scroll arrow. Check iPhone Safari explicitly. Verify related destinations and real timetable/radio/admin behaviour. Preserve Hostinger's existing build-time environment variables. Confirm deployment separately from Git push.
