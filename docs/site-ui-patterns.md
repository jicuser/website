# JIC public and staff interface patterns

This work follows the October 2026 public crawl (79 sitemap URLs and ten additional paths), plus local phone/desktop rendering of all 20 enabled staff areas and five detailed editor/booking states. Staff rendering used example records and local API fixtures; it was not an authenticated production walkthrough. The comparison uses the user's Labbaik screenshots and the public [Labbaik masajid page](https://uselabbaik.com/us/masajid). Its authenticated product was not inspected.

## Shared direction

Keep the JIC script branding and navy/gold/ivory themes. Give each section one clear purpose, a concise explanation and a useful next action. Use genuine mosque photography and actual saved previews where they help explain a choice. Labbaik's hierarchy and selected-state patterns are the reference; its teal branding, mock people, product claims and illustrations are not JIC content.

Status must come from real published data. “Details not published” does not mean no project work has happened. An unavailable total is not zero. An enquiry is not a confirmed booking. A donation preference does not activate a payment provider. Public portal copy must describe only the features actually available to that account.

## Public pages

- Use the CMS-aware navigation and page visibility helpers. Custom labels, order, moved pages and added pages must remain functional after layout changes.
- Keep one compact section control on phones, with clear parent/current-page context. Longer About material belongs on the combined story page with matching jump links and body order.
- Use `PageChoices` for concise related destinations and the existing service finder for searchable/filterable services. Use longer copy for actual guidance, not repeated navigation panels.
- Service guides and direct form links must render the same published service form through `BuiltInForm`. Contact Us remains the general enquiry route. Form schema, versions, closed states, receipts and response routing belong to the existing form workflow.
- Preserve real programme details, service preparation guidance, source references and authenticated reading material. If details are missing, offer a relevant existing enquiry route rather than fabricate a schedule or policy.
- Keep the photo-led home introduction distinct from the calm sections below it. Theme and contrast preferences must preserve readable text and visible controls.
- Keep prayer start/Jama'ah distinctions and published Jummah times. The Salah dock must respect active tasks, keyboard focus, safe areas and its scroll hide/reveal controls.
- Spiritual reminders should remain readable, dismissible and passive. A first visit should never require waiting for a blurred page to clear.

## Staff workflows

The common sequence is choose an item or task, see its current state, edit relevant fields, preview where useful, and save with an accurate result. Keep one clear heading and a deliberate primary action. Secondary setup belongs in its own view or disclosure.

| Area            | Primary task                                              | Keep secondary                                                        |
| --------------- | --------------------------------------------------------- | --------------------------------------------------------------------- |
| Staff home      | Find a tool or open work needing attention                | Detailed response progress and account settings                       |
| Forms           | Choose Live, Draft or Closed; edit or review responses    | Follow-ups, schedules, attachments and workflow settings              |
| Website pages   | Find a page, edit and preview it                          | Site-wide reminders/community settings and menu configuration         |
| Page visibility | Choose a section or search, then switch a page on/off     | Closed groups until needed; always-on restrictions stay explicit      |
| Prayer          | Daily times, weekly Jummah, or CSV import                 | Per-date overrides and import preview                                 |
| TV              | Choose a screen and edit its real saved scene             | Advanced timing, device/input controls and separate live presentation |
| Posters         | Choose a poster, edit details and website placement       | TV layout and per-screen rotation remain in TV screens                |
| Hall            | Select date(s), choose status, edit booking details       | Colour setup and public calendar link                                 |
| Ramadan         | Monthly sponsorship bookings and a selected day's details | Season setup and website/home/TV destinations                         |
| Safeguarding    | Review queue, then deliberate New/Edit                    | Recording guidance and retention actions                              |

Prayer times, TV screens and website livestream are separate tools. Ramadan meal sponsorship is distinct from the prayer timetable and from Daily Giving. A TV sponsorship board is scene content that can be fixed or rotated; turning on a destination does not publish an unset campaign or take a payment.

## Implementation and validation

Use the owning components and styles, existing theme tokens and backend contracts. Avoid new dependencies, duplicated settings paths and override layers that obscure the original rules. Preserve draft state when switching editor views and retain unsaved-change guards on navigation/cancel.

Check changed journeys at narrow phone widths, desktop and both themes. Respect increased contrast and reduced motion/transparency. Controls need readable text, keyboard focus and 44px targets. Calendar statuses need both text and colour, with full accessible labels even when their visible label is shortened. Local mock workflow checks must be reported separately from live read-only publication checks and actual device testing.

The startup JavaScript gzip budget remains 240000 bytes. Release checks include lint, types, unit behavior, the relevant browser journeys, production build and startup budget. Native iPhone Smart Invert and an authenticated live admin walkthrough require separate evidence; they must not be claimed from browser emulation.
