# JIC certificates: first release groundwork

Status: implemented behind `VITE_ENABLE_CERTIFICATES=false`. The staged SQL is not automatically applied. No production certificate has been issued by this work.

## Where people go

| Person | Entry | What they can do |
| --- | --- | --- |
| Active account holder | My account → My certificates | Request a certificate, follow the office response, view their issued records and copy a verification link |
| Authorised staff | Administration → Certificates | Review pending requests, check source details, issue a record, decline with a reason, or revoke an issued record |
| Recipient of a verification link | /verify/:token | Check reference, certificate type, issuing centre, issue date and validity |
| Website visitor without an account | My certificates | See the sign-in destination; private records never load |

Initial types: Nikah, Shahadah, course completion and Ijazah. These are community records. This implementation does not claim statutory status, a cryptographic signature, an imam's digital signature or an accredited qualification.

An issued certificate records the approved wording and the approving staff member's display name. It cannot be edited or deleted through the application. Corrections require revocation and a new reviewed request. Staff cannot approve their own request.

## Shared website and app contract

Supabase Auth identifies the account. Website and future native app use the same tables, RLS and RPCs; a native app must not use a service key.

- `request_certificate(p_kind, p_recipient_name, p_event_date, p_notes, p_client_key)` → request UUID.
- `review_certificate_request(p_request_id, p_decision, p_statement, p_note)` → certificate UUID on issuance.
- `revoke_certificate(p_certificate_id, p_reason)` → void.
- `verify_certificate(p_token)` → minimal public JSON or null.
- RLS-scoped `certificate_requests` and `certificates` reads, paged by created/issued timestamp and ID.
- `certificate_events` records the requester/issuer/revoker, time and action. Only certificate staff can read events.

The request key is reused for retries. A daily limit of five new requests per active account is enforced transactionally. Repeat issuance or revocation does not create duplicate records. Disabled accounts cannot read or request, and staff labels alone grant no capabilities.

`certificates` is an explicit permission in the shared staff catalogue. Deploy the matching `manage-user` Edge Function before enabling the permission checkbox. Owners already pass the existing explicit owner permission check; other staff require the checkbox.

The public token is random and cannot be derived from the certificate reference. Treat its link as shareable. Public verification deliberately excludes the recipient's name, event date, account ID, certificate wording, approver identity, internal notes and revocation reason. It verifies the issuing record, not the identity of the person presenting a copy.

Certificate pages are excluded from indexing and suppress the Referer header. No third-party QR API, public storage bucket or document upload is used. The full certificate is a responsive HTML account view; no PDF is generated.

## Activation

1. Review the four initial certificate types and agree the wording, evidence requirements, authorised issuers and retention policy with the centre.
2. On a development Supabase branch, turn `supabase/features/certificates.sql` into one named migration using the project's normal migration tooling. It requires the existing `profiles` table and `private.has_permission(text)`. Do not apply the quarantined legacy migration history as a shortcut.
3. Run the real SQL permission suite and browser suite. Test with two ordinary accounts, one certificate staff account and one inactive account.
4. Apply the reviewed feature migration to the intended project, then deploy the updated `manage-user` shared permission catalogue.
5. Build with `VITE_ENABLE_CERTIFICATES=true`. This flag is independent of `VITE_ENABLE_WORKSPACE`; enabling certificates does not enable the unfinished learning workspace.
6. Grant the certificate permission to the intended staff. Submit and review a labelled test request, verify the public fields, revoke it, and confirm the verification page changes.
7. Confirm the exact build is deployed by Hostinger. A merge to GitHub is not proof of a live deployment.

To pause the UI, rebuild with the certificate flag false. Preserve issued records. A UI flag is not a replacement for server authorization or a mechanism to silently alter previously issued records.

## Next increments

- A local QR encoder for the same verification URL, without sharing certificate data with an external image service.
- Approved templates and a real signing policy before any “signed and sealed” claim.
- Delegated family access only after guardian relationships are verified.
- Private evidence uploads with size/type limits, staff access rules and short-lived signed download URLs.
- Native app screens and deep links consuming the same account API.
- Optional notification outbox after the certificate workflow is activated. This release does not send email or WhatsApp messages.

## Verification

`tests/certificates.test.mjs` executes the staged schema in PGlite with actual anonymous/authenticated roles. It checks private reads, permission enforcement, immutable snapshots, idempotency, public-field minimisation, revocation, inactive accounts and rate limits.

`tests/browser/certificates.spec.mjs` runs only in the isolated feature-enabled test server. Production defaults remain off.

## Research

Reviewed 15 October 2026:
- Labbaik features: https://uselabbaik.com/features
- Labbaik mosque workflows: https://uselabbaik.com/masajid
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase private storage: https://supabase.com/docs/guides/storage/security/access-control

Labbaik's public marketing describes signed/sealed certificates and link/QR verification. We did not inspect its private source code or authenticated certificate workflow. Our implementation is original and does not assert that it reproduces Labbaik's signing mechanism.
