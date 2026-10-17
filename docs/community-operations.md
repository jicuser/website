# Community operations

This release keeps the website, personal account and staff workspace distinct. Staff signing in land in `/admin`. “My account” opens `/portal?workspace=personal`; a staff label does not grant a permission or create a family relationship.

## Where to work

| Task                                          | Location                                       |
| --------------------------------------------- | ---------------------------------------------- |
| Email sign-up and sign-in                     | Portal login                                   |
| Request staff, volunteer or family access     | Portal → Request access                        |
| Review access and invite a new person         | Staff & access                                 |
| Create a personal fundraising page            | Donate & fundraise → Start a fundraiser        |
| Approve a campaign                            | Staff workspace → Fundraising                  |
| Confirm campaign donations                    | Staff workspace → Finance → Campaign donations |
| Create, issue, print and reconcile invoices   | Staff workspace → Finance                      |
| View invoices linked to your verified email   | My account → My invoices                       |
| Record minimal DBS reviews                    | Staff workspace → Safeguarding                 |
| Add stages, dates, photos and 3D walkthroughs | Staff workspace → Project timeline             |

## Data and permissions

The additive `community_operations` migration uses the existing profiles, explicit permissions and audit log. It does not replay or activate the historical learning migrations. New operational tables use row-level security; writes use narrow database functions. Public campaign data is an explicit projection without owner account IDs, private review notes or payment references.

Finance and safeguarding are separate permissions. Treasurer, secretary, trustee and safeguarding lead are organisational labels only. Approving an existing account preserves existing permissions and rechecks delegation in the database. Public access requests are bounded, rate-limited and deduplicated while pending; a request never assigns its own permissions.

Financial amounts are stored as integer pence. The database calculates line totals. An issued invoice keeps its issuer snapshot and cannot be edited. A payment cannot exceed the outstanding balance. Retry keys prevent duplicate entries. Corrections append negative reversal entries; they do not transfer a refund. Invoices with a nonzero paid balance cannot be voided. Graphs aggregate all records; lists are explicitly labelled with their display limits.

Before the first invoice, the treasurer must confirm the organisation’s actual details and that the supported non-VAT invoice format is appropriate. This release does not provide VAT accounting, card processing, automated bank reconciliation or Gift Aid claims. Personal pages currently fund JIC’s general charitable work, with that purpose and the treatment of targets stated on every page. Restricted gifts and Zakat require separate confirmation with JIC.

Safeguarding stores minimal review metadata, not certificate images or conviction information. The recorder must confirm eligibility, lawful basis and policy; review dates are internal reminders, not DBS expiry dates. Retention review and record removal are explicit actions. This tooling does not certify legal compliance or replace JIC’s safeguarding process.

## Project timeline

Stages are stored under the single public content key `masjid_project_stages`. Existing project URLs remain valid. Stage order, visibility, description, start/completion dates, images and captions are editable. Dates and completion states are not invented. The visual area selector is labelled as a guide, not a measured floor plan.

Only HTTPS `poly.cam/capture/...` URLs are accepted. Pasted iframe snippets are reduced to the validated source URL; arbitrary HTML is never inserted. Public captures are embedded on demand for completed stages. The visitor can rotate and zoom in the provider’s viewer. Pictures open at readable width with independent zoom controls. Uploaded photos remain in media storage if removed from a stage.

## Platform boundaries

Email sign-up uses a verification link. Google sign-in appears only when the provider is configured in Supabase; Google OAuth credentials must be supplied by the account owner. Family/learning and digital certificate modules retain their existing activation gates until the matching backend is reconciled. This migration does not grant staff blanket access to personal family records.

The iPhone reminder fix binds `atob` to Window and bounds service-worker readiness. iPhone web push requires the installed Home Screen web app and notification permission. Real-device delivery has not been claimed from a desktop fixture.

Every social channel has a visual overview. Optional provider embeds open at a readable size. WhatsApp conversations stay in WhatsApp; no fabricated feed or follower count is shown. Third-party sign-in, embed permissions and availability remain controlled by the provider.

## Organisation

- `features/operations`: campaign, finance and safeguarding UI with shared money and data helpers.
- `features/projects`: stage schema, public timeline and editor.
- `functions/request-access`: bounded public submission handler.
- `functions/manage-user`: authenticated staff invitation and review actions.
- `functions/_shared/access.js`: stable permissions and staff labels.
- `components/donations/DonationDialog.jsx`: bank transfer dialog (renamed from its obsolete provider-specific filename).

Historical migrations and established URLs are preserved. Renaming deployed tables or deleting migration history would risk existing records and deployment reproducibility.

## References used for implementation

- [Invoice content requirements](https://www.gov.uk/invoicing-and-taking-payment-from-customers/invoices-what-they-must-include)
- [Gift Aid eligibility](https://www.gov.uk/claim-gift-aid/what-you-can-claim-it-on)
- [DBS employer guidance](https://www.gov.uk/guidance/dbs-check-requests-guidance-for-employers)
- [ICO criminal-offence data guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/a-guide-to-lawful-basis/criminal-offence-data/)
- [WebKit iPhone web push](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- [Polycam embed guidance](https://learn.poly.cam/hc/en-us/articles/28802104162196-How-to-Embed-Your-Polycam-Captures)
