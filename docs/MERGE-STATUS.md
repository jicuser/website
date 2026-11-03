# Community improvements integration

The community branch is integrated with main without replacing the newer content, posters, forms, screen controls or staff editor.

## Release state

- Website account entry and password sign-in are available at `/portal`. Google is offered only after the live Auth settings confirm it is enabled, and checked again before redirecting. The current project has Google disabled; configure its OAuth client credentials and redirect allowlist in Supabase before offering it.
- With `VITE_ENABLE_WORKSPACE=false`, signed-in members see an account page; authorised staff can open administration. Family/learning modules are not advertised as live.
- Keep `VITE_ENABLE_WORKSPACE=false`. The historical all-in-one workspace remains incompatible with live forms. The new **learning-only** upgrade is separate: `20261103090000_learning_foundation.sql` and `20261103091000_learning_admissions.sql`. It composes with the current unified-forms baseline and preserves existing task/form functions. Follow `docs/2026-11-03-learning-release.md`; its server switch defaults off. Do not deploy historical fixtures or enable the old client flag.
- Account requests are separately disabled by default. Keep `VITE_ENABLE_ACCOUNT_REQUESTS=false` and server `ACCOUNT_REQUESTS_ENABLED` unset until deployed and reviewed, including rate limiting and transactional approval. Existing staff invitations continue to work.
- The standalone account-request schema does not change existing permissions. A requested teacher label does not assign classes or grant access to student records.
- Live video rooms, automatic attendance and teacher chat are not implemented by these portal cards.
- GitHub main and the Hostinger deployment are separate checks. This merge does not establish which branch Hostinger deploys, publish backend functions, or enable Google.

Earlier workspace release documents describe the historical branch architecture; they are not an activation procedure for the merged production database.
