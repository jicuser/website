# Website and staff usability review

This pass retains JIC’s latest navigation: a bare Home icon, a read-only prayer pill, header Menu, and unboxed account/appearance shortcuts below the menu links.

## Changes

- Narrow phones retain the two-column service shortcuts while smaller icon spacing leaves room for complete service names.
- Staff task cards use less nested padding on phones, giving descriptions more room and reducing scrolling.
- Light-mode staff headings use the shared readable gold rather than a low-contrast local colour.
- Error messages use a dedicated theme token. Dark-mode text is lighter while indicator and destructive-action fill colours remain unchanged.
- Public and staff shells have keyboard-only skip links to their main content.

## Evidence

Before changes, an axe-core WCAG 2 A/AA and 2.1 AA scan identified insufficient contrast in dark-mode Salah alert errors (4.29:1) and the light-mode Staff home eyebrow (3.49:1). Both are corrected.

The follow-up scan covered seven public routes and four authenticated staff areas in both themes at 320px: 22 route/theme combinations, with no reported violations or horizontal page overflow. Public routes: home, services, giving, contact, portal, staff login and Salah alerts. Staff areas: home, forms, safeguarding and notices. API responses were mocked; these checks do not certify live CMS content or third-party services.

Focused browser checks cover keyboard skip navigation, service-title wrapping, shared page spacing/materials, staff navigation at 320/390/1280px, account-menu changes, safeguarding guidance and unsaved-change protection. Lint, TypeScript and production build/startup-size checks are also run before publication.

## Review tooling

AI DevKit’s review checklist informed the review. Its own lint command reports five missing `docs/ai` scaffold files: this repository uses its existing documentation structure and has not been initialised as an AI DevKit lifecycle project. The verification sub-skill became unavailable during the session, so verification used the repository commands and browser evidence above. No claim is made that AI DevKit lint passed.

Ansight has no resident host/CLI or native app target here. This React/Vite website was inspected with Chromium and axe-core. No macOS app or Canva artwork was needed for these interface corrections. Hosted deployment remains separately unverified because automated requests to the live domain return HTTP 403.
