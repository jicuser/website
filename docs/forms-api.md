# Shared custom forms API

Status: implementation in progress; additive migration must be applied in staging before enabling clients.

Custom responses are rows in the existing `form_submissions` inbox (`kind='custom'`). Their `custom_form_id`, `form_version`, `schema_snapshot`, and `submitter_id` columns identify the form, immutable published schema and optional signed-in submitter. Existing contact/madrassah/itikaaf remain unchanged. `payload` is the validated field-ID-to-value answer object. `status` remains `new|done` and existing work task statuses remain `open|in_progress|waiting|done`.

## Definition schema

`custom_forms`: `id uuid`, `slug text` (lowercase letters/digits/hyphens, 3–80), `title text`, `description text`, `schema jsonb`, `published_version integer|null`, `enabled boolean`, `task_title text`, `due_hours integer (1–8760)`, `created_by uuid`, `updated_at`.

`schema = {fields: [{id, type, label, required, options?, show_when?}]}`. 1–40 fields; IDs `[a-z][a-z0-9_]{0,39}`; labels max160. Types: `text`, `textarea`, `email`, `phone`, `number`, `date`, `select`, `multiselect`, `checkbox`, `image`, `file`. Options are 1–50 unique strings (max120). `show_when={field:'earlier_field_id',operator:'equals'|'not_equals',value:'string'|number|boolean}` may refer only to an earlier non-file field with no show_when. Hidden answers are rejected (omit them). No expressions or scripts. String limits: text500,textarea6000,email254,phone40,date ISO YYYY-MM-DD. Number finite +/-1e12. Checkbox boolean; required checkbox must be true. Multiselect array of unique permitted strings, max50. File/image answer is an uploaded UUID (single file per field), max5 upload fields per form. Missing optional answers can be omitted/null/empty; required visible answers must have content.

`custom_form_staff`: `form_id,user_id,role` with role `manager|responsible|watcher`; one role per member. Active owners or `forms_manage` permission manage all definitions. Explicit per-form managers manage their form. Any assigned role may view and reply to that form's responses. Global `forms_custom` also reads/replies all custom responses. Any recipient must be active. At least one responsible member is required before publishing; each responsible gets a task. Watchers receive notification only. Managers can also be responsible by specifying routing via `responsible_ids` in save (see below): members may hold multiple roles.

## Client RPCs

- `list_public_forms()` → rows `{id,slug,title,description,version}` for enabled published forms (anon/auth).
- `get_public_form(p_slug text)` → JSON `{id,slug,title,description,version,schema}` or null (anon/auth); no staff/routing details.
- `save_custom_form(p_form jsonb)` → UUID. `p_form={id?:uuid,slug,title,description,schema,task_title,due_hours,enabled,manager_ids:uuid[],responsible_ids:uuid[],watcher_ids:uuid[]}`. Existing form IDs update draft; published version stays immutable until republished. New forms default enabled true; safe server validation, no arbitrary direct client writes.
- `publish_custom_form(p_form_id uuid)` → integer new version; validates draft, recipients then snapshots atomically.
- `custom_form_members(p_form_id uuid default null)` → rows `{id,display_name}` of active eligible accounts for assignment; only managers/owners. Null requires global manage permission.
- Read `custom_forms` and `custom_form_staff` through Supabase table queries under RLS. Roles can overlap (PK form_id,user_id,role).
- Read `form_submissions` with `.eq('kind','custom')` for staff inbox; for public account history also `.eq('submitter_id', user.id)`. Staff access follows per-form membership/current permissions. Own authenticated submitters see only their own custom responses.
- `reply_custom_form(p_submission_id uuid,p_body text,p_internal boolean default false)` → UUID. Staff can write internal notes or replies; submitters can write external replies only. Read `form_replies` filtered submission_id, ascending created_at. Fields `id,submission_id,author_id,body,internal,created_at`. RLS hides internal notes from submitters.
- `set_custom_form_status(p_submission_id uuid,p_status text)` → void; staff only, `new|done`.
- `assign_custom_form_task(p_submission_id uuid,p_assigned_to uuid,p_title text,p_due_at timestamptz default null)` → UUID; form staff may assign only another active staff member of the same form. Uses existing work_tasks and inbox/outbox transaction. Existing task status table update works.
- `form_attachments` read with `.eq('submission_id', id)` returns `id,submission_id,field_id,file_name,mime_type,size_bytes,created_at` under submission access. No storage keys exposed via this table.

## Edge function `custom-forms`

POST JSON; public API key as normal Supabase SDK header; optional user access JWT is verified by handler. Limits: body64KiB; 10 successful submissions per network fingerprint /10min; uploads20/10min; 5files/form/attempt. No emails or pushes are sent directly. `idempotency_key` is a fresh client UUID per form attempt, retained across retries. Success replies JSON; errors `{error}` with 400/401/403/409/413/429/503. Never send user-provided IDs as authorization.

- `{action:'submit',slug,version,answers,idempotency_key,uploads?:[{id,upload_token}]}` → `{ok:true,id}`. Version must match current published version; 409 asks user to reload changed form. Field files use their upload IDs as answer values. Logged-in submitter identity derives exclusively from verified JWT. Anonymous responses have no online account history.
- `{action:'upload_prepare',slug,version,field_id,idempotency_key,file_name,mime_type,size_bytes}` → `{upload_id,upload_token,path,token,signed_url}`. Upload bytes via `storage.from('form-attachments').uploadToSignedUrl(path,token,bytes,{contentType:mime_type})`; no upsert. Keep upload_token only in memory for finish/submit. MIME allowlist JPEG/PNG/WebP/PDF/ZIP; image fields only JPEG/PNG/WebP; max10MiB per file. Filename is display-only (server sanitizes); object key is random and server generated.
- `{action:'upload_finish',upload_id,upload_token}` → `{ok:true,id}`. Server checks stored size and bytes/magic before ready status. Finish is idempotent; prepare/submit must be completed within 2h. Expired/unattached uploads are cleanup candidates; run documented cleanup regularly.
- `{action:'download',attachment_id}` → `{url,expires_in:60}`. Requires verified active user allowed to read the parent submission; URL is short-lived, attachment disposition, never public bucket.
- `{action:'export',form_id,format:'csv'|'zip',submission_ids?:uuid[]}` → downloadable bytes; staff only, up to100 selected/most recent submissions. CSV exports ID/time/status/version and snapshot field labels with formula protection. ZIP includes CSV plus up to50 attachments /25MiB, returns413 when exceeded (select fewer rows). ZIP paths use server generated IDs + safe display filename; no path traversal.

Feature flags: use existing workspace gate. Super admin user editor adds `forms_manage` (build forms), `forms_custom` (all custom response access) permissions; per-form membership can grant access without either global permission. No users gains permissions from metadata or labels. Multi-organisation reuse is deployment/config based, not a shared-tenant DB without additional tenant isolation.

`custom_form_assignees(p_form_id uuid)` → `{id,display_name}` available to any current form staff, listing current active members plus active globally permitted forms_custom/managers/owners, used for manual task assignment.

`search_form_submissions(p_search text default '',p_kind text default null,p_form_id uuid default null,p_status text default null,p_from timestamptz default null,p_to timestamptz default null,p_offset int default 0,p_limit int default 25,p_oldest bool default false,p_mine bool default false)` → JSON `{rows:[],total,new_count,done_count}`; invoker RLS protects legacy and custom responses. Search matches literal case-insensitive substring of JSON answers. `total` includes status filter; new/done counts ignore status filter. All other filters apply. From inclusive, to exclusive. Limit1–100, offset0–25000. Rows include schema_snapshot.title for custom form label.

Shared JS validation module `supabase/functions/custom-forms/validation.mjs` exports `validateSchema(schema)` (returns normalized schema or throws), `validateAnswers(schema,answers)` (returns normalized visible answers or throws), `isFieldVisible(field,answers)`, `validateUpload(field,file)`, `safeFilename`, `csvCell`. SQL independently enforces the same critical bounds so direct RPC calls cannot bypass validation.

## Operations and verification

Apply migrations in timestamp order to an isolated Supabase project, deploy `custom-forms` and updated `push-worker`, then enable the existing workspace flags. `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` are server settings; never put service credentials in either client. Supabase Storage must allow at least10MiB globally; the private `form-attachments` bucket itself is restricted to10MiB and the MIME allowlist. No client Storage object policies are added for this bucket. Upload URLs cannot overwrite an existing object; the finish check verifies size and magic before a response can claim the file. This is format validation, not antivirus scanning; downloaded files use attachment disposition, ZIP contents are never extracted, and HTML/SVG/executables are excluded.

Set a separate random `FORMS_MAINTENANCE_SECRET` of at least32 characters, and schedule `POST custom-forms` with `Authorization: Bearer <maintenance secret>` and `{"action":"cleanup"}` hourly. Each run removes up to100 expired unattached objects, then their private metadata. Run more often if the expired queue grows. No worker is scheduled or deployed by the source change. Completed responses/replies/files are retained until an administrator applies an agreed retention policy; cleanup never deletes submitted attachments.

Verified locally with PGlite executing both workspace/forms migrations and RLS as anon/authenticated/service_role, `node --test tests/custom-forms*.test.mjs`, `deno check supabase/functions/custom-forms/index.ts`, and `deno test --allow-env --deny-net tests/custom-forms-edge.test.ts`. The Edge tests mock every network request and prohibit real network access. Staging must still exercise real signed upload/download URLs, bucket limits and worker configuration before public enablement.

A retry with the same attempt, identity, version and normalized answers returns its original ID. Reusing that attempt for changed answers returns409; start a new attempt. Forms without any active responsible person reject new submissions until a manager restores routing, so responses cannot silently lose their follow-up tasks.
