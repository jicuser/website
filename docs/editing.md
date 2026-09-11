# Editing the JIC website

## Your first change

1. Start a Codespace using **Code → Codespaces** in GitHub.
2. Run `npm run dev`, then open port **3000** from the **Ports** panel.
3. Open a file from the table in the main README.
4. Change one thing and save. The preview updates automatically.
5. Run `npm run validate` before committing your change.
6. Use **Source Control** to review the changed lines, write a short commit message and commit. **Sync Changes** pushes the commit to GitHub.

The forwarded preview port should stay private. For existing Codespaces, use **Codespaces: Rebuild Container** after changing `.devcontainer/devcontainer.json`.

You can also run the preview, checks or formatter from **Terminal → Run Task → JIC**. Closing a browser tab does not necessarily stop a Codespace; stop it from GitHub's Codespaces page when finished.

GitHub documentation: [dev containers](https://docs.github.com/en/codespaces/setting-up-your-project-for-codespaces/introduction-to-dev-containers) and [preview ports](https://docs.github.com/en/codespaces/developing-in-a-codespace/forwarding-ports-in-your-codespace).

## How the files fit together

`src/main.jsx` loads the application and providers. `src/App.jsx` maps addresses to pages. Public pages use `src/layouts/MainLayout.jsx`, which places the header, daily reminder, content and footer in order.

`src/styles/app.css` imports the styles once. Find a component's class name in the appropriate stylesheet and change its existing rule. Put that component's mobile rules in the same file. Do not add a second stylesheet to override an old version of the same component.

CSS custom properties are shared settings. For example, `var(--jic-text)` takes the current theme's text colour. Change the token in `theme.css` if every use should change; edit the component if only that component should change.

Normal responsive and theme rules are intentional. A desktop size, a mobile size and a dark-mode colour are different states. Do not remove them solely because a selector appears more than once. Comments explain non-obvious behaviour and ownership; they should not record a history of attempts or describe a fix as “final”.

The header and navigation menu select the lettering-only logo with `<JamatiaLogo variant="wordmark" />` in `src/components/shell/UnifiedHeader.jsx`. The shared logo component chooses the light or dark SVG from `public/brand/`. Change the variant at its point of use when changing one placement; keep logo sizing in the existing `header.css` rules.

## Android and iPhone checks

Check Chrome at 320, 360 and 412 CSS pixels, and Safari on the iPhone. Also check a desktop width around 1440 pixels. Device emulation is useful, but it does not reproduce every phone's font settings or browser behaviour.

- Open About, Our History and Prayer Times. The reminder and content must sit below the header.
- All six prayer names and times should be readable, with Start and Jama’ah aligned. The shared row labels are visual; each prayer link also has a complete accessible label.
- Both Jummah times, Radio, the theme button, Home and Menu should be reachable.
- Swipe the section tabs to the last item, select it, and confirm it becomes the current tab.
- Open and close the menu. Only the menu should scroll while it is open; Escape closes it on a keyboard.
- Try light/dark mode and glass on/off. Text should stay clear over the photograph.
- Rotate the phone. In short landscape windows the header scrolls with the page to leave room for content.
- Try 200% text size or zoom. The timetable may scroll sideways instead of clipping or reducing the text.
- Open `/admin/login` and `/tv179` to check their separate layouts.

## Comments and formatting

Use `//` for a short JavaScript explanation, `{/* ... */}` for a JSX comment, and `/* ... */` for CSS. Explain why a rule exists when that is not obvious from the code. Prettier handles indentation and line wrapping with `npm run format`; `npm run format:check` checks without rewriting.

## Data and publication

Use a test data environment when trying forms or staff edits. Opening a local preview does not isolate it from the database named in its environment variables. Ordinary website content edits belong in `/admin`; deployment is for code changes.

The Codespaces configuration and local build use Node 24. The development server allows the exact Codespace preview hostname supplied by GitHub; host checks remain enabled.

The Android cleanup was checked with the production build, JavaScript checks and the existing tests. This session's browser preview was blocked with `ERR_BLOCKED_BY_CLIENT`, so real-device layout and signed-in staff workflows still need the checks above. No claim of completed physical Android/iPhone testing is made.
