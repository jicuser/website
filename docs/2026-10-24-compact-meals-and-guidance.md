# Compact meals and guided services

The Ramadan workspace now centres on a selected day. Staff choose Iftar or Suhoor, switch booking availability, add dish names and optional public dish costs, set the total sponsorship price and the number of people fed, then save. The total belongs to the whole meal; servings are never added across dishes. A visitor preview and public notes are under one disclosure. Draft dishes survive switching meals, dates and views within the Ramadan workspace; Undo edits restores the saved version. Booking records remain in a separate tab and the existing table and print view remain available.

Visitors choose a date, select Iftar or Suhoor, review the menu/price/people fed and then open the short contact step. On phones, the selected meal replaces the calendar with a Change date action. Desktop keeps both panels together. Reserved or closed meals remain viewable but cannot be requested. Daily Giving retains its separate multi-day flow. Existing days without a configured menu retain their previous suggested sponsorship amount and clearly say that menu details need confirmation.

Configured meals require dishes, a positive total and a serving count before opening. The backend checks the exact menu revision and price supplied by the visitor under the existing per-day lock. Requests capture the agreed offer; later menu edits and closing availability leave existing bookings intact. Staff can view the captured offer under Menu agreed at booking. Suhoor and Iftar retain independent reservations and the existing unique active-booking constraint. Public calendar data includes menu information, never private sponsor contacts or staff notes. The TV sponsorship board shows the next published meal's menu, price and serving count.

Other compact workspaces:

- Service journeys show a choice of questions, preparation guidance, steps and related links. Contact forms load only after Contact the team is selected. Switching guidance preserves an already opened contact draft. Funeral phone contact stays visible.
- Staff can edit, add, hide or remove up to eight guided questions inside the existing page editor for Community, Nikah and Funerals. Guidance uses the same page save and real website preview.
- The form builder opens one question at a time and selects a newly added question.
- Added website pages group content, menu and registration settings into disclosures; page visibility and Save stay available.
- Homepage tile editing shows one selected tile; edits to other tiles remain in the shared draft.
- TV colours use compact labelled palette chips. Existing TV draft, comparison and publish controls remain in place.

## Release order

1. Apply `supabase/migrations/20261024140000_ramadan_meal_menus.sql` through the project's normal migration process.
2. Deploy the updated `ramadan-request` edge function to return a readable conflict when a menu changes.
3. Release the website build. Add actual dishes, prices and serving counts through Ramadan → selected day. No sample meal data is inserted by the migration.

The migration and edge function have been prepared in this change; production has not been modified. Roll back the frontend if needed; retain the added database columns and booking snapshots to preserve agreed offers. Unconfigured legacy days remain compatible. Older clients cannot submit stale prices for a newly configured menu.

## Verification

- Database tests exercise permissions, anonymous read boundaries, valid menus, invalid/incomplete menus, revision conflicts, wrong prices, idempotency, duplicate booking rejection, independent Suhoor and preservation of existing bookings.
- Browser checks cover booking at 320/390/1366px, selected-day editing, failed saves, draft preservation, closed/reserved meals, guided answers without form submissions, staff-managed guidance, form editing, page preview and TV draft controls.
- Standard source checks, TypeScript checks, unit/database suite, production build using the repository's CI-only public configuration, and startup budget check are recorded with the PR.
