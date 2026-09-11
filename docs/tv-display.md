# Mosque TV screens

Each screen has its own entry in Admin and its own saved display settings.

| Admin entry           | TV address               |
| --------------------- | ------------------------ |
| Men’s Main Hall       | `/tv179/mens-main`       |
| Men’s Upstairs Hall   | `/tv179/mens-upstairs`   |
| Ladies’ Upstairs Hall | `/tv179/ladies-upstairs` |
| Shoe Area             | `/tv179/shoe-area`       |

`/tv179` still opens Men’s Main Hall. `/tv` redirects there. Add the website domain before these paths when entering them on a TV.

## Choose what each TV shows

Open the screen's entry in Admin. Choose posters, the website livestream, a separate YouTube video/live link, or a local camera. Select programme posters, whether to include published upcoming events, rotation speed and muted audio. Press **Save screen settings**. The TV checks settings every eight seconds; programme/event content refreshes every minute.

All screens retain prayer times and a 12-hour clock using Europe/London time. Posters fit without cropping. Press **F**, double-click the display, or use the TV browser's full-screen option. Wake Lock is requested where available; also check the TV's sleep settings.

The default mode follows the website's enabled/scheduled YouTube livestream, otherwise it shows posters. A YouTube channel homepage is not a video/live link. Videos must allow embedding. Sound starts muted by default; a TV may require someone to press its playback button when sound is enabled.

## Pair a TV for private feeds

1. In Admin, open the correct room and press **Create pairing link**.
2. Open that link in the TV browser. Alternatively, open the room's TV address, press **Pair TV**, and paste the pairing code using the TV's keyboard or remote-control app.
3. In Admin, press **Refresh paired TVs** to check that it appears.

Pairing links work once and expire after ten minutes. A paired browser remembers its credential for 90 days. Clearing browser storage requires pairing again. Use **Revoke** to remove a TV's private access. Public poster and YouTube displays continue to work without pairing.

Treat an unused pairing link as access to that room's private feed. It is removed from the TV address after use. No staff login is saved on the TV. Camera URLs and screen-sharing connection details are withheld from public visitors.

## Share a laptop screen or phone camera

Open the room in Admin on the sending device, then choose **Share laptop screen** or **Share this camera**. Approve the browser's capture request. The selected screen or camera appears on paired TVs for that room, beside a poster and below prayer times.

Keep the sending admin page open and the phone awake. Stop with **Stop sharing**, the browser's sharing control, or by leaving that admin screen. Normal display resumes. If the sender loses its connection, the session expires within 90 seconds, followed by the TV's next status check. A different authorised staff member can refresh the room and stop its existing session.

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
