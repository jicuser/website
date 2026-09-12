# Staff access and TV scenes

## Invite a colleague

Open **Admin → Staff & access**. Enter their name and email, tick optional staff labels, then tick the specific editing permissions. Nothing is selected automatically. Being a teacher or volunteer does not grant access. TV operators need **TV scenes and device inputs**; external broadcasting additionally needs the broadcast permission.

Invited accounts without permissions can complete account setup but cannot open Admin. An owner can grant access later. A delegated staff manager can only grant permissions they hold and cannot change an owner or their own access. Picture uploads require the upload permission plus access to the relevant editor. Delete permission applies only inside permitted sections.

Invites use `/admin/setup`. In Supabase **Authentication → URL Configuration**, the public JIC website must be the Site URL and its exact `/admin/setup` URL must be allowlisted. Do not use a Vercel dashboard or protected deployment address. Existing incorrect emails need a new setup email after this configuration is corrected. No automatic test invitations are sent.

## Put a TV on the wall

1. Connect it to the mosque network and open its browser.
2. Open the hall address shown in **Admin → TV screens**. Times and posters work immediately.
3. For Class / Teach, choose **Connect TV** on that page. Enter its six-digit code and a recognisable device name (for example Main hall TV or Test phone) in **Admin → TV screens → your hall → Connect TV**. The code lasts ten minutes; the browser remembers approval. The address never changes when saving, clearing or switching scenes. Active TVs renew their approval; approval lasts up to 90 days from issue or renewal. A cleared, expired or disconnected browser needs approval again.
4. Leave the page open in landscape. Double-click or press F to request fullscreen if supported. Admin controls what it displays.

A second phone can receive the output for testing: open the same address and connect it using its own code. Admin lists its name and whether that browser was seen recently and received the latest save. Existing unnamed TVs can be renamed without a new code. This acknowledges settings delivery, not successful video playback.

There are four addresses: `/tv179/mens-main`, `/tv179/mens-upstairs`, `/tv179/ladies-upstairs`, `/tv179/shoe-area`. The shoe area stays on times and posters.

## Normal

Normal shows up to four portrait posters across the landscape display. The row moves left by one poster each rotation, bringing the next into view and wrapping back to the start. Reduced-motion browsers change the row without sliding. It uses selected programme posters, announcement posters and published upcoming event posters. **Admin → Posters** shows current programme pictures: edit names, replace pictures, add posters and choose website destinations. The shared catalogue is `page_content.programme_posters`; bundled programme definitions are initial defaults only. TVs refresh the catalogue every 30 seconds. Dated event posters are edited in **Admin → Events**. In **Admin → Posters & announcements**, add an announcement poster, enter its text and optionally upload up to two pictures. Preview it there, publish, then tick its name in the TV picker. The same card works on selected website pages and in Class scenes. General reminders appear in this editable poster; the repeated reminder in the TV footer is removed. Its timetable, next-prayer line and clock have separate switches. Normal has no broadcasting or device controls.

Normal alone runs prayer reminders, Jummah and Ramadan notices. At Jama‘ah it shows the phone reminder, then dhikr after five minutes (ten for Maghrib). Posters return twenty minutes after Jama‘ah. Jummah welcome runs from one hour before the first congregation until twenty minutes after the last. Ramadan follows the Islamic calendar with an optional local offset or explicit on/off setting. After Isha it shows the configured du‘a twenty to forty minutes after Jama‘ah, then fasting times among posters.

## Class / Teach

1. Choose **Class / Teach**.
2. Add scenes with **+ Scene**, up to six. Choose a scene to work on.
3. Start with an empty scene. Add Posters, YouTube, CCTV, screen share, device camera, timetable, next prayer, clock or text. Each item opens its own properties. For Posters, tick names and set rotation seconds; for YouTube, enter its link. Add more than one Posters item if you want separate rotating areas.
4. Drag sources, resize using the corner, or edit the percentage fields. Use **Bring to front** and **Send to back** for layering. Disable overlap after arranging sources apart if wanted.
5. Press **Save & update TV**. This saves the layout and selects that scene on the TV. Choosing a different scene also needs Save.

Class / Teach hides Normal settings and pauses all automatic seasonal and prayer notices. Optional timetable and next-prayer elements still work as chosen. Return to Normal manually and save, or choose a timed return. Drafts are stored per account and hall on the current browser, including after switching sections. Clear draft restores the published version; Clear scene removes items only from the draft. Saving an empty selected scene returns the TV to Normal and retains other scenes. A stale draft is rejected if another staff device saved first; clear the stale draft before editing the latest version.

The editor and TV share a 16:9 coordinate system. The TV letterboxes other aspect ratios. Each scene supports twelve layers. The bottom-left pillar logo stays visible. In Class / Teach, **Show picture while arranging** renders the draft inside the drag/resize canvas. It includes saved, running camera/screen feeds using a short-lived receiver credential. The preview is muted and does not publish unsaved changes. Normal keeps its View TV preview. This does not prove playback on the physical TV. `/tv179` and hall URLs remain supported because installed TVs use them; `/tv` is just a redirect, not a second player.

## Laptop presentation and phone camera together

Add **Screen share** and **Device camera** to a scene, give each a meaningful device name, arrange them and save. The names appear in the canvas, source list and capture controls, and stay consistent when the same connection is reused across scenes. Internal slots such as `input-1` are stable identifiers, not device names.

On each contributing laptop or phone, sign in to Admin and open the same hall. Under **Share from a device**, enter the name of that physical laptop/phone, then choose **Share this screen** or **Use this camera** for its named source. Other operators see which named device is publishing. Enable the microphone before starting when audio is needed. Keep both pages open. Up to four independent devices can supply inputs. A live input cannot be replaced by another device until it is stopped or expires; **Stop other device** makes that choice explicit. Connecting a TV using its code grants viewing access; it does not turn that browser into a publisher.

Capture controls use the latest saved server settings, not this browser's draft baseline. Unrelated draft edits do not block an existing saved source. A new source or mode change still needs Save before starting. The browser chooser opens directly from the click before any network/authentication awaits. Unsupported capture, HTTPS/policy restrictions, a busy source, permission denial and operating-system capture failures have separate explanations. The deployed Hostinger headers allow same-origin camera, microphone and display capture.

A saved Class / Teach never runs Normal prayer automation. An unapproved browser shows a Class / Teach connection screen while private content stays hidden. A temporary status failure pauses private output and shows a reconnection message; it does not silently substitute the Normal poster rotation. Saving an empty selected scene or explicitly saving Normal still restores Normal.

For testing, connect the TV, laptop and phone to the same non-isolated Wi-Fi. Different networks are possible with WebRTC, but often require TURN. The Admin panel reports whether TURN is configured in `TV_ICE_SERVERS`; this checks configuration presence, not that the relay actually works. Browser support and network reachability still need a physical device test. See https://webrtc.org/getting-started/turn-server and https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia.

Device inputs can be reused across scenes, but only once in each scene. Removing an input from every scene or saving Normal ends it. Capture permission is requested by the browser; the website cannot bypass it. Whole-screen capture is not generally available in phone browsers. Camera capture requires HTTPS and a supported browser. Screen audio depends on the browser and the selected tab. To hear a source on the TV, enable that layer's audio and turn off **Mute TV audio**. A TV may require one playback click before unmuted autoplay.

Private input signalling is authenticated and hall-scoped. The TV browser polls saved settings every eight seconds, input signalling every two seconds. Publisher heartbeats expire after ninety seconds without renewal. TURN may be required when direct WebRTC cannot connect. Set `TV_ICE_SERVERS` only in Edge secrets.

### Receiver lifecycle rollout

Apply `supabase/migrations/20260912074952_tv_receiver_lifecycle.sql` first, then deploy `tv-control`, then publish the website. The schema adds `last_seen_at`, allowlisted `receiver_state`, and the service-only `join_tv_receiver` function, and removes the old shared-peer uniqueness constraint. Publish the Edge function immediately after the migration: old Edge join requests use that constraint and can fail during this short gap. Existing connected peer rows and live inputs are preserved.

Each mounted receiver now gets a separate peer, including multiple tabs from one approved browser. Closing it sends an authenticated leave request. Receivers unseen for 90 seconds are excluded from publisher polling, and stale rows for a device are removed when it joins again. A device may have at most eight active receiver rows. New answers reference the offer they processed to reject stale negotiation responses. Older browser clients remain supported by the updated Edge function; refresh them after deployment for cleanup and reconnection improvements. Diagnostic states contain only fixed status/error names, never camera details, SDP or arbitrary browser messages.

`npm test` includes negotiation retries, browser SDP normalisation, simultaneous input handlers and ICE cancellation. `tests/tv-receiver.sql` checks independent receivers, stale cleanup, limits and access grants in a rolled-back transaction. These checks do not replace a real browser/media test. Use **Show picture while arranging** first, then test a separately approved TV; the status distinguishes no receiver, an unanswered offer, and a connected display. Keep source devices awake with their admin pages open. Testing from mobile data may require TURN; a successful local camera preview alone does not prove delivery to another device.

### Permanent browser setup rollout

Apply `supabase/migrations/20260912083609_tv_browser_setup.sql`, deploy `tv-control`, then publish the website. The setup table and approval functions are service-only. Browser credentials are hashed before storage; setup codes do not grant public access. Existing approved browsers and old one-use links continue working during rollout.

`tests/tv-browser-setup.sql` verifies grants, expiry, idempotency, hall boundaries, atomic approval and queue limits in a rolled-back transaction. The Edge status response includes a revision; the browser acknowledges it on its next poll. Only an exact current revision is accepted as received. Physical TVs report contact at most every 30 seconds; this does not indicate that audio or video decoded successfully.

## Installed cameras

Enter an HTTPS HLS (`.m3u8`) or WebRTC WHEP stream URL for a CCTV layer. A local IP by itself is not a browser stream. RTSP cameras usually need a local relay to convert video and provide trusted HTTPS/CORS. TVs and viewers must be able to reach that relay on the mosque LAN; guest Wi-Fi isolation can prevent it. Port 4455 in the earlier OBS screenshot is the OBS remote-control service, not a camera video URL.

The website does not scan the LAN or expose cameras publicly. Private camera URLs are only returned to authorised TV browsers. Do not put camera passwords or platform stream keys into public site content. Obtain the actual camera/NVR model and stream URL before on-site testing.

## Broadcast the finished TV view

Local recording controls have been removed. On a desktop, open the finished TV view in a tab, enable its sound, then choose that tab with shared audio for the outgoing broadcast. Keep that laptop and the contributing phone camera open. Never put the same outgoing YouTube broadcast into its own TV scene: that creates repeating video/audio feedback. The broadcast view has an eight-hour credential; close or revoke it when finished.

A stream key is the private destination code from the streaming platform. Screen sharing and phone/CCTV inputs do not need one. In YouTube Studio choose Create → Go live → Stream and copy the stream URL and key. A relay converts the finished browser picture/audio into the format YouTube accepts. The existing OBS computer can alternatively capture that TV view and stream directly to YouTube. See https://support.google.com/youtube/answer/2907883.

External YouTube/TikTok output needs the separately hosted media relay in `services/media-relay`. Static website hosting and Supabase Edge Functions do not run its persistent encoder. No external stream is started until an operator enters destination details and explicitly chooses **Go live**. Platform passwords are not collected. Enter the stream server and key from the platform's Live Studio; TikTok streaming access depends on the account.

The relay has not been deployed or tested with the mosque's platform credentials. Its UI remains unavailable until `VITE_MEDIA_RELAY_URL` is configured. See `services/media-relay/README.md`.


## Named devices and idle sessions rollout

Apply `supabase/migrations/20260912092802_tv_device_names.sql`, deploy `tv-control`, then publish the website. Device names are separate from credentials and the four stable input slots. The service-only named approval/start functions reuse the existing locking and access checks, and save each name atomically. Older clients can still use the original endpoints; no existing TV approval is reset. Name edits are scoped to the selected hall. The shared scene JSON contains each input's optional `name`; Flutter should use it for presentation and retain `slot` for identity.

Admin signs this browser out after 15 minutes without interaction, with a one-minute warning and **Stay signed in** button. Activity is shared between tabs in the same browser. Active camera/screen capture and outgoing broadcasting count as ongoing use; background API polling and token refresh do not. Idle protection locks the interface if sign-out cannot reach the server. It is browser-side inactivity protection, not a server-enforced JWT lifetime. Sign-out uses local session scope so another staff device keeps working. The permission checks and private-table policies remain in force.

`tests/tv-capture.test.mjs` covers capture capability/gesture handling and idle timing; `tests/tv-control.test.mjs` checks saved source names. The rolled-back SQL tests also check named approval, invalid names without consuming codes, publisher names and occupied input protection. A build or simulated capture test does not confirm video delivery on a physical laptop/TV.
