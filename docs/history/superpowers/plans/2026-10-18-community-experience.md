# JIC community experience implementation plan

> Implement in the current session; independent catalogue, account-contract and copy tasks may use parallel agents. Review the combined branch once at completion.

**Goal:** Deliver a polished, useful JIC public website and a more reliable modular Supabase account boundary.
**Architecture:** Preserve the existing host, backend and routes. Introduce shared service data and focused UI modules; centralise account URL configuration and add incremental type checks.
**Tech Stack:** React, Vite, Supabase, TypeScript for new contracts, existing Node/Playwright tests.
**Spec:** `docs/superpowers/specs/2026-10-18-community-experience-design.md`.

## Global constraints

- Target `jicuser/website`; no `jicpreprod` changes.
- Preserve CMS content overrides, visibility controls and existing private-record permissions.
- No fabricated integrations, activity, payments, dates or availability claims.
- No production deployment, schema mutation, provider secret or real email sends.
- Work on `feature/jic-community-experience`; retain Hostinger static compatibility.

## Review focus

- A hidden service cannot reappear through search or homepage discovery.
- Empty/offline/CMS-error data must not look like live success.
- Unknown account origins and external return destinations must be rejected.
- Phone widths, large text, dark mode and reduced motion remain usable.
- Public claims match real JIC journeys and distinguish enquiries from confirmed bookings.

## Tasks

1. **Service discovery module.** Create `src/features/services/catalog.js`, `ServiceExplorer.jsx` and owned styles; integrate ServicesPage. Export default `ServiceExplorer({ compact = false })` for the homepage. Pure catalogue filtering must be testable without React. Test search, category, hidden destinations and empty results before implementation.
2. **Account contracts.** Add validated public origin configuration and use it for Google, email-link and recovery returns; preserve local destination filtering. Introduce TypeScript and generated database types at this boundary with a CI type-check. Test development/production origins, malformed and secret settings, disabled providers and return destinations.
3. **Public copy audit.** Review public pages/content and portal explanatory text; make targeted corrections in existing owning files, preserving CMS keys and factual/religious content. Record page coverage and remaining hosted-content work in `docs/content-audit.md`.
4. **Shared design and homepage.** Build focused feature sections, warm palette, restrained serif hierarchy, service discovery and a portal explanation using actual JIC assets/destinations. Keep existing time/event/poster/live logic; align shared public typography, portal entry and footer. Document style ownership.
5. **Verification and delivery.** Run lint, type checks, unit tests and production build with non-production settings; exercise services, homepage and portal in Chromium mobile/desktop and dark mode. Review combined diff and fix important findings. Publish the verified changes directly to the production repository main branch, as authorised, then check deployment status.

## Progress ledger

- User approved the technical proposal and implementation, then supplied further reference screenshots. Proceeding without another approval cycle.
- Native implementation with independent modules delegated under the parallel-agents skill; final combined review is required.

- Completed modular service discovery, homepage learning/account/FAQ sections, public copy audit, staff navigation/activity improvements and typed account contracts.
- Review findings fixed: hidden FAQ destinations, missing public certificate guidance, compact finder geometry.
- Restored homepage account entry and kept light/dark appearance preferences.
- The service directory loads as a separate module so the initial page stays within the existing startup budget.
