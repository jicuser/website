# JIC functional and security review

Status: fixes prepared for review; **not a complete cross-device or production sign-off**.

## Source reviewed

- `jicuser/website`, base commit `e758881e9299f130f1c54884715ac4ec7d76fee7`.
- Compared with `tippytaptap/jicpreprod` at `db3451eff6b4d72061ab6e04840ee7e0d556bf26`: repositories differ in navigation, donation and mobile styling. Production repository was retained as the base.
- Inspected attached ZIP inventories and the three supplied images. The supplied prayer poster is for August 2026; it cannot independently verify September prayer values. Its bank details agree with the existing donation component.
- Connected Supabase project: JIC website (`pwhtguaevhlnzytneemp`).
- Existing React/Vite architecture retained. No new-framework rebuild started.

## Implemented corrections

- Run profile loading outside Supabase's auth state callback to avoid the documented request deadlock; invalidate stale profile responses and handle failed initial session loads.
- Reject unsuccessful or zero-row inline content saves, keep failed text edits open, and show their errors. Image upload no longer reports success when saving its content reference fails.
- Align picture uploads with the live bucket: JPG, PNG and WebP, maximum 8 MB. Reject HEIC/SVG with an actionable message. Make inline picture replacement a visible keyboard-accessible button and text editing visible on touchscreens.
- Restrict the homepage tile route to content editors/admins, backed by existing database policies.
- Add missing standalone pages, including extension floors and Madrassah pages, to the existing page editor registry.
- Add editing and publishing controls for existing team profiles, including their pictures, and validate saved row counts.
- Display published upcoming events and posters, which the homepage previously fetched without rendering. Use London dates for the event filter and restrict rendered external event links to HTTPS.
- Harden YouTube embed parsing to trusted hosts and valid video IDs.
- Make Visit the Centre navigate to the map, including anchor scrolling below the fixed header.
- Clear old page sections during navigation to avoid carrying content into the next page after a failed load.
- Load the CSS cascade through one ordered entrypoint; repair malformed bracketed selectors and remove references to a nonexistent hero SVG.
- Measure actual header height for content clearance, reduce the desktop information grid's minimum width at laptop sizes, contain mobile controls inside their card, show the reminder at initial mobile load, and increase tiny mobile prayer/reminder labels.
- Make the active subsection unique, add menu expanded states and Escape handling, honour the solid-surface preference, and add reduced-motion CSS.
- Replace the contact form's nonexistent email API call with a clearly labelled email-draft workflow. It does not claim a message has been sent; the visitor sends it in their own email app.
- Hide the unconfigured I'tikaf submission form behind an explicit readiness flag, with contact details available instead. A configured existing Sheets webhook continues to enable its workflow.
- Restore the missing ESLint configuration and add focused image/timetable validation tests.

## Verification and limits

| Check | Result |
|---|---|
| Production build | Pass; previous invalid-selector and missing-SVG warnings resolved. Large application chunk warning remains. |
| Source lint | Pass. |
| Image MIME/size and timetable validation tests | 3 tests pass, including rejected HEIC/SVG, oversized files, invalid dates, duplicate dates and invalid times. |
| Public timetable REST API | HTTP 200; latest loaded date 30 September 2026. |
| Radio endpoint | HTTP 200, `audio/mpeg`, audio bytes received. This verifies transport, not audible device playback. |
| Supabase table protection | RLS enabled on all nine public tables. |
| Anonymous permissions | No staff profiles, audit logs or unpublished page sections visible. Today's timetable visible. |
| Anonymous writes | Content insert denied and content update affected zero rows. Tests ran in a rolled-back transaction. |
| Unprivileged authenticated role | User-editable metadata claiming `super_admin` did not grant admin access; profiles/audit remained inaccessible. |
| Picture storage | Public image bucket with an 8 MB limit and JPG/PNG/WebP allowlist. Writes require the existing assigned staff roles. |
| iPhone/Safari, macOS Safari/Chrome, Windows Edge/Chrome | **Not visually or interactively verified.** The supervised preview server ran, but the browser rejected both attempts with `ERR_BLOCKED_BY_CLIENT`. No screenshots or browser passes were fabricated. |
| Authenticated admin save/upload/reload | **Not end-to-end verified.** Reviewed code and live policies; no staff credentials used and no authenticated browser session available. |

## Remaining release blockers and unfinished capabilities

1. **Staff invitations and role management:** no Edge Functions are deployed. The UI calls `manage-user`, but only its source exists in this repository. Deployment, invitation redirect/password onboarding and a real staff-account test are still required. Its current source also needs row-count/error checks and dependency pinning before deployment. No invitations were sent.
2. **I'tikaf:** `public.itikaaf_registrations` does not exist. The alternative Sheets webhook's deployed configuration was not available to inspect. Secure registration storage and submission handling must be configured before setting `VITE_ITIKAAF_REGISTRATION_ENABLED=true`. No registration records were collected or created.
3. **Direct contact email:** `send-contact-email` is not deployed. This patch supplies the working email-draft alternative, not server-side delivery. Automatic email requires a configured provider and protected endpoint.
4. **Device and admin QA:** the requested mobile/Mac/Windows and signed-in editing checks remain outstanding. Before merging, test 320/375/390/430 px mobile, tablet, 1024/1280 px laptop and wider desktop layouts, light/dark and glass/solid modes, menu/dialog focus, donation copying, playback, and a text/picture save followed by reload. Actual Safari and Edge checks must be labelled separately from any Chromium viewport emulation.
5. **Dependency advisory:** `npm audit --omit=dev` reported two moderate package findings (`react-router`, `react-router-dom`) representing React Router advisories, with no high/critical production findings. The suggested fix is a major upgrade to 7.18.3. The open redirect advisory concerns dynamically supplied destinations; navigation here is largely fixed. The hydration advisory needs SSR, while this is a client-rendered Vite app. Still schedule and verify the supported upgrade rather than declaring these packages clean. See [React Router redirect advisory](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6) and [hydration advisory](https://github.com/advisories/GHSA-337j-9hxr-rhxg).
6. **Password protection:** Supabase's security advisor reports leaked-password protection disabled. Supabase documents this feature as Pro-plan-and-above; no paid upgrade was made. See [Supabase password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
7. **Content completeness:** the database currently has no published events, team profiles or page sections; only the homepage has a managed `page:` record. Many standalone routes therefore show placeholder copy. The student portal/classes pages are content placeholders, not an implemented course-assignment or learning system. Overview-page editing still supplements some existing static sections rather than replacing all legacy copy; a full content migration is required to eliminate that duplication.
8. **Timetable continuity:** only 1–30 September 2026 is loaded in this project. Obtain the official October timetable before month end. The supplied August image does not establish accuracy of September's rows.
9. **Livestream and donations:** livestream is disabled with no published content to exercise. YouTube presentation needs a real configured stream for playback testing. Donations currently show bank details; no Zeffy/card checkout is wired in this production base. No payment was made.
10. **Remaining accessibility/performance work:** legacy CSS contains many overlapping overrides and small labels; modal focus trapping, 200% zoom, colour contrast and larger-than-500 kB application chunks require browser verification and further cleanup. The changes here do not constitute WCAG certification.

The auth change follows [Supabase's documented callback deadlock guidance](https://supabase.com/docs/guides/troubleshooting/why-is-my-supabase-api-call-not-returning-PGzXw0).

## Delivery

Prepared on `fix/jic-functional-review` for a draft pull request. No production branch was replaced, no website was deployed, and no persistent database data or permissions were changed. Local preview credentials are ignored and excluded from the commit.
