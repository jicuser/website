# Optional form email bridge

Portal replies and generic app alerts remain the default. This module adds an explicit reviewed email action for authorised form staff, plus inbound replies that return to the same response thread. It is disabled until a configured worker supplies its readiness heartbeat. No email was sent or provider/domain settings changed during development.

## Staff workflow

1. Write a reply in the portal as usual, or choose the optional email action when available.
2. For email, review the recipient address, subject and exact message; confirm permission to contact that person. A form answer that resembles an email address is not proof of ownership. Nothing is automatically sent to every submitted address.
3. Sending atomically adds a portal reply and a delivery job. Repeated submission of the same unchanged client attempt returns the same job. The portal reply exists even if delivery subsequently fails; staff can inspect delivery status.
4. Replies sent to the random thread alias enter a staff-only review queue. Accepting adds a clearly labelled external email reply to the thread. Rejecting keeps it out of the conversation. The provider webhook signature authenticates the delivery event, not the human named in the From header.

The sender address and receiving domain are server configuration. Visitors cannot choose them. Plain text is sent; submitted attachments and internal notes are never included automatically. Receiving imports plain text only. HTML-only mail and attachments remain in the provider inbox for a staff member to inspect; the web app does not render remote email HTML or automatically download attachments.

## Deploy only after staging validation

Apply `20260913113136_optional_form_email.sql` after `20260913111401_custom_forms.sql`. Build `services/form-email/Dockerfile` from its directory and host behind HTTPS. Keep the database private schema off the exposed PostgREST schema list.

| Server variable             | Value                                                           |
| --------------------------- | --------------------------------------------------------------- |
| `FORM_EMAIL_ENABLED`        | `false` by default; explicitly `true` to activate               |
| `SUPABASE_URL`              | Existing project HTTPS URL                                      |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-only server credential                                  |
| `FORM_EMAIL_WORKER_SECRET`  | Independent random secret, at least 32 characters               |
| `RESEND_API_KEY`            | Account key with the required sending/receiving access          |
| `RESEND_WEBHOOK_SECRET`     | The webhook’s `whsec_…` signing secret                          |
| `FORM_EMAIL_FROM`           | Address on a verified sending domain, optionally a display name |
| `FORM_EMAIL_REPLY_DOMAIN`   | Verified receiving subdomain, e.g. `replies.example.org`        |
| `PORT`                      | Internal HTTP port, default 8080                                |

Configure the sending domain and the receiving subdomain/MX records in the organisation’s Resend account. Subscribe its webhook to `email.received` at `POST /webhooks/resend`. Do not redirect the organisation’s existing mailbox domain unless that is deliberately wanted; a dedicated reply subdomain is sufficient.

Schedule `POST /dispatch` every minute with `Authorization: Bearer <FORM_EMAIL_WORKER_SECRET>`. The protected endpoint refreshes readiness for ten minutes and claims at most one job per call. A missing/stopped worker disables the client email option when readiness expires. Configure a reverse-proxy response timeout of at least 120 seconds. No public CORS access or client provider credential is required. `GET /health` is a minimal liveness check.

## Delivery semantics

- Queue and worker lease IDs prevent competing workers from completing another job. Staff access is checked when queueing, claiming, and immediately before the provider request. Revoked staff jobs are cancelled.
- The provider request uses a stable `Idempotency-Key: form-email/<job UUID>`. Automatic retries stop before its documented 24-hour window expires. Jobs older than 23 hours or with unconfirmed final delivery move to `uncertain`; inspect the provider log before choosing to send a new message.
- `sent` means the provider accepted the request. It is not proof of mailbox delivery or reading. Delivery/bounce events remain in the provider dashboard; the app does not mark a task complete because email was sent.
- Inbound aliases are unpredictable UUIDs scoped to a response and recipient and expire after 180 days. Incoming provider IDs are unique, so webhook replay does not duplicate replies or alerts. All inbound content requires staff review, including apparent replies from the expected address.
- Signatures cover the exact raw body with HMAC-SHA256, constant-time comparison, and a five-minute timestamp tolerance. Request/provider response sizes and network timeouts are bounded. Addresses, bodies and credentials are not logged by this service.

## Client contract

`form_email_capability(p_submission_id)` returns `{enabled}` to current staff. `queue_form_email(p_submission_id,p_recipient,p_subject,p_body,p_idempotency_key,p_acknowledged)` returns the job UUID. Keep the idempotency UUID unchanged during a failed request retry, but make a new attempt if any recipient/message field changes.

Staff can read `form_email_outbox` and `form_email_incoming` filtered by `submission_id` under RLS. `review_form_email(p_id,p_accept)` is idempotent for already reviewed mail. Accepted inbound rows in `form_replies` use `author_kind='email'` and `author_id=null`; existing authenticated replies keep `author_kind='account'`. Clients must label email origin explicitly and must not display an authenticated staff identity for those rows.

## Verification

`node --test tests/form-email.test.mjs` uses only mocked provider requests and local SQL. It covers signature tampering/replay, alias routing, payload/idempotency, disabled workers, inbound quarantine, owner/staff access, no duplicate replies, leases and explicit acceptance. Deployment still needs a verified domain, receiving routing, scheduler and an authorised staging send/reply test. No real delivery is claimed by the mocked tests.

References: [Resend sending API](https://resend.com/docs/api-reference/emails/send-email), [received email API](https://resend.com/docs/api-reference/emails/retrieve-received-email), [Resend webhook verification](https://resend.com/docs/webhooks/verify-webhooks-requests), and [Svix manual verification](https://docs.svix.com/receiving/verifying-payloads/how-manual).
