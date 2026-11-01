# JIC compact experience — quick guide

## Status
November's 30 prayer dates and Arabic course details were saved to the connected JIC database on 1 November 2026 and read back. The UI is a review-branch change. The SQL in `supabase/staged/compact-experience.sql` is NOT automatically applied. Do not describe the UI as live until validation, migration review and the normal Hostinger release are complete.

## What to click after release
**Staff home → Arrange dashboards:** choose Staff dashboard or Member portal, select an audience, drag tiles or use the up/down buttons, tick shortcuts to show, preview phone/desktop, then Save layout. Undo restores saved settings; Reset creates a standard-layout draft until saved. All tools always restores the complete authorised tool list.

This is a role-template preview, NOT account impersonation. Actual permissions still decide which tools appear. People & access remains the place to grant access. The editor enables no feature flags. Per-person overrides and viewing real private student records as someone else are not implemented.

**Fundraising:** choose Current appeals, Past appeals or Awaiting review. Select an appeal, add its photo, description, verified outcome and completion date, then Save appeal display. Publishing and closing still use the existing approval function. Upload requires existing Media permission; other fundraising staff can select an existing secure image URL. Targets and received payments remain in existing campaign creation/Finance workflows, not the presentation editor.

**Donate:** open the arrow beside Current appeals & past achievements. Current and past views use published data and confirmed ledger totals. No sample achievements or amounts have been invented.

**Home:** dates are collapsed until needed. Current highlighting follows prayer starts, ends Fajr at sunrise, uses Europe/London, and never calls a different selected day current. Friday next-congregation information uses Jummah instead of weekday Dhuhr. Installed-app shortcuts put Community Hub, Classes and Donate beside prayer times. The existing radio player and TV editor remain unchanged.

## File map
- `src/lib/prayerStatus.js`: prayer periods, London date, printed Hijri metadata.
- `src/hooks/useLondonClock.js`: minute clock; no extra network requests.
- `src/components/home/HomePrayerCard.jsx` and `src/styles/compact-home.css`: compact home.
- `src/features/dashboard/`: dashboard templates, editor and presentation-only filtering.
- `src/features/admin/AdminOverview.jsx`: staff home integration.
- `src/features/portal/PortalAccountHome.jsx`, `PortalHome.jsx`: member/learning integration.
- `src/features/appeals/`: current/past display, photos and outcomes.
- `src/features/operations/DonationsCore.jsx`: existing giving/campaign flows, preserved from main.
- `src/features/operations/Donations.jsx`: expandable appeals integration.
- `src/features/operations/FundraisingManager.jsx`: review and display editing.
- `supabase/staged/compact-experience.sql`: permission-checked save functions and tables.
- `tests/prayer-status.test.mjs`, `compact-experience.test.mjs`, `compact-database.test.mjs`: model and isolated database checks.

## Security boundaries
Layouts contain approved widget IDs, not HTML or user data. Active accounts can read templates. Only People & access managers can save templates. Fundraising staff can save appeal presentation; server permissions are checked again in each RPC. Direct client writes are not granted. Both functions reject stale versions. Public output uses an explicit field list and includes no donor records. Presentation cannot change raised totals. Existing storage permissions and account-request/workspace feature gates remain unchanged.

## Release gate
1. From this branch run `npm ci`, `npm run validate`, `npm run test:browser` and the existing WebKit/mobile suite.
2. Run `node --test tests/compact-database.test.mjs`. It uses isolated PGlite records, not production accounts.
3. Review and apply staged SQL through the normal Supabase migration workflow. Do not enable unrelated workspace/account features.
4. Check owner, teacher, fundraising-only, member and signed-out states; stale saves; failed network requests; unsaved-edit navigation; keyboard/touch reorder; 320px/390px layouts in both themes.
5. Publish the supplied original poster/timetable images through the media workflow. Set the Arabic course page image and poster only after the asset exists. Course text is live; the source images are included in the handover package but have not been uploaded by this branch.
6. Deploy via the existing website release workflow; verify the real installed app and TV screens.

## Future timetable months
Use the existing CSV importer. Preserve the mosque's Hijri boundary under `page_content` key `prayer_calendar:YYYY-MM`. Never invent khutbah times when only congregation times are printed. November Jummah Jama'ah is 12:35pm and 1:30pm. Islamic dates remain subject to moon sighting.

## Rollback
Revert the UI commit through a reviewed Git revert. Do not remove valid November prayer data or the course to roll back presentation. Empty new tables can remain; do not drop tables containing saved layouts or outcomes. Existing public campaign fields remain compatible. Never delete payment records as part of UI rollback.

## Wider review still to deliver
Compact shared page headers and section spacing; service triage (Janazah, Nikah, hall booking, wellbeing); course-to-registration-to-register flow; Ramadan date/meal editor; content/page previews; sticky accessible section tabs; media cleanup; recovery/error states; account-request default-off verification; real-device performance and accessibility checks. These are planned, not falsely reported as rebuilt in this branch.
