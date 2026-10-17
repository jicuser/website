# Portal web/app contract

This batch changes the website, not a native application release. A future app must call the same authenticated Supabase APIs; it must not use service-role credentials or duplicate permission decisions in a separate database.

## Family information
Identity is `auth.uid()`. Resolve students only through `learning_students.user_id`, `learning_students.guardian_id`, or `learning_guardians(user_id,student_id)`. A teacher assignment is not a household link. `learning_enrolments.active` identifies current courses. The family presentation filters `learning_records.published = true`, even when a teaching account could also read drafts. Attendance joins saved `learning_attendance` rows to `learning_sessions`; missing records are not absences and the interface does not fabricate a percentage.

Meeting requests use the existing `request_learning_meeting(p_student_id,p_course_id,p_notes,p_proposed_at)` RPC. Disable duplicate in-flight submissions. A timed-out write is not proof of failure; refresh records before resubmitting. Preferred times are entered in device-local time and sent as UTC timestamps; display uses Europe/London.

Course files use the existing private learning-resource flows. Fees use the existing paginated `list_fee_requests` contract and immutable receipt model. Forms/replies use the existing custom-form workspace. These screens do not create Stripe subscriptions or infer paid status from a redirect.

## Navigation
Website deep links use `/portal?tab=home|family|learning|forms|fees|tasks|notifications`. Family links additionally accept `student`, `course` and `view=progress|attendance|materials|fees|meetings`. Treat IDs as selectors, never as authorization. Validate a requested ID against the authenticated permitted result. Unknown or unauthorised areas return to Overview. Native routing can map these same destinations without duplicating business rules.

## Availability
Do not turn on `VITE_ENABLE_WORKSPACE` or certificates solely because their screens compile. The connected JIC database inspected during this batch did not contain the learning tables. Existing feature flags are deliberately unchanged. The installed learning/fees schema, RLS and role fixtures must be activated and verified before real family records are released. No production migration, identity write or message was made by this batch.

## Remaining integrations
Apple/provider configuration, approved usernames, recurring billing, communication providers, advanced curricula, safeguarding, staff payroll and app-store builds remain separate implementation/release work. The public service-booking and donation links are not personal histories. Only data actually returned by the relevant authorised API is presented as a personal record.
