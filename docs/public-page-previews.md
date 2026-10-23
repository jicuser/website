# Google and social previews

Production `npm run build` reads the existing anonymous published-content APIs
using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Hostinger must supply the
same public settings already used by the browser application. No service-role,
secret key or signed-in session is used. `JIC_PUBLIC_PREVIEWS` defaults to `on`.

The build emits the normal application HTML, with route-specific title,
description, canonical, Open Graph and Twitter metadata, for:

- Published, open forms at `/forms/:slug`. `list_public_forms` supplies the
  immutable published-version title and introduction, rather than editable drafts.
- Published pages and programmes at `/pages/:slug`. `list_site_pages` discovers
  them; `get_site_page` supplies the published schedule, body and poster image.
  A page withdrawn between these reads is omitted.
- Approved public campaigns at `/fundraise/:slug`.
  `public_community_campaigns` includes published and closed campaigns; pending
  and rejected campaigns are omitted.

The existing shared `pageMetadata` helper supplies the same canonical origin
(`https://www.jicmasjid.org`), description truncation and HTTPS image validation
as the browser. Relative poster images become absolute public addresses. Forms
and campaigns use the centre photograph. Query strings and fragments, including
programme context on a form link, are omitted from the canonical address.

`dist/page-metadata.json` records `schemaVersion: 1`, the source (`public-api` or
`disabled`) and an array of normalized dynamic public metadata. Each entry has
only `path`, `title`, `description`, `url`, `image`, `imageAlt` and `noindex`.
It contains no form schema, answers, staff assignments, record ownership, review
notes or API settings. These dynamic routes also appear in `dist/sitemap.xml`.

Deploy the entire newly generated `dist/`, including `.htaccess`, replacing the
previous build output so that removed route files do not remain on the host.
Hostinger's rewrite rules serve each generated route document, then use
`metadata-fallback/index.html` for unlisted, withdrawn or private routes. That
fallback starts the application with `noindex, nofollow` and no invented
canonical address. The root route still serves `index.html`.

## Publishing and rebuilding

The browser reads current published content when visitors open the page. Raw HTML
previews and the sitemap are snapshots of the last successful website build.
After publishing, changing, withdrawing or closing a form/programme/campaign,
run a new Hostinger build/deploy to update those snapshots. A database edit alone
does not trigger a Git-based Hostinger build. Existing Google results and social
cards may also need recrawling by their providers.

An API failure, timeout, invalid response or unsafe route stops the production
build. Requests time out after ten seconds and page details are fetched in batches
of six. The build does not replace unavailable data with generic indexable
previews or reuse an old metadata cache. Errors name the public RPC and status,
without printing API bodies or configuration values.

The current public RPCs cap form/page catalogues at 200 and campaigns at 100.
Reaching a cap logs a warning; routes beyond it cannot be discovered through
those APIs. Add a reviewed paginated public metadata API before exceeding these
catalogue sizes. No extra database migration is required for the current API.

For offline validation with dummy Supabase settings only, set
`JIC_PUBLIC_PREVIEWS=off`. The build warns and records `source: "disabled"` with
an empty dynamic manifest; fixed public pages and their metadata still build.
The validation workflow sets this explicitly. Leave it on for release and
Hostinger builds.

## Checking a release

Run `node --test tests/public-page-previews.test.mjs` for API-contract, generated
HTML, sitemap, manifest, unpublished-content and failure-path checks. Run the
normal production build with real public Supabase settings to verify API access.
After deployment, fetch the raw HTML of one published form, programme and
campaign and confirm its title, clean canonical and HTTPS image. Check that an
unknown route starts with `noindex`. `vite preview` does not execute Hostinger's
Apache rewrite rules, so the fallback also needs a deployed-host check.
