# JIC guided website and staff tools

The TV editor is the reference for the wider experience: choose a task, work in a small labelled section, review the result, then explicitly save. Keep everyday actions visible, with specialist options inside the relevant task. Avoid introductory screens that add a click without helping somebody decide.

## Implemented

| Area | Experience |
| --- | --- |
| Website pages, Home and service pages | Introduction → optional facilities/venue → Sections. Keep the live phone/desktop preview alongside controls on desktop and behind an Edit/Preview switch on phones. |
| Janazah, Nikah and hall editing | Separate the introduction, facilities or venue, and page sections; retain each specialised photo editor and its save registration. |
| Courses and programme pages | Details → Content → Location → Registration → Review. Keep registration permissions and saved visibility separate. |
| Form builder | Basics → Questions → Responses; existing interactive question preview, draft saving and publishing remain available. Public forms continue asking relevant short steps followed by an answer review. |
| Events | Details → Content → Review, retaining native required-field validation and the existing publication controls. |
| Website menus | Arrange → Review; retain drag handles, keyboard movement, concurrent-change protection and original-menu restoration. |
| Salah | Four compact task cards: monthly timetable, one day, weekly Jummah and CSV import. Existing monthly editor and export workflow retained. |
| Ramadan | Task cards for setup, bookings and website/screens. Setup splits into Dates → Amounts → Review. Booking calendar and sponsorship management remain available. |
| Mobile app content | Appearance → Reading → Review. Edit one reading at a time and retain explicit publishing. |
| Home Screen website | Prayer and radio first, then six compact service shortcuts, subject to existing page visibility. |
| Community Hub | Reduced header and card spacing, retaining search, categories and existing service journeys. |
| Home Screen section navigation | One scrollable row, current page brought into view, sticky section header, and a route back to the Hub. |

Shared editor steps preserve mounted child editors, local draft state and global save registrations. Arrow keys, Home and End move between tabs. Back/Next moves focus into the selected panel. Invalid native form fields reveal their hidden panel before receiving focus. Step numbers indicate position, not completed validation.

## Consistency rules for all sections

- Use the existing permission-filtered staff overview and grouped menus as the entry point. Do not create competing dashboards or public links to private records.
- Browsing uses grouped destinations and direct links. Editing uses small task panels. Do not force a wizard onto a simple read-only page or a calendar.
- Show useful actions with a short label and one supporting line. Keep Save, Publish, visibility and unsaved states explicit.
- Use the existing navy, teal and gold palette, theme surfaces, 44px targets and visible keyboard focus. Keep a solid readable surface underneath controls.
- Keep forms, service requests, courses, finance and safeguarding on their existing APIs and permissions. Do not enable release flags as part of a design update.

## Validation and release limits

The existing 855 Node tests and four new shared-step behaviour tests pass. Type checking and the production bundle build pass using the repository's test-only public configuration. Browser checks cover shared editor draft retention, keyboard navigation, invalid-field recovery, and narrow/light/dark rendering, plus public Hub navigation. Production account writes have not been exercised.

No database migrations, permission changes, release-flag changes or production data edits are included. The existing release workflow prepares a Hostinger artifact; a GitHub source update alone does not verify deployment at jicmasjid.org. Do not deploy the local test-configuration bundle.
