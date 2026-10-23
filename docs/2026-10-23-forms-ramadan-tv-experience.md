# Forms, Ramadan sponsorships and screen controls

Implementation instructions, 23 October 2026.

## What the current site does

Inspected the live home page, About, Services, Education, Hall booking, Ramadan,
the published hall enquiry form, Radio, Donate and Staff login. Also traced the
shared public layout, full route directory, navigation, staff form catalogue,
form builder, publication RPCs, sponsorship manager and TV controls.

The navy/gold branding, script Menu, compact prayer dock and Ramadan timetable
notice should stay. The main problems are excessive settings on individual
questions, no edit shortcut on a published form, a hidden sponsorship table,
several competing actions on every TV card and generic page descriptions.
The station was offline during this inspection; an availability check must
confirm a playable stream before a live notice appears.

## Shared UI rules

- Use existing theme tokens for text, borders, surfaces and focus. Touch targets
  are at least 44 px; input text is at least 16 px on phones.
- Put the usual action first. Keep advanced options in labelled disclosures.
- Say what buttons do: Save draft, Publish changes, Select days, Edit screen.
- Preserve input on failure. Display success only after a confirmed save.
- Never publish guessed dates, take payments implicitly or expose staff notes.
- Show status in words as well as colour. Respect reduced motion and increased
  contrast. Floating notices must clear the prayer dock and close in menus.

## Page and function instructions

### Published forms: `/forms/:slug`

1. Load the published definition with `get_public_form`; render its questions and
   preserve the current retry key, uploads and conditional-answer validation.
2. For a signed-in staff member, use the existing permission-filtered
   `admin_forms_overview` to determine management access. Ordinary visitors and
   response-only staff must not see edit controls.
3. Offer Edit this form and Responses. The edit link opens that exact form's
   builder, including when the form is currently accepting responses.
4. Keep published slugs fixed. Save draft leaves the published questions intact;
   Publish changes makes a new version. Previous submissions retain their
   original question snapshot. A stale version must not overwrite a newer one.
5. Use the actual form title and introduction for the browser/share metadata.

### Form creation and editing: Admin → Forms

- Use one editing page, with clear Basics, Questions and Responses sections.
  Avoid a wizard with compulsory extra screens.
- Generate the address from the title until staff explicitly customise it.
  The full address and technical identifiers belong under advanced options.
- Offer starter templates and quick question choices. Include an optional
  name-title field and a telephone example that accepts UK and international
  numbers. Do not force every phone number to use +44.
- Each question shows its label, answer type and required switch. Field keys and
  conditional rules remain available under More options. Moving/deleting a
  question must keep dependent conditions valid or explain the conflict.
- Add short help text and example answers. These are presentation information,
  validated on save; they must not silently modify submitted answers.
- Preview uses the same field renderer as the live form. Preview never submits.
- A published form gets an explicit Live badge, Save draft and Publish changes.
  Route assignments and opening/closing still use the existing backend checks.
- Keep the legacy Contact Us, Madrassah and I'tikaf response identities intact;
  do not migrate or discard their existing submissions as part of a UI change.

### Ramadan meal sponsorships: `/ramadan/*` and Admin → Ramadan

- Keep the overview's **Ramadan timetable coming soon** notice separate from
  Iftar, Suhoor and Daily Giving. These pages book sponsorships, not prayer times.
- Derive `1 Ramadan … 29/30 Ramadan` from the first date entered by staff and the
  season length. Display the corresponding UK date beside each Ramadan day.
  Do not use a calculated Hijri calendar as an assertion of local moon sighting.
- Setup shows the first and last UK dates together, plus a readable date-range
  summary. Only 29- or 30-day seasons are accepted.
- Provide Days and Table views. Table headings explicitly distinguish Ramadan
  day and UK date; statuses and approved sponsor names are visible.
- A range control chooses a first and last sponsorship day using labels that
  contain both dates. Allow whole Ramadan, selected ranges and individual days.
- Public range selection skips closed/reserved meals. Daily Giving can have
  several supporters. Meal requests remain pending until staff confirm them.
- Staff can open/close a selected range using `save_ramadan_days`. Closing days
  preserves bookings. Staff records include contact, amount, payment status and
  private notes; the public table never includes these.
- Printing uses the currently selected date range and status filter, includes
  both date columns and removes interactive controls.
- Existing page, meal, home and TV switches remain authoritative.

### Live radio notice

- Reuse `useRadioAvailability`; do not add another stream probe or autoplay.
- When the stream is online, offer a small translucent notice: JIC Radio is live
  and Listen. Listen uses the existing player. Include a labelled close control.
- Hide the notice while listening, in an open menu/donation dialog and after
  dismissal for this tab's session. Clear it if the station becomes unavailable.
- Keep the ordinary radio controls available after dismissal or playback errors.

### TV first screen: Admin → Screens & layouts

- First choose a task: Screen layouts or Live presentation. Default to layouts.
- Each supported screen then has one main action for that task. Layout choices
  open the existing draft editor; presentation choices start the quick workflow
  or manage the current session. Do not imply a presentation has started merely
  because its setup screen was opened.
- Keep screen status, refresh/retry and active-session management visible.
  Shoe-area remains layout-only. Advanced presentation setup stays optional.
- Preserve saved layouts, automatic prayer transitions, draft/conflict checks,
  connection codes and the existing publish/save boundary.

### Menus, page purposes and Google/share previews

| Area | Main visitor action | Staff location |
| --- | --- | --- |
| Home | Prayer times, services and current programmes | Website pages / Posters |
| About, Team, Contact | Find the centre and contact the team | Website pages / Team / Forms |
| Prayer Times and Faith & practice | Timetable, learning and prayer guidance | Prayer times / Website pages |
| Ramadan | Timetable notice, Iftar/Suhoor sponsorship and Daily Giving | Ramadan |
| Services, Nikah, Funerals, Halls | Understand the service and send an enquiry | Forms / Hall bookings |
| Education, Madrassah and Youth | Find programmes and register | Website pages / Forms |
| Get involved, Donate, Campaigns | Volunteer or choose how to support JIC | Forms / Centre operations |
| Radio | Start listening | Existing station stream |
| Portal / staff / TV receivers | Complete an account or staff task | Permission-controlled workspace |

- Retain the current menu hierarchy and icon labels. Task pages should not gain
  unrelated posters or discovery panels.
- Give each known public page an accurate title, description, canonical URL and
  Open Graph/Twitter card. Use an existing centre photograph for previews.
- Generate matching static HTML metadata for known routes so link-preview bots
  do not depend on JavaScript. Keep one shared metadata source for build/runtime.
- Include a sitemap and robots file. Exclude private account, administration,
  certificate verification and TV receiver pages from indexing.
- Do not put personal form answers, session codes, search queries or tracking
  parameters in canonical URLs. Google controls its own snippets and crawl timing.

## Implementation sequence and acceptance

1. Improve form creation and the published-form edit route; preserve publication
   and assignment checks. Verify an authorised edit and an unauthorised visitor.
2. Add shared sponsorship date-range and table components. Verify a range crossing
   a UK month boundary, 29/30-day setup and skipping unavailable meals.
3. Add the radio notice and TV task selector. Verify dismiss/listen/offline states
   and the layout-only shoe-area path without any accidental writes.
4. Add shared/static metadata. Verify unique canonical tags, escaped titles,
   route-specific descriptions, private noindex and generated route documents.
5. Run focused functional tests, lint/type checks and a production build. Publish
   through the existing main-branch deployment and check the live pages.
