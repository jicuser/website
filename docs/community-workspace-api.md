# Community workspace API — additive, not deployed

Use existing Supabase accounts and get_my_profile. Active owners manage courses, students and assignments. Staff access comes only from explicit course assignment or existing form permissions; labels do not grant access. Enable website VITE_ENABLE_WORKSPACE and app ENABLE_EXTENSIONS only after staging this migration and verifying representative users.

## Stable client contract

All IDs are UUIDs, dates ISO, and timestamp columns timestamptz. Select results through normal authenticated Supabase clients: RLS limits each caller. Limit/paginate lists.

| Table                 | Columns used by clients                                                                                                         | Write path                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| learning_courses      | id,title,department(adult/madrassah),description,published,created_at                                                           | owner insert/update                                     |
| learning_staff        | course_id,user_id,role(teacher/head_teacher)                                                                                    | owner insert/delete                                     |
| learning_students     | id,display_name,user_id nullable,guardian_id nullable,created_at                                                                | owner insert/update                                     |
| learning_enrolments   | course_id,student_id,active                                                                                                     | owner insert/update/delete                              |
| learning_sessions     | id,course_id,starts_at,ends_at,title,created_at                                                                                 | assigned teachers/owner insert/update                   |
| learning_attendance   | session_id,student_id,status(present/absent/late/excused),note,marked_by,marked_at                                              | mark_class_register RPC                                 |
| learning_records      | id,course_id,student_id,kind(progress/plan/assessment),title,body,published,created_by,created_at                               | assigned teachers/owner insert/update                   |
| learning_meetings     | id,student_id,course_id,requested_by,requested_at,proposed_at,notes,status(requested/confirmed/completed/cancelled)             | student/guardian request; teacher/owner schedule/status |
| student_contributions | id,student_id,course_id,title,body,kind(poetry/reflection),published,created_by,created_at                                      | student/guardian submit draft; teacher/owner publish    |
| work_tasks            | id,form_id nullable,title,description,assigned_to,created_by,status(open/in_progress/waiting/done),due_at,created_at,updated_at | create_work_task RPC; direct status update              |
| user_notifications    | id,user_id,kind(task/learning),entity_id,created_at,read_at                                                                     | own read_at update only                                 |
| form_workflows        | kind(contact/madrassah/itikaaf),assigned_to,title,due_hours,enabled,configured_by                                               | owner upsert, actor stamped server-side                 |

## RPCs

- create_work_task(p_title text,p_assigned_to uuid,p_form_id uuid=null,p_due_at timestamptz=null,p_description text="") → UUID. General delegation owner-only; self tasks allowed (maximum 100 task creations/account/hour). Linked form tasks require caller and recipient current kind access.
- task_assignees(p_form_id uuid=null) → [{id,display_name}]. General: owner sees active people, others themselves. Form: eligible people only if caller can read form.
- mark_class_register(p_session_id uuid,p_marks jsonb) → void. Marks [{student_id,status,note}]. Entire batch rolls back if any student is not actively enrolled.
- register_push_device(p_token text,p_platform text) → void. platform android/ios, active caller only. Tokens opaque, server-owned, cannot rebind another account token.
- unregister_push_device(p_token text) → void. Removes current account device only.
- request_learning_meeting(p_student_id uuid,p_course_id uuid,p_notes text,p_proposed_at timestamptz=null) → UUID.
- submit_student_contribution(p_student_id uuid,p_course_id uuid,p_title text,p_body text,p_kind text="poetry") → UUID draft. Publication stays with assigned teachers/owner.

## Push delivery

The push-worker is a scheduled server endpoint; it does not accept a user-selected recipient or message. POST with a dedicated PUSH_WORKER_SECRET bearer (minimum 32 characters), verify_jwt=false. Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FCM_SERVICE_ACCOUNT JSON, PUSH_WORKER_SECRET. SQL outbox claims lease work, retry transient failures, and re-check current recipient access. Notifications carry generic text and an opaque notification ID, no student names, form answers, payment details or teaching notes. Opening/read notification is independent of completing a task. Firebase native/APNs credentials and scheduler are deployment steps. Never put service credentials in app, website or repository.

This implements single-organisation deployment with organisation-neutral names, not multi-tenant isolation inside one database. Accounts, coursework, private forms and finance must not be mixed between organisations without an explicit tenant model. Existing form submission validation and rate limits remain authoritative.

## Deployment and operating limits

1. Apply the additive community_workspace migration to an isolated/staging Supabase project with the website's existing profiles/form schema. Do not apply individual table snippets.
2. Test owner, assigned teacher, parent, student, forms-only staff and disabled accounts. Run `node --test tests/community-workspace.test.mjs tests/push-message.test.mjs` locally. The PostgreSQL WASM tests execute real grants, policies, RPCs and transactions; they do not connect to production.
3. Use existing owner-managed accounts; link students/guardians, enrolments and explicit teacher/head-teacher course assignments. A head-teacher label currently grants the same assigned-course operations as a teacher. Only owners create course/account links; a full delegated school management product is later work.
4. Enable workspace flags only after the shared schema exists. Current forms submit through the existing validated submit-form Edge Function. The existing gateway expects a legacy anon JWT; modern publishable keys need the existing gateway updated separately. Do not change authentication opportunistically.
5. Configure Firebase for the Flutter Android/iOS application, APNs keys for iOS, then set the push-worker server secrets and deploy. Schedule a POST every minute with the dedicated bearer secret. Store scheduling credentials securely (for example Supabase Vault); do not place a secret in a public SQL script or client bundle.
6. Worker claims at most 10 jobs and uses at most 10 devices/account, refreshed within 30 days. Failures retry up to eight attempts with exponential backoff capped at one hour. Monitor exhausted attempts and explicitly requeue after fixing the cause. Expired device entries should be routinely removed by a server maintenance job.

`delivered_at` means accepted by FCM, or intentionally skipped because the alert is no longer eligible/there are no devices. It is not proof the phone displayed or read it. FCM delivery is at least once; collapse IDs reduce duplicate alerts but do not guarantee exactly once. The SQL inbox is authoritative. Permission changes are checked before sending and again when opening the app; already delivered OS notifications cannot be recalled. Payloads contain no private content.

Student poetry/reflections remain within the authenticated course after teacher approval; this is not public publication consent. Approved published poetry is visible to that course's enrolled students and guardians. Drafts stay with the author/student's guardian and assigned teaching team. Uploads, public publication consent and editorial media handling require a later dedicated flow.

All new tables have RLS and explicit grants; device tokens and queue tables are service-only. Client RPCs are invoker wrappers around narrowly checked functions in the unexposed private schema. No client receives a service key. This migration does not create a production cron job, send notifications, change existing roles or deploy any Edge Function. Supabase advisor checks still need to run against staging before deployment; the local test database does not provide the managed advisor service.

Sources consulted: [Supabase push guide](https://supabase.com/docs/guides/functions/examples/push-notifications), [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security), [FCM HTTP v1](https://firebase.google.com/docs/cloud-messaging/send/v1-api).

## Verification checkpoint

The workspace security suite and push payload tests pass (13 tests). The edge entry point passes Deno type checking with the committed npm dependency lock installed using `npm ci`, followed by `deno check --node-modules-dir=manual index.ts`. The edge folder's package-lock records the dependencies used for that check. Deno's direct registry fetch is unavailable in this workspace, so a deployment Deno lock has not been generated; create and commit it in staging before deploying. Native FCM/APNs delivery and managed Supabase advisors remain staging checks.
