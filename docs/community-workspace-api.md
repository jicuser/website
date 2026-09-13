# Community workspace API — additive, not deployed

Use existing Supabase accounts and get_my_profile. Active owners manage courses, students and assignments. Staff access comes only from explicit course assignment or existing form permissions; labels do not grant access. Enable website VITE_ENABLE_WORKSPACE and app ENABLE_EXTENSIONS only after staging this migration and verifying representative users.

## Stable client contract
All IDs are UUIDs, dates ISO, and timestamp columns timestamptz. Select results through normal authenticated Supabase clients: RLS limits each caller. Limit/paginate lists.

| Table | Columns used by clients | Write path |
|---|---|---|
| learning_courses | id,title,department(adult/madrassah),description,published,created_at | owner insert/update |
| learning_staff | course_id,user_id,role(teacher/head_teacher) | owner insert/delete |
| learning_students | id,display_name,user_id nullable,guardian_id nullable,created_at | owner insert/update |
| learning_enrolments | course_id,student_id,active | owner insert/update/delete |
| learning_sessions | id,course_id,starts_at,ends_at,title,created_at | assigned teachers/owner insert/update |
| learning_attendance | session_id,student_id,status(present/absent/late/excused),note,marked_by,marked_at | mark_class_register RPC |
| learning_records | id,course_id,student_id,kind(progress/plan/assessment),title,body,published,created_by,created_at | assigned teachers/owner insert/update |
| learning_meetings | id,student_id,course_id,requested_by,requested_at,proposed_at,notes,status(requested/confirmed/completed/cancelled) | student/guardian request; teacher/owner schedule/status |
| student_contributions | id,student_id,course_id,title,body,kind(poetry/reflection),published,created_by,created_at | student/guardian submit draft; teacher/owner publish |
| work_tasks | id,form_id nullable,title,description,assigned_to,created_by,status(open/in_progress/waiting/done),due_at,created_at,updated_at | create_work_task RPC; direct status update |
| user_notifications | id,user_id,kind(task/learning),entity_id,created_at,read_at | own read_at update only |
| form_workflows | kind(contact/madrassah/itikaaf),assigned_to,title,due_hours,enabled,configured_by | owner upsert, actor stamped server-side |

## RPCs
- create_work_task(p_title text,p_assigned_to uuid,p_form_id uuid=null,p_due_at timestamptz=null,p_description text="") → UUID. General delegation owner-only; self tasks allowed. Linked form tasks require caller and recipient current kind access.
- task_assignees(p_form_id uuid=null) → [{id,display_name}]. General: owner sees active people, others themselves. Form: eligible people only if caller can read form.
- mark_class_register(p_session_id uuid,p_marks jsonb) → void. Marks [{student_id,status,note}]. Entire batch rolls back if any student is not actively enrolled.
- register_push_device(p_token text,p_platform text) → void. platform android/ios, active caller only. Tokens opaque, server-owned, cannot rebind another account token.
- unregister_push_device(p_token text) → void. Removes current account device only.
- request_learning_meeting(p_student_id uuid,p_course_id uuid,p_notes text,p_proposed_at timestamptz=null) → UUID.
- submit_student_contribution(p_student_id uuid,p_course_id uuid,p_title text,p_body text,p_kind text="poetry") → UUID draft. Publication stays with assigned teachers/owner.

## Push delivery
The push-worker is a scheduled server endpoint; it does not accept a user-selected recipient or message. POST with a dedicated PUSH_WORKER_SECRET bearer (minimum 32 characters), verify_jwt=false. Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FCM_SERVICE_ACCOUNT JSON, PUSH_WORKER_SECRET. SQL outbox claims lease work, retry transient failures, and re-check current recipient access. Notifications carry generic text and an opaque notification ID, no student names, form answers, payment details or teaching notes. Opening/read notification is independent of completing a task. Firebase native/APNs credentials and scheduler are deployment steps. Never put service credentials in app, website or repository.

This implements single-organisation deployment with organisation-neutral names, not multi-tenant isolation inside one database. Accounts, coursework, private forms and finance must not be mixed between organisations without an explicit tenant model. Existing form submission validation and rate limits remain authoritative.
