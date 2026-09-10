# Styles

`app.css` is the only stylesheet manifest. Import order matters because later files intentionally override earlier development layers.

## Active styles to edit

For new work, prefer these files rather than creating another numbered patch:

- `index.css` — Tailwind variables, base typography and global primitives.
- `unified-header-v26.css` — current public header/menu geometry.
- `header-page-blend-v27.css` — header surface blending.
- `prayer-blocks-v28.css` — compact daily prayer blocks.
- `jic-palette-v29.css` — canonical JIC light/dark palette and global colour overrides.
- `hall-booking-v23.css` — hall availability calendar.
- `admin-workspace.css` / `admin-sections-v16.css` / `admin-menu-stability-v25.css` — Admin workspace.

## Legacy compatibility layers

The remaining CSS files in this directory are older development layers. They are still imported because some current pages rely on selectors defined there. Do not add new rules to them unless a page still owns that selector.

When a feature is touched, migrate its required rules into the active stylesheet for that feature, verify the affected pages, then remove the obsolete legacy import/file. This avoids the old pattern of adding `v30`, `v31`, etc. overrides forever.

## Palette

Use variables from `jic-palette-v29.css`. Do not introduce new cream/beige page backgrounds or unrelated teal/green theme colours.

Light mode: white `#FFFFFF`, secondary `#F5F5F7`, dark text `#0B1420`, JIC gold `#C99A28`.

Dark mode: background `#050A10`, secondary `#0A111A`, card `#0D1622`, near-white text `#F5F7FA`, JIC gold `#E3B43B`.

Semantic status colours (success/warning/error) are allowed for real states such as hall availability and validation.
