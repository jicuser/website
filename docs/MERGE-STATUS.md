# Community improvements integration

The community branch is integrated with main without replacing the newer content, posters, forms, screen controls or staff editor.

## Release state

- Website account entry and password/Google sign-in are available at `/portal`. Google still requires provider and redirect configuration in Supabase.
- With `VITE_ENABLE_WORKSPACE=false`, signed-in members see an account page; authorised staff can open administration. Family/learning modules are not advertised as live.
- Keep `VITE_ENABLE_WORKSPACE=false`. The historical workspace migrations overlap the deployed website forms schema. They are retained under `tests/fixtures/legacy-workspace` for isolated regression tests, not in the deployable migration directory. A new additive upgrade and full migration-chain test are required before activation.
- Account requests are separately disabled by default. Keep `VITE_ENABLE_ACCOUNT_REQUESTS=false` and server `ACCOUNT_REQUESTS_ENABLED` unset until deployed and reviewed, including rate limiting and transactional approval. Existing staff invitations continue to work.
- The standalone account-request schema does not change existing permissions. A requested teacher label does not assign classes or grant access to student records.
- Live video rooms, automatic attendance and teacher chat are not implemented by these portal cards.
- GitHub main and the Hostinger deployment are separate checks. This merge does not establish which branch Hostinger deploys, publish backend functions, or enable Google.

Earlier workspace release documents describe the historical branch architecture; they are not an activation procedure for the merged production database.
