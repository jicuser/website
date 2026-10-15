# Opt-in Salah reminders

The homepage's Set Salah reminders button opens a dedicated settings page. Opening
either page never requests notification permission. Enable reminders is an explicit
user action. Start and Jama'ah switches have independent 0–60 minute lead times;
the five daily prayers can be selected. Sunrise is not a congregational prayer.
iPhone instructions appear only in settings: add to Home Screen and open that icon.
Send test confirms a send request, not visible delivery. Real-device acceptance is
still required; Focus settings and connectivity can delay or silence notifications.

## Delivery and privacy

The notification-only service worker does not intercept page fetches or cache times.
Supabase's minute scheduler reads published prayer_times using Europe/London dates
and DST. Receipts, bounded leases and retries prevent ordinary duplicate sends;
simultaneous start/Jama'ah alerts are combined. Expired subscriptions are removed.
No fallback times are invented. This is not an exact-time alarm guarantee.

Private RLS tables have no anonymous/authenticated grants. Service-only, invoker RPCs
manage subscriptions. A random device capability allows only that device's settings,
test and removal. The server validates push-provider URLs and rate-limits requests.
VAPID private keys and a dedicated scheduler proof remain in Vault, never frontend
code. Keep VAPID keys stable: rotation requires a subscription migration plan.

## Deployment and operation

Source migration `20261015001000_salah_reminders.sql` was deployed as managed
`20261015000731 salah_reminders` to project `pwhtguaevhlnzytneemp`.
Edge Function `salah-reminders` version 1 is active. JWT verification is intentionally
replaced by device capabilities and a private scheduler proof; GET exposes readiness
and the public VAPID key only. Production website origins are explicitly allowed.
The `jic-salah-reminders` cron runs every minute. Public readiness requires a recent
heartbeat. Emergency stop: set private.salah_reminder_runtime.enabled to false.
Do not expose the private runtime or Vault values while diagnosing.

Live checks confirmed HTTP 200, readiness, advancing heartbeat, restricted grants,
and zero enrolled devices. No visitor was enrolled or notified during deployment.
Automated tests cover capability ownership, stale saves, DST, zero-minute alerts,
lease acknowledgements, opt-in sequencing, removal and fixed notification URLs.
Browser visuals and physical iPhone/Android delivery are not verified here.

## Remaining platform hardening

The advisor flags pg_net's non-relocatable extension metadata in public. Its callable
network functions reside in net; do not hack system catalogs or relocate an extension
that declares relocation unsupported. Review platform-supported packaging separately:
[extension guidance](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public).
Private tables intentionally have RLS without client policies:
[RLS notice guidance](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
Existing form SECURITY DEFINER and leaked-password warnings remain documented in
`maintenance-status.md`; this release is not a whole-project security certification.
