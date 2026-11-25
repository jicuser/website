# Booking and staff workflow clarity

The user supplied current screenshots: the compact staff Ramadan month is useful, while public date cards/table rows are large; status aliases and draft visibility are confusing; prayer editing is too tall; iPhone alerts show a disabled action; staff sign-out reports an error.

Continue the authorized UI work using the existing React/CSS/SDK architecture. Preserve the working calendar, draft/published separation, permission boundaries, prayer/CSV drafts, actual iPhone notification prerequisites and full photo/glass styling. Do not change production seasons, bookings, publication settings or authentication sessions while verifying.

- Ramadan owner: reconcile status words and public month/table patterns; separate what can be booked from where it appears; show draft/effective state honestly. Optional user preference on public compact calendar is pending; independent publishing work proceeds.
- Prayer owner: shared Start/Jama'ah headings and compact accessible prayer rows; retain44px editable controls and all save/failed-read guards.
- Auth owner: diagnose the exact logout path with pinned SDK source/current official docs; durable logout must not be faked by clearing only React state. Mock failures/timeouts/races and preserve authorization.
- Controller: make unavailable iPhone alert prerequisites/action obvious without requesting permission automatically; integrate, review changed journeys and build, then publish and check live.

No new dependencies, database/schema/RLS changes, invented content or extra approval gates. Each owner runs focused checks; controller performs one combined release validation. Native iPhone and authenticated production workflows require real evidence and remain distinct from local fixture tests.
