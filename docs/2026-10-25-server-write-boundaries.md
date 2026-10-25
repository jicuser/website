# Server write boundaries — 25 October 2026

The hall calendar previously allowed staff to insert and update availability
directly through the Data API. Those writes bypassed the overlapping-booking
check in `save_hall_calendar`.

`20261025125656_hall_booking_rpc_writes.sql` removes both table and column write
grants for insertion and editing. The existing RPC remains the create/edit API;
public availability reads and the staff delete action retain their current
permissions. No website or Edge Function deployment is needed for this change.
Apply this new migration through the normal reviewed database release process;
it has only been executed against isolated PGlite fixtures during this work.

The existing edit contract still accepts the last submitted edit, so an older
open editor can overwrite a newer edit. Preventing that requires adding an
expected revision to the RPC and passing it from the website. This change does
not introduce that contract or claim to resolve stale edits.

The staged certificate schema also retains the current finance, fundraising and
safeguarding permissions when installing its permission constraint. This avoids
an activation failure for existing operational staff. Certificates remain behind
their existing activation gate; this source correction does not activate them.

Local regressions execute the SQL as real anonymous and authenticated roles.
They check that direct calendar writes fail, supported RPC editing and deletion
still work, and certificate installation preserves existing staff assignments.
