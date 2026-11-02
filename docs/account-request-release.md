# Account-request release boundary

Status: implementation and isolated regression checks only. This change does not apply a
production migration, deploy an Edge Function, change production secrets, or approve activation.
Keep intake closed until the checks below have passed on the intended deployment.

## Independent controls

| Control                                 | Default                                        | Effect                                                                                                                               |
| --------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `VITE_ENABLE_ACCOUNT_REQUESTS`          | Missing/empty/`false` = off                    | Build-time route and account-help links. Only `true` renders the form.                                                               |
| `ACCOUNT_REQUESTS_ENABLED`              | Missing/empty/anything other than `true` = off | Server-only runtime gate in `request-access`, read on every request.                                                                 |
| Personal accounts and staff invitations | Existing behaviour                             | `/portal`, email-link account creation, password recovery/setup, Google provider checks and `manage-user` are independent of intake. |

The website release workflow explicitly sets the frontend flag to `false`. Other hosting builds
must also leave it unset or `false`; this repository does not establish Hostinger's environment.
Do not put the server flag or service-role key into `VITE_*` variables.

While closed, `/account/request` shows an unavailable message with portal and office links. All
account-access entry links go to the office. The form and human-check widget are not mounted.
The certificate guide points to the existing personal-account flow at `/portal`.

The Edge Function returns HTTP **503** with
`{"error":"Account requests are not open yet.","code":"account_requests_disabled"}` and
`Cache-Control: no-store`, before reading the body, calling CAPTCHA, constructing a database
client or executing an RPC. OPTIONS remains available and other methods return 405. Query,
body, header, JWT and frontend flag values cannot enable the server gate.

An older, still-open browser bundle also receives the closed-server error rather than a receipt.
Changing only the frontend cannot close an older deployed Edge Function: the updated handler
must be deployed with its server flag unset or `false`.

## Preserved security boundaries

- Existing bounded JSON parsing, consent/input checks, allowed-origin checks, honeypots,
  timing checks and configured Turnstile verification remain in place when intake is enabled.
- `submit_account_request(jsonb,text)` is executable only by `service_role`. It validates the
  source key, name, email, requested role and message, filters requested features and applies
  the existing five-per-source-key-per-hour limit. Duplicates also consume that limit.
- The partial unique index permits one pending request per case-insensitive email. Repeating
  a pending request does not overwrite it and produces the same success receipt.
- Submitting a request only inserts a pending request. It does not create an Auth account,
  grant permissions, apply a staff label, or link a family/student record. Submitted permission,
  owner, approval and target-account fields have no authority.
- `manage-user` still verifies the caller with `auth.getUser()` and an active trusted profile
  with `users` permission (or ownership). It validates delegation before approval/invitation.
  `resolve_account_request` rechecks the actor, pending state and target email under row locks,
  and calls `manage_staff_access` for the final permission checks and audit. Reviewed requests
  cannot be approved again. Anonymous and authenticated clients cannot call these RPCs directly
  or read/write the request table.
- Approval grants only access explicitly selected by an authorised administrator. A teacher or
  parent request does not assign classes, link children or enable family/learning modules.
  Pending requests can still be reviewed while new intake is closed.

No database migration or approval-handler changes are included in this patch.

## Required deployment checks before enabling intake

1. Keep both flags off. Review the intended database migration chain, especially
   `20260912021743_explicit_staff_permissions.sql` and
   `20261017225316_community_operations.sql`, against the target database. Do not replay
   historical workspace fixtures. Confirm the request table, private rate-limit table, pending
   email index, RPC definitions/grants, active-manager rules and audit behaviour match the review.
2. Run the automated checks below. In an isolated database/staging deployment, confirm invalid
   roles and payloads fail, five requests from a source pass and the sixth is throttled, the
   window resets, duplicates stay unchanged, and direct anon/authenticated RPC/table access
   fails. Confirm inactive/unauthorised reviewers, email mismatches, excessive delegated
   grants and repeated approvals fail without partial permission changes.
3. Deploy the updated `request-access` with `ACCOUNT_REQUESTS_ENABLED` **unset or `false`**.
   Confirm a valid and a malformed direct POST both return the disabled 503/code and create
   no row. Confirm preflight still works. Verify the deployed revision rather than assuming
   that merging GitHub deploys Supabase.
4. On staging only, set the server flag to `true`. Check actual origin/CAPTCHA configuration,
   gateway-derived source IP handling, service-role RPC execution, duplicate receipts and
   throttling. Use controlled fixtures rather than real visitors. Close intake again afterwards.
5. Review the approval process with the responsible administrator: least-privilege grants,
   audit entries, existing-account matching, rejection and failure recovery. An Auth invitation
   and SQL approval are separate operations: a failed SQL approval can leave an invited account
   without permissions. Test that recovery path and verify no permissions are granted early.
6. Verify portal password/email-link sign-in, personal account creation, password setup/recovery
   and authorised staff invitations with intake off. Google remains conditional on the actual
   Supabase provider configuration; this patch does not configure or enable it.
7. Record the database review and deployed checks before a separate activation decision. After
   approval, enable the server first and verify it, then release a frontend built with its flag
   set to `true`. Remove the workflow's `false` pin only as part of that reviewed activation.

Rollback: unset `ACCOUNT_REQUESTS_ENABLED` or set it to `false` first, then rebuild the frontend
with `VITE_ENABLE_ACCOUNT_REQUESTS=false`. Intake closes immediately at the updated Edge handler
without interrupting existing accounts or staff invitations.

## Automated verification

```sh
npm ci
npm run validate
npm run test:edge
npm run test:account-requests:browser
npx playwright test tests/browser/portal-sign-in.spec.mjs tests/browser/account-recovery.spec.mjs
```

- `tests/account-requests-edge.test.ts` executes the real request and staff handlers using Deno
  with runtime network access denied and mocked external responses. It covers strict flag
  states, body-not-read while off, validation/protection errors, public enabled submissions,
  SQL error translation, unauthorised management, explicit approval and invitations while off.
- `tests/community-operations.test.mjs` executes the existing SQL in isolated PGlite, including
  database grants, invalid payloads, duplicate handling, throttling/reset, ignored privilege
  fields, approval/delegation rollback and audit/replay checks.
- `tests/browser/account-requests.spec.mjs` runs against separate enabled and disabled local
  servers, with mocked Supabase calls. It checks direct navigation, entry links, inactive
  members, independent email account creation, and closed-server/rate-limit responses.
- `tests/build-settings.test.mjs` checks the missing-flag default and rejects ambiguous release
  values. CI runs the Edge suite and both browser flag states; release packaging runs the Edge
  suite and pins intake off.

These isolated tests are not evidence that production migrations, CAPTCHA, SMTP, provider
configuration or deployed Edge checks have passed.

### Local results (26 October 2026)

- `npm run validate`: lint, frontend type checks, **855 tests** and production build passed.
- `npm run test:edge`: **3 suites / 19 steps** passed with runtime networking denied.
- Account-request browser suite: **9 passed**, with the enabled-form-only case intentionally
  skipped on the disabled server. Existing portal/recovery browser suite: **12 passed**.
- Removing each new gate caused its corresponding regression test to fail; restoring the
  gates returned both suites to passing.
- The separate release startup budget is still blocked on the current base: unchanged main
  `a5c219c` measures **242,847** gzip bytes; this branch measures **242,970**, against **240,000**.
  Both were built with the same isolated public configuration. Existing
  [quality PR #37](https://github.com/jicuser/website/pull/37) covers startup loading; this
  intake change does not absorb that separate work or relax the budget.
