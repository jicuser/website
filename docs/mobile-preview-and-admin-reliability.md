# Timetable previews and admin requests

The reported mobile problem was a narrowed or enlarged timetable after viewing a downloaded image. The image dialog now constrains its own width, keeps the image and actions in separate scroll areas, and restores the page position and focus when closed. `pageScrollLock.js` owns the scroll lifecycle and supports overlapping callers without releasing the page early. Browser pinch zoom remains available.

The marked explanatory subtitle and footer notes have been removed from both timetable images and the monthly page. The download dialog retains its action buttons without the long instructions. Dates, prayer times, Friday colours and Jummah times are preserved. No matching conversation references were found in the live `page_content` records searched on 14 October 2026.

`recordLoader.js` owns admin read timeouts, cancellation and coalesced refreshes independently of React or Supabase. `useAdminRecords` connects it to component state and visibility events. A stalled read now times out after 15 seconds and allows retry. Failed reads clear previous records because the user's access may have changed; disposed requests cannot publish into a new view.

## Verification

- Run `npm run check`, `npm test` and `npm run build`.
- Unit regressions cover scroll/style restoration, overlapping locks, scrollbar spacing, request timeout/retry, coalescing, disposal and clearing records on denied access. Canvas checks cover 31 dates, image bounds and removed wording.
- `tests/browser/timetable-preview.spec.mjs` exercises both previews at 320px and 390px, horizontal table scrolling, dialog bounds, focus and page restoration. Run `npm run test:browser -- timetable-preview` in a browser-enabled environment.
- The browser regression could not run in this task's container: Chromium was denied its process socket; WebKit was missing shared libraries. The exact reported iPhone issue and native Share/Save to Photos remain unverified. Check both formats on an iPhone, including closing a zoomed preview and returning from Open image.

## Supabase review

Read-only live checks on 14 October 2026 found RLS enabled on all 27 public tables. The two flagged form functions deny anonymous execution, check active staff access and use an empty search path. The tables flagged for having RLS without policies are private/server-managed; no permissive policies were added. This is a focused review, not a complete security audit.

Supabase's breached-password protection remains disabled. It can be enabled in the project's Auth settings; the connected tools did not expose that setting. See [Supabase password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

No database schema or data changes are required for this release.
