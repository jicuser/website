# Mosque TV screens

Open **Admin → TV screens**, then choose a hall from the selector. Each hall keeps its own settings.

| Admin entry           | TV address               |
| --------------------- | ------------------------ |
| Men’s Main Hall       | `/tv179/mens-main`       |
| Men’s Upstairs Hall   | `/tv179/mens-upstairs`   |
| Ladies’ Upstairs Hall | `/tv179/ladies-upstairs` |
| Shoe Area             | `/tv179/shoe-area`       |

`/tv179` still opens Men’s Main Hall. `/tv` redirects there. Add the website domain before these paths when entering them on a TV.

## Choose what each TV shows

Choose **Normal**, **Class** or **Speech**. Mode buttons apply immediately. Panel selection, position, text and display switches use **Update this TV**. Updates reach TVs within eight seconds.

| Mode   | Display                                                         | Prayer sequence             |
| ------ | --------------------------------------------------------------- | --------------------------- |
| Normal | Two rotating posters, with automatic Jummah and Ramadan notices | Automatic when enabled      |
| Class  | Your selected sources and layout                                | Paused until the class ends |
| Speech | Your selected sources and layout                                | Continues when enabled      |

For Class or Speech, tick up to four panels: **Poster / slide 1**, **Poster / slide 2**, **YouTube**, **CCTV / installed camera**, **Shared screen / device camera**, or **Website livestream**. Sources can play together. The two poster panels show consecutive posters from the selected list. A source that cannot play falls back to a poster independently of the other panels and retries after 30 seconds.

Choose **Side by side**, **Top and bottom**, **Grid**, **Large panel on left** or **Large panel on right**. The numbered landscape diagram shows their positions. Use the arrow buttons to change panel order; the first source occupies the large area in either large-panel layout. This is a diagram of your draft; **Preview TV** shows the saved live output.

**Salah timetable**, **Next prayer reminder** and **Current clock** have separate switches under **What stays visible**. They apply to the selected TV in every mode. Clock and prayer time displays use 12-hour time and Europe/London dates. Posters and video fit without cropping.

Class and Speech return to Normal after the selected duration. **Back to normal** stops sharing and clears temporary event text and notice overrides. It retains the source arrangement for the next class, plus your calendar and visibility settings. Removing the shared-screen panel also stops its session; rearranging sources does not. The shoe area has no Class/Speech or private feeds and keeps its poster-only content.

Open the hall address in the smart TV browser and leave it open. The browser follows the saved settings; there are no mode or layout controls on the TV itself. Use landscape orientation. Double-click requests fullscreen and landscape locking when supported; the TV browser can also enter fullscreen. Wake Lock is requested where available.

**Preview TV** opens the real TV page at 1280×720 inside Admin. It can receive the active shared source. Its separate credential expires after ten minutes and is revoked on closing; it does not replace the physical TV’s pairing. Local feeds require the previewing device to reach the mosque network. A working preview is not confirmation that the physical TV is playing.

YouTube links must identify an embeddable video or live video, not a channel homepage. Audio is muted by default; browsers may require a playback gesture when sound is enabled. Setup controls do not appear on TV pages.

## Approve a TV browser for private feeds

1. Choose the hall in Admin, expand **TV sound & private video access**, and press **Create private TV link**.
2. Open that link in the TV browser.
3. Press **Refresh connections** in Admin to check that it appears.

This approves the web browser; it is not Bluetooth pairing or casting. Approval links work once and expire after ten minutes. A paired browser remembers its credential for 90 days. Clearing browser storage requires pairing again. Use **Disconnect** to remove a TV's private access. Public poster and YouTube displays continue to work without pairing.

Treat an unused pairing link as access to that room's private feed. It is removed from the TV address after use. No staff login is saved on the TV. Camera URLs and screen-sharing connection details are withheld from public visitors.

## Share a laptop screen or phone camera

Open the room in Admin on the sending device. Choose Class or Speech, tick **Shared screen / device camera**, arrange the panels and press **Update this TV**. Then press **Share screen** or **This device’s camera** and approve the browser’s capture request. The selected source appears in its chosen panel on approved TVs for that room. It can appear alongside CCTV, YouTube and a poster.

Keep the sending admin page open and the phone awake. Stop with **Stop sharing**, the browser's sharing control, or by leaving that admin screen. The saved source resumes; **Back to normal** restores posters. If the sender loses its connection, the session expires within 90 seconds, followed by the TV's next status check. A different authorised staff member can refresh the room and stop its existing session.

Laptop screen capture can include audio when the selected browser/source supports it. The camera button sends video without microphone audio. Whole-phone screen capture is not supported by current iPhone/Android browsers; native AirPlay/Cast is separate and takes over the TV display rather than appearing inside this prayer layout. See [browser screen capture](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia) and [camera capture](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).

Both devices need internet access to the site and Supabase for pairing and connection setup, even on the same Wi-Fi. Media uses WebRTC. A shared network usually helps, but guest/client isolation, firewalls and TV browser support can prevent a direct connection. An optional TURN relay can help when direct connections fail.

## Connect a local Wi-Fi/IP camera

The TV player accepts:

- An **HTTPS HLS** stream, normally ending in `.m3u8`.
- An **HTTPS WebRTC/WHEP** endpoint.

A raw `rtsp://` camera URL cannot play in a browser. Use a local relay such as MediaMTX to read the camera and expose HLS or WHEP. The relay must remain running and reachable from the TV. Configure trusted HTTPS, CORS for the website origin, and a video codec the TV supports. HLS is usually more compatible but has more delay; WebRTC is usually faster. Do not place camera usernames/passwords in website URLs. See the [MediaMTX browser playback guide](https://mediamtx.org/docs/read/web-browsers).

For WHEP, enter the complete endpoint and expose its `Location` response header through CORS so the player can close its session. The implementation sends a complete SDP offer and does not use trickle ICE. HLS uses native playback where available, otherwise the separately loaded `hls.js` player.

No real camera address is preconfigured. The camera/TV models, network reachability, certificate and codec still need checking on site. A relay cannot correct an unsupported codec without transcoding.

## Code and backend

- `src/components/admin/TvScreenEditor.jsx`: four instances of one room editor.
- `src/components/admin/TvLayoutEditor.jsx`: source selection, panel order and the landscape arrangement diagram.
- `src/components/tv/TvMediaPanel.jsx`: independent media players and poster fallbacks.
- `src/hooks/useTvPublisher.js`: capture, staff heartbeat and sending peers.
- `src/hooks/useTvScreen.js`: TV pairing and room status.
- `src/components/tv/PrivateTvPlayer.jsx`: receiving WebRTC and playing local camera streams.
- `src/lib/tvControl.js`: API calls and ICE gathering.
- `supabase/functions/_shared/tv.js`: room names, settings validation and public-data filtering.
- `supabase/functions/tv-control/index.ts`: API authentication and signalling.
- `supabase/migrations/20260911222221_tv_screens_and_sharing.sql`: four rooms, pairing codes, devices and peer records.

New tables have RLS enabled and no browser-role grants or policies. This deliberately denies direct browser access; the Edge Function's service client performs checked operations. Supabase's [RLS-without-policy notice](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) is expected for these tables. Staff actions verify the user JWT and the active role in `profiles`; metadata supplied by the user is never trusted. Device tokens and one-use pairing codes are stored as SHA-256 hashes. Peer requests are scoped to a device, room and current session. Starting/stopping a session clears its signalling records; revoking a device also removes its peers.

The optional `TV_ICE_SERVERS` Edge secret accepts an `RTCIceServer[]` JSON array. It is returned only to authenticated staff and paired receivers; never put TURN credentials in `VITE_*` variables. Use dedicated relay credentials and rotate them when revoking access. Without this secret the application supplies a public STUN server and attempts a direct connection.

## Verification and on-site check

`npm run validate` checks the frontend, shared TV validation/privacy tests and the production build. The Edge Function can be type-checked with `npx deno check --node-modules-dir=manual supabase/functions/tv-control/index.ts` after installing dependencies.

Before relying on the display during a service, pair one real TV and check each room's posters, 12-hour clock, sound, screen capture and camera feed. Confirm that Stop and Revoke return the TV to public content, then repeat in the remaining halls. Test Android Chrome and iPhone Safari in both themes. Software/API checks do not replace those hardware and local-network checks.

## Prayer sequence and class staff

The three hall screens support cameras, YouTube and paired screen/camera sharing. The shoe-area screen is restricted in both the player and API to times and posters; its live-feed and pairing controls are hidden. The two-pillar logo sits at bottom left and the prayer strip starts at the top of the screen.

With automatic prayer display enabled, each congregation starts a silent phone/quiet-hall notice. Dhikr begins five minutes after Jama‘ah, or ten minutes for Maghrib. At twenty minutes after Jama‘ah, the saved display resumes (posters by default). Friday follows both configured Jummah congregation times instead of Dhuhr. Missing or stale daily data does not trigger a sequence. Ayat al-Kursi is shown in three consecutive parts, followed by short dhikr; each card remains for forty seconds. General mosque-etiquette reminders rotate beneath ordinary hall content. These are original reminders, not attributed hadith or specific reward claims.

Class pauses prayer and manual notices until its expiry. Speech and Ramadan allow prayer notices to temporarily replace video. Capture remains active on the sender during that interruption; use Stop sharing to end capture itself.

A Super Admin can choose **TV operator (TV controls only)** in **Staff access / Users & roles**, for an existing user or an invitation. This role can control the four TV panels but cannot edit website pages, timetable records or other users. Assigning it replaces that user's previous role. Existing administrators and content editors retain TV access. No users are promoted automatically. Apply the TV-operator migration and redeploy both `tv-control` and `manage-user` before deploying this frontend.

Camera discovery must run on a device connected to the mosque network. The saved office-PC connection on port 4455 identifies OBS remote control, not a confirmed camera stream. Check the router's connected-device list or the camera source in OBS for the actual address and stream path. Do not assume all cameras share that subnet or add guessed IPs as streams.

## Jummah and Ramadan notices

Under **Automatic prayers, Jummah & Ramadan**, Normal uses London time and the current dated timetable:

- Friday welcome runs from one hour before the first Jummah until 20 minutes after the last. The congregation/dhikr sequence has priority.
- Ramadan follows the Umm al-Qura Islamic calendar. Set the local moon-calendar adjustment (−2 to +2 days), or choose **Ramadan is on/off** to match the mosque’s announced dates. A positive adjustment advances the Islamic date; it never changes prayer times.
- During Ramadan, the du‘a screen runs 20–40 minutes after Isha Jama‘ah. Outside that window, fasting times appear for 20 seconds and posters for 40 seconds in each minute.
- Class and Speech keep their selected sources regardless of the seasonal calendar. Speech can still show the enabled Jama‘ah/dhikr sequence.
- **Notice override in Normal mode** can keep a Jummah or Taraweeh notice on until staff restore **Automatic**. Missing/stale timetable data prevents automatic seasonal notices.

Edit the Jummah message for welcome information and local notices. It is also used at both Friday congregation times. Taraweeh accepts up to 1,200 characters of Arabic or English. Blank text displays the general Qur’anic supplication in [Al-Baqarah 2:201](https://quran.com/2/201); it is not presented as a prescribed Taraweeh formula. Text is displayed literally, never executed as HTML. Automatic Jama‘ah/dhikr takes priority over special notices; class mode suspends both. Shoe-area settings cannot enable either special notice.

During Ramadan in Normal mode, fasting times use the dated mosque timetable. Before iftar the display shows today’s Fajr and Maghrib beginning times. At/after iftar it uses tomorrow’s record, including month and year boundaries. Missing data is labelled unavailable; times are never guessed. Class and Speech use their saved panels instead of these seasonal cards.

## Streamerr video

[Streamerr Video](https://streamerr.co/videostreaming) is a separate video service supporting OBS/RTMP input and website embedding. An existing radio URL is audio only. This implementation accepts browser-playable HLS/WHEP camera sources and YouTube video links; a Streamerr account’s embed/player must be checked before connecting that service. No video subscription is purchased or configured automatically.
