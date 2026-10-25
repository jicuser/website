# JIC public, education and staff experience

## Approved direction
Extend the approved Nikah reference: restrained navy/gold, editorial serif public headings, crisp body text, outlined primary actions, compact rounded cards and consistent spacing. The request covers website pages, Madrasah and backend/admin interfaces, not a new backend or replacement of existing workflows.

## Approach
Use the existing shared components and CSS owners rather than a blanket colour override or separate one-off page redesigns. Public discovery, learning/family and staff tools share materials but retain different information density. A full rewrite would risk the recently approved navigation, prayer and TV work; a colour-only patch would not address task flow.

## Page-family audit and treatment
| Family | Treatment |
| --- | --- |
| Home, header, timetable | Preserve approved structure and real prayer data; keep shared controls and accessible materials. |
| Community Hub, guidance, services | Editorial introduction, consistent primary/secondary cards, compact question/FAQ areas. Preserve triage and page switches. |
| Education, Madrasah, pupil classes, adult classes | Clear pupil/adult separation; admissions and parent information first; compact learning topics, no stock room imagery or invented availability. |
| Youth, programmes, volunteering | Same compact intro/action language, real programme links and on-demand detail. |
| About, contact, projects | Preserve specialist image-led layouts and published CMS content; inherit public type and surface tokens. |
| Nikah and funerals | Preserve the two newly approved implementations and booking flows. |
| Worship and reading | Consistent page entry; never replace Arabic fonts or modify reading controls. |
| Forms, enrolment, bookings, donations | Keep field validation, review/submit and request-not-confirmation semantics. Improve surrounding hierarchy only. |
| Portal, family, fees, tasks, certificates | Private workspace cards, readable navigation, clear selected state and compact action rows. Respect release flags and roles. |
| Learning/teaching | Split resources, progress, attendance, meetings, student work and fees into selectable panels; preserve unsent drafts within a course. |
| Admin home and all staff modules | Cohesive shell, permission-filtered quick tool finder, compact informative task cards, consistent panels, forms and tables. Preserve Save, unsaved-change guard, Back and permissions. |
| TV / radio / Ramadan display | Preserve dedicated live renderers and their geometry; staff controls may share the admin theme, not display canvases. |

## Non-negotiables
No database migrations, new public access, altered RLS, feature-flag activation or live test submissions. No fictional counts, class times, capacity, charges or photos represented as JIC. Do not replace administrator content. Keep light/dark, glass off, reduced motion, keyboard focus and mobile touch targets. No global overflow hiding, foreground opacity/filter tricks or dependencies.

## Verification
Fresh baseline: 826 unit tests passed. Test real component rendering, hidden page/role filtering, compact layouts at 320–1440px, dark/light/glass-off, booking/triage controls, pupil/adult separation and learning drafts. Run the complete unit suite, ESLint, TypeScript and production build. Use mocked test data for browser checks; record failures and limitations. Stage on an isolated branch and merge only verified changes, preserving concurrent main commits.
