# Shared backend contract for a future Flutter client

Keep the existing React/Vite website. Flutter will use its own Dart UI and the same Supabase records, authentication, RLS and Edge Functions. No Flutter app or native widget is created by this website change.

| Area             | Contract / code                                                                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity         | Supabase Auth user ID; `get_my_profile()` returns `id`, `display_name`, `is_active`, `is_owner`, `permissions`, `staff_kinds`                   |
| Capability IDs   | `supabase/functions/_shared/access.js`; stable IDs, labels are presentation only                                                                |
| Staff management | Authenticated `manage-user`: `invite`, `set_permissions`, `set_active`, `send_setup`; grants rechecked transactionally by `manage_staff_access` |
| TV control       | `tv-control`; fixed hall ID plus action; users require `tv`, private receiver actions require the hall's device token                           |
| Scene data       | `tv_screens.settings`, version 2; validated in `_shared/tv.js` and `_shared/tv-scenes.js`                                                       |
| Content          | Existing published page content, event posters, timetable, announcements and livestream settings                                                |
| Forms            | Existing `submit-form` endpoint and private `form_submissions`; preserve submission payloads                                                    |
| External output  | Separate optional media relay; not a public Supabase content field                                                                              |

## TV settings version 2

`scene_mode` is `normal` or `teaching`. `class_until` is an ISO timestamp or empty for manual return. `scenes` contains one to six `{id,name,overlap,layers}` objects. `active_scene_id` selects one. Layers are ordered back to front and contain `{id,type,x,y,width,height}` with percentage coordinates on a 16:9 canvas. Dimensions are 5–100%; rectangles must remain inside the canvas. At most twelve layers per scene.

Layer types: `poster`, `poster-next`, `youtube`, `camera`, `input`, `schedule`, `times`, `next`, `clock`, `text`. YouTube and camera use `url`; camera also uses `protocol` (`hls` or `whep`). `input` uses a stable hall slot `input-1` through `input-4`. Video sources have an explicit `audio` boolean. Text uses a plain `text` string; clients render text, never HTML. Inputs are unique within a scene but reusable across scenes.

Saving sends `{action:"save",screenId,settings,expectedUpdatedAt}` with the authenticated bearer token. A stale revision returns an error; do not retry by overwriting the latest revision. Read `admin` again and resolve edits. The response supplies `settings` and `updated_at`.

`start` sends `slot` and `kind` (`screen` or `camera`). It returns `sessionId` and ICE servers. Each source has independent `heartbeat`, `peers`, `offer`, and `stop` calls. Approved receivers use `join`, `receive`, and `answer`, bound to their hall/session/device. SDP is a complete description after ICE gathering. Do not expose the service-role key or query private TV tables from Flutter.

Normal settings retain `poster_ids`, `include_events`, `rotation_seconds`, `show_times`, `show_next`, `show_clock`, `prayer_enabled`, `auto_jummah`, `ramadan_calendar`, `calendar_offset`, `notice_mode`, `jummah_notice`, `taraweeh_dua`, and master `muted`. Automatic notices are evaluated only in Normal, in Europe/London time. The website's prayer-sequence boundary tests should become shared fixtures for a Dart implementation.

Migrations preserve existing account access once, then remove the legacy role column. Historical migration files remain as deployment history; they are not active runtime patches. The new UI does not infer permissions from labels or user-editable metadata. Add new capabilities via reviewed schema/API/client changes together.
