# Nikah page: approved mockup implementation

The Nikah page now has an editorial gold-accented heading, two booking actions,
four compact venue shortcuts, grouped facility galleries, a four-step planning
panel, and a collapsed requirements/FAQ panel. The layout uses existing light and
dark tokens and stays within the Nikah feature; no global navigation, database,
form schema or account settings have changed.

The hero uses the first available, visible photo from the existing decorations,
men's hall or ladies' hall collections. Failed images are skipped. With no usable
photo it shows a decorative surface, not stock or generated venue photography.
Staff still manage the photos through Admin > Pages > Nikah > Facilities & photos.
Hidden areas and the hall-booking visibility setting remain respected.

Shortcuts select and focus the correct gallery. Book Nikah, Book hall and Start
planning open the existing inline published forms. Each mounted booking branch
retains its answers while other branches are selected or the questions are closed.
Closing returns keyboard focus to the initiating button. Existing #enquire links,
published closure, submission validation and admin photo controls are preserved.

## Verification

Five focused Node rendering tests passed after first failing against the original
layout. The real JSX modules compile and the stylesheet parses. An offline
Chromium component harness passed 16 checks: light/dark layouts at 320, 390, 430,
768 and 1280 CSS pixels, 44px-high controls, gallery selection/focus, all three
booking drafts, disclosure, photo controls, exhausted hero-image fallbacks and
the enquiry deep link. The gold action's icon contrast was also checked after
correcting a CSS specificity conflict. No JavaScript page errors were observed.

The harness substitutes backend, global shell and form implementations: these
checks do not establish a full-site build, actual submission or live deployment.
The repository's existing validation and release workflows remain unchanged.
