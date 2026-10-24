# Service, home and display refinement

- Service questions open on the same page; useful details are collapsed below. Hall dates carry into inline questions. Published schemas, private inboxes, conditional visibility, review and receipts remain in use.
- Home has a compact linked prayer card, published next-day Fajr, three activity rows with sideways navigation, and short community links. The duplicated discovery section and extra homepage related-content rails are removed.
- Salawat appears once per browser session on the home page, closes after 5.5 seconds, and supports outside tap, Escape and the close button. It takes no footer space. Portal access stays in the menu but is removed from the footer.
- After-salah TV text comes from `src/content/tvReminders.js`. Landscape/portrait PNGs are generated with the bundled Noto Naskh Arabic font and retain accessible source text. Run `node scripts/build-tv-dhikr.mjs` with Pillow and RAQM installed to regenerate; never edit religious wording in an image model.
- Livestreams and notices have saved home-page positions and optional website notifications, with drag previews and accessible select controls. These controls do not send phone push notifications.

## Security deployment

Migration `20261024195918_notice_placement_and_public_grants.sql` adds constrained display settings and revokes unnecessary anonymous mutation privileges and profile/audit reads. Existing row policies and service-role-only submission RPCs remain in place.

Shared public-endpoint protection checks request origin, honeypots, supplied timing, and (when configured) verifies CAPTCHA tokens server-side, including hostname and action. Parameterized calls, payload limits, upload signature checks, private attachment access, verified account identity and database rate limits remain enforced. Timing and honeypots are spam deterrents, not proof that someone is human.

To activate Cloudflare Turnstile, configure a widget for `jicmasjid.org` and `www.jicmasjid.org`; set `VITE_TURNSTILE_SITE_KEY` in the website build and `TURNSTILE_SITE_KEY` plus `TURNSTILE_SECRET_KEY` in Supabase Edge Function secrets. Never put the secret in a VITE variable or public content. Deploy the website key before enabling the server secret. Secret-only configuration fails closed. Custom domains require explicit `FORM_ALLOWED_ORIGINS`. Supabase Auth CAPTCHA for sign-in/sign-up is a separate dashboard setting.

## Validation

Production build, ESLint and TypeScript checks; unit and PGlite tests; mocked Edge Function checks covering forged identity, unrelated attachments, oversized bodies and invalid upload signatures; server-render checks of changed components; visual inspection of both Arabic images. Live anonymous/unrelated-account checks confirm private data remains inaccessible. Browser automation could not start because this workspace prohibits Chromium's local socket; browser tests are retained for CI and are not claimed as locally passed.
