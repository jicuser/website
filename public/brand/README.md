# Approved JIC stone and glass identity

These exports use the approved artwork supplied on 11 September 2026: slender rectangular pillars that step inward, layered stone collars, connected beads and thin crescents, a grey stone arch and blue-grey glass. The script lettering is outlined. SVGs have no embedded bitmap, external font or script.

| Composition | Use |
| --- | --- |
| `horizontal` | Entrance beside lettering: home page, radio and TV |
| `centred` | Full entrance with lettering above the arch |
| `pillars` | Wide lettering between two pillars |
| `compact` | Compact lettering between pillars: footer |
| `arch` | Standalone stone arch and glazed doors |
| `minaret` | Tall standalone pillar |
| `minaret-compact` | Compact standalone pillar |
| `wordmark` | Lettering only: website header and navigation menu |
| `entrance` | Entrance and pillars without lettering: staff login and mosque symbol |

Every composition has SVG and transparent PNG exports. Use `-light` on pale surfaces and `-dark` on dark surfaces. Only the navy lettering becomes pearl in dark mode; stone, glass and finial colours stay unchanged. Preserve the aspect ratio; never apply an image colour filter.

Browser, Apple, Android and radio artwork uses the entrance without lettering on a pale square. The maskable Android icon has extra safe space for device cropping. Icon references use a version suffix so browsers request the updated artwork.

## Rebuild

The original approved vectors are in `scripts/brand-source/`. Run `npm ci` then `npm run build:brand` to recreate website SVGs, PNGs, the contact sheet, favicon.ico, Apple touch icons and app artwork. Sharp is a development dependency only. Run `node --test tests/*.test.mjs` and `npm run build` after changes.
