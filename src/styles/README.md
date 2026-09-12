# Styles

`app.css` is the only stylesheet entry point. Edit the owner below instead of adding another override file.

| File                  | Responsibility                                                                |
| --------------------- | ----------------------------------------------------------------------------- |
| `index.css`           | Tailwind, global text scaling, focus, scrollbars and reduced motion           |
| `theme.css`           | Light/dark palette and colour mapping for existing page utilities             |
| `header.css`          | Prayer strip, navigation row, menu, reminder and measured prayer-strip offset |
| `subnav.css`          | Section tabs and the current-tab indicator                                    |
| `public-sections.css` | Public page typography, section spacing and prayer tables                     |
| `home.css`            | Shared photograph and homepage layout                                         |
| `content.css`         | Poster cards, swipe rails and image/download controls                         |
| `dialogs.css`         | Donation dialog structure                                                     |
| `footer.css`          | Footer layout                                                                 |
| `liquid-glass.css`    | Glass tokens, public card material and accessibility fallbacks                |
| `admin.css`           | Staff workspace, editors, login and responsive behaviour                      |
| `projects.css`        | Building project tiles                                                        |
| `hall-booking.css`    | Hall availability calendar                                                    |
| `worship.css`         | Worship pages and Qur'an reader                                               |
| `tv.css`              | Dedicated mosque-screen scale and layout                                      |

## Rules

- Keep component geometry and its media queries together.
- Use theme tokens for shared colours. Glass changes the background, not the opacity of text or images.
- `!important` is retained where a shared style intentionally replaces a page's Tailwind utilities. The public header and section tabs do not need it.
- The TV shares prayer data and markup but has deliberate screen-size styles in `tv.css`.
- Only the fixed prayer strip is measured by `ResizeObserver`; the unboxed logo and section tabs scroll with the page. On mobile, the script-style Menu word beside the logo opens a compact main-page list. Back, burger, Donate and theme actions stay at the bottom; the burger opens a full-page text directory. Do not add fixed top padding to every `main` element.
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

`liquid-glass.css` maps existing named components and utility cards to these same tokens. Dedicated display layouts stay outside the public material selector. Keep the script Menu word, radio, footer navigation and individual bottom-bar controls unboxed. Their surrounding bars provide the glass surface; do not add separate backgrounds to buttons while leaving adjacent links plain. The full-page mobile directory sets local material tokens to a solid reading surface. The green WhatsApp action, red heart, teal desktop burger, gold mobile burger and grey footer Donate action keep their colours.

The two homepage call-to-action buttons and the current section tab can use a separate SVG refraction layer. Its ordinary blur/tint layer remains when URL filtering cannot render. Other controls use the clear material, while large content panels receive no displacement. Do not put SVG filters on foreground text or images. Do not enable displacement globally through `--jic-glass-panel-filter`.

The filter has no animation or pointer tracking; immutable map strings are generated once. Mobile blur sizes are smaller, form fields avoid nested blur, and Glass off/reduced transparency/no-blur browsers use opaque surfaces. Reduced motion suppresses refraction. A CSS support query only checks parsing; real Safari/Android rendering still needs checking. See [backdrop filters](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter).

Secondary routes, including admin, TV and financial charts, use [React lazy loading](https://react.dev/reference/react/lazy). The public header remains visible while a secondary route downloads. `PageLoadBoundary` provides a reload action if a chunk fails. In the production build, the main App chunk fell from 798 KB (231 KB gzip) to 194 KB (63 KB gzip); this measures that chunk, not total page weight or device load time. HLS remains a separate optional player download.

Run `npm run validate`. The colour test checks clear, frosted and dense backgrounds in both themes against black and white backgrounds. Check a real phone before claiming a visual or frame-rate result.
