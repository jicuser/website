# Website release on Hostinger

The website is a React/Vite static build. Keep Hostinger for the website and Supabase for its shared accounts, database, private files and functions. The Flutter app is released separately through its Android/iOS build and store workflow.

This guide prepares a release; no hosting account, domain, live database or email setting was changed during this review.

## Release order

1. Record the currently deployed website commit and retain its complete `dist` files for rollback. Check the live Supabase migration history and backup before applying changes.
2. If enabling the workspace, apply the six missing shared workspace migrations in their reviewed order, then deploy the matching functions/configuration. Existing migrations, including the already-applied team-group migration, must not be rerun. Use [the backend release guide](BACKEND-RELEASE.md) for the exact pending list and the verified migration gap. An ordinary website release with the workspace disabled does not need those new migrations, push, email or AI workers.
3. Check active owner, assigned teacher, student, guardian and unrelated-account access using representative test accounts. Verify private uploads, one form response, a reply, an assigned action and a fee record in the intended test environment.
4. Confirm the production website origin and Supabase email return settings below.
5. Build this reviewed frontend with the correct public project settings. Enable the workspace only when steps 2–3 have passed.
6. Publish the resulting static files on the existing Hostinger website. Refresh the direct URLs below and test a real invitation/recovery with its intended recipient.

The repository includes a **Prepare website release** GitHub Actions workflow. It builds and uploads an artifact; it does not deploy, connect a hosting account, merge a branch or send an invitation.

## Public build settings

Vite reads these when building. Changing a hosting variable after upload does not modify existing JavaScript; build and publish again.

| Variable                    | Required value                                                                  |
| --------------------------- | ------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`         | HTTPS origin of the same Supabase project used by the app                       |
| `VITE_SUPABASE_ANON_KEY`    | Public anon JWT or publishable key from that project                            |
| `VITE_ENABLE_WORKSPACE`     | `false` until activation checks pass; then `true`                               |
| `VITE_WONDERFUL_DONATE_URL` | Existing donation page, if configured                                           |
| `VITE_MEDIA_RELAY_URL`      | Existing public HTTPS relay origin, only if that optional service is configured |

Build validation rejects missing/malformed settings, an expired or wrong-project anon JWT, server keys, and a misspelled workspace flag. A publishable key is opaque, so a live read is still needed to check it belongs to the URL. Deploy the matching Edge Function configuration before switching an existing anon key to a publishable key.

Keep service-role keys, SMTP passwords, FCM credentials, payment secrets and AI keys in their server settings. No `VITE_` setting can keep a secret.

## Build and download

For GitHub Actions, add the public build settings under repository **Settings → Secrets and variables → Actions → Variables**. Once the workflow is available on the default branch, open **Actions → Prepare website release → Run workflow**, select the reviewed branch and set its workspace checkbox deliberately. Download the successful run's `website-dist-<commit>` artifact. The archive includes `.htaccess` for Hostinger route fallback.

For a local build, use Node 24 and an ignored `.env.local` file copied from `.env.example`:

```sh
npm ci
npm run check
npm test
npm run build
```

Only `dist/` is the website to upload. A build without backend settings now stops with a clear error instead of producing a site that fails in the browser.

## Choose the existing Hostinger deployment path

First open the current site's hPanel dashboard and check its deployment type. That account setting is not encoded in this repository.

- **Static web hosting / File Manager:** back up the current site. Upload/extract the artifact's contents into the domain's `public_html` directory, so `index.html`, `.htaccess` and `assets/` are directly inside it. Do not leave them inside an extra `dist` folder. Retain old hashed assets during the changeover so already-open pages can finish loading; replace the entry page after the new assets are present.
- **An existing Node.js/Vite build deployment:** use repository root, Node 24, the public build variables, `npm ci` and `npm run build`, with `dist` as the published output. Check the actual completed deployment commit. A Vite website does not need a separate application server after its files are built.
- **Advanced → Git on static hosting:** this integration copies repository files into the selected directory. Do not assume it runs the Vite build. This source branch does not track `dist`, so it needs an explicit existing build step or publication of the prepared artifact. Do not publish `.env`, backend source or the whole repository as the website.

Git auto-deployment may already follow `main`; inspect it before merging the feature branch. Keep the current host and domain. [Hostinger's Git guide](https://www.hostinger.com/support/1583302-how-to-deploy-a-git-repository-in-hostinger/) distinguishes static Git deployment from Node.js deployments.

## Invitations and forgotten passwords

Use the **actual live HTTPS website origin** consistently. For a release on `https://jicmasjid.org`:

| Setting                                    | Value                                    |
| ------------------------------------------ | ---------------------------------------- |
| Supabase Auth Site URL                     | `https://jicmasjid.org`                  |
| Supabase Auth exact allowed Redirect URL   | `https://jicmasjid.org/admin/setup`      |
| `manage-user` server secret `JIC_SITE_URL` | `https://jicmasjid.org`                  |
| Public forgotten-password page             | `https://jicmasjid.org/account/recovery` |

If the current live site still uses its temporary Hostinger address, use that origin consistently until the domain change is ready. The legacy `manage-user` fallback remains the temporary address; explicitly set `JIC_SITE_URL` for the intended release. Do not silently point already-sent emails at a different host. Add only intentional production redirect paths; avoid broad production wildcards. [Supabase redirect guidance](https://supabase.com/docs/guides/auth/redirect-urls).

Configure custom SMTP before inviting staff, students or guardians outside the Supabase project team. Supabase's default sender restricts recipients and is unsuitable for ordinary production invitations. This authentication email setup is separate from the optional form reply email worker. Keep public signup disabled. The account setup screen sends staff to Admin and members to the portal. Forgotten-password requests display the same confirmation for any supplied address. [Supabase SMTP guidance](https://supabase.com/docs/guides/auth/auth-smtp).

## Verify the published site

Direct-load and refresh `/`, `/prayer-times/monthly`, `/education/week`, `/forms/<published-slug>`, `/portal`, `/talks`, `/admin/login`, `/admin/setup`, `/account/recovery` and `/tv179`. An expired setup link should show its recovery message. Check phone width, prayer times, donation destination, radio playback and existing paired TV behaviour.

With the workspace disabled, `/portal`, public custom forms and `/talks` show availability messages without querying their new tables. Existing contact/Madrassah/I'tikaf forms still use their existing endpoint. With it enabled, verify owner and member sign-in, private file access, response/reply/task handling, course permissions and recovery email completion. Tests that mock Supabase do not demonstrate real SMTP delivery or live account setup.

If frontend checks fail, restore the previous static release. To withdraw only the new workspace, rebuild with `VITE_ENABLE_WORKSPACE=false` and publish that build. Retain the additive database changes and data; do not delete tables or reverse migrations as a frontend rollback.

Push delivery, automated sermon processing, optional form email and optional Stripe reconciliation each need their own credentials and worker setup. They do not need to delay the public timetable/radio website or manual staff operations. See [workspace contracts](community-workspace-api.md), [forms](forms-api.md), [learning](learning-extensions-api.md), [fees](fees-api.md), [talk processing](MEDIA.md) and [optional reply email](EMAIL.md).

## Review evidence

The release review added build configuration checks, the missing workspace example setting, a disabled-state guard for the talks archive, member portal continuation after password setup, and a public recovery page. Focused Node tests and mobile Chromium checks cover invalid/server credentials, recovery redirect/confirmation, member password setup and the disabled talks page. No real email was sent by these checks. Refer to the final release run for the integrated suite and build results at the saved commit.
