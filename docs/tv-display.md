# Mosque TV display

Open `/tv179` on the website, or choose **TV display** in the admin header. The previous `/tv` address redirects here. The display opens directly without a login and is not added to the public navigation. Editing events and livestream settings still uses the existing staff login.

- Choose **Full screen** once on the TV. The prayer bar remains above the content and contains no radio player. The TV clock uses Birmingham/London time.
- **Auto** shows posters until an enabled, supported YouTube livestream reaches its scheduled time. The video then appears beside a rotating poster. Disabling the stream, a playback error, or the end of playback returns to posters.
- **Posters** keeps this TV on posters even while the website has an enabled livestream. **Livestream** switches back to the enabled stream. These choices affect this browser only.
- Posters rotate every 20 seconds. Landscape screens show two; portrait screens show one. Images fit within the screen without cropping. Previous/next controls allow manual changes.
- Livestream sound starts muted. Use the speaker control to enable it. If the browser blocks playback, press **Start livestream**.
- Display controls disappear after eight seconds of inactivity. Move the pointer, tap, or use the remote/keyboard to reveal them. Focused controls stay visible.
- Wake Lock is requested where supported. On TVs without it, use the TV's own power/sleep settings for continuous display.

## Updating content

The display uses the same `PROGRAMMES` posters as the public website, plus published upcoming event posters from **Admin → Events**. Upload the event poster, set its date and publish it. Draft events are excluded, and past event posters drop out automatically.

Use **Admin → Livestream** to save the exact YouTube video/live URL and enable **Show livestream**. A channel homepage is not a video URL. An optional scheduled time delays TV playback. YouTube must allow the video to be embedded; Vimeo, Facebook and direct camera feeds are not supported by this TV player.

Published content refreshes every minute, retaining the last successful content during a network interruption. There are no new database tables, keys or migrations. Prayer times use the existing website timetable hook. The player does not discover whether the channel is broadcasting independently: the existing enabled/scheduled settings control when it attempts playback.

The page displays published programme/event content and the enabled livestream without authentication. It does not introduce private media storage or a camera connection. No camera credentials or staff credentials belong in the screen URL.
