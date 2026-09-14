# One-screen after-salah dhikr

## Content and sources

This is a selected after-salah set based on the page requested by the mosque:
https://www.islamic-relief.org.uk/resources/knowledge-base/five-pillars-of-islam/salah/dhikr-after-salah/

The Arabic text and counts were checked against these primary narrations and the Quran:

- Seeking forgiveness three times, then the peace supplication: Sahih Muslim 591,
  https://sunnah.com/muslim:591. The wording with “ya dhal-jalali” is also reported
  in Muslim 592a, https://sunnah.com/muslim:592a.
- The tawhid declaration followed by “Allahumma la mani'a…”: Sahih al-Bukhari 844,
  https://sunnah.com/bukhari:844.
- Tasbih, tahmid and takbir 33 times each, then the tawhid declaration once to
  complete 100: Sahih Muslim 597a, https://sunnah.com/muslim:597a.
- Full Ayat al-Kursi: Quran 2:255, https://quran.com/2/255. Its recitation after
  obligatory prayer is reported from Abu Umamah by an-Nasa'i and recorded in
  Bulugh al-Maram, Book 2, Hadith 220, https://sunnah.com/bulugh/2/220.

The guide also mentions saying the tawhid declaration 100 times **in a day**.
That is a separate narration (Bukhari 3293, https://sunnah.com/bukhari:3293), not
an instruction to repeat it 100 times after every salah. It is not added as such.
This display is not an exhaustive list of all valid Sunnah adhkar or variants.
The screen contains only the Arabic recitations, Arabic headings and repetition
badges. It has no transliteration, English meaning, reward claims or timed slides.

## Display behaviour

`TV_DHIKR` now holds one board's content instead of an array of timed slides.
`TvPrayerScene` renders all of it together. The complete existing Arabic Ayat
al-Kursi text is retained by joining its three previously displayed parts.

Only the existing dhikr phase adds `is-dhikr` to the normal display frame. During
that phase the timetable header and non-logo footer text are hidden so the board
can use the available screen. They return with the next normal phase. The display
code/approval component remains in place.

The prayer timing, London date checks, prayer-enabled switch, shoe-area exclusion
and live-presentation priority are unchanged. Live scenes are not interrupted by
automatic dhikr. The existing schedule begins dhikr five minutes after most
congregation starts, ten minutes after Maghrib, and returns to normal twenty
minutes after the start. These are display timings, not prescribed worship counts.

The normal footer logo grows into the existing blank footer gap and moves towards
the left edge. Live-scene logos are larger and left-aligned within the same canvas.
The SVG artwork, poster dimensions, media input coordinates, streaming transport,
Supabase, authentication, Flutter and hosting/domain settings are unchanged.

## Verification

- `node --test tests/tv-dhikr.test.mjs`: six content/count tests. Five failed against
  the old slide content, and all six pass against the new board.
- The changed JSX was transpiled/parsed with TypeScript. The pure prayer component's
  output was checked at six dhikr timestamps: identical complete board each time,
  five repetition badges and Arabic-only visible copy. The existing congregation
  and Friday notices were also checked.
- Isolated component markup and the actual TV stylesheet were rendered in local
  Chromium at 1280x720, 1920x1080, 1366x768, 3840x2160, 1024x768, 844x390 and
  390x844. Checks found no clipped text, overlapping cards or scrolling. The TV
  view retains its landscape frame; portrait phone text is correspondingly small.
- The Arial fallback was checked at 720p and 1080p. Normal and live-scene logo
  geometry was compared before/after using a placeholder with the unchanged SVG's
  actual aspect ratio; the poster/source bounds stayed unchanged.

These are targeted content, markup and layout checks, not a full application build,
React integration run, production deployment check or physical TV/casting test.
