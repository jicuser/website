# JIC service, portal and admin experience

This increment continues the connected member portal in PR #12. The public site remains on the existing React/Vite repository and Hostinger deployment path; Supabase stays the account and records backend shared with the future app.

## Implemented

- Portal login is a labelled header link on phones and desktop, a prominent menu entry and a footer link. Staff can reach Administration from their portal account.
- Services now introduce their purpose with the existing centre photo. Janazah, Nikah and community support have a clear three-step process, preparation checklist, FAQs, an on-page enquiry, directions and a map loaded on request. Hall booking retains its date calendar and adds planning guidance and the same location section.
- Service enquiries use the existing `submit-form` contact endpoint, with a service subject included in the message. They appear in Admin → Contact messages. Custom form bookings continue to use their existing form workflow. A successful enquiry displays a receipt message; it never claims to confirm a booking.
- The public certificate guide connects the four existing types to the account area. Disabled online requests explain their availability and offer a certificate-specific office enquiry.
- The enabled certificate journey is type → details → review → submit → office review → issued record. Request status includes the next step. Issued records can be printed/saved through the browser PDF dialog and their minimal verification links can be copied.
- Certificate login accepts only an allowlisted local account destination, retaining the selected type through password, email-link and Google sign-in. Production email/OAuth return URLs must permit the intended `/portal?next=…` callback. Provider delivery remains a separate live check.
- The sign-in form stays mounted while password authentication is pending so invalid credentials display their error and preserve the user's input.
- Administration opens on Overview when permitted. Real, permission-scoped message/form/certificate counts show what needs attention. The form completion chart uses returned counts, with unavailable data explicitly identified. Task search and a mobile area selector simplify navigation; existing unsaved-change protections still apply.
- Owner fee confirmation remains available in the portal; ordinary members retain read-only fee views.

## Release boundaries

No production migration, feature-flag activation, permission grant, certificate issuance or external notification is included. `VITE_ENABLE_WORKSPACE`, `VITE_ENABLE_CERTIFICATES` and account-request settings keep their existing values. Existing SQL permission enforcement remains authoritative. The certificate/learning activation procedures in `docs/certificates.md` and `docs/BACKEND-RELEASE.md` still apply.

The current environment has no browser-control plugin for local preview. The existing CI workflow runs lint, unit/database fixture tests, production build, Chromium, phone WebKit and the feature-enabled workspace/certificate suite as one consolidated verification. Test results and actual deployment status are reported separately from source implementation.

## Remaining platform work

1. Activate the reviewed learning and certificate schemas in the intended backend with representative account checks and agreed issuer wording.
2. Verify production account approval, household links and email/provider return settings.
3. Connect personal enquiries, bookings and certificate updates to authorised account ownership; do not associate historic submissions by a matching name or unverified email.
4. Extend curricula, registers, exams, progress and family dashboards using the existing shared contracts.
5. Add payment-provider checkout, signed idempotent webhooks and reconciliation before claiming live billing.
6. Connect consent-based messaging, course materials and notifications; restricted safeguarding and payroll integrations remain separate.
7. Build native app navigation and deep links against these authenticated APIs, then complete signing and store release configuration.
