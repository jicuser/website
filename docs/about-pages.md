# About pages

The About area uses open sections, centre photography and brand artwork. Its
layout lives in `about.css`; it does not inherit the old tall card treatment.

- About: one photographic introduction, three founding/location facts, three
  purposes and a compact directory. Repeated mission/vision/value prose is condensed.
- History: editable introduction and a three-point timeline. The existing 1979
  founding and 1981 establishment dates are retained; the current centre image is
  not presented as an archive photograph. Staff text and live previews still work.
- Team: published profiles keep their assigned groups and supplied order. The
  first populated group opens automatically. Portraits use compact proportions;
  biographies expand on request. Initials stand in for missing portraits. An empty
  directory has one short message. No identities, portraits or roles are invented.
- Social: one centre image, six compact channel rows with labelled Preview/Open
  actions and a single noticeboard. External embeds load only on request; closing
  restores focus. Existing channel anchors and links are retained.
- Financial history: the same published amounts appear in a lightweight paired
  bar chart and annual table, replacing the Recharts bundle and repeated cards.
  Accounting dates are ISO strings built from the published date, avoiding a local
  midnight conversion that could move a UK year-end back a day.
- Contact: direct call/email/map actions precede the existing managed form, with a
  compact map beside it on larger screens. Submission and access rules are unchanged.
- Projects: the existing photo/timeline remain; empty photo placeholders and some
  excess spacing are removed. Published photos and walkthrough controls remain.

`AboutMasthead` reserves image space and uses 480/760px WebP versions of the existing
centre image on phones. The original large image remains available for desktops.
About layout code stays in page chunks. Unframed managed content opts out of the
shared glass material without changing other managed pages. Obsolete social-card
styles have been removed from the shared stylesheets.
