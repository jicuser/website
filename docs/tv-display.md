# Hall streams and presentation sessions

Every hall has a permanent `/tv179/<hall>` display webpage. Open it on the TV, laptop or phone that will show the output. Changing scenes never changes that address.

## Normal and Class / Teach

Normal is public and shows the configured posters, prayer timetable and automatic prayer, Jummah and Ramadan notices. It never requires a viewing code. Class / Teach pauses those automatic notices and shows the selected scene.

In Admin, choose the hall stream, choose Class / Teach, then build a scene:

1. Press **Add content**, choose its type and complete the fields shown. Name a camera or sharing laptop once. Reuse its named source in other scenes when needed.
2. Select content in the canvas to edit, move, resize, change audio or remove it. Properties appear alongside on wide screens and below on phones. The live picture preview stays inside the canvas.
3. Draft changes are kept on this browser. **Save draft** keeps them without changing viewers. **Present** saves the selected scene and updates the display webpage.
4. Give viewers the eight-digit session code shown in Admin. On the display webpage, they press **Connect display**, enter their display name and the code. They do not need a staff account.

The connection icon fades while the display is idle and returns when touched, pointed at or focused. Its panel can be closed with × or Escape and closes after joining. The public display never reveals the session code.

Saving another scene keeps the current session code. **Start new presentation** ends previous live inputs and viewing access while retaining saved scenes, then opens a draft. Press Present to start the new session and generate its new code. **Return to Normal now**, saving Normal, a timed end, or presenting an empty selected scene ends private viewing. Joining from a second staff device never resets the session.

## Camera and laptop contributors

Add a named camera or screen source, then Present it. In **Share from a device**, start the matching source on the device that supplies it. **Allow another device to join** reveals that source's sharing link. The link opens a dedicated staff page for that source; it has no scene editor or reset control. A viewer's session code cannot publish a camera, change scenes or edit the website.

Keep each contributing page open. Capture begins only after the browser grants camera or screen permission. Refreshing a capture page stops its browser capture; login is retained, and **Restart this camera / Restart screen sharing** can replace only that tab's leftover connection. Refreshing a viewing page reconnects it to the current presentation. Switching focus does not intentionally stop capture, but phones and browsers may suspend background cameras. The active-sharing notice and browser leave warning explain this limitation.

**Retry viewing connection** rebuilds that source's connections without restarting its camera or screen capture. Local camera preview, a connected transport, and a received layout are different signals. Inspect the receiving picture and sound before treating a session as ready.

## Network and outgoing broadcasts

Same Wi-Fi is a useful first test, but guest network isolation can still block peer connections. Reliable connections across different networks may require TURN, configured in the `TV_ICE_SERVERS` Edge secret. See the [WebRTC TURN guide](https://webrtc.org/getting-started/turn-server). A “relay configured” message only confirms a TURN URL is configured; it does not prove that server is reachable.

Website broadcasting to YouTube/TikTok uses a separate media relay (`VITE_MEDIA_RELAY_URL`, `services/media-relay`). TURN helps devices exchange media; the media relay forwards the finished display picture to a broadcast platform. Neither is configured by a viewing code. Broadcast controls explain when the outgoing service is absent. A broadcasting laptop can use the finished display tab through OBS or the configured website relay. Do not feed the outgoing YouTube broadcast back into the same scene.

## Implementation and access boundaries

- `tv_screens` stores saved layouts and their revision. A save rejects a stale revision instead of overwriting another operator's changes.
- `tv_presentations` holds the current session ID and code for each hall. Only the server service role can read it. The code is returned only to authenticated staff with hall-stream permission.
- `tv_devices` holds hashed viewer credentials bound to a presentation and hall. Session removal cascades to those credentials and their receivers. Admin previews use shorter credentials and do not appear in the viewer list.
- `tv_join_attempts` bounds failed guesses per address hash and hall. Successful joins do not consume the failed-guess allowance, so a class can join behind one Wi-Fi address. The address itself is not stored.
- `tv_inputs` are four independent named source slots per hall. The slot is an internal identifier; the UI uses its saved name. Each mounted player has its own `tv_peers` row, avoiding negotiation collisions between tabs.
- Public status returns a known mode separately from redacted public settings. It contains no private scene, media source IDs or session code until authorized. The webpage uses a neutral loading/reconnecting state before reliable status arrives.
- Browser tab authentication survives refresh. Profile RPCs run after auth notifications return, and bounded requests expose Retry without clearing login. Explicit logout remains available on Admin and the public website.

Scene JSON and the Edge request contract are reusable from a future Flutter client. Flutter must preserve stable hall, scene and source IDs, use authenticated contributor requests, and implement media capture/playback for its own platform.

## Deployment and checks

Apply `20260912105049_presentation_sessions.sql`, deploy `tv-control` and its shared modules, then publish the matching frontend. This migration clears old connections and approvals and returns displays to Normal; saved scenes, posters and accounts remain. Old browser-pairing endpoints are retired. Historical migrations remain as database history, not active alternate implementations.

Run `npm run validate`. Run `tests/tv-presentation-sessions.sql`, `tests/tv-receiver.sql` and `tests/staff-tv-permissions.sql` against the migrated schema; their fixture changes roll back. The tests cover code access, shared-Wi-Fi joins, session rotation, expired viewing access, empty-scene fallback, stale saves, permission boundaries, independent receivers, auth restoration and capture lease recovery.

For acceptance, test one viewing display, one laptop screen and one phone camera: join the current code, show both named inputs, rearrange and Present, refresh each device separately, change scenes, end the session, then join a new session with its new code. Check mobile button placement and audio on the physical devices. Automated tests do not establish browser codec support, camera delivery or network reliability.
