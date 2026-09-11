# Jamatia Islamic Centre website

React/Vite website for JIC. See [the brand and mobile handover](BRAND-AND-MOBILE-HANDOVER.md) for completed checks and remaining verification.

## Included in this build
- Responsive dark/light design with optional glass or solid surfaces
- Persistent top information bar with address, both Jummah times, and JIC Radio play/pause
- Official JIC radio stream fallback: `https://jicmosque.radioca.st/stream`
- Refined SVG identity with seven light/dark variants; persistent Home and Menu actions
- Persistent Salah strip with full timetable link
- Existing Supabase prayer-time, CMS, admin and page foundation preserved
- Mobile-first navigation with no duplicate Jummah or directions tiles in the header flow
- Programme poster previews, native sideways content rails and a phone-friendly timetable save flow

## Local development
```bash
npm install
npm run dev
```

## Production build
```bash
npm run build
```

Hostinger should deploy the generated `dist/` directory for a static Vite deployment, or use its Git deployment workflow if already configured.

## Checks and logo assets

```bash
npm run check
node --test tests/*.test.mjs
node scripts/build-brand.mjs
```

[Logo variants and colour guidance](public/brand/README.md) · [Seven-variant contact sheet](public/brand/jic-variations.svg)

## Environment
Copy `.env.example` to `.env`. `VITE_RADIO_STREAM_URL` is optional because the official JIC stream is included as a fallback in `src/content/site.js`.
