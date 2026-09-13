# Monthly timetable and downloads

The monthly page now follows the supplied printed timetable: prayer names group Start and Jamat columns, unchanged congregation times use a ditto mark, and Friday rows use the website's gold with navy text. Sunrise stays separate. Maghrib uses one Adhan column only when its start and congregation times agree on every date.

| File                                                          | Responsibility                                                                                                                                   |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/lib/monthlyTimetable.js`                                 | Builds the shared table model. Validates and sorts dates, normalizes times, decides when ditto marks are safe, and retains the complete time.    |
| `src/components/sections/prayer-times/MonthlyPrayerTable.jsx` | Renders the grouped headings and live data. Keeps dates visible during horizontal scrolling and provides complete dates/times to screen readers. |
| `src/styles/monthly-timetable.css`                            | Styles the table and download list with the existing website palette. Light/dark surfaces remain readable.                                       |
| `src/lib/timetableWallpaper.js`                               | Draws monthly and phone images from the same table model. Phone images leave space above the title for the lock-screen clock.                    |
| `src/components/WallpaperDownload.jsx`                        | Prepares both JPEG files, exposes direct download links and separate previews, and preserves iPhone sharing from a tap.                          |

A ditto mark is only presentation: it never overwrites a stored time. It compares complete AM/PM values on consecutive dates in the same month. A missing date, missing time or changed value starts a new sequence.

The original ISO date is retained by `PrayerTimesLogic.js`; weekday and today highlighting therefore do not depend on a visitor's time zone. Upcoming Jummah information continues to use the existing settings and date overrides and is labelled “Next Jummah”.

The current database/CSV contract does not supply Hijri or Zawal fields. These are not calculated from prayer times or copied from one month's reference image.

Both image files are prepared before the user taps their download/share action. Unchanged polling data does not regenerate them. Temporary URLs are revoked on replacement/unmount, and the canvas backing buffers are released after encoding.

Validation: `npm run check`, `npm test`, `npm run build`. The model tests cover changed and repeated times, AM/PM differences, missing/invalid values, date gaps, month boundaries and Maghrib. The image regression covers 31-day bounds, Sunrise, and missing congregation values in both formats. The native canvas previews were also inspected visually; actual iPhone Save to Photos still needs a device check.
