# Website experience and content ownership

Every page should answer three questions: where am I, what can I do here, and what happens next? This applies to names, content, navigation, forms, saving and empty states as well as spacing.

## Public journeys

- Menus use a short label within a named section. Search, browser titles and the staff page picker use the full destination name from `src/content/pageDirectory.js`.
- `src/content/nav.js` owns the menu hierarchy. Page addresses stay stable when labels change. Madrassah is part of Education; funeral support is part of Services; extension areas are part of Building Works.
- Overview pages offer relevant destinations. Do not duplicate a detail page under an Overview label or add tabs that only switch introductory wording.
- Use `PageHeading` for section introductions and `PageChoices` for destination cards. Descriptions remain visible on phones.
- Prayer start and Jama’ah times remain separate. Jama’ah is emphasised. Sunrise has no congregation time. The next-prayer countdown still measures the next prayer start.
- The floating prayer panel fades out after 12 pixels of page scrolling and returns 700 milliseconds after the last movement. Its page space stays reserved, so hiding it never jumps the content. The mobile navigation stays visible. Focused/pressed prayer controls remain available; route changes, returning to the top, width/orientation changes and tab restoration reveal the panel. Height-only browser-bar resizing does not interrupt a scroll gesture. The in-flow panel on short landscape screens does not auto-hide. Reduced motion removes the fade.
- A programme appears once per location. `programmePlacement.js` is shared by posters and linked-page cards. Adult classes require an explicit published placement; generic education posters do not imply an adult course is available.
- Poster groups select overview pages only. They do not automatically repeat on enrolment, policies, contact pages or prayer guides. Explicit programme placements can add listing destinations. Admin poster-location names explain this same rule.
- A published programme and its registration form retain their parent section. The form URL carries a programme slug, verified against `get_site_page` and its linked form before displaying a return destination. Direct forms remain independent; query parameters never supply an arbitrary return URL. Confirmation offers a return to the programme.
- Building Works has one prominent choice per destination. The extension owns its areas and timeline. Related links omit destinations already represented in an overview's section navigation.
- Loading, unavailable data and a genuinely empty list are distinct states. An empty or unavailable course list provides a contact route.
- Information pages offer a relevant onward action. A pupil information page must not promise a functioning student login unless one exists.

## Staff journeys

`src/content/adminNavigation.js` owns dashboard and sidebar names, groups, descriptions and existing permission requirements. Public team profiles and staff accounts are separate functions. Website livestream and TV presentation controls are separate functions.

Website pages has two views:

| View            | Purpose                                                                    |
| --------------- | -------------------------------------------------------------------------- |
| Existing pages  | Edit the content of an existing website destination.                       |
| Programme pages | Create and publish a programme page, choose its placement and link a form. |

The current view and selected existing page are kept in the address so a refresh reopens them. Switching editors checks for unsaved changes, including changes in nested page sections. Saving publishes content; it does not require a second publish operation for existing pages. Programme pages retain their own visibility controls.

The existing page editor states where its content appears:

- Home: edits the home introduction.
- Standalone information pages: edits the main introduction.
- Structured pages, such as timetables, services and enrolment: adds information below the main content. Their forms, timetable data and other dedicated features retain their own editors.

Additional content has no default heading and renders no container when empty. Its heading is level 2, preserving the main page heading. The content preview can contain unsaved edits; the website preview shows saved content and is labelled accordingly.

Legacy project addresses redirect to the canonical page while preserving query and anchor. `pageAliases.js` also resolves old editor links and content keys so there is only one editable destination. Before consolidating `/projects/timeline` and `/projects/madrassah-building`, the live `page_content` and `page_sections` records for both legacy and canonical addresses were checked on 14 October 2026; all were empty. No stored content was deleted or changed.

## Placement decisions

Refine the existing structure where a visitor loses context, sees the same destination repeatedly or reaches an unclear next step. Keep working page addresses, branding and saved content. A complete rebuild is justified only when the current structure prevents a clear journey; repeated spacing adjustments alone are not a reason to replace it. New pages should have a named owner, a useful purpose and an onward action before being added to navigation.

## Maintenance

- Update names at their shared source, not separately in the dashboard, search and page picker.
- Keep layout rules in their owning stylesheet; do not add an override layer or `!important` patches.
- Keep actual schedules, fees, availability and policy content under the centre’s control. Do not invent programme details while restructuring navigation.
- Preserve permission checks and server-side access controls when changing staff navigation.
- Run `npm run validate` before pushing. Browser and real-device checks are separate; automated unit checks do not establish visual behaviour on an iPhone.
