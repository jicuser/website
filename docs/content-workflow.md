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

## Website editing workspace

Use distinct names for three different jobs:

- **Website section:** a visitor-facing navigation group, such as Education.
- **Page:** a destination with a stable address. Existing website pages are selected
  by section and then page; search can find pages across all sections. Programme
  pages have their own searchable catalogue, placement and visibility controls.
- **Content block:** added text, a background picture or a gallery below a page's
  built-in content. Blocks can be edited, hidden, moved to another existing page,
  reordered with a touch/mouse handle or up/down buttons, and removed with permission.

The block workspace owns a single draft and save registration. Collapsing a block
or editing another block never reloads or discards the draft. Changes, including
new blocks and deletion, remain local until **Save content blocks**. New blocks
start hidden. Undo and Discard are available before saving. Picture selection is
local until save; successful uploads are cached during retries. Unreferenced
uploads are not automatically deleted because an image may be shared elsewhere.

`save_page_sections` saves the source-page list atomically. It checks the complete
saved ID/revision snapshot, source ownership and content/delete permissions. A
stale edit or move conflict rolls back all content and audit writes. Existing
block IDs and keys remain stable; moves append to the destination without replacing
its content. The function uses caller permissions and existing RLS, not elevated
privileges. A brief table write lock protects against old direct-write clients;
public reads continue. Source and destination pages are limited to 60 blocks,
each with at most 12 gallery images.

Local saves report their busy state to the admin save provider, so navigation and
the global save action cannot treat an in-flight block save as complete. Reloading
saved blocks after a conflict is an explicit, discard-confirmed action.

### Deliberate boundaries and next phase

This is not an unrestricted visual website builder. Built-in timetable, donation,
contact, enrolment and other application features retain their dedicated editors.
Programme pages reuse the existing form builder and response records. Hiding a
programme page does not close its form, and changing its website section does not
change its address. Staff permission checks remain in the backend.

Whole navigation-section visibility, arbitrary page-template rearrangement and
embedded form blocks need a separate versioned page-template model before controls
are exposed. That phase must define allowed block types, required service content,
draft preview versus publication, route/menu consistency and migration of existing
content. Do not add cosmetic toggles that only hide a menu link while claiming the
page itself is private. Test desktop and real-phone editing before considering that
larger builder complete.

## Operational boundary

This integration does not activate an app, remote push, payment processing, SMTP
transport or media workers. Website deployment, backend migration, email delivery
and physical-device acceptance are separate verification steps.
