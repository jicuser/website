# Forms and content pages

Integration and deployment status are recorded in `maintenance-status.md`.

## Shared records

The website-only migrations define versioned `custom_forms`, immutable published
versions, per-form staff assignments and private `form_submissions`. Responses may
have private attachments, internal notes and `work_tasks`. The admin form catalogue
and a linked poster must open the same records, not copied inboxes.

`site_pages` stores public-facing programme/detail content. Each page has a stable
slug, a placement, an independent publication switch, and an optional form link.
A poster can remain an announcement without a registration form. Registration may
be absent, an expression of interest, an application or a registration request.

## Access and publication

Public page/form reads return published content only. Staff names, assignments,
answers and private attachments are not part of the public page response. Backend
permissions and per-form assignments govern administration; merely showing a control
in the interface does not grant access.

Saving form questions does not change the published question version until publication.
Page visibility and form acceptance are separate: hiding a page does not erase its
responses or close a shared form link. An application received is not an accepted place.

## Responsibility and actions

Form editors, responsible people and followers have distinct purposes. Responsible
people receive actions for new responses. Changing the form's routing affects future
responses; existing unfinished actions are reassigned explicitly, with access checks
and optimistic concurrency. Completing an action does not complete its response.

The public-facing page address remains stable when its placement changes. Stale page
or form edits must not overwrite newer saved work. Automatic refreshes must not clear
an ordinary editing draft or recreate an active media capture controller.

## Operational boundary

This integration does not activate an app, remote push, payment processing, SMTP
transport or media workers. Website deployment, backend migration, email delivery
and physical-device acceptance are separate verification steps.
