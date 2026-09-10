# JIC Website Codebase Map

Use this file as the starting point when opening the repository.

## Main application flow

- `src/main.jsx` — application bootstrap.
- `src/App.jsx` — all URL routes.
- `src/layouts/MainLayout.jsx` — public page shell: header, page content, footer, admin bar.

## Public site shell

- `src/components/shell/UnifiedHeader.jsx` — the only active public header. Contains prayer summary, daily prayer strip, Jummah, radio, logo actions, section tabs, reminder and mobile menu.
- `src/components/shell/Footer.jsx` — public footer.
- `src/components/shell/JamatiaLogo.jsx` — shared JIC logo renderer.
- `src/components/shell/ScrollToTop.jsx` — route scroll behaviour.
- `src/components/shell/AdminBar.jsx` — toolbar shown to signed-in admins on public pages.

## Pages

All route-level pages are in `src/pages/`.

- `HomePage.jsx` — homepage.
- `PrayerTimesPage.jsx` — Today, Monthly and Jummah views.
- `ServicesPage.jsx` — services landing page.
- `HallBookingPage.jsx` — hall booking calendar/availability.
- `ProjectsPage.jsx` — projects landing page.
- `YouthPage.jsx` — youth overview and I'tikaf registration view.
- `MadrassahPage.jsx` — Madrassah landing page.
- `AboutPage.jsx`, `TeamPage.jsx`, `ContactPage.jsx`, `FinancialHistoryPage.jsx`, `PrivacyPage.jsx` — named pages.
- `SectionPage.jsx` — reusable page for smaller routed sections configured in `src/content/sectionRoutes.js`.

## Feature sections

Page-specific components live under `src/components/sections/`:

- `prayer-times/` — prayer timetable UI and prayer data logic.
- `services/` — service page sections.
- `madrassah/` — Madrassah sections and forms.
- `youth/` — youth registration components.
- `contact/` — contact/map/form sections.
- `financials/` — financial chart components.

## Editable content / CMS

- `src/components/ManagedPageContent.jsx` — renders editable page content.
- `src/components/ManagedPageSections.jsx` — renders additional managed sections.
- `src/components/edit/` — inline/public editing helpers.
- `src/pages/admin/` — Admin pages.
- `src/components/admin/` — Admin-specific UI and route protection.
- `src/content/editablePages.js` — pages exposed to editable-content logic.

## Navigation and site content

- `src/content/nav.js` — navigation groups and sub-tabs.
- `src/content/sectionRoutes.js` — routes that use `SectionPage`.
- `src/content/site.js` — address, phone, radio/social/site constants.
- `src/content/images.js` — static image references.
- `src/content/data/` — static datasets such as financial records.

## Data / Supabase

- `src/lib/supabaseClient.*` — Supabase client configuration.
- `src/lib/timetable.*` — timetable/date helpers.
- `src/components/sections/prayer-times/PrayerTimesLogic.*` — prayer timetable loading and current-day logic.
- Direct Supabase queries also exist in feature pages/hooks where the feature owns the data, for example Home, Team and Hall Booking.

## Styling

- `src/styles/app.css` — the single style import manifest. Start here.
- `src/styles/index.css` — Tailwind base variables and global base rules.
- `src/styles/unified-header-v26.css` — active unified header geometry.
- `src/styles/header-page-blend-v27.css` — header/page blending.
- `src/styles/prayer-blocks-v28.css` — daily prayer block layout.
- `src/styles/jic-palette-v29.css` — final global light/dark colour tokens and palette overrides. This is intentionally loaded last.
- `src/styles/README.md` — explains the style layers and cleanup rules.

## Important editing rule

When changing a current feature, edit the active file above rather than creating another `v30`, `v31`, etc. patch file. Existing numbered CSS files are historical layers from development. New work should consolidate into the active feature stylesheet or the global palette rather than adding another override layer.

## Admin save behaviour

Admin fields should behave as drafts. Changing text, selections or media should not write to Supabase until an explicit Save / Update Database / Add / Delete action is pressed.
