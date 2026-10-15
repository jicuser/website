# Styles

`app.css` is the only stylesheet entry point. Edit the owner below instead of adding another override file.

| File                     | Responsibility                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------ |
| `index.css`              | Tailwind, global text scaling, focus, scrollbars and reduced motion                  |
| `theme.css`              | Light/dark palette and colour mapping for existing page utilities                    |
| `header.css`             | Prayer strip, navigation row, menu, reminder and measured prayer-strip offset        |
| `subnav.css`             | Section tabs and the current-tab indicator                                           |
| `public-sections.css`    | Public page typography, section spacing and prayer tables                            |
| `home.css`               | Shared photograph and homepage layout                                                |
| `content.css`            | Poster cards, swipe rails and image/download controls                                |
| `dialogs.css`            | Donation dialog structure                                                            |
| `footer.css`             | Footer layout                                                                        |
| `liquid-glass.css`       | Glass tokens, public control/card material in both modes and accessibility fallbacks |
| `admin.css`              | Staff workspace shell, editors, login and responsive behaviour                       |
| `tv-admin.css`           | TV settings/editor controls only; never the live TV renderer                         |
| `custom-forms.css`       | Form builder, response inbox and form-admin layout                                   |
| `content-workflow.css`   | Posters, programme pages and structured content workflow                             |
| `projects.css`           | Building project tiles                                                               |
| `hall-booking.css`       | Hall availability calendar                                                           |
| `worship.css`            | Worship pages and Qur'an reader                                                      |
| `tv.css`                 | Dedicated mosque-screen scale and layout                                             |
| `spiritual-overlays.css` | Welcome salawat and occasional reflection overlays                                   |

## Rules

- Keep component geometry and its media queries together.
- Use theme tokens for shared colours. Glass changes the background, not the opacity of text or images.
- Use `jic-prompt` for the current question or next-step label. It follows the readable gold accent in both themes and glass modes; keep explanatory text in the normal text colour. Primary actions use existing button variants, with green for starting a stream and red for ending it.
- Do not use `!important` as a cascade patch. Put a rule in the stylesheet that owns the component and use a scoped selector. The only retained exception is the global reduced-motion accessibility fallback in `index.css`.
- The live TV renderer is owned by `tv.css`; admin-only TV editing controls are owned by `tv-admin.css`. Do not duplicate the same selector in both.
- `ResizeObserver` measures the prayer panel and mobile controls. On phones the dock defaults to a compact next-jama’ah and radio row; Prayer times expands the full timetable, and Escape closes it. The logo, search, theme control and section tabs stay in document flow. The floating scroll-to-top control is desktop-only. On short landscape screens the prayer panel returns to normal flow. On desktop the prayer panel stays at the top with page controls below it. Mobile and tablet section breadcrumbs use the same route context as desktop highlights. Do not add fixed top padding to every `main` element.
- Desktop section dropdowns support mouse hover, button clicks and arrow-key navigation; Escape restores focus to the section button. Main section and submenu underlines share route context with mobile breadcrumbs.
- Desktop reserves the prayer panel's measured height at the top. Mobile reserves only the persistent bottom controls: the prayer panel yields while the footer is visible or a field is focused, and can be explicitly opened from Prayer times. Page height never changes when visibility changes. `--jic-prayer-visible-height` and `--jic-mobile-visible-dock-height` position floating controls using only the visible panel. `usePrayerDockVisibility` owns the root visibility marker and clears it on unmount. Short landscape uses the in-flow panel.
- Keep horizontal overflow inside the timetable or tab rail; do not hide all page overflow to disguise a sizing problem.
- Preserve reduced-motion, reduced-transparency and no-blur fallbacks.
- Use `npm run format` before committing. Comments should explain ownership or a reason, rather than a sequence of patches.

Light mode uses pearl surfaces and navy text; dark mode uses navy surfaces and off-white text. The logo has its own approved colours and must not be recoloured using a CSS filter. See [the brand guide](../../public/brand/README.md).

## Material choices

| Material               | Use                                                | Appearance                               |
| ---------------------- | -------------------------------------------------- | ---------------------------------------- |
| `data-glass="clear"`   | Shared buttons and tabs; small navigation controls | Less tint, a small blur and a bright rim |
| `data-glass="frosted"` | Shared cards, programme and project tiles          | More tint and blur for readable copy     |
| `data-glass="dense"`   | Menus, quotes, prayer information and forms        | Strongest tint for dense text            |

`liquid-glass.css` maps existing named components and utility cards to these same tokens in both appearance modes. Glass off substitutes opaque colours and disables blur; it never removes the card background. Plain buttons and staff actions are not selected by the public material rules. Dedicated display layouts stay outside the public material selector. Keep the script Menu word, radio, footer navigation and individual bottom-bar controls unboxed. Their surrounding bars provide the glass surface; do not add separate backgrounds to buttons while leaving adjacent links plain. The full-page mobile directory sets local material tokens to a solid reading surface. The green WhatsApp action, red heart, teal desktop burger, gold mobile burger and grey footer Donate action keep their colours.

Glass uses CSS tint, borders and backdrop blur. Mobile blur sizes are smaller, controls within blurred panels avoid nested blur, and Glass off/reduced transparency/no-blur browsers use opaque surfaces. Do not put filters on foreground text or images. A CSS support query only checks parsing; real Safari/Android rendering still needs checking. See [backdrop filters](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter).

Secondary routes, including admin, TV and financial charts, use [React lazy loading](https://react.dev/reference/react/lazy). The public header remains visible while a secondary route downloads. `PageLoadBoundary` provides a reload action if a chunk fails. In the production build, the main App chunk fell from 798 KB (231 KB gzip) to 194 KB (63 KB gzip); this measures that chunk, not total page weight or device load time. HLS remains a separate optional player download.

Run `npm run validate`. The colour test checks clear, frosted and dense backgrounds in both themes against black and white backgrounds. Check a real phone before claiming a visual or frame-rate result.
