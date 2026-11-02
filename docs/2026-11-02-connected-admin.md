# Connected admin — first implementation

This is a working UI update to the existing system, not completion of the entire design concept.

## Included

- Staff home gains permission-filtered shortcuts for website pages, forms/responses, course/class pages, account access, invoices and prayer settings. No sample statistics are displayed.
- Forms can be searched by name, address, description and linked-page title. Status filters include all, live, draft and closed.
- Form groups use existing page assignments and built-in identities: Madrasah, courses/youth, contact/services, Ramadan/Itikaf and other. A form used in several sections can match several groups. These are derived groups, not new editable database folders.
- Each form shows where it is used and whether linked pages are published. Page/form linking is explained and links to the existing website editor.
- **New class interest form** creates an editable, five-question starter using the existing form builder and publication workflow. It asks subject, availability, experience, adult/guardian name and email. It neither enrols a student nor confirms a place, creates an account or takes a payment.
- Existing responses, built-in legacy forms, staff assignments, save conflict checks and close/reopen operations remain on their existing backend paths.
- Jummah sessions use compact side-by-side cards. Unpublished khutbah times are omitted; absent prayer times have a written empty state. Monthly and Ramadan timetable components retain their interfaces.

## Staff guide

**Create a form:** Forms → New form → give it a title → edit questions → choose responsible staff → Save draft → preview → publish.

**Check demand for a class:** Forms → New class interest form. Give it a specific title (for example, Weekend Arabic interest). Choose a direct form link or create/link a page using the existing Website location controls. Publishing interest is not permission to take payment or promise a place.

**Add a saved form to a page:** Website pages → open the programme page → choose the registration option and form → save/preview/publish as appropriate. Removing a link does not delete the form or its answers.

**Stop accepting answers:** Open the form → Close form. Existing answers and follow-ups remain available. Hiding the page alone does not close a shared form or prevent use of its direct link.

**Accounts:** Staff & account access opens the existing permission-managed workflow. Creating a public team profile or recording a form response does not grant login privileges.

## Deployment boundaries

No dependencies, environment flags, production database migrations, role grants or payment-provider configuration are added. Historical learning/family modules and account-request release gates must not be enabled merely to match the mockup.

Still separate work: teacher allocation, live class registers, family/student records, server-authorised form-to-enrolment conversion, verified payment callbacks and idempotent reconciliation, explicit form archive/purge policies, and approved sunrise/sunset/Zawwal data entry. Do not infer Zawwal from Dhuhr or sunset from a displayed Maghrib value. This commit does not supply those additional times.

## Code map

- `src/lib/formLibrary.js`: grouping, search and catalogue summaries.
- `src/lib/formTemplates.js`: fresh, editable interest-form questions and draft.
- `src/features/forms/FormsManager.jsx`: catalogue and unchanged backend workflows.
- `src/lib/adminQuickActions.js`, `src/features/admin/AdminQuickActions.jsx`: permission-filtered shortcuts.
- `src/features/admin/AdminOverview.jsx`: dashboard integration.
- `src/lib/publishedTime.js`, `src/components/sections/prayer-times/CompactJummah.jsx`: published-time validation and compact card.
- `src/styles/connected-admin.css`, `src/styles/jummah-card.css`: scoped, theme-aware styles.
- `tests/connected-admin.test.mjs`: focused behavioural regression checks.

## Verification

Local: 13 focused Node tests pass; all changed JavaScript/JSX files parse without syntax diagnostics. Isolated React rendering passed three Jummah scenarios. These are not a substitute for full application validation.

Required before production: repository CI (`npm run validate` and browser suites). Direct repository cloning and package installation were unavailable in the editing environment, so full-project verification must be taken from the actual GitHub workflow result, not assumed from the focused tests.
