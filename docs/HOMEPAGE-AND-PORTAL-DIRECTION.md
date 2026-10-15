# Website layout and portal direction

Reviewed 15 October 2026 against the live JIC website, the supplied six-screen app concept, and Labbaik’s official public pages. Public marketing and published screenshots are evidence of what Labbaik advertises, not a test of its signed-in application.

## Homepage order implemented

| Position             | Content                                                                                | Purpose                                                                         |
| -------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Welcome              | Centre identity, short introduction, Visit the Centre, My account                      | Orient new visitors and give returning users a direct sign-in route.            |
| Daily information    | Next published congregation, prayer start or khutbah time, timetable, reminders, radio | Keep related prayer actions together. Friday uses the two Jummah sessions.      |
| Explore JIC          | Courses, Madrassah, Janazah, Donate                                                    | Four frequent tasks with consistent sizing and short descriptions.              |
| Updates              | Published notice, an enabled live stream, programme posters, upcoming events           | Use real content. A live banner only appears with an enabled, valid stream URL. |
| Community & services | Services, building works, youth                                                        | Keep secondary destinations discoverable without crowding the first screen.     |
| Stay connected       | Friday times, published broadcast player, WhatsApp                                     | Continue into the existing pages and channels.                                  |

The photograph remains behind the welcome area. The content below has a plain theme-aware background. CMS hero text and the existing four editable destination tiles are retained; destinations follow page-visibility settings. Video remains click-to-load. Donate opens the existing donation flow.

On phones, search and theme controls scroll with the header. The bottom prayer row starts compact; opening the full timetable is an explicit action. The panel still yields to the footer and focused fields. The Home control returns to the top on the homepage, replacing the overlapping floating arrow there. This is a responsive website update, not an App Store release.

## What Labbaik advertises

| Area           | Publicly described offering                                                                               | Best place in JIC’s future product                                                 |
| -------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Education      | Registers, Qa’idah/Qur’an/Hifz progress, kitab tracking, exams, registration approvals                    | Education discovery publicly; records in family and teaching workspaces.           |
| Family portal  | Linked children, attendance, progress, fees, announcements, live sessions and recordings                  | My account → My family; select a child before showing their records.               |
| Live           | Private authenticated rooms, teacher-start controls, automatic attendance, optional recording publication | Join from a class detail or next lesson; teacher controls in Teaching.             |
| Giving         | Stripe payments, Apple Pay/Google Pay, separate funds, appeal targets, receipts and Gift Aid options      | Public Donate; reconciliation in Finance.                                          |
| Communications | Role-scoped WhatsApp queries, absence reporting, register links and reminders                             | Account inbox and assigned staff tools; public WhatsApp stays a community channel. |
| Community      | Events, bookings, capacity, certificates and verification                                                 | Public discovery and applications; review queues inside administration.            |
| Operations     | Payroll, staff attendance, safeguarding records and recurring administrative tasks                        | Permission-scoped admin modules, never public homepage cards.                      |

Sources: [Features](https://uselabbaik.com/features), [Parent portal](https://uselabbaik.com/portal), [Live](https://uselabbaik.com/live), [Donations](https://uselabbaik.com/donations), [WhatsApp](https://uselabbaik.com/whatsapp).

The official [portal screenshot](https://uselabbaik.com/assets/student-portal-home-CfMlX2zm.webp) separates Home, Attendance, Progress, Recordings and More. That is useful evidence for role-specific navigation. JIC’s supplied app concept goes further by separating public, family, teaching and administrative screens. The website should keep the same content relationships without forcing every screen to use identical navigation.

Labbaik’s Live page currently lists 0.35p per participant-minute and optional recording at 2p per recorded minute. These are separate operating costs. Its donation page distinguishes a 0% platform fee from Stripe processing charges; advertised processing-fee credits have eligibility conditions and monthly limits. These claims must not be transferred to JIC’s current donation provider.

A targeted public GitHub search for the official domain did not identify a verified source repository. That does not establish whether private repositories exist. No source was copied, and there is no basis here to determine whether their implementation was AI-generated.

## Keep public and private journeys clear

| User           | Starting point                    | Relevant work                                                                       |
| -------------- | --------------------------------- | ----------------------------------------------------------------------------------- |
| Visitor        | Homepage                          | Prayer, directions, courses, enrolment, Janazah, events, giving.                    |
| Account holder | My account                        | Profile, requests and only the modules enabled for their account.                   |
| Parent         | My account → My family            | Children, attendance, learning, fees and messages, once those modules are deployed. |
| Teacher        | Approved account → Teaching       | Assigned classes, registers, lessons, progress and authorised messaging.            |
| Administrator  | Approved account → Administration | Applications, permissions, content, finance and operational queues.                 |

The current release exposes the real account entry and existing public services. Family records, private lessons, teacher chat and automatic attendance are a subsequent backend-and-portal build. They must not be simulated with sample family data on the public site. Role requests require server-side approval; ticking a role in signup must never grant that role. Google sign-in remains dependent on the provider being enabled in Supabase.

Next implementation order: secure account requests and permission approval; family/class assignment; teaching registers and progress; a permission-scoped inbox; authenticated live lessons with provider billing and recording controls. Keep the existing website and eventual native apps on the same authorised records and API.
