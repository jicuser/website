# Maintenance status

## Agreed boundaries

- Preserve the current desktop/mobile admin design and working casting, TV, radio and prayer flows.
- One coordinated writer to `main`; do not overwrite concurrent changes.
- No DNS, registrar, email DNS, hosting or Cloudflare changes in this work.
- No host migration before a replacement has been tested. One production frontend host.
- Do not assume nonprofit eligibility for Vercel Hobby or purchase a plan without approval.
- No new SMTP provider, remote-desktop access, signing credentials, paid cloud builds or store publication without the corresponding setup decision.
- Preserve real staff accounts, audit history, published content and licences during repository cleanup.

## First delivery: accounts and mobile administration

| Item | Status | Acceptance check |
| --- | --- | --- |
| Poster picker titles | Implemented; isolated browser checks passed; full-app check pending | Image above title; no character-by-character wrapping at 390px. |
| Mobile section navigation | Implemented; isolated browser checks passed; full-app check pending | One Go to selector in sticky toolbar; desktop sidebar unchanged. |
| Invitation destination | Code default corrected; hosted redirect settings unverified | Production fallback is the JIC domain; live Site URL/allowlist/Edge secret agree. |
| Branded account emails | Templates prepared; not applied to hosted Auth or SMTP | Invitation/reset templates identify Jamatia Islamic Centre; real sender and links verified. |
| Owner-only account deletion | Implemented; helper/UI checks passed; Edge deployment pending | Server checks, explicit confirmation, owners/self protected, dependencies preserved. |
| Browser security warning | Open | Inspect exact warning, live TLS chain, HTTP redirects and mixed content; a cached fetch is insufficient. |

## Next approved work, not included in the first release

1. Reconcile Flutter custom-form code, its migrations and the deployed backend before changing the website's form model. The inspected project currently deploys manage-user, submit-form and tv-control only.
2. Forms management: current/draft/closed forms, creation, responses, linked content and responsible staff. Preserve existing inbox records.
3. Linked courses, activities, talks, gatherings, posters, pages and optional registrations. Do not create a duplicate course for each poster.
4. Education as parent; Adult Courses & Classes and Madrasah have separate content, tabs and schedules. Preserve old links.
5. Publishing states, form versions, duplicate-submission protection, private attachments and staff reassignment. Decide retention before historical deletion.
6. Measure route loading and background refreshes; preserve secure authentication checks and useful error states.
7. Classify personal placeholders, obsolete instructions, temporary domains, dead code and conflicting styles. No blind global renames or deletion of legitimate attribution.

## Deferred decisions / operational prerequisites

- Vercel: confirm appropriate plan and the correct current repository; keep old preproduction separate.
- Cloudflare/DNS: separate change window after production acceptance; preserve mail records.
- App delivery: choose Codemagic or GitHub Actions, provision Apple/Google accounts and signing, test through TestFlight/Play testing before public release.
- SMTP: verify an organisation-controlled sender and existing provider configuration; no invented mailbox or assumed service subscription.
- Physical casting speed/TV fit: retain the working transport. Capture real TV geometry and timings before altering ratios or negotiation.

## Evidence policy

Record local tests, complete build, repository push, hosted deployment and physical-device checks separately. An isolated component test is not an end-to-end production test.

## Verification checkpoint — 14 September 2026

- Source baseline: `71e323290062514b6f6777c9df601875bdad2107`. Changed source
  files were checked against their Git blob hashes before editing.
- 21 local Node tests passed: deletion safeguards, account destination/password
  checks and branded-template verification-link checks.
- Isolated React/Chromium checks passed at 320px, 390px and 1280px for poster
  geometry, editor focus, publishing and navigation. Five deletion UI cases passed
  for owner/manager access, enabled targets, cancel/confirm, error and warning states.
- The isolated fixture substitutes auth/data and uses selected stylesheet rules;
  it is not a full-application or production-browser test.
- A checked-in browser regression suite and read-only GitHub Actions workflow
  are prepared for the complete repository validation, build and browser tests.
- No real accounts were deleted, no emails sent, and no DNS or hosting changed.
- Hosted email settings, production TLS, real email acceptance and physical
  iPhone/TV behaviour remain operational acceptance checks.

See `auth-email-configuration.md` for the exact hosted email prerequisites and
the intentionally conservative account-deletion dependency policy.
