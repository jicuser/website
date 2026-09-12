# Wallpaper download and timetable header fixes

The footer linked to Today's timetable, but the wallpaper control was only on Monthly Timetable. The first download button also opened a preview instead of saving a file.

| File                                                          | Change                                                                                              | Coding idea                                                                       |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `src/components/shell/Footer.jsx`                             | Links to `/prayer-times/monthly#phone-wallpaper`.                                                   | A URL needs both the correct page and the correct section.                        |
| `src/pages/PrayerTimesPage.jsx`                               | Redirects old wallpaper links to Monthly.                                                           | Keep previously shared links working after changing navigation.                   |
| `src/lib/scrollToAnchor.js`                                   | Waits for a delayed section to appear, then scrolls once and stops watching.                        | An observer responds to actual loading instead of guessing a delay.               |
| `src/components/WallpaperDownload.jsx`                        | Prepares the JPEG from the monthly data, then supplies a normal download link. Preview is separate. | An anchor with `href` and `download` lets the browser save directly from the tap. |
| `src/components/shell/JamatiaLogo.jsx`                        | Sets image width and height to match each SVG's proportions.                                        | The browser can reserve space before the image loads. CSS still scales it to fit. |
| `src/components/sections/prayer-times/PrayerScheduleTabs.jsx` | Removes the timetable's entrance movement.                                                          | The destination should stay still while scrolling to a download control.          |
| `public/.htaccess`                                            | Revalidates the entry page after deployments.                                                       | Keep versioned assets cached while checking the entry page for updates.           |

The wallpaper is rebuilt only when timetable values change. Unmounting revokes its temporary URL; a late image callback cannot restore an obsolete download. Failed generation has a retry action. An empty timetable does not produce invented prayer times.

The shared header keeps the existing logo artwork. Its mobile Menu also explicitly disables native button styling. Already-open tabs need a reload to pick up changed code.

Checks include the production build, the repository test suite, logo proportions for both themes, delayed/missing/cancelled anchor navigation, and six real React checks covering the direct download link, unchanged polling data, preview closure, stale generation, retry and legacy routing. Real iPhone Safari rendering and saving to Photos require a phone check.
