# Modular product architecture

This repository should be developed as an assembly of reusable product blocks, not as one large JIC-specific application.

## Rule

A reusable block owns one responsibility and communicates through an explicit interface. Organisation-specific wording, branding, routes and policy belong in configuration or composition layers rather than inside generic blocks.

## Layers

1. **Foundation** — UI primitives, accessibility, validation, dates, media helpers and generic hooks. No mosque-specific business rules.
2. **Modules** — reusable feature blocks such as forms, schedules, people, content pages, announcements, events, media/presentation and permissions.
3. **Adapters** — Supabase, browser media/WebRTC, storage and notification implementations. Modules should depend on adapter interfaces rather than scattered direct calls where practical.
4. **Product composition** — JIC routes, navigation, feature flags, permissions and module assembly.
5. **Brand/content** — JIC logo, colours, typography, copy, imagery, prayer terminology and organisation-specific defaults.

## Target source shape

```
src/
  app/                  # product composition, providers, routing
  foundation/
    ui/                 # Button, Card, Dialog, Tabs, Field, Status, EmptyState...
    hooks/
    lib/
  modules/
    content/
    forms/
    schedules/
    people/
    events/
    announcements/
    displays/
    permissions/
  adapters/
    supabase/
    media/
    storage/
  products/
    jic/
      config/
      content/
      theme/
```

This is a target boundary, not permission for a mass move. Migrate feature-by-feature while keeping imports and tests working.

## Block contract

Each reusable module should aim to expose:

- a small public entry point;
- typed/validated data at its boundary;
- UI that receives labels/configuration instead of hard-coded organisation names;
- data access through a service/repository boundary;
- explicit permissions/capabilities;
- loading, empty, error and disabled states;
- tests for its public behaviour;
- no dependency on another module's private files.

Prefer composition over special-case flags. A JIC page should assemble blocks; a generic block should not know which JIC page contains it.

## Reuse goal

A future mosque, charity, CIC, community centre, website or companion app should be able to reuse a module by supplying configuration and an adapter, without copying the module and deleting JIC-specific code.

Web and mobile do not need identical presentation components. Reuse contracts, schemas, business rules and backend interfaces where that is safer than forcing React web UI into Flutter/mobile.

## Refactor constraints

- Preserve current production behaviour while extracting boundaries.
- Do not rewrite working TV transport, form privacy/RLS or authentication merely for folder symmetry.
- Do not create a generic abstraction until at least one concrete responsibility is clear.
- Keep database migrations append-only and reconcile managed Supabase deployment history.
- No `!important` patch layer.
- Remove obsolete implementations after their replacement is tested.
- Keep admin feature files focused; `AdminPage` should compose feature modules rather than implement them.
- Keep organisation-specific constants out of reusable modules.
- Prefer stable module APIs over cross-directory deep imports.
- Security and authorization remain server enforced; UI capability checks are not authorization.

## Migration order

1. Establish foundation UI primitives and module public APIs.
2. Split the Admin shell from feature implementations.
3. Consolidate Forms, Posters/Content, Events/Announcements, People and Schedules behind module boundaries.
4. Refine Presentation/TV operator UX without replacing its existing session/transport core.
5. Move JIC brand/content/configuration to the product layer.
6. Audit direct Supabase calls and introduce adapters where this materially improves reuse/testability.
7. Run validation and browser/database regression tests after each extraction.
8. Remove superseded code only after equivalent behaviour is covered.

## Definition of done for the planned release

The release is complete only when the coordinated admin, public-site and TV changes pass the repository validation suite and the architecture no longer requires adding new feature logic to the monolithic Admin page. The modularisation itself must not be used as a reason to change production data or permissions.
