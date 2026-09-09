# Jamatia Islamic Centre website

Production-ready React/Vite website for JIC.

## Included in this build
- Responsive dark/light design with optional glass or solid surfaces
- Persistent top information bar with address, both Jummah times, and JIC Radio play/pause
- Official JIC radio stream fallback: `https://jicmosque.radioca.st/stream`
- Compact logo / donate / menu row
- Persistent Salah strip with full timetable link
- Existing Supabase prayer-time, CMS, admin and page foundation preserved
- Mobile-first navigation with no duplicate Jummah or directions tiles in the header flow

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

## Environment
Copy `.env.example` to `.env`. `VITE_RADIO_STREAM_URL` is optional because the official JIC stream is included as a fallback in `src/content/site.js`.
