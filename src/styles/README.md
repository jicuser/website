# Styles

`app.css` is the only stylesheet entry point. Edit the owner below instead of adding another override file.

| File                  | Responsibility                                                        |
| --------------------- | --------------------------------------------------------------------- |
| `index.css`           | Tailwind, global text scaling, focus, scrollbars and reduced motion   |
| `theme.css`           | Light/dark palette and colour mapping for existing page utilities     |
| `header.css`          | Prayer strip, navigation row, menu, reminder and measured page offset |
| `subnav.css`          | Section tabs and the current-tab indicator                            |
| `public-sections.css` | Public page typography, section spacing and prayer tables             |
| `home.css`            | Shared photograph and homepage layout                                 |
| `content.css`         | Poster cards, swipe rails and image/download controls                 |
| `dialogs.css`         | Donation dialog structure                                             |
| `footer.css`          | Footer layout                                                         |
| `liquid-glass.css`    | Glass tokens, public card material and accessibility fallbacks        |
| `admin.css`           | Staff workspace, editors, login and responsive behaviour              |
| `projects.css`        | Building project tiles                                                |
| `hall-booking.css`    | Hall availability calendar                                            |
| `worship.css`         | Worship pages and Qur'an reader                                       |
| `tv.css`              | Dedicated mosque-screen scale and layout                              |

## Rules

- Keep component geometry and its media queries together.
- Use theme tokens for shared colours. Glass changes the background, not the opacity of text or images.
- `!important` is retained where a shared style intentionally replaces a page's Tailwind utilities. The public header and section tabs do not need it.
- The TV shares prayer data and markup but has deliberate screen-size styles in `tv.css`.
- The public header is measured by `ResizeObserver`. Do not add fixed top padding to every `main` element.
- Keep horizontal overflow inside the timetable or tab rail; do not hide all page overflow to disguise a sizing problem.
- Preserve reduced-motion, reduced-transparency and no-blur fallbacks.
- Use `npm run format` before committing. Comments should explain ownership or a reason, rather than a sequence of patches.

Light mode uses pearl surfaces and navy text; dark mode uses navy surfaces and off-white text. The logo has its own approved colours and must not be recoloured using a CSS filter. See [the brand guide](../../public/brand/README.md).
