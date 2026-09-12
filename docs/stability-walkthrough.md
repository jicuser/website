# September 12 stability fixes — code walkthrough

These changes preserve the existing design and correct problems found while reviewing the recent menu, reminder and TV updates.

## Start with these files

| File                                                         | What changed                                                                                                                                | Coding idea                                                                                                                           |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `src/layouts/MainLayout.jsx`                                 | Removed the route-wide fade from opacity 0. Only CMS sections reset when the route changes.                                                 | A React `key` change recreates a component. Use it only where a reset is needed.                                                      |
| `public/appearance.js` and `index.html`                      | Read the saved light/dark and glass preferences before the first page paint.                                                                | The browser can draw the page before React is ready. A small early script prevents the wrong theme appearing first.                   |
| `src/context/AppearanceContext.jsx`                          | Apply appearance changes before paint; retain the existing saved preferences.                                                               | `useLayoutEffect` runs before painting; `useEffect` is suitable for saving preferences afterwards.                                    |
| `src/components/shell/SpiritualOverlays.jsx`                 | One welcome timer, reset to three seconds after a tap; five seconds without a tap. The 45-second random-reminder cooldown survives updates. | A `useRef` retains a value between renders without causing another render. Clear timers when replacing them or leaving the component. |
| `src/styles/header.css`                                      | Align the script Menu within its existing row and keep the full mobile menu stable.                                                         | CSS alignment takes part in layout; `transform` moves the drawing without reserving space.                                            |
| `src/styles/liquid-glass.css`                                | Consolidated action colours, removed conflicting menu backgrounds and unnecessary nested blur.                                              | Later CSS can override earlier CSS. Give each styling concern one owner.                                                              |
| `src/components/tv/TvPosterRail.jsx` and `src/styles/tv.css` | Fill an empty normal TV stage with the logo; keep poster space unchanged.                                                                   | Conditional rendering can use vacant space without shrinking populated content.                                                       |
| `src/hooks/useStreamSetup.js`                                | Return unnamed stream drafts to the name step, retaining their inputs.                                                                      | Validate both the data and the step the user must visit to correct it.                                                                |

`StreamSaveDialog.jsx` now passes the edited name back to `StreamSetup.jsx`. `ScrollToTop.jsx` scrolls before paint and tolerates malformed URL fragments.

The redundant `jic-actions.css`, `tv-logo.css` and unused SVG filter component were removed. No package or backend changes are needed.

## How to read the change

1. Open the commit's **Files changed** tab in GitHub.
2. Start with `MainLayout.jsx`: red lines show the removed fade; green lines show the replacement.
3. Read `SpiritualOverlays.jsx` next. Follow the timer from creation to replacement to cleanup.
4. Read the two CSS files together: `header.css` owns placement; `liquid-glass.css` owns surface appearance.

## Verification

- `npm run validate` checks JavaScript, runs the existing regression suite and builds the production site.
- `tests/appearance.test.mjs` executes the early script with light/dark, glass/solid, missing and blocked storage.
- `tests/stream-finish.test.mjs` checks that an unnamed saved draft can be named and restarted without losing inputs.
- The validation run passed 185 tests and the production build. A separate temporary ReactDOM/StrictMode harness passed seven checks for welcome timing, dismissal, blocked storage, reminder cooldowns and suppression while editing or using a dialog.
- Real iPhone/Safari rendering and physical mosque screens still need device checks. A passing build alone does not prove visual smoothness.
