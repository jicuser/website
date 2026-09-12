# Staff access and TV scenes

## Invite a colleague

Open **Admin → Staff & access**. Enter their name and email, tick optional staff labels, then tick the specific editing permissions. Nothing is selected automatically. Being a teacher or volunteer does not grant access. TV operators need **TV scenes and device inputs**; recording and external broadcasting additionally need **Recording and broadcasting**.

Invited accounts without permissions can complete account setup but cannot open Admin. An owner can grant access later. A delegated staff manager can only grant permissions they hold and cannot change an owner or their own access. Picture uploads require the upload permission plus access to the relevant editor. Delete permission applies only inside permitted sections.

Invites use `/admin/setup`. In Supabase **Authentication → URL Configuration**, the public JIC website must be the Site URL and its exact `/admin/setup` URL must be allowlisted. Do not use a Vercel dashboard or protected deployment address. Existing incorrect emails need a new setup email after this configuration is corrected. No automatic test invitations are sent.

## Put a TV on the wall

1. Connect it to the mosque network and open its browser.
2. Open the hall address shown in **Admin → TV screens**. Times and posters work immediately.
3. For private cameras and device sharing, open the **private TV link** once in that browser. This authorises that browser for 90 days. It is not Bluetooth pairing and does not require an app. The approval link expires after 10 minutes and works once.
4. Leave the page open in landscape. Double-click or press F to request fullscreen if supported. Admin controls what it displays.

There are four addresses: `/tv179/mens-main`, `/tv179/mens-upstairs`, `/tv179/ladies-upstairs`, `/tv179/shoe-area`. The shoe area stays on times and posters.

## Normal

Normal rotates selected programme posters and published upcoming event posters. Programme poster definitions live in `src/content/programmes.js`; event posters are edited in **Admin → Events**. Its timetable, next-prayer line and clock have separate switches.

Normal alone runs prayer reminders, Jummah and Ramadan notices. At Jama‘ah it shows the phone reminder, then dhikr after five minutes (ten for Maghrib). Posters return twenty minutes after Jama‘ah. Jummah welcome runs from one hour before the first congregation until twenty minutes after the last. Ramadan follows the Islamic calendar with an optional local offset or explicit on/off setting. After Isha it shows the configured du‘a twenty to forty minutes after Jama‘ah, then fasting times among posters.

## Class / Teach

1. Choose **Class / Teach**.
2. Add scenes with **+ Scene**, up to six. Choose a scene to work on.
3. Add sources: two separate poster slides, YouTube, CCTV, device inputs, website livestream, timetable, next prayer, clock or a text notice.
4. Drag sources, resize using the corner, or edit the percentage fields. Use **Bring to front** and **Send to back** for layering. Disable overlap after arranging sources apart if wanted.
5. Press **Save & update TV**. This saves the layout and selects that scene on the TV. Choosing a different scene also needs Save.

Class / Teach pauses all automatic seasonal and prayer notices. Optional timetable and next-prayer elements still work as chosen. Return to Normal manually and save, or choose a timed return. A stale draft is rejected if another staff device saved first; reload before editing again.

The editor and TV share a 16:9 coordinate system. The TV letterboxes other aspect ratios. Each scene supports twelve layers. The bottom-left pillar logo stays visible. The embedded preview is the actual saved TV route, not a simulation; it cannot prove playback on the physical TV.

## Laptop presentation and phone camera together

Add **Device input 1** and **Device input 2** to a scene, arrange them and save. On the laptop choose Input 1 → Share this screen. On the phone, sign in to Admin, choose the same hall and Input 2 → Use this camera. Enable the microphone before starting when audio is needed. Keep both pages open. Up to four independent devices can supply inputs. A live input cannot be replaced by another device until it is stopped or expires.

Device inputs can be reused across scenes, but only once in each scene. Removing an input from every scene or saving Normal ends it. Capture permission is requested by the browser; the website cannot bypass it. Whole-screen capture is not generally available in phone browsers. Camera capture requires HTTPS and a supported browser. Screen audio depends on the browser and the selected tab. To hear a source on the TV, enable that layer's audio and turn off **Mute TV audio**. A TV may require one playback click before unmuted autoplay.

Private input signalling is authenticated and hall-scoped. The TV browser polls saved settings every eight seconds, input signalling every two seconds. Publisher heartbeats expire after ninety seconds without renewal. TURN may be required when direct WebRTC cannot connect. Set `TV_ICE_SERVERS` only in Edge secrets.

## Installed cameras

Enter an HTTPS HLS (`.m3u8`) or WebRTC WHEP stream URL for a CCTV layer. A local IP by itself is not a browser stream. RTSP cameras usually need a local relay to convert video and provide trusted HTTPS/CORS. TVs and viewers must be able to reach that relay on the mosque LAN; guest Wi-Fi isolation can prevent it. Port 4455 in the earlier OBS screenshot is the OBS remote-control service, not a camera video URL.

The website does not scan the LAN or expose cameras publicly. Private camera URLs are only returned to authorised TV browsers. Do not put camera passwords or platform stream keys into public site content. Obtain the actual camera/NVR model and stream URL before on-site testing.

## Record or broadcast

A phone can record its active camera input, including microphone audio if selected. A desktop can open the separate TV view and record that tab with sound. The separate recording view has an eight-hour credential; close it when finished or revoke it under TV connections. Recordings are kept locally, then downloaded as WebM or MP4 according to browser support. Each recording part stops at approximately 256 MB to limit mobile memory; download it before starting another part.

External YouTube/TikTok output needs the separately hosted media relay in `services/media-relay`. Static website hosting and Supabase Edge Functions do not run its persistent encoder. No external stream is started until an operator enters destination details and explicitly chooses **Go live**. Platform passwords are not collected. Enter the stream server and key from the platform's Live Studio; TikTok streaming access depends on the account.

The relay has not been deployed or tested with the mosque's platform credentials. Its UI remains unavailable until `VITE_MEDIA_RELAY_URL` is configured. See `services/media-relay/README.md`.
