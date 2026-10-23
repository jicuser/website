# Public reading pages

The `/worship` hub has three primary destinations: Adhkar, Qur’an and Janazah Guide. The previous `/worship/daily-salah` URL redirects to `/prayer-times` so the public site has one timetable. Existing worship URLs are retained.

The three readers are nested dynamic imports. Their Arabic text, surah directory and reader stylesheet are loaded only when that reader is opened. No full Qur’an verse dataset is bundled; the reader requests one surah at a time from the existing AlQuran Cloud API.

## Text sources and scope

Checked on 23 October 2026. This is a short selection of adhkar, not an exhaustive collection. Arabic is based on these published hadith texts. Transliteration and concise English meanings are reading aids prepared for this page; they do not replace learning pronunciation or consulting the Imam.

| Reading                                                   | Published reference                                      |
| --------------------------------------------------------- | -------------------------------------------------------- |
| Morning/evening supplication                              | [Sunan Abi Dawud 5068](https://sunnah.com/abudawud:5068) |
| Bismillah protection remembrance, three times             | [Sunan Abi Dawud 5088](https://sunnah.com/abudawud:5088) |
| Sayyid al-Istighfar                                       | [Sahih al-Bukhari 6306](https://sunnah.com/bukhari:6306) |
| Istighfar three times and the prayer of peace after Salah | [Sahih Muslim 591](https://sunnah.com/muslim:591)        |
| Tasbih/tahmid/takbir 33 each and the completion of 100    | [Sahih Muslim 597a](https://sunnah.com/muslim:597a)      |

The morning/evening wording intentionally follows **Abu Dawud 5068**, including its shorter evening wording ending `wa ilayka-n-nushur`. Other narrations and published collections use different wording; do not silently combine variants. The Sayyid al-Istighfar “read once” label describes this short selection, while the linked report describes saying it by day or night with conviction without prescribing a repeated count.

Janazah follows the **Hanafi** method in the existing [Method of Funeral Salah](https://www.dawateislami.net/bookslibrary/en/method-of-funeral-salah), Maktaba-tul-Madina / Dawat-e-Islami, printed pages 8–10 (PDF pages 12–14). The added `wa jalla thana’uka`, adult du‘a and separate boy/girl supplications were checked against the publisher PDF, including a visual check of the Arabic on PDF pages 13–14 because automatic text extraction corrupts the embedded Arabic font. The base first-takbir praise is cross-referenced to [Jami‘ at-Tirmidhi 243](https://sunnah.com/tirmidhi:243), with the Hanafi addition from the guide. Salat Ibrahimiyya follows the Arabic in [Sahih al-Bukhari 3370](https://sunnah.com/bukhari:3370); the salam wording is in [Sunan Abi Dawud 996](https://sunnah.com/abudawud:996). The page identifies this method and instructs worshippers to follow the Imam.

The existing English PDF remains publisher-hosted. The direct [Urdu PDF](https://data2.dawateislami.net/Data/Books/Download/ur/pdf/2014/62-1.pdf?fn=namaz-e-janaza-ka-tariqa) was retrieved from the [publisher’s Urdu library page](https://www.dawateislami.net/bookslibrary/ur/namaz-e-janaza-ka-tariqa). Books are linked intact; the site does not host or repackage them.

The Qur’an directory is a metadata snapshot of [AlQuran Cloud `/surah`](https://api.alquran.cloud/v1/surah), checked on the same date. Arabic and English verses are fetched as `quran-uthmani,en.sahih`; the latter is Sahih International’s English translation. The parser checks the requested surah, edition identifiers, verse counts and verse numbers before displaying paired text. This verifies response structure and alignment, not independent textual authenticity. Quran.com remains available during loading, on failure and after successful reading.

## Reader behavior

Qur’an search accepts a surah’s name, English meaning, Arabic name without vowel marks, or exact number. Search results are ordinary keyboard-accessible buttons; the complete native select remains available. Text size ranges from 24px to 48px; translation is optional. A saved verse and display preferences use only `localStorage` (`jic-quran-reading-v1`). Continue reading loads the saved surah and focuses the saved verse. Corrupt or inaccessible storage falls back to reading defaults and does not stop reading. Storage failures are disclosed when saving.

Requests use an `AbortController` and a 20-second timeout. Switching surahs or leaving the reader aborts the request. An active-request guard prevents stale responses from replacing the current text even if a fetch implementation ignores cancellation. Loading and error states clear the previous surah’s verse text. Retry and the external Quran.com link remain available on errors.

## Focused verification

Run `node --test tests/worship-reading.test.mjs tests/guide-resources.test.mjs` and `npx playwright test tests/browser/worship-reading.spec.mjs`. The browser suite checks the three primary choices, collection switching, visible recitations and child duas, Urdu PDF/contact links, the timetable redirect, named surah search, reading preferences, saved-verse focus after reload, request cancellation, and the error fallback. API fixtures are explicitly test text and never bundled into the public reader.

Build with a manifest and run `npm run check:startup`; the nested readers and their data must stay outside the public startup import graph, which has a 240,000 gzip-byte JavaScript budget.
