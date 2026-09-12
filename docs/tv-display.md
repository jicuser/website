# Hall streams and display webpages

Each hall has one permanent `/tv179/<hall>` webpage. The address stays the same when a stream starts, changes scenes or ends. When no stream is running, it shows public posters, prayer times and scheduled notices. An active stream shows its selected scene to approved viewers. Display webpages always use a black background and light text, regardless of the website theme. The large prayer timetable remains at the top, with next-prayer details and countdown in the footer.

## Set up a stream

1. In **Hall streams**, choose the hall and press **Next**.
2. Enter a descriptive **Stream name** and press **Next · arrange inputs**. One blank scene is created. **Add scene** adds another immediately, up to six; scene names are not requested.
3. In each scene choose one to four inputs. Pick a side-by-side, grid, sidebar or picture-in-picture arrangement. Each blank input displays **+ Select input type**.
4. Press an input to open its settings form. Choose screen sharing, a device camera, CCTV, a YouTube link, a saved video URL, posters, prayer times, next prayer, a clock or text from the **Input type** dropdown. Complete only the fields for the selected type. Required fields show an error beside the field and receive focus. Existing inputs open the same form with their details filled in.
5. Apply the input, then move or resize it in the preview. Device inputs use **Continue to connection**; this replaces the settings form with connection controls. The settings cog reopens the form and input-type dropdown. **Connect device** beneath the selected input opens its connection controls directly. Inputs can overlap; snapping aligns edges. Bring forward and Send back change stacking. Removing content keeps a blank input ready to use again.
6. Press **Start stream**. Prepared camera/screen inputs begin publishing. The same green button becomes red **End stream**. **Update live layout** applies later layout edits without restarting the stream.

A camera or screen has one descriptive, reusable name. Entering its details keeps the dialog open on connection controls, so the operator can prepare local capture or copy its contributor link. Closing the dialog keeps capture running and visible in the canvas. Preview sound is muted to avoid feedback; source audio and the display's master mute are separate controls.

**Save stream settings** is offered only after ending the stream. It saves all scenes, input details, layouts, active scene and audio settings together under the stream name entered during setup, which can be changed in the save dialog. Saved settings can be loaded when setting up the next stream; there are no separate scene-save controls. When ending a stream, screens return to the normal display first, then Admin asks whether to save the settings and shows the existing stream name for editing. The unsaved snapshot survives refresh until saved or explicitly dismissed. Loading settings replaces the draft; older single-scene presets open as their own setup. Generic stream or device names such as “Stream 1” and “Device 1” must be replaced. Scene labels are assigned automatically; older unnamed or generic scenes receive valid internal labels when published. Live browser captures and permissions are not stored in templates. **New setup** starts empty and stops this browser's captures; an existing stream keeps its saved layout until replaced or ended. Merely opening Admin or joining as a contributor never clears another operator's setup.

An in-progress setup survives refresh in the same browser tab. Capture itself stops on reload, so reopen the input and restart it. Login remains active. **End stream**, or saving a selected scene whose inputs are all empty, returns viewers to the background schedule. The separate **Background posters & prayer notices** settings are available before scene setup, and do not replace an active stream.

## Connect a display or share a watching link

The corner of each hall display webpage shows a six-digit **Display code**, valid for ten minutes. It refreshes automatically; no connection icon or code-entry form is needed on the viewing device.

After starting the stream, enter that display's code in **Connect a display** in Admin. Its name is optional. The open webpage then receives the stream; the connected list reports when it last checked in and which layout it received. Rotating the corner code does not disconnect an approved viewer. Approval lasts for the current stream; starting a new stream clears prior approvals and source leases.

**Copy watching link** creates a link for the current stream. Anyone with that link can watch without a staff account or individual display approval. Treat it as a viewing invitation: it contains the stream's secret in the URL fragment, which is removed from the address bar after joining. The link expires when that stream ends and cannot join a later stream at the same hall address. Watching never grants permission to edit or send a camera.

The shoe-area webpage remains a public timetable/poster display and does not run presentations or issue display codes. Private Admin preview pages also omit corner codes.

## Contributing from another device

In a camera or screen input's dialog, choose **Use another device**. Copy its device sharing link to the contributing phone or laptop. Start the stream, then open that link and sign in on the contributing device. This dedicated page controls the selected source without opening the scene editor or resetting other devices.

Keep contributing pages open. Browser permission is required for camera/screen capture. Refreshing stops local capture, while tab authentication survives. Restart releases only that tab's leftover source lease. Closing the content dialog is safe; closing the browser page ends capture. Phones may suspend cameras when backgrounded or locked, regardless of the website. Check the receiving picture and sound before relying on it.

**Retry connection** rebuilds the viewer connections while retaining the local camera/screen preview. A local preview, a connected transport and a received layout are separate signals; only checking the receiving display establishes what the audience sees.

## Network and outgoing broadcasts

Same Wi-Fi is a useful first test, but guest isolation can still block connections. Reliable connections across different networks may need TURN in the `TV_ICE_SERVERS` Edge secret. See the [WebRTC TURN guide](https://webrtc.org/getting-started/turn-server). A configured URL does not prove that the relay is reachable.

YouTube/TikTok broadcasting uses the separate media relay (`VITE_MEDIA_RELAY_URL`, `services/media-relay`). TURN carries media between devices; the outgoing relay sends the finished picture to a broadcast platform. A display code sets up neither service. Existing OBS software can also capture the finished display tab and send it to YouTube. Do not add that outgoing broadcast back into the same scene.

## Code and access boundaries

- `StreamSetup` and `useStreamSetup` own the three setup steps, the private tab draft and save conflicts. Polls never replace an unsaved layout. A stopped or replaced managed stream releases this browser's capture controllers.
- `SceneEditor`, `ContentEditorDialog` and `SceneCanvas` share percentage geometry. `sceneLayouts` provides presets/snapping; `streamWorkspace` builds blank scenes and remaps template inputs without merging distinct sources.
- `DeviceInputs` keeps per-slot controllers mounted outside the dialog. Portals render only their controls inside the selected source. `tvPublisherController` separates capture preparation, publication and stopping.
- `tv_screens` stores saved layouts and revisions. `save_tv_presentation` checks the revision while holding the hall lock; `new-presentation` rotates the stream identity. Background saves preserve the active scene and presentation fields.
- `tv_presentations` stores each active stream's private identity/code. `tv_devices` stores hashed viewer credentials bound to that hall and stream. Ending a stream removes its credentials and receivers. Admin previews are short lived and excluded from the viewer list.
- `display_connection_codes` stores hashed browser identities and rolling six-digit codes. Only service-role requests access this table. `approve_display_code` checks staff permission, hall and code expiry before granting current-stream access. New identity allocations are bounded per network and hall; known-browser refreshes remain usable.
- `tv_scene_templates` stores private reusable scenes. Staff Edge actions validate names, source types and URLs; replacements check the template revision. No service-role key or capture credential enters the scene JSON.
- Public status never exposes private source details before authorization. Initial loading waits for the server response. An unapproved display stays on public posters and prayer times until its code is approved or a valid watching link is used. Failed access checks stop private playback and show the public background while reconnecting.

Successful start, stop, approval and layout changes send an empty Realtime refresh hint. Displays recheck the authorised status immediately; three-second polling and focus/online checks cover missed notifications. The public hint contains no scene, media credential or code and cannot grant access. Camera capture requests 720p at 24 fps; screen capture is capped at 1080p/30 fps to limit unnecessary device work.

## Deployment and verification

Apply the migrations through `20260912121025_saved_stream_settings.sql`, deploy `tv-control` with its shared modules, then publish the matching frontend. The display-code/template migration adds private tables and updates empty-scene handling; it does not reset existing streams or delete posters/accounts. Historical SQL migrations remain necessary deployment history.

Run `npm run validate`. Database suites use isolated fixtures and roll back: `tests/display-connections.sql`, `tests/tv-presentation-sessions.sql`, `tests/tv-receiver.sql` and `tests/staff-tv-permissions.sql`. They cover code rotation, expiry, rate limits, permissions, template privacy, stale saves, stream isolation and receiver independence.

For acceptance, open one display webpage, build a two-input scene with a laptop screen and phone camera, then Start stream and approve the displayed six-digit code. Check picture and audio, resize and save, close/reopen the content dialog, refresh each device separately, load a saved scene, and end the stream. Confirm old watching links no longer work. Automated checks do not establish physical browser codec support or camera/network delivery.
