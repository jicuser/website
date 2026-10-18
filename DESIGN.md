# JIC website design

## Direction

A welcoming public website for a real community centre: worship, learning, practical support and personal account access. Liquid Glass surfaces, clear editorial headings and focused service sections make those journeys easy to understand on a phone. Navy, neutral glass and brand gold form one visual language across navigation, page actions, service cards and the member portal.

Reference: https://uselabbaik.com, inspected on 18 October 2026 alongside the supplied mobile captures. The reference informs spacing, hierarchy and graphics. JIC is a public masjid website: its homepage prioritises prayer, current activities and practical support rather than a software sales story. JIC retains its own navy-and-gold Liquid Glass identity. Its software pricing, product illustrations, logos and automation claims are not part of JIC's design.

## JIC tokens

| Role           | Light theme | Dark theme |
| -------------- | ----------- | ---------- |
| Page           | `#f9f7f1`   | `#080f1d`  |
| Surface        | `#fffefa`   | `#112a43`  |
| Primary text   | `#081222`   | `#f4f6fa`  |
| Secondary text | `#26364a`   | `#b7c3d5`  |
| Brand gold     | `#89501b`   | `#e9bc67`  |

These are JIC implementation choices. The reference branding extraction reported `#FAF8F3`, `#00A892`, DM Sans and Amiri; JIC retains its existing body font stack and uses Georgia for editorial headings to avoid another font dependency.

## Components and ownership

- `HomePage` retains published prayer, event, poster and livestream behaviour.
- `features/services` owns the CMS-aware searchable service catalogue and reusable directory.
- The homepage shows current activities and three compact support links; full search and the complete catalogue belong on Services. Learning, account and help destinations remain available through their own pages and navigation.
- `portal.css` owns member sign-in/workspace geometry.
- `features/admin` owns permission-aware task discovery and staff overview states.
- `theme.css` owns semantic colours; individual component styles own geometry.
- `liquid-glass.css` owns shared controls and surfaces. Gold edges/underlines identify primary actions and selected choices without changing their glass fill. Solid mode and reduced transparency remain supported.

Staff navigation groups tasks behind disclosures and search, with one account menu. Section IDs, permissions and unsaved-change checks remain stable.

The TV workflow is screen → display section → design and colours → individual items → review → save. Layout proposals compare the current draft with a proposed design; the final review compares a saved snapshot with the actual draft. Midnight, Pearl and Forest are validated TV-only palettes. Colour choices do not alter poster artwork or the staff interface theme.

Use real destination links and content. Empty records remain empty; an enquiry is not a booking confirmation. Public guidance stays available before account creation where the existing service supports it.

## Responsive and interaction rules

Public sections align to a shared 1120px content width with fluid 16–32px gutters. A single homepage flow owns compact 32px section gaps; other page sections use 40–72px gaps; cards use shared padding and keep actions aligned without forcing fixed heights on phones. Related fields stay close together, while separate tasks have larger group gaps. Homepage programme cards show the poster, schedule and a direct details link; extended descriptions remain on the programme page.

Sections use centred reading widths; cards collapse into a single column on small phones. Essential Janazah/Nikah links remain above prayer details on mobile. Controls have at least 44px targets; mobile text inputs use 16px to avoid browser focus zoom. Directory filters remain keyboard accessible. Optional staff guidance uses native details controls. Daily reminders appear on the homepage, prayer and worship pages. Mobile search and appearance controls live in the menu; the expanded prayer panel shows a single timetable with a close control. Respect reduced motion and preserve saved appearance choices; new visitors start in the light theme.

## Assets

The mosque photograph is JIC's existing `/optimized/jic-aerial-sunset.webp`. Existing programme posters retain their original files for viewing/download.
