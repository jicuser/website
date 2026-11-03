# Mobile homepage correction

Replaces the cramped five-card timetable and clipped month strip with one semantic table, one current-prayer highlight, a local countdown and previous/date/next controls. The table uses a labelled 24-hour clock; the next-event summary retains the site's familiar time formatter. Radio remains playable in the existing home player; only the duplicate radio link inside the timetable is removed. All existing prayer, reminder, menu, back/forward and community destinations remain unchanged.

The next-event panel distinguishes prayer begins from Jamaat and handles same-time Maghrib, multiple Friday sessions, UK daylight-saving changes and published tomorrow-Fajr data. Missing or stale rows do not produce invented current times. The seconds clock performs no network requests and pauses while hidden. This update does not change TV takeover scheduling, database records, login, permissions, payments or forms.

Mobile photography now fades into an opaque reading background before the activity section. Solid and reduced-transparency preferences remain supported. Card rules use a distinct component class rather than stacking rules over the legacy browser tiles.

## Verification performed

39 focused Node tests passed across prayer-display-state, home-prayer-view and real-component server rendering. Changed JS/JSX transpiles and CSS parses. An isolated browser fixture using the actual React component passed widths 320, 375, 390, 430, 768 and 1280 px, with no horizontal page overflow or JavaScript errors. Date arrows, native date entry, return-to-today, hidden historical countdowns, live second updates, light mode and solid mode were checked. The surrounding preview shell used sample content; this is not a full production end-to-end test.

Full repository validation and deployment verification are still required through the repository workflow; no claim of full build or live deployment is made by the isolated checks.
