# Jamatia Islamic Centre website

The JIC website uses React and Vite. The public site, staff administration and mosque TV display share the same repository.

## Edit in GitHub

1. Open **Code → Codespaces → Create codespace on the selected branch**.
2. Wait for the dependencies to install.
3. Run `npm run dev` in the terminal.
4. Open **Ports → 3000 → Open in Browser** to see your changes.

The repository includes a Node 24 development container, formatting on save and editor tasks. A Codespace is created only when you choose to start one on GitHub.

For a small text-only code change, press `.` while viewing the repository to open GitHub's browser editor. Use Codespaces when you need to run the website.

## Where to edit

| Change                          | File or area                                                                |
| ------------------------------- | --------------------------------------------------------------------------- |
| Logo, menu and header           | `src/components/shell/UnifiedHeader.jsx`                                    |
| Six prayer columns              | `src/components/shell/PrayerTimeBar.jsx`                                    |
| Header spacing and mobile sizes | `src/styles/header.css`                                                     |
| Section tabs                    | `src/content/nav.js`, `src/styles/subnav.css`                               |
| Colours and transparency        | `src/styles/theme.css`, `src/styles/liquid-glass.css`                       |
| Homepage content and layout     | `src/pages/HomePage.jsx`, `src/styles/home.css`                             |
| Address, phone and radio link   | `src/content/site.js`                                                       |
| Photos                          | `src/content/images.js`                                                     |
| Staff pages                     | `src/pages/admin/`, `src/components/admin/`, `src/styles/admin.css`         |
| Mosque TV                       | `src/pages/TvDisplayPage.jsx`, `src/styles/tv.css`                          |
| Four TV settings and sharing    | `src/components/admin/TvScreenEditor.jsx`, `supabase/functions/tv-control/` |

Use the website's `/admin` area for content it manages. A saved CMS value takes priority over its code fallback. Use GitHub for changes to structure, styling and behaviour.

## Run locally

Use Node 24, as specified in `.nvmrc`.

```bash
npm ci
npm run dev
```

Copy `.env.example` to `.env.local` and fill in the browser configuration when connecting to your chosen data environment. Without it, the site can show its fallback content; database-backed features require a configured connection. Never commit `.env.local` or put a service-role key in a `VITE_*` variable.

## Check and save

```bash
npm run format
npm run validate
```

`validate` checks JavaScript, runs the tests and builds `dist/`. Check the preview before committing. A push to the branch connected to Hostinger can trigger deployment; editing a local file alone does not update the public website.

- [Editing guide](docs/editing.md)
- [Code map](CODEBASE_MAP.md)
- [Style ownership](src/styles/README.md)
- [Deployment](DEPLOYMENT.md)
- [TV setup](docs/tv-display.md)
- [Earlier handovers](docs/history/README.md)
