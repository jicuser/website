# Code map

Start with [README.md](README.md) for setup and [docs/editing.md](docs/editing.md) for making a change.

| Area                                 | Owner                                                              |
| ------------------------------------ | ------------------------------------------------------------------ |
| Startup and providers                | `src/main.jsx`                                                     |
| URL routes                           | `src/App.jsx`                                                      |
| Public page shell                    | `src/layouts/MainLayout.jsx`                                       |
| Header, menu and radio               | `src/components/shell/UnifiedHeader.jsx`                           |
| Website and TV prayer strip          | `src/components/shell/PrayerTimeBar.jsx`                           |
| Reminder below the tabs              | `src/components/shell/DailyReminder.jsx`                           |
| Background photograph                | `src/components/shell/PublicBackdrop.jsx`                          |
| Footer and logo rendering            | `src/components/shell/Footer.jsx`, `JamatiaLogo.jsx`               |
| Route pages                          | `src/pages/`                                                       |
| Page-specific sections               | `src/components/sections/`                                         |
| Staff pages and editors              | `src/pages/admin/`, `src/components/admin/`                        |
| CMS page rendering                   | `src/components/ManagedPageContent.jsx`, `ManagedPageSections.jsx` |
| Inline editing                       | `src/components/edit/`                                             |
| Navigation groups                    | `src/content/nav.js`                                               |
| Reusable section routes              | `src/content/sectionRoutes.js`                                     |
| Editable page definitions            | `src/content/editablePages.js`                                     |
| Contact details and radio fallback   | `src/content/site.js`                                              |
| Images and programme posters         | `src/content/images.js`, `programmes.js`                           |
| Prayer loading                       | `src/components/sections/prayer-times/PrayerTimesLogic.js`         |
| Timetable conversion and next prayer | `src/lib/timetable.js`, `nextPrayer.js`                            |
| Backend client                       | `src/lib/supabaseClient.js`                                        |
| Database setup and migrations        | `supabase/`                                                        |
| Stylesheet entry                     | `src/styles/app.css`                                               |
| CSS ownership                        | `src/styles/README.md`                                             |
| Tests                                | `tests/`                                                           |
| GitHub environment and editor tasks  | `.devcontainer/`, `.vscode/`                                       |

Admin fields are drafts until their explicit Save, Update, Add or Delete action. Formatting or layout edits must not introduce automatic database writes.
