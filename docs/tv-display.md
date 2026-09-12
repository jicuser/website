# Hall streams and display webpages

Each hall has one permanent `/tv179/<hall>` webpage. The address stays the same when a stream starts, changes scenes or ends. When no stream is running, it shows public posters, prayer times and scheduled notices. An active stream shows its selected scene to approved viewers.

## Set up a stream

1. In **Hall streams**, choose the hall and press **Next**.
2. Choose one to six scenes and press **Next · arrange content**.
3. In each scene choose one to four inputs. Pick a side-by-side, grid, sidebar or picture-in-picture arrangement. Each blank input displays **+ Select input type**.
4. Press an input to choose screen sharing, a device camera, CCTV, a YouTube link, a saved video URL, posters, prayer times, next prayer, a clock or text. Complete the fields in its dialog. Required fields show an error beside the field and receive focus.
5. Save the content, then move or resize its input in the preview. Inputs can overlap; snapping aligns edges. Bring forward and Send back change stacking. Removing content keeps a blank input ready to use again.
6. Press **Start stream**. Prepared camera/screen inputs begin publishing. **Save & update stream** applies later changes and scene selection to connected displays.

A camera or screen has one reusable name, with a default if no custom name is needed. Saving its content keeps the dialog open so the operator can prepare local capture or copy its contributor link. Closing the dialog keeps capture running and visible in the canvas. Preview sound is muted to avoid feedback; source audio and the display's master mute are separate controls.

**Saved scenes** stores layouts and settings in the shared database. Load one explicitly into the selected scene. Live browser captures and permissions are not stored in templates. **New setup** starts empty and stops this browser's captures; an existing stream keeps its saved layout until replaced or ended. Merely opening Admin or joining as a contributor never clears another operator's setup.

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
- Public status never exposes private source details before authorization. Initial loading and connection failures use a neutral state instead of flashing background posters during an active stream.

## Deployment and verification

Apply the migrations through `20260912114647_display_codes_and_scene_templates.sql`, deploy `tv-control` with its shared modules, then publish the matching frontend. The display-code/template migration adds private tables and updates empty-scene handling; it does not reset existing streams or delete posters/accounts. Historical SQL migrations remain necessary deployment history.

Run `npm run validate`. Database suites use isolated fixtures and roll back: `tests/display-connections.sql`, `tests/tv-presentation-sessions.sql`, `tests/tv-receiver.sql` and `tests/staff-tv-permissions.sql`. They cover code rotation, expiry, rate limits, permissions, template privacy, stale saves, stream isolation and receiver independence.

For acceptance, open one display webpage, build a two-input scene with a laptop screen and phone camera, then Start stream and approve the displayed six-digit code. Check picture and audio, resize and save, close/reopen the content dialog, refresh each device separately, load a saved scene, and end the stream. Confirm old watching links no longer work. Automated checks do not establish physical browser codec support or camera/network delivery.
