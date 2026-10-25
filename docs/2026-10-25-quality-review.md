# Website and admin quality review — 25 October 2026

Reviewed `jicuser/website` from main commit `a5c219c`. The separate
`tippytaptap/JICapp` repository is the mobile companion, not the website.

## Changes

- Team profiles, header content, app content, permissions, Community Hub and
  WhatsApp editors now report local saves to the admin navigation/sign-out guard.
- WhatsApp editing waits for the saved value, offers retry after a failed read,
  verifies the returned save, and retains newer changes typed during a request.
- Invalid optional Jummah settings cannot discard valid daily/monthly times.
  Failed refreshes clear stale sessions and show an availability message.
  Incomplete sessions cannot shift the second Jummah into the first position.
  Friday headings use the upcoming Friday; unavailable Jummah sessions never
  substitute ordinary Dhuhr in the next-congregation summary.
- The staff password icon follows the active theme. The dark homepage preserves
  an opaque background for increased contrast and reduced transparency.
- TV screen cards use their dedicated workspace layout instead of conflicting
  horizontal-rail overrides, keeping screen-opening controls reachable on phones.
- Compatible build-tool patches update Vite, Sharp, brace-expansion and
  source-map-js. The lockfile also refreshes the compatible selector parser.
- Home uses the existing lazy route-loading boundary. The unchanged startup
  JavaScript budget check falls from 242,942 to 239,074 gzip bytes (limit 240,000).
- Browser checks use the current compact navigation and Appearance dialog.
  The radio fixture keeps its status outside the browser so navigation cannot
  destroy an in-progress route handler.

## Database release

Apply only the new `20261025125656_hall_booking_rpc_writes.sql` migration through
the normal database release process. It prevents direct booking creation/editing
from bypassing the RPC overlap check. Public reads and staff deletion remain
available. No Edge Function deployment is needed for that migration.

The optional certificate SQL preserves operational staff permissions during
activation. It remains staged; this review does not enable certificates or other
workspace features. See [server write boundaries](2026-10-25-server-write-boundaries.md).

## Verification limits and follow-up

Verification record:

- Lint, account TypeScript checks and all 852 Node logic/database tests pass.
- The 287-case integrated Chromium run passed 284 cases. Its three failures
  were the exact Facility selector and two desktop funeral heading-size checks;
  all three pass after correcting those obsolete test expectations.
- Two additional permissions/Community Hub save-guard regressions pass, bringing
  the current default browser inventory to 289 cases.
- The feature-enabled workspace run passed 18 of 19 cases. The remaining upload
  test now opens the Resources tab before uploading and passes with its original
  metadata-failure cleanup assertions retained.
- Release build and the unchanged startup budget check pass using the isolated
  public test settings described below. Native Sharp loading is also verified.

All database and browser regression checks use isolated fixtures. The live domain
returned HTTP 403 from this execution environment. This review does not verify
live staff login, configured RLS, SMTP delivery, real payments or paired TV devices.
No production data, hosting settings or database schema was changed.

Chromium runs locally. WebKit downloaded, but its required system libraries are
missing and this environment cannot authenticate as root to install them. The
existing CI WebKit job must finish before claiming Safari verification.

The full dependency audit retains three moderate development-tool findings in
the Tailwind/PostCSS dependency chain. Resolving the remaining audit report asks
for a Tailwind major upgrade and needs a separate styling migration. The
production-dependency audit reports zero findings after these patch updates.

Hall editors still use the existing last-write-wins edit contract. Add coordinated
RPC/client revision checks before promising protection against an older open
editor overwriting a newer save.

Build verification uses dummy public Supabase settings and
`JIC_PUBLIC_PREVIEWS=off`. A release must build with its real public configuration
and published-content previews enabled.
