# Forms, course materials and fee workspace

The website uses the same Supabase accounts and API contracts as the app. Enable `VITE_ENABLE_WORKSPACE=true` only after staging the additive migrations and functions documented in `forms-api.md`, `fees-api.md` and `learning-extensions-api.md`. Existing public contact, Madrassah and I’tikaf forms remain available through their existing validated endpoint when the new workspace is disabled.

## Where to use it

- `/portal` → **Forms and replies**: available published forms, staff form definitions and the responses inbox. The existing administrator Forms inbox opens the same workspace when enabled.
- `/forms/<slug>`: shareable published form, including conditional questions and private attachments. A signed-in submitter can read replies in their account. An anonymous submitter receives a reference; knowing an email address does not grant account access.
- `/portal?tab=forms&mine=true`: the signed-in person's own responses.
- `/portal?tab=fees`: all fee records the signed-in person is allowed to read.
- **My learning** → choose a course: course materials. Choose a student to see the associated fees as well as learning records.
- `/talks` and owner **Talks** tab mount the separate reviewed sermon archive and manager.

## Form workflow

Owners and people with `forms_manage` create forms. Explicit per-form managers edit their assigned definitions. A form can have multiple responsible people, watchers and managers. Publishing requires a responsible person; every responsible person receives an automatic task. Watchers receive an alert. Saving a draft preserves the published question snapshot until republishing. Turning acceptance off takes effect when saved.

The builder supports text, long text, email, telephone, number, date, single/multiple choice, confirmation, photograph and document fields. Conditional questions compare a value against an earlier unconditional field. Validation and conditional visibility reuse the Edge Function's pure validation module. Preview is interactive and never submits data.

Public uploads use the server's prepare/signed-upload/finish sequence, then attach only finished upload IDs to the submitted response. Files are private and server-validated. The attempt UUID remains stable across an unchanged submission retry. Changing the signed-in identity discards the old draft. Clearing a file invalidates its in-flight callback before a later completion can attach it. Selected hidden answers and their uploads are omitted from the response. JPEG/PNG/WebP photographs and PDF/ZIP documents are supported within the server limits.

The inbox searches all authorized answers on the server, filters by form/status/date/submitter, sorts oldest/newest, and shows matching/outstanding/completed counts. CSV reads every matching page, displays progress, supports cancellation, neutralizes spreadsheet formulas and stops explicitly above 25,000 responses. ZIP uses the authorized server export for selected responses from one custom form, up to the server's attachment size/count limits. Downloads use short-lived authorized links. Opening an email draft does not send it.

Staff can mark responses complete, reopen them, assign callback/payment/photo actions, add internal notes and reply in the portal. Submitters cannot read staff-only notes. The first 250 conversation entries are currently displayed; very long conversations require an additional history view. The source response and task completion remain separate.

## Course files and fees

Assigned teachers and department heads can add private PDF/image/audio/video course files (25 MB limit), or HTTPS resource links, edit descriptions, and publish/unpublish. A failed metadata insert attempts to remove its newly uploaded object. Students and guardians receive only published resources allowed by current enrolment; Storage RLS also applies to signed downloads.

Fee requests can be linked to a response or an enrolled student/course. New website entries are in GBP; input converts decimal pounds to integer pence without floating-point rounding. Staff confirm a receipt only after explicitly checking the payment was received. The UI labels these manual confirmations, separately from verified provider events. Unchanged retries retain their UUID. Unconfirmed server/network results keep fee fields read-only until the same attempt is retried or the ledger is refreshed; definitive rejected requests can be corrected. Corrections append reversal entries and reasons; voiding requires no net receipt. Neither action charges a card or issues a refund. Summary balances are grouped by currency. Fee receipt/audit history is bounded to 200/100 entries per opened request.

## Optional email transport

Portal replies are the default. The email composer is shown only when `form_email_capability` confirms a configured worker is ready. Queuing an email requires explicit recipient/content acknowledgement and uses a retry UUID. The queue RPC atomically saves the portal reply; clients do not send an additional duplicate reply. Changing the recipient or message clears the review acknowledgement. Unchanged email retries keep their UUID. Delivery status is shown separately. Incoming email stays staff-only until reviewed and accepted; accepted messages are labeled as email with an unverified sender, not an authenticated account.

## Verification

- `npm run check` passes.
- `node --test tests/custom-forms-ui.test.mjs tests/fee-ui.test.mjs` passes eight tests covering visibility, draft validation, full CSV pagination/cancellation, formula safety, download URLs and exact minor-unit amounts.
- `VITE_ENABLE_WORKSPACE=true npm run build` passes. The existing optional HLS bundle still emits Vite's large-chunk notice.
- `npx playwright test --config=playwright.forms.config.mjs` passes nine mobile browser tests. These exercise actual React/router/UI code with all external data and writes intercepted: public conditional response/retry, owner publishing/routing, search/reply/task assignment, fee receipt retry, course-file cleanup after metadata failure, explicit optional email acknowledgement, account-change draft cleanup, cleared in-flight uploads, and task totals beyond the loaded-row cap. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` if using an existing Chromium installation.

No real response, upload, payment record or outgoing message was created during these checks. Managed Supabase RLS/Storage deployment, production credentials and real email delivery remain staging/release checks owned by the deployment workflow.

Action dashboard totals now use exact server HEAD counts under the current account's RLS: open/overdue totals follow the selected form; unread alerts cover the account. The action list separately labels its loaded-row limit.
