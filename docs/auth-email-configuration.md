# Account email configuration

## Prepared in the repository

- `supabase/email-templates/invite.html`: branded invitation.
- `supabase/email-templates/recovery.html`: branded password setup/reset.
- `manage-user/site-url.mjs`: the default production destination is
  `https://jicmasjid.org/admin/setup`. `JIC_SITE_URL` remains a server-only override.

## Hosted configuration still requires verification

HTML files in this repository do not change hosted Auth templates automatically.
Deploying an Edge Function does not update Auth's Site URL, redirect allowlist,
sender identity or SMTP settings. The available project connector does not expose
those settings. Do not claim the email flow is repaired until a fresh email is tested.

1. Confirm the production HTTPS domain and `/admin/setup` route. Resolve the browser
   security warning before entering real credentials. Do not change DNS as part of
   this task or disable certificate checks.
2. Check the existing `JIC_SITE_URL` Edge secret. It must be the intended production
   origin, not a Vercel preview or a retired temporary host.
3. In Supabase Authentication URL Configuration, use the intended production Site
   URL and explicitly allow `https://jicmasjid.org/admin/setup`. Preserve any valid
   mobile deep links and other approved redirects. Do not broadly allow `*` or
   all Vercel previews. Investigate old entries before removing them.
4. Back up the current invitation/recovery template and subject settings privately.
   Set the Invite user subject to `Jamatia Islamic Centre — set up your account` and
   use `invite.html`. Set Reset password to
   `Jamatia Islamic Centre — password reset` and use `recovery.html`.
5. Keep the action link as `{{ .ConfirmationURL }}`. It verifies the token before
   redirecting; replacing it with a plain website link would skip verification.
6. Set the sender name to `Jamatia Islamic Centre` using an already approved,
   organisation-controlled sending address and configured SMTP provider. No new
   mailbox, provider, paid subscription or DNS change is assumed. Disable link
   rewriting/click tracking for authentication emails at the chosen provider.
7. Send a new invitation to a consenting test recipient, open it in a signed-out
   browser and complete password setup. Test reset, expiry, reuse and mobile email
   browser behaviour. Staff must not need a Vercel/hosting account. Old emails do
   not prove the new configuration works and may already be expired or consumed.

## Owner-only deletion

An active owner can delete another **disabled, non-owner** account, after typing
`DELETE`. The handler reads trusted database profiles and uses the Auth Admin API;
it does not accept role claims from request metadata. Self and all owner accounts
are protected. A registered TV input blocks deletion to avoid deleting its source.

The deletion request must be audited before the Auth call. Network uncertainty is
reported as unconfirmed and staff must reload. A confirmed deletion remains a success
when the later audit-status update fails, with a warning and the original request kept.

Content/history foreign keys and Auth's storage-ownership checks are deliberately
retained. Accounts linked to historical edits or owned uploads can be blocked.
Do not delete these records or relax constraints just to remove the account.
Keep access disabled while ownership/retention is resolved. This is not a GDPR
purge or a reassignment workflow. Existing permission checks consult active profiles;
this change does not claim already-issued JWTs become cryptographically invalid.

No real account deletion or invitation is part of automated tests. Browser tests
replace only external data; helper tests use an isolated fake Auth adapter.

## References

- https://supabase.com/docs/guides/auth/auth-email-templates
- https://supabase.com/docs/guides/auth/redirect-urls
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/auth/managing-user-data
- https://supabase.com/docs/reference/javascript/auth-admin-deleteuser
