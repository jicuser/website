# Navigation and appearance redesign

Implements the approved navy/gold header and branded right-hand drawer. Search, appearance settings and hamburger share one aligned control group; the wordmark links home. Light/dark are explicit choices and transparency is an independent switch using the existing AppearanceContext and storage keys.

The drawer derives prominent Janazah, Nikah, education, projects, giving and contact destinations from CMS-visible navigation. Existing labels, custom links and reading/worship destinations are retained. Prayer calculations, homepage prayer/date browsing, services, radio, authentication, dependencies and databases are unchanged. Duplicate floating tools are removed from the public layout.

## Verification

- Six focused Node tests pass for visibility, deduplication, ordering, labels and active destinations.
- Changed production JS/JSX passes the repository ESLint rules in the local focused workspace.
- JSX and CSS parse checks pass.
- An isolated Chromium component harness passed at 320, 390, 768 and 1440 pixels, including theme/transparency independence, restricted-storage fallback, menu focus wrapping, Escape, backdrop dismissal, route closing, scroll restoration and reduced motion, with no JavaScript errors.
- Updated Playwright specifications cover the actual application, including saved preferences after reload and high-contrast appearance. These require the full repository CI; the isolated harness is not a complete production build, Safari verification or live deployment check.
