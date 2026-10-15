# Homepage and sign-in repair — 15 October 2026

Measured from the same production build command and configuration before and after this change. These are transfer-size measurements, not real-device load-time claims.

| Measure                                    |          Before |         After |
| ------------------------------------------ | --------------: | ------------: |
| Bootstrap JavaScript, uncompressed         |   821,351 bytes | 716,546 bytes |
| Bootstrap JavaScript, gzip                 |   268,340 bytes | 233,387 bytes |
| Local hero and five poster display images  | 3,696,232 bytes | 585,478 bytes |
| Extra homepage `home_tiles` query          |               1 |             0 |
| YouTube iframe before visitor chooses Play |     1 when live |             0 |

- Animation code for the scroll button and a route wrapper pulled Framer Motion into the initial graph. The scroll button now uses native browser behaviour, including reduced motion. Other pages keep their animations and load the library on demand.
- The 404 page is lazy-loaded. This keeps its animation dependency off the homepage.
- `useHomeTiles` reads the existing shared content response. It still updates when that content changes.
- Display images use WebP. Original poster URLs remain in the viewer and download links. CMS-hosted custom images are unaffected.
- The large account panel is replaced by two compact links. Madrassah remains in the main destination grid.
- Public Auth settings confirmed `external.google=false`. Provider discovery never blocks email login, and the OAuth handler rechecks before leaving the website.

## Repeat the measurements

Run `npm run build -- --manifest`, then `npm run check:startup`. The release workflow checks a 240,000-byte gzip startup budget. Run `npm run build:images` when replacing the bundled source photographs or posters.

Chromium could not start in this workspace because socket creation is restricted. Browser tests cover the login availability cases, but need execution in CI or a normal browser environment. Real iPhone LCP, interaction latency and scrolling remain unmeasured.
