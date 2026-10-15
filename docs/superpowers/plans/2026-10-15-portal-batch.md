# JIC connected portal implementation plan

**Goal:** replace disconnected shortcuts with a usable member/family workspace, without enabling unprepared production modules.
**Architecture:** retain the existing Supabase identities, RLS, learning records, forms, fees and certificate APIs. Split account access, data loading, family views and navigation into small components. The web and future app consume the same backend contracts.
**Spec:** docs/community-workspace-ui.md, integrated platform delivery brief.
**Execution:** one implementation batch and one consolidated final CI run, as requested. No repeated deployment after individual edits. No new paid services, production migrations or feature-flag activation.

## This batch
- [x] Extract portal sign-in; remove the nested passwordless form and guard duplicate submissions.
- [x] Build a role-aware home with URL-backed navigation and real family/learning/forms/fee destinations.
- [x] Show linked children, enrolments, recorded attendance, published progress, assessments and meetings. Submit meeting requests through the existing authorised RPC.
- [x] Isolate unavailable data areas; cancel superseded requests and keep private records out of persistent storage.
- [x] Restore Portal to the menu while excluding it from the public CMS editor.
- [x] Update obsolete mobile-bar assertions and add regression coverage for login and family data selection.
- [ ] Commit the whole batch and run the existing validation workflow once.

## Full platform delivery order
1. Identity and linked accounts: account approval, usernames/provider configuration, household verification and enquiry ownership. Staff capabilities remain server-authorised; social sign-in never grants privileges.
2. Member service records: personal enquiries, bookings, documents, certificate issuance/verification, notifications. Never link historic records by an unverified matching name or email.
3. Madrassah: configurable Qa'idah/Qur'an/Hifz/Salah/kitab curricula, registers, absence reporting, exams, progress, merits, teacher attendance and family dashboards.
4. Finance: invoice/receipt ledger, billing plans and sibling discounts; provider checkout and signed idempotent webhooks; refunds/reconciliation, separate settlement entities. Card data remains with the provider.
5. Communications/online learning: consent-based WhatsApp/SMS/email/push, delivery results and class links/materials. Do not expose private student sessions in the public ticker.
6. Restricted operations: designated safeguarding access, DBS expiry metadata, staff hours and payroll-provider/export integration. No DIY statutory payroll claims.
7. Native app: reuse authenticated backend APIs and permission rules; add app deep links, notification permission flows and platform-native navigation. Publishing requires signing and store configuration.

## Review focus
- No account creation from magic-link requests; active-profile checks still apply after authentication.
- Teacher access to a pupil must not make that pupil appear as their own family.
- Staff drafts never appear in the family progress view; missing marks are not shown as zero.
- Refreshing/switching accounts cannot publish a late response from an older request.
- A link in the public menu does not make the private portal CMS-editable.

## Release boundary
Source implementation, automated test results, backend activation and hosting deployment are separate statuses. Existing workspace/certificate flags remain unchanged. This batch does not claim live recurring payments, WhatsApp, payroll, safeguarding, private donation history or a released mobile app.
