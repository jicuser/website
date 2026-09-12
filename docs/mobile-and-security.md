# Mobile controls and security notes

## Editing the mobile layout

`src/components/shell/UnifiedHeader.jsx` owns the Back, Menu, Donate and theme actions. `src/styles/header.css` owns their layout. Below 768px all four actions stay at the bottom with safe-area spacing. The bottom burger opens a full-page text directory with thin dividers and independent arrows for subpages. A native dialog handles focus trapping and Escape. Back uses in-app history, with Home as the fallback.

The wordmark and script-style Menu button share a row in normal document flow. That Menu button opens a small main-page list, which closes on outside press, Escape, navigation or a switch to desktop width. Both menus use the same route data. Desktop navigation keeps its existing layout.

`src/components/shell/Footer.jsx` counts the rendered social and contact links. Below 768px `src/styles/footer.css` uses that count to give the grey Donate button the same width as the complete icon row. Optional social links can be removed without leaving an oversized button.

`src/components/shell/DailyReminder.jsx` owns quote selection and scrolling behaviour. On phones the reminder spans the content width below the prayer strip, fades out during document scrolling and returns with the next reminder after 700ms of inactivity. Its space remains reserved to avoid jumps. Keyboard focus keeps it visible; reduced-motion preferences remove the fade. Desktop interactions are unchanged. Curated text lives in `src/content/reminders.js`; admin content can add reminders.

## Protections reviewed

- TV actions verify signed-in identity and the active database role on the server. TV operators cannot manage website content or roles. Private tables deny direct browser access through RLS and grants.
- TV room names, modes, URLs, durations and notice lengths are validated. Database operations use Supabase query parameters, not user-built SQL. Notice strings are rendered as React text, not HTML.
- Private camera URLs and signalling require room-scoped pairing. Device credentials and single-use pairing codes are hashed in the database. Revoking a TV removes its signalling access.
- Media links require HTTPS; embedded YouTube video IDs are allowlisted. URLs containing embedded usernames/passwords are rejected. Startup messages use DOM text nodes instead of HTML interpolation.
- The profile bootstrap RPC is executable by authenticated users and the service role only. Its `auth.uid()` filter still restricts the result to the caller's profile.

This is a focused code and permission review, not a penetration test or a guarantee against every attack. Supabase leaked-password protection remains disabled and needs an account-level configuration review. Authenticated execution of the profile security-definer function is intentional and may remain an advisor warning. No credentials belong in source code or public VITE variables except the browser-safe Supabase anon key.

Hosting remains Hostinger; this change does not migrate DNS or configure Cloudflare/Vercel. A CDN/WAF does not replace database permissions or protect a separately exposed Supabase endpoint automatically. Keep dependency and platform updates part of routine maintenance.

Run `npm run validate` for lint, behavioural tests and the production build. Real phone browsers and mosque TVs still need on-site checks, especially camera codecs, network routing, certificates, sound and capture permissions.
