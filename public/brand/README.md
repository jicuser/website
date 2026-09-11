# Jamatia Islamic Centre identity

Seven refined SVG compositions, each with a light and dark version. The supplied script lettering is traced to paths, not substituted with a font. The entrance and minarets share symmetrical geometry; the lattice is a transparent cut-out. Files contain no raster image, external font or script.

| Variation | Intended placement |
| --- | --- |
| `horizontal` | Main website header, menu and upper footer; matching identity throughout |
| `centred` | Portrait compositions and entrance-led applications |
| `compact` | Alternative small horizontal composition |
| `wordmark` | Writing-only alternative and Friday Qur’an Circle poster |
| `entrance` | Standalone architectural mark |
| `minaret` | Decorative accent, not a replacement for the full name |
| `pillars` | Seventh variation: writing between two pillars, with no doorway |
| `pillars-outline` | Outline version of our own two minarets and writing, at the very bottom of the page |

Use `-light.svg` on pale backgrounds and `-dark.svg` on dark backgrounds. Keep their aspect ratio and clear space around them. Do not use a global CSS colour filter: it destroys the two-colour identity. Use the compact/wordmark/pillars compositions at small sizes; the detailed entrance is best at larger sizes. The website uses an `<img>` for each self-contained SVG.

## Recommended palette — Navy, Pearl & Brass (implemented)

| Role | Light | Dark |
| --- | --- | --- |
| Page | `#FAFBFD` | `#080F1D` |
| Secondary background | `#EFF2F6` | `#0F1A2B` |
| Surface | `#FAFBFD` | `#152238` |
| Main text / wordmark | `#0C1930` | `#F4F6FA` |
| Supporting text | `#5F6875` | `#B7C3D5` |
| Logo / text accent | `#89501B` | `#D6AF62` |
| Filled action | `#D6AF62` + navy text | `#D6AF62` + navy text |

The dark copper is deliberately deeper in light mode for legibility. Glass surfaces are substantially opaque to keep the photograph from competing with the text. The hero keeps white lettering in either theme because its background is a darkened photograph.

## Alternative directions (suggestions, not enabled)

| Direction | Light surface / text / accent | Dark surface / text / accent |
| --- | --- | --- |
| Deep Teal & Copper | `#F6F8F4` / `#102E2A` / `#825023` | `#0B2321` / `#EDF3EC` / `#D0A16C` |
| Charcoal & Champagne | `#FAF9F6` / `#24252A` / `#7D5828` | `#14161B` / `#F4F0E7` / `#D8BA83` |

Navy, Pearl & Brass stays closest to the supplied identity. The alternatives would need a fresh full-interface contrast and photography review before adoption.

## Maintenance

`node scripts/build-brand.mjs` regenerates the SVGs and the `jic-variations.svg` contact sheet. The shared path lettering source is `scripts/brand-wordmark.svg`. All outputs are versioned alongside the website. Run `node --test tests/*.test.mjs` after rebuilding.
