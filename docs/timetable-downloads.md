# December 2026 timetable share pages

The public download pages are static HTML. The page title, description, canonical URL and Open Graph image tags are present in the initial response so a messaging preview does not depend on running the React app.

- `/downloads/december-2026/` — timetable preview, image and two-page PDF.
- `/downloads/december-2026/phone-wallpaper/` — phone wallpaper preview and image download.

The pages use the existing JIC branding. Copy link and native sharing run only after a visitor presses their buttons. File downloads and image previews also work without JavaScript.

## Deployment status — 25 November 2026

The public sharing pages are live on the separate download host:

- Timetable, images and PDF: https://jic-december-2026-downloads.haider194ali.chatgpt.site/downloads/december-2026/
- Phone wallpaper: https://jic-december-2026-downloads.haider194ali.chatgpt.site/downloads/december-2026/phone-wallpaper/

These links can be shared now. They link back to the main JIC monthly timetable at https://jicmasjid.org/prayer-times/monthly.

**Deployment of this branch's frontend changes to the main JIC hosting remains pending.** The generated `www.jicmasjid.org/downloads/…` URLs are prepared source, not confirmed live download routes. Do not replace the public sharing links with those URLs until the complete JIC release is deployed and checked.

The accompanying managed-gallery change preserves complete portrait images and their corners, and adds full-size image links. Keep the existing hidden December `page_sections` record unpublished until that gallery renderer reaches the JIC website. The current live section model has no supported external download-link field.

## Regenerate for the JIC website

```sh
node scripts/build-timetable-share-pages.mjs
```

This writes the two HTML files under `public/downloads/december-2026/`. Vite copies them into `dist` unchanged. The existing Apache directory-index rewrite serves them before the app fallback. No React route or database change is needed for these standalone pages.

The generated pages default to the website's existing canonical origin, `https://www.jicmasjid.org`.

## Prepare a separate static deployment

```sh
node scripts/build-timetable-share-pages.mjs --origin https://PUBLIC-HOST --output /absolute/path/to/static-output
```

Replace the origin with the real public HTTPS origin before publishing. The command copies the logo, favicon, stylesheet, sharing script and five approved download assets, generates the canonical download pages, and adds a useful root page and permissive robots file. It does not publish anything. The output can be served by an ordinary static host without installing application dependencies or connecting to Supabase.

## Download assets

Keep these five files together in `public/downloads/december-2026/`:

| Filename | Content |
| --- | --- |
| `timetable.pdf` | Approved two-page December 2026 PDF |
| `timetable.png` | Full, uncropped timetable image |
| `phone-wallpaper.png` | Full phone wallpaper image |
| `share-timetable.jpg` | 1200 × 630 timetable link-preview image |
| `share-wallpaper.jpg` | 1200 × 630 wallpaper link-preview image |

Publish the HTML and all assets together. Before sharing the public links, check that both HTML routes return `text/html`, the preview images return `image/jpeg`, and the files are accessible without signing in. Messaging services control whether and when their cached previews appear.

These standalone pages publish the approved December files. Their content stays fixed until the assets are regenerated and redeployed.

## Shared editor template

The accompanying main-site update uses one A4 layout for the monthly editor, printable image and phone wallpaper. The mosque header and footer stay fixed. Staff edit prayer times in **Check times**, then edit Hijri dates and notices in **Design & download**, and use **Save month** to publish the settings.

Migration `20261125213002_prayer_timetable_months.sql` was applied to the connected JIC database on 25 November 2026. It adds the saved monthly presentation and seeds the approved December design. It does not change the existing prayer-time records. Only staff with the existing `prayer_times` permission can save; stale revisions are rejected, and direct client table writes are disabled.

The exact approved PDF and PNG assets are offered only while the month design, prayer values and Friday sessions still match. Editing those values switches public/editor exports to a fresh render, including a browser **Print / PDF** action. Static share pages remain the approved December edition and must be regenerated if a revised edition is to be shared.

The frontend containing these editor controls and the download buttons still needs deployment to JIC hosting. After deployment, check the monthly timetable, select December, preview both image formats, and confirm that the PDF and share-page buttons open the files in this release.
