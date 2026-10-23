# Simple website and staff workspaces

Approved implementation: keep public pages familiar while making staff tasks predictable.

- Staff navigation separates prayer times, TV screens and livestream. Each area opens with its common task; settings and less common tools sit behind a clear secondary choice.
- Website pages open in a full workspace. The actual website renders draft introductions and sections beside the controls, with phone and desktop previews. Saving publishes; previewing does not write anything.
- A dedicated Menus area controls section names, page names and ordering. Existing addresses and saved links remain stable. Added published pages can appear in their selected section.
- Forms use Live, Draft and Closed views. The same builder edits built-in and added forms, retaining previous submissions and access rules. Form creation can create a named page in a selected menu section.
- Ramadan separates bookings, sponsorship setup, and website/screen visibility. Phones use compact date/status rows; selecting a day opens its details. Printing uses the selected date range and excludes private editing controls.
- TV everyday content offers a fixed scene or a rotation. Ramadan boards are scene choices. Selected persistent layers can remain visible during a rotation; automatic prayer phases retain priority.
- The reading section is named Adhkar, Qur’an & Janazah Guide, with practical reading controls and sourced recitations.
- Public programme discovery, hall information and sharing previews use existing published information. Unknown hall capacities, facilities and dates stay blank until staff supply them.

Checks: schema and permission tests for changed database contracts, scene scheduling tests, focused browser journeys without screenshot suites, lint, type checking, production build and startup budget. Publish the approved changes after those checks and verify the live deployment.

## Staff guide

- **Website pages → open a page → Edit & preview:** type in the controls and inspect the real page beside them. On a phone, switch between Edit page and Live preview. Mobile and Desktop choose the preview width. Save publishes the changes; opening a preview never submits a public form.
- **Website menus:** edit a section or page name, use its up/down arrows, then Save menu. Published added pages join their chosen section. These changes keep the original page addresses.
- **Forms:** choose Live, Draft or Closed. Open Edit form to change its questions; Save draft preserves the published questions, while Publish changes creates the next published version. A new form can create a named page or attach to an existing one when the editor also has website-content permission. Contact Us, Madrassah and I’tikaf use this same workflow.
- **Events / Notices:** the first screen lists saved items. Choose New or Edit, make the change, then Save. Cancel returns to the list. Livestream has its own destination and optional scheduling controls.
- **Ramadan → Bookings:** choose Iftar, Suhoor or Daily Giving, then a day or range. Add sponsor or Edit opens the details for that date. Setup controls the season dates and targets; Website & screens controls publication and visibility. Print uses the chosen date range. Private contact and payment records remain staff-only.
- **TV screens → Automatic displays:** choose a screen, then Fixed scene or Rotation. Add Ramadan boards as scenes, choose durations and order, and select the timetable items that should stay visible. Scheduled overrides and automatic prayer phases retain priority. Save applies the screen settings.
- **Hall information:** Website pages → Hall Booking → Hall information contains the optional photos, capacity and facilities shown before the calendar. Empty fields stay hidden until the centre supplies the information.

Detailed references: [editing](editing.md), [forms](forms-website.md), [TV displays](tv-display.md), [Ramadan](2026-10-23-forms-ramadan-tv-experience.md), [reading sources](worship-reading.md), and [public sharing previews](public-page-previews.md).

## Release evidence

The backend migration is `20261023193349_unified_form_workflow.sql`. It supports installations both with and without the retired legacy workflow table. The deployed handlers are custom-forms version 2 and tv-control version 20. Existing Contact Us and Madrassah submission counts were unchanged after migration, and the security-advisor baseline was unchanged.

The combined lint, type check and all 748 Node tests pass. A production build fetched 11 public dynamic previews successfully; initial JavaScript was 239,861 gzip bytes against the existing 240,000-byte budget. Focused browser journeys cover editing, menu ordering, both high-contrast themes, forms, booking tables, TV rotations and reading controls without a screenshot suite. Physical iPhone accessibility settings and physical centre TVs still require device confirmation.
