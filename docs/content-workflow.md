# Website content workflow

## Agreed scope

Admin Forms will show current forms, creation, responses and actions. A poster may
link to a public detail page and an optional versioned form. Opening the poster in
admin must expose the same information, people, responses and actions, not a copy.
Pages have separate publication and placement controls. Hiding a page must not erase
responses or silently close a shared form. Preserve the current admin design.

Presentation Stream follows this work: Quick Present selects a source, obtains
browser permission from Start, then starts the session without a naming step.
Retain the existing transport, display approvals and advanced settings. Show the
server session status and allow confirmed deletion of saved settings.

Apps, remote push, paid services, hosting/DNS/Cloudflare changes and Vercel plan
assumptions remain out of scope.

## Checkpoint record

- Content-page metadata, safe-image validation and stable-address helpers are saved.
- Four focused Node tests pass for that helper.
- Forms/pages integration and Quick Present are not released to main yet.
- Previous local database experiments are not a deployment. Re-run validation against
  the source that is actually committed before updating release status.
- Preserve work with small commits on maintenance/content-workflow. Main is updated
  only after the completed changes pass validation and concurrent changes are checked.

The release and outstanding-work tracker remains docs/maintenance-status.md.
