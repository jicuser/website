# Local prayer search, radio status and portal entry

The home and prayer-page titles/descriptions identify Jamatia Islamic Centre (JIC),
Woodlands Road Masjid, Sparkhill, Birmingham and the West Midlands. Salah/Namaz,
Jama’ah, Jummah and the monthly timetable use natural descriptive text. Canonical
page addresses remain unchanged. The mosque schema includes its existing verified
address, phone, social profiles, local aliases and a stable identity shared by
prayer-page WebPage/BreadcrumbList data. Other mosques are not alternate names.

The three prayer-page HTML documents include the same short location introduction
and timetable links as the React page before JavaScript runs. Current prayer times
continue to load from the published timetable API; the build embeds no times that
could become stale. Google chooses indexing, rankings and special prayer panels.
There is no markup in this change that promises a Google prayer panel or ranking.
The owner can request recrawling of `/` and `/prayer-times` in Search Console and
keep the centre’s verified Google Business Profile name/address/website consistent.

On 23 October 2026 the station’s public Icecast `/status-json.xsl` response exposed
an `/autodj` holding stream titled `NOT LIVE - NOT LIVE [13vv]`, with empty `/live`
and `/stream` mounts. Loading audio therefore established connectivity, not a live
broadcast. The public CORS-enabled status feed is now polled every 45 seconds and
when connectivity or tab visibility returns. Only an active audio source outside
AutoDJ/fallback mounts, without an explicit off-air title, triggers the live notice.
Errors/timeouts are unknown and suppress the notice; playback stays user initiated.
No server credentials or private station APIs are used. Status parser code loads
separately from the bootstrap bundle.

The portal entry now puts its sign-in form first in both document and visual order.
Password and email-link choices share one row; account creation has its own link.
Help is grouped below the action and unavailable Google/family features add no
setup messages. Existing auth redirects, email verification and account permissions
are preserved. Only the available Google sign-in button appears when configured.
