# Shared backend release

Prepared for the existing website and Flutter app. This is a deployment runbook, not a record that production has been changed. The database, Edge Functions and client rollout flags are separate deployment steps. Keep optional delivery and paid processing off for the first release.

## 1. Fix the target and preserve the existing website

Use the reviewed website release commit and project reference `pwhtguaevhlnzytneemp` only after confirming the dashboard says **JIC website**. First rehearse against a separate test project containing the existing website schema. Use test accounts and synthetic submissions there. Preserve the production backup/restore point, existing function versions, current Auth redirect settings and current website build before changing the live project.

The repository includes historical SQL with legacy date names and a schema snapshot. **Do not run `production_schema.sql` or replay old migrations on production.** The read-only review found the later `20260913114724_team_member_groups` migration already applied and reconciled to the repository. The six workspace migrations below are missing and have earlier timestamps. This known gap needs `--include-all` after verifying the pending list; it is not a reason to rerun the team migration or mark unknown work as applied. Recheck the ledger immediately before deployment because another website release may have changed it.

Discover commands in the installed CLI (`supabase --version`, then each command's `--help`). From the website checkout:

```bash
supabase login
supabase link --project-ref pwhtguaevhlnzytneemp
supabase migration list --linked
supabase db push --linked --dry-run --include-all --skip-vault
```

That preview must propose exactly the six missing workspace migrations in the next table. Stop and reconcile any additional historical entries before proceeding. For this verified gap, the write command is `supabase db push --linked --include-all --skip-vault`. Both `--include-all` and `--skip-vault` were checked in the installed CLI help. Do not pass `--include-seed`, `--include-roles` or `--prune`. A managed deployment tool may instead apply each exact missing version/file with migration history, one at a time, in the order below. After the gap is filled, ordinary later migrations do not need `--include-all` unless a new reviewed gap exists.

## 2. Apply the missing migrations in this order

| Version | File purpose | Required earlier source |
| --- | --- | --- |
| `20260913100552` | Community workspace, learning, tasks, notifications, push outbox | Existing explicit profile permissions and website forms |
| `20260913111401` | Custom forms, versioned submissions, private attachments, replies, per-form access | Community workspace |
| `20260913111515` | Reviewed talk archive and processing queue | Community workspace |
| `20260913111741` | Linked guardians, department heads, marks, plans, course files | Community workspace |
| `20260913113124` | Fee ledger, audited manual receipts, optional provider reconciliation | Custom forms and learning extensions |
| `20260913113136` | Optional form email queue and reviewed inbound replies | Custom forms |

The six workspace migrations are additive and explicitly grant APIs and enable RLS on exposed tables. The custom-form migration extends the allowed profile permissions without automatically granting them. Existing owners remain owners; users receive form or teaching access only through the relevant editor/assignment. Keep the `private` schema off the exposed Data API schema list. Keep all new file buckets private and retain their MIME/size allowlists. Global Storage limits must permit at least 25 MiB for course resources (forms stay capped at 10 MiB and sermon uploads at 24 MB).

## 3. Deploy the required handlers

```bash
supabase functions deploy custom-forms manage-user submit-form --project-ref pwhtguaevhlnzytneemp --use-api
```

The committed `config.toml` is the authority for gateway settings. All three use `verify_jwt=false` for compatibility with publishable keys and current user signing keys, with their own access model:

| Handler | Actual authorization |
| --- | --- |
| `submit-form` | Public allowlisted payload; bounded body; transactional network rate limit; no response read endpoint |
| `custom-forms` | Public published-form actions; private actions derive identity using Auth `getUser()` and recheck current database access |
| `manage-user` | Auth `getUser()` plus active profile permissions; database rechecks delegation under row locks |

The functions require the hosted `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; `custom-forms` also recognises the hosted legacy `SUPABASE_ANON_KEY`. No service credential belongs in a website/app build or Git. Existing legacy server keys remain supported for this release; migrate server credentials separately, including raw REST worker headers. Do not disable or rotate currently used keys during the feature rollout.

Set server `JIC_SITE_URL` to the selected public website origin and put its exact `/admin/setup` redirect in Supabase Auth's allowlist before using invitations or password setup. SMTP must be configured for delivery to real community addresses; Supabase's default sender has production restrictions. Do not test by inviting real people without their intended invitation action.

## 4. Verify before enabling clients

Run the repository checks, then exercise the real test project's APIs and Storage with an owner, assigned form worker, assigned teacher, linked guardian, unrelated account and signed-out visitor. Required live checks are: public legacy/custom submission; conditional fields; signed image upload and download; staff-only note; reply; task assignment/completion; unrelated-account denial; revoked-user denial; register/marks/guardian isolation; manual fee receipt and duplicate retry. Confirm website prayer times, public content, login and TV display still work. Run Supabase security/performance advisors and inspect errors without logging answers, student data or credentials.

The read-only production advisor check during this review returned nine existing informational TV findings for RLS enabled without client policies, plus the existing warning that leaked-password protection is disabled. These predate the workspace release. The TV tables are intentionally service-only: do not add broad client policies to remove those findings. Record and compare them after deployment. Review [Supabase password protection](https://supabase.com/docs/guides/auth/password-security) and enable the leaked-password check in Auth settings if supported by the account's plan (currently Pro and above). No Auth setting, subscription or RLS policy was changed by this review; these known findings are not evidence of a new workspace regression.

Local verification commands (network/paid requests are mocked):

```bash
npm ci
npm ci --prefix supabase/functions/push-worker --ignore-scripts
npm test
deno test --allow-env --deny-net tests/custom-forms-edge.test.ts tests/release-functions-edge.test.ts
deno check supabase/functions/custom-forms/index.ts supabase/functions/manage-user/index.ts supabase/functions/submit-form/index.ts supabase/functions/push-worker/index.ts supabase/functions/payment-webhook/index.ts
```

The SQL tests run actual PostgreSQL/WASM transactions and RLS. They do not prove hosted Storage URLs, Auth email delivery, device pushes or a real provider webhook. Once those checks needed for the first release pass, build the website with `VITE_ENABLE_WORKSPACE=true` and the app with `ENABLE_EXTENSIONS=true`. Feature flags alone do not create tables or functions.

## 5. Activate optional services separately

| Service | Defaults and setup |
| --- | --- |
| Forms attachment cleanup | Set independent `FORMS_MAINTENANCE_SECRET` (32+ random characters). Schedule an hourly POST to `custom-forms` with that bearer and JSON `{"action":"cleanup"}`. Removes at most 100 expired, unattached objects; never submitted files. |
| App push | Deploy `push-worker`; set `PUSH_WORKER_SECRET` (32+ random characters) and `FCM_SERVICE_ACCOUNT` JSON. Register the final Android/iOS apps in Firebase, configure APNs and native build files. Schedule a POST every minute using the dedicated bearer. No scheduler or push is activated by SQL alone. |
| Radio transcription | Leave the scheduled container absent until provider settings and speaker permission are ready. Build `services/sermon-worker`; configure the server values in [MEDIA.md](MEDIA.md). Run one bounded job at a time. It creates review drafts, never public AI quotations automatically. |
| Email replies | Leave `FORM_EMAIL_ENABLED=false` and the worker absent. Portal replies and app inbox remain usable. Activate only after the sending domain, dedicated receiving subdomain, signed Resend webhook and protected dispatcher in [EMAIL.md](EMAIL.md) are verified. |
| Stripe reconciliation | Leave `payment-webhook` undeployed unless an authenticated payment backend creates intents with safe fee metadata. Manual fee records remain usable. Configure signature, test/live and account settings in [fees-api.md](fees-api.md); this endpoint does not create payment buttons, move money, issue refunds or reconcile disputes. |

Use a server scheduler or Supabase Cron plus Vault for scheduling secrets; never put bearer secrets in public SQL or app configuration. Each endpoint must receive its own dedicated secret, not a user's JWT. Monitor failed/expired queue leases and provider rejections before promising delivery. Push acceptance means FCM accepted the request; it is not proof the person read or completed a task.

## Rollback

Disable the website workspace flag and use the last approved website build; stop optional schedules and containers. Disable/unpublish affected forms or talk publications from the owner controls if needed. Preserve the additive tables and responses while investigating. Do not drop tables or attempt an unreviewed reverse migration after people submit data. Existing app builds require a reviewed corrective build or server-side access/content control; a website build flag cannot remotely switch their compiled flag off.

References checked for this review: [database migration deployment](https://supabase.com/docs/guides/deployment/database-migrations), [function configuration](https://supabase.com/docs/guides/functions/function-configuration), [authorization headers](https://supabase.com/docs/guides/functions/auth-headers), [API key migration](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys), and [production SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
