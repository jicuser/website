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

The header and navigation menu select the lettering-only logo with `<JamatiaLogo variant="wordmark" />` in `src/components/shell/UnifiedHeader.jsx`. The shared logo component chooses the light or dark SVG from `public/brand/`. The main header logo and three icons sit directly over the page background, with no pill or icon boxes; the invisible touch targets remain 44px. Only the prayer strip stays fixed. Its measured height reserves space above the logo; the logo, icons and section tabs scroll normally so page text cannot pass behind them. Change the variant at its point of use when changing one placement; keep logo sizing in the existing `header.css` rules.

Homepage links and tiles use the clear glass inset in `home.css`; their appearance is not redefined in `theme.css` or `liquid-glass.css`. At 1024px and wider the hero buttons and tile grid are hidden, and `content.css` shows a compact row of programme posters. Each poster still opens full size. The daily quote's subtle warm tint belongs to its existing button rule in `header.css`.

The burger menu is a single list on desktop and mobile. Section names navigate; their separate chevrons expand or collapse subpages without closing the menu. Sections start collapsed and remember the visitor's choices while the header stays mounted. The markup and expansion state belong to `UnifiedHeader.jsx`, with all menu layout rules in `header.css`.

## Android and iPhone checks

Check Chrome at 320, 360 and 412 CSS pixels, and Safari on the iPhone. Also check a desktop width around 1440 pixels. Device emulation is useful, but it does not reproduce every phone's font settings or browser behaviour.

- Open About, Our History and Prayer Times. The reminder and content must sit below the header. Scroll the page: the logo and navigation must move with the content, while the prayer strip stays above it.
- All six prayer names and times should be readable, with Start and Jama’ah aligned. The shared row labels are visual; each prayer link also has a complete accessible label.
- Both Jummah times, Radio, the theme button, Home and Menu should be reachable.
- Swipe the section tabs to the last item, select it, and confirm it becomes the current tab.
- Open and close the menu. Only the menu should scroll while it is open; Escape closes it on a keyboard.
- Expand two menu sections. Both should stay open until their chevrons are pressed again, including after resizing or reopening the menu. Choosing a page closes the menu and navigates there.
- Try light/dark mode and glass on/off. Text should stay clear over the photograph. The Today prayer table always has an opaque theme background.
- On Home, phone tiles and hero buttons should be translucent with no doubled borders. On a laptop or PC, they should be hidden and the compact posters should open by click or keyboard.
- Rotate the phone. In short landscape windows the header scrolls with the page to leave room for content.
- Try 200% text size or zoom. The timetable may scroll sideways instead of clipping or reducing the text.
- Open `/admin/login` and `/tv179` to check their separate layouts.

## Comments and formatting

Use `//` for a short JavaScript explanation, `{/* ... */}` for a JSX comment, and `/* ... */` for CSS. Explain why a rule exists when that is not obvious from the code. Prettier handles indentation and line wrapping with `npm run format`; `npm run format:check` checks without rewriting.

## Data and publication

Use a test data environment when trying forms or staff edits. Opening a local preview does not isolate it from the database named in its environment variables. Ordinary website content edits belong in `/admin`; deployment is for code changes.

The Codespaces configuration and local build use Node 24. The development server allows the exact Codespace preview hostname supplied by GitHub; host checks remain enabled.

The Android cleanup was checked with the production build, JavaScript checks and the existing tests. This session's browser preview was blocked with `ERR_BLOCKED_BY_CLIENT`, so real-device layout and signed-in staff workflows still need the checks above. No claim of completed physical Android/iPhone testing is made.
