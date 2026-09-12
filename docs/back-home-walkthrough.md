# When Back becomes Home

The bottom navigation shows a house icon and **Home** when the preceding page is
the homepage, when no earlier site page exists, or when you are already home.
Otherwise, it shows the arrow and **Back**.

Example: visit Home → About → Contact. Contact shows Back. Press it to return to
About, and the button becomes Home. Press Home to return to the existing homepage
entry in browser history. It does not add another homepage entry in that case.

## How the code works

- `src/context/NavigationContext.jsx` records completed router location changes,
  including visits to standalone pages such as Admin.
- `src/lib/navigationHistory.js` keeps up to 50 recent page paths in this tab.
  Back and Forward retain their entries; a new route after Back discards the old
  forward branch. The record survives reloads when session storage is available.
- `src/components/shell/UnifiedHeader.jsx` chooses the icon and text from the
  previous path. The button still uses browser Back when that destination exists.

Only page paths are stored, with no query strings or form values. If storage is
blocked, the current tab keeps working from its in-memory record.

## Checks

Five history tests cover Back/Forward, branching, redirects, reloads and storage
failure. Six React/DOM checks exercise the actual button, its label changes and its
navigation behavior. The full test suite, lint and production build also pass.
