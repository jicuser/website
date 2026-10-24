# JIC public and staff UI: clearer journeys

The user requested a full public and admin crawl, a study against Labbaik, and implementation of the findings. Public evidence covers 79 sitemap URLs and ten additional paths. Admin evidence covers all 20 currently enabled owner sections at 390px dark and 1440px light with local example records, plus form editing, page editing, TV design, hall selection and Ramadan setup. Admin rendering is not an authenticated production crawl. No production record changes were made to conduct the study.

## Design direction

Retain JIC's script Menu and logo, navy/gold/ivory themes, equal home service tiles, real mosque photography, accurate prayer and radio information, combined About story and genuine reading content. Adapt Labbaik's short labels, focused choices, strong serif headings, calm section surfaces, informative previews and explicit selected states. Do not reproduce its brand, product claims or mock attendance/certificate data as JIC features. The live Labbaik reference is https://uselabbaik.com/us/masajid; user screenshots also show its portal, certificates and TV selectors.

## Changes

1. Public enquiries must use the same published service schema inline and on direct form pages. General Contact Us remains available and all responses stay in Forms. Contact support through the office is clearly distinguished from confirmed bookings. Do not add a second backend or bypass managed form publication.
2. Public section choices should be compact and readable with clear next actions. Thin informational pages need relevant existing destinations and honest descriptions. Do not fabricate content or remove editable CMS content to disguise a placeholder. About jump links and visible body sections must agree in order, honouring configured labels, order, visibility, moved pages and additional programme pages. Project pages must distinguish unpublished progress from zero progress.
3. Admin tools should use a common choose / edit / preview / save approach. Keep Prayer times, TV screens, Livestream, Hall bookings and Ramadan distinct. The page visibility list should start with compact section summaries and show matching results immediately on search/filter. Prayer editing should offer Daily times, Jummah and CSV import as focused views, retain unsaved values across views, and use paired Start/Jama'ah fields. Safeguarding should open an editor only after New or Edit and protect unsaved input on cancellation. Staff home needs a compact attention summary so tools are easier to reach. TV setup should keep real saved previews and use compact screen choices without hiding fixed/rotating states or the separate live presentation workflow. Forms keep Live/Draft/Closed and live preview; page editing keeps real previews, menu naming/reordering and visibility controls.
4. Hall and Ramadan month days should have unbroken, legible status labels on phones and accessible full descriptions. Preserve single/multi-day selection, range actions, private booking details, print views and website/home/TV publication controls. Ramadan sponsorship remains separate from the prayer timetable and retains the timetable coming-soon state.
5. Reduce duplicate mobile navigation: a page with a section picker should not also repeat its breadcrumb immediately above. Retain parent context, menu configuration, direct links and keyboard navigation. Public hub choices and service finder rows should avoid oversized repeated glass cards. Keep the photograph in the homepage introduction and provide calmer, theme-aware surfaces below it.
6. Keep the distinctive Salah dock and its scroll hide/reveal controls, but avoid covering active tasks or focused controls. Form/booking tasks may suppress/minimise the dock using an explicit route policy; content, safe-area clearance and focus must remain accessible. Replace full-page blur and random full-screen spiritual interruptions with a compact passive salawat/reminder treatment, preserving authentic text, dismiss controls and reduced-motion behavior.

## Global constraints

- Do not change production records, permissions, authentication, database schema or payment configuration for this UI work.
- Preserve CMS content keys, page visibility, custom menu labels/order, form versions and backend routing.
- Do not invent people, schedules, prices, project progress, payment support or active portal features.
- Keep JIC's script branding, navy/gold/ivory tokens and published prayer/radio behavior.
- Keep Ramadan meal sponsorship, Daily Giving and prayer timetable distinct, and preserve timetable coming-soon copy.
- Support 320px and 390px phones, desktop, both themes, increased contrast and reduced motion/transparency.
- Keep keyboard/focus behavior and minimum 44px controls; do not rely on colour alone for status.
- Add no dependencies and keep startup gzip at or below 240000 bytes.
- Edit the owning components/styles, avoiding stacked override patches and unrelated refactors.
- Use focused behavioral checks; avoid a prolonged screenshot suite. No production form submissions or real record mutations during validation.

## Evidence and scope

Full read-only public study: `/workspace/jic-ui-study/JIC-website-UI-study.md`. Admin captures and inventory: `/workspace/jic-ui-study/admin/`. Reference capture: `/workspace/jic-ui-study/labbaik-reference.png` and `.json`. Follow-up implementation should not claim an authenticated live admin walkthrough or native iPhone Smart Invert verification. Content needing office decisions remains explicitly unpublished rather than guessed. Disabled Ramadan routes in the static sitemap remain an SEO follow-up unless publication filtering can be changed safely within existing metadata generation.
