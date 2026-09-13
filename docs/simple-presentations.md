# Simple presentation controls

Choose a hall, enter the stream name, select one input and use **Start presenting**.
New one-input, full-screen layouts open in **Simple**. The **Presentation mode**
dropdown reveals the existing multi-input, multi-scene editor under **Advanced**.
A saved layout with extra scenes, extra inputs or custom geometry stays in Advanced;
changing modes never converts, crops or deletes a saved layout.

The selected device uses the existing connection controls. Changing modes changes
editor visibility only: it does not publish a stream, alter its ID, replace device
slots or remount the capture controllers. Start, End, display approval, WebRTC,
authentication and the Supabase/Flutter data contract are unchanged.

Saved settings are visible in both the name and input steps, including an empty
library. Loading is blocked while this workspace is presenting or holds local
capture, to avoid silently stopping a working source. Replacing an unpublished
draft asks for confirmation. Settings are still saved after ending a stream.

Open sessions appear as compact radio-icon buttons in the hall selector. Inside a
hall, the active-session indicator keeps **End stream** available even when its
camera has disconnected. An active session is not proof of video playback.

## Checks

`node --test tests/presentation-mode.test.mjs` covers nine mode-selection and
layout-preservation cases. An isolated React 18/Chromium fixture also exercised
14 UI scenarios at 1024px and 390px widths: input selection, Start handoff, Advanced
scene controls, keyboard behaviour, saved-settings visibility and loading guards,
End handoff, read-only session discovery, and preservation of preview/capture mount
boundaries across mode changes. Backend, media and authentication dependencies were
stubbed in that fixture; these were not live-device playback tests. Changed JSX
was parsed and transpiled locally.

The full repository build, production styling, hosting deployment and physical
phone-to-TV playback were not verified by those isolated checks. No DNS, hosting,
Supabase schema, Edge Function, Flutter, dependency or lockfile changes are included.
