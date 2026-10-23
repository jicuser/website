# About JIC, on one page

`/about` brings the introduction, story, people, finances, social channels and
contact details together. It uses one centre photograph, the 1979/1981/Today
timeline and open sections. `about.css` owns the layout, with two columns for
the shorter sections on larger screens and one column on phones.

- A compact jump menu follows the photo. It retains configured menu labels and
  ordering, including added pages. About's repeated site-level subnav is omitted.
- History: the editable introduction and three-point timeline appear directly
  on the page. The current photograph is not presented as an archive image.
- Team: the directory expands on request. Published profiles keep their assigned groups and supplied order. The
  first populated group opens automatically. Portraits use compact proportions;
  biographies expand on request. Initials stand in for missing portraits. An empty
  directory has one short message. No identities, portraits or roles are invented.
- Social: six compact links are immediately available. Channel previews and
  the noticeboard expand on request. External embeds load only after selecting
  Preview; closing restores focus. Existing channel anchors are retained.
- Finances: latest-year figures appear immediately; the paired bar chart and
  annual table expand on request. The same published amounts are retained.
  Accounting dates are ISO strings built from the published date, avoiding a local
  midnight conversion that could move a UK year-end back a day.
- Contact: address, phone, email and directions appear immediately. The existing
  managed enquiry form and map expand on request; submission/access rules are unchanged.
- Projects: the existing photo/timeline remain; empty photo placeholders and some
  excess spacing are removed. Published photos and walkthrough controls remain.

`aboutSections.js` maps the original `/about/history`, `/team`, `/financial-history`,
`/social-media` and `/contact` addresses to sections of `/about`. Shared links keep
their query strings and anchors. Visiting one opens the relevant details. The
masjid project keeps its dedicated photo/stage experience, linked from the timeline.

The original page addresses remain the content and visibility keys. Switching off
a section hides its content and jump link. Managed introductions and extra page
sections render in their corresponding part of the combined page. Staff previews
keep the selected editor address and focus that section, preserving draft isolation
and existing save controls. Published About posters and added-page links remain.

`AboutMasthead` reserves image space and uses the existing 480/760px WebP variants
on phones. Profiles, social preview code and the contact form load in separate
chunks when opened. Map and social frames stay absent from the initial page.
Unframed managed content opts out of the shared glass material without changing
other managed pages.
