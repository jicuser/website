# Styles

`app.css` is the stylesheet entry point. Keep imports grouped by responsibility and edit the file that owns the feature instead of adding another override file.

## Main ownership

- `index.css` — global primitives and Tailwind base styles.
- `theme.css` — light and dark colour tokens.
- `header.css` — public header, prayer strip, ticker, navigation and reminder geometry.
- `liquid-glass.css` — glass surfaces and blur treatment.
- `home.css` — homepage cards and feature layout.
- `worship.css` — Worship and Qur'an pages.
- `hall-booking.css` — hall booking calendar and availability states.
- `admin-workspace.css` — main admin workspace layout.
- `admin-sections.css` — admin content section editor and managed sections.
- `admin-responsive.css` — admin mobile and tablet layout.
- `admin-stability.css` — browser-specific admin stability rules.

## Working rule

Do not create files named `fix`, `patch`, `final`, `v2`, `v3`, or similar. If a feature needs changing, update its owning component and stylesheet. When an older stylesheet is touched, move the rules that are still needed into the correct semantic file and delete the old file.

A few older layout files are still imported while their selectors are being consolidated. They should shrink over time rather than receive new rules.

## Palette

Use the variables in `theme.css` rather than adding page-specific colour systems.

Light mode uses white `#FFFFFF`, secondary `#F5F5F7`, dark text `#0B1420`, and JIC gold `#C99A28`.

Dark mode uses background `#050A10`, secondary `#0A111A`, card `#0D1622`, near-white text `#F5F7FA`, and JIC gold `#E3B43B`.

Status colours are reserved for real states such as availability, warnings and validation.
