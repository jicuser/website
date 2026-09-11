# Styles

`app.css` is the stylesheet entry point. Keep imports grouped by responsibility and edit the file that owns the feature instead of adding another override file.

## Main ownership

- `index.css` — global primitives and Tailwind base styles.
- `theme.css` — light and dark colour tokens.
- `header.css` — fixed public header, prayer strip, navigation and inline reminder.
- `public-sections.css` — retained public-page layouts consolidated from the older override files, in their original cascade order.
- `content.css` — shared swipe rails, programme posters, image previews and wallpaper controls.
- `liquid-glass.css` — glass surfaces and blur treatment.
- Glass styles load last: shared translucent backgrounds, stronger on-glass text, and solid/reduced-transparency fallbacks. Change background alpha, never container opacity. Photographs and poster images retain their original opacity.
- `home.css` — homepage cards and feature layout.
- `worship.css` — Worship and Qur'an pages.
- `hall-booking.css` — hall booking calendar and availability states.
- `admin-workspace.css` — main admin workspace layout.
- `admin-sections.css` — admin content section editor and managed sections.
- `admin-responsive.css` — admin mobile and tablet layout.
- `admin-stability.css` — browser-specific admin stability rules.

## Working rule

Do not create files named `fix`, `patch`, `final`, `v2`, `v3`, or similar. If a feature needs changing, update its owning component and stylesheet. When an older stylesheet is touched, move the rules that are still needed into the correct semantic file and delete the old file.

The former override files are no longer imported. Their retained section rules live in `public-sections.css`; header and homepage rules live only in their component owners. Gradually simplify retained section rules when working on those pages; do not add another override layer.

## Palette

Use the variables in `theme.css` rather than adding page-specific colour systems.

Light mode uses pearl `#FAFBFD`, secondary `#EFF2F6`, navy text `#0C1930`, and copper interface accents `#89501B`.

Dark mode uses navy `#080F1D`, secondary `#0F1A2B`, card `#152238`, off-white text `#F4F6FA`, and brass accents `#D6AF62`.

Filled primary buttons use brass `#D6AF62` with navy text in both modes. Do not use the darker light-mode copper as a button background with navy text. The approved logos retain their stone and glass colours; only the lettering changes for dark surfaces. Never recolour the entire logo using CSS filters. See `public/brand/README.md` for exports and usage.

Status colours are reserved for real states such as availability, warnings and validation.
