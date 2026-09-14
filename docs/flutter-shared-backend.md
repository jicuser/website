# Shared backend contract for the Flutter client

Keep the existing React/Vite website. The Flutter client is in `tippytaptap/JICapp` and uses its own Dart UI with the same Supabase records, authentication, RLS and Edge Functions. The app repository contains the native widget source.

The September 2026 workspace implementation is specified in [community-workspace-api.md](community-workspace-api.md) and [community-workspace-ui.md](community-workspace-ui.md). Those documents describe the new additive migration, FCM sender, task inbox and learning portal. Source exists; the migration, native credentials and production rollout are not deployed by this change. The display contracts below remain unchanged.

## App inbox and notifications: agreed direction

This section records the agreed direction. The repository retains its private
forms inbox and staff access, and now includes feature-gated shared tasks, a
per-user notification inbox and an FCM push worker. Enable them after staging the
new migration and verifying account isolation.

| Responsibility                 | Owner and intended behavior                                                                                                                                                                                                                     |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Announcements, tasks and forms | Store shared records in Supabase and reuse existing content/form records. Website Admin and Flutter operate on the same records and stable IDs.                                                                                                 |
| User inbox                     | Store each recipient's notification and read state in Supabase. Opening an alert leads to the original task, form or announcement, subject to current access.                                                                                   |
| Delivery                       | Save the underlying change and notification together before sending push. Retry delivery using the same notification identity so failures cannot create duplicate inbox items.                                                                  |
| Phone push                     | A server-side sender uses a mobile push service. Supabase remains the data and access backend; push is a delivery channel, not a second user database.                                                                                          |
| Missed alerts                  | Fetch the authorised inbox on app open/resume. Live updates can refresh an open app; they do not replace background phone push.                                                                                                                 |
| Optional email                 | Offer explicit Copy, Share or Open email actions for a selected record. Let the user review recipients and text in their email app; opening a draft does not mean it was sent. Routine task/notice delivery does not depend on automatic email. |

Keep the notification inbox distinct from the underlying task: reading an alert
does not complete its task. Changes to task status must use the shared backend
operation. Delivery retries must not repeat that operation. Apply recipient access
and notification preferences on the server, including when a queued alert is sent.
Private form details should be read inside the authenticated app, not copied into
lock-screen push text by default.

The Flutter app uses FCM, with sender credentials held on the server and device
registrations associated with the signed-in user. Supabase documents Edge
Functions sending through services such as FCM or Expo; native provisioning and
physical-device delivery tests remain rollout work. See
[Supabase push notifications](https://supabase.com/docs/guides/functions/examples/push-notifications).

The optional-email direction concerns routine notices, tasks and form replies.
Existing account invitations and password setup/recovery remain separate Auth
flows until an alternative is deliberately implemented and verified.

Build this in order: shared task/inbox records and permissions, website/app inbox
screens, phone push delivery, then optional sharing/email draft controls. Reuse the
existing forms endpoint and content model rather than introducing parallel inboxes.

## Existing shared contracts

| Area             | Contract / code                                                                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity         | Supabase Auth user ID; `get_my_profile()` returns `id`, `display_name`, `is_active`, `is_owner`, `permissions`, `staff_kinds`                   |
| Capability IDs   | `supabase/functions/_shared/access.js`; stable IDs, labels are presentation only                                                                |
| Staff management | Authenticated `manage-user`: `invite`, `set_permissions`, `set_active`, `send_setup`; grants rechecked transactionally by `manage_staff_access` |
| Stream control   | `tv-control`; fixed hall ID plus action; users require `tv`, private receiver actions require the hall's device token                           |
| Scene data       | `tv_screens.settings`, version 2; validated in `_shared/tv.js` and `_shared/tv-scenes.js`                                                       |
| Content          | Existing published page content, event posters, timetable, announcements and livestream settings                                                |
| Forms            | Existing `submit-form` endpoint and private `form_submissions`; preserve submission payloads                                                    |
| External output  | Separate optional media relay; not a public Supabase content field                                                                              |

## Display settings version 2

`scene_mode` is `normal` or `teaching`. `class_until` is an ISO timestamp or empty for manual return. `scenes` contains one to six `{id,name,overlap,layers}` objects. `active_scene_id` selects one. Layers are ordered back to front and contain `{id,type,x,y,width,height}` with percentage coordinates on a 16:9 canvas. Dimensions are 5–100%; rectangles must remain inside the canvas. At most twelve layers per scene.

Layer types: `empty`, `video`, `poster`, `poster-next`, `youtube`, `camera`, `input`, `schedule`, `times`, `next`, `clock`, `text`. Saved video, YouTube and camera use `url`; camera also uses `protocol` (`hls` or `whep`). `input` uses a stable hall slot `input-1` through `input-4`. Video sources have an explicit `audio` boolean. Text uses a plain `text` string; clients render text, never HTML. Inputs are unique within a scene but reusable across scenes.

Saving sends `{action:"save",screenId,settings,expectedUpdatedAt}` with the authenticated bearer token. A stale revision returns an error; do not retry by overwriting the latest revision. Read `admin` again and resolve edits. The response supplies `settings` and `updated_at`.

`start` sends `slot` and `kind` (`screen` or `camera`). It returns `sessionId` and ICE servers. Each source has independent `heartbeat`, `peers`, `offer`, and `stop` calls. Approved receivers use `join`, `receive`, and `answer`, bound to their hall/session/device. SDP is a complete description after ICE gathering. Do not expose the service-role key or query private stream tables from Flutter.

Normal settings retain `poster_ids`, `include_events`, `rotation_seconds`, `show_times`, `show_next`, `show_clock`, `prayer_enabled`, `auto_jummah`, `ramadan_calendar`, `calendar_offset`, `notice_mode`, `jummah_notice`, `taraweeh_dua`, and master `muted`. Automatic notices are evaluated only in Normal, in Europe/London time. The website's prayer-sequence boundary tests should become shared fixtures for a Dart implementation.

Migrations preserve existing account access once, then remove the legacy role column. Historical migration files remain as deployment history; they are not active runtime patches. The new UI does not infer permissions from labels or user-editable metadata. Add new capabilities via reviewed schema/API/client changes together.

## Guided setup and viewer authorization

The web client presents a guided stream/scene/area flow; the internal `normal` and `teaching` values remain for the background and active-presentation states. Empty placeholder regions are draft geometry and do not make a presentation active. All new arrangements allow overlap.

A display creates a random 32-byte browser token and sends `display-code` with `{deviceToken}`. The Edge hashes it and returns `{code, expires_at}` for a rolling ten-minute code. Admin sends authenticated `approve-display` with `{code,name?}`; this grants that browser access to the current presentation. Changing the short code does not invalidate its token.

A watching link uses `#watch=<8-digit secret>&session=<presentation UUID>`. Public `join-session` accepts `{code,presentationId,name}` and returns a viewer token only for that exact active presentation. Remove the fragment after reading it. Never use a viewer token for staff actions.

`save-template` accepts `{name,scene,templateId?,expectedUpdatedAt?}`; the last two fields replace an existing hall template with revision protection. `delete-template` takes `{templateId}`. Authenticated `admin` includes `templates`. Templates contain settings and geometry, never live capture tracks or permissions.

`new-presentation` starts a clean stream identity with validated settings and a screen revision. `save` keeps that identity while changing its scenes. `save-background` changes background fields while retaining server-owned presentation fields. Use explicit scene-template loading for reusable layouts.
