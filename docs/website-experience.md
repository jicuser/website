# Website experience and content ownership

Every page should answer three questions: where am I, what can I do here, and what happens next? This applies to names, content, navigation, forms, saving and empty states as well as spacing.

## Public journeys

- Menus use a short label within a named section. Search, browser titles and the staff page picker use the full destination name from `src/content/pageDirectory.js`.
- `src/content/nav.js` owns the menu hierarchy. Page addresses stay stable when labels change. Madrassah is part of Education; funeral support is part of Services; extension areas are part of Building Works.
- Overview pages offer relevant destinations. Do not duplicate a detail page under an Overview label or add tabs that only switch introductory wording.
- Use `PageHeading` for section introductions and `PageChoices` for destination cards. Descriptions remain visible on phones.
- Prayer start and Jama’ah times remain separate. Jama’ah is emphasised. Sunrise has no congregation time. The next-prayer countdown still measures the next prayer start.
- A programme appears once per location. `programmePlacement.js` is shared by posters and linked-page cards. Adult classes require an explicit published placement; generic education posters do not imply an adult course is available.
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

## Maintenance

- Update names at their shared source, not separately in the dashboard, search and page picker.
- Keep layout rules in their owning stylesheet; do not add an override layer or `!important` patches.
- Keep actual schedules, fees, availability and policy content under the centre’s control. Do not invent programme details while restructuring navigation.
- Preserve permission checks and server-side access controls when changing staff navigation.
- Run `npm run validate` before pushing. Browser and real-device checks are separate; automated unit checks do not establish visual behaviour on an iPhone.
