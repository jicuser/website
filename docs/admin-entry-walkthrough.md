# Admin entry: what changed

## The problem

The Admin link closed the menu immediately. React then had to load the login page,
so a slow connection could briefly reveal the previous page between the menu and
Admin. Also, the automatic scroll reset lived inside the public website layout.
Admin uses a separate layout and could inherit the previous page's scroll position.

Both problems were reproduced with the real menu and React Router in a test that
deliberately delayed the Admin page. The old code dismissed the menu too soon and
retained a simulated scroll position of 620 pixels.

## Read these files in order

| File                                        | Change                                                                                                 | Why it helps                                                                                                                                           |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/components/shell/UnifiedHeader.jsx`    | Wait for the route to change before closing the menu. Open and clean up its dialog in a layout effect. | The menu-to-page change happens before the browser paints the next frame. Selecting the current page or pressing Close still dismisses it immediately. |
| `src/components/shell/RouteScrollReset.jsx` | Move the existing scroll and anchor behavior into a shared component.                                  | Admin and other standalone pages receive the same scroll reset as public pages.                                                                        |
| `src/App.jsx`                               | Mount the shared reset inside the route loading boundary.                                              | It runs when the destination is ready, rather than scrolling the old page while the new one loads.                                                     |
| `src/components/shell/ScrollToTop.jsx`      | Keep only the floating scroll-to-top button here.                                                      | There is one owner for automatic route scrolling.                                                                                                      |

## Small coding lesson

An `onClick` handler runs when you tap. A page change may finish later, because its
JavaScript still needs to download. Close the menu when that change finishes, not
just when the tap happens.

`useLayoutEffect` runs after React updates the page structure but before the browser
paints it. It suits short visual tasks such as releasing a dialog and resetting
scroll position. Fetching data and other background work still belong elsewhere.

## Validation and limits

Eight React/DOM integration checks cover delayed Admin loading, scroll locking and
release, scrolling to the top, current-page selection, public navigation and Close.
The two failing cases pass after this change. The full 190-test suite, lint check
and production build also pass. The integration test uses a simulated DOM; the
live browser check is separate, and neither substitutes for an actual iPhone Safari
check. Login credentials and account permissions were not changed.
