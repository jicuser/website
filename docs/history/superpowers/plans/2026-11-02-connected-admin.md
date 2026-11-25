# Connected admin: first implementation

Goal: improve the existing administration workflow without replacing its permission checks or creating a second source of records.

Base: jicuser/website main 5c765b16b8b3ac2a4e9198cb728a37cc58019d77.

## Scope of this commit
- Searchable, clearly grouped form catalogue using permitted overview records and existing page assignments.
- Explicit form lifecycle and usage information; preserve close/reopen and existing answers.
- A new-class interest template that records preferences without implying enrolment or payment.
- Plain-English, permission-filtered quick actions connecting pages, forms, staff access and finance.
- Compact Jummah cards, omitting unpublished khutbah placeholders.

## Constraints
- No production database changes, permission grants, card charging, student creation or feature-flag activation.
- Keep draft/publish boundaries, stable form URLs, legacy responses and save conflict protection.
- Never infer Zawwal or sunset from Dhuhr/Maghrib or present fabricated statistics.
- Keep staff/personal/family permissions separate.
- Unknown form purposes stay in Other forms, not guessed from respondents or private data.

## Tasks and checks
1. Write failing behavioural tests for group membership, search, legacy identity, interest template fields and published-time validation.
2. Implement pure helpers; run Node tests and check immutability/invalid inputs.
3. Integrate helpers into existing components without changing their backend operations.
4. Add responsive, scoped styles and accessible controls.
5. Push an isolated branch; use repository CI for complete lint, typecheck, unit, build and browser checks (direct network cloning is unavailable in this environment).
6. Publish only verified code and state clearly any remaining backend work.

## Remaining separate implementation
Production teacher/class/student/family management; payment-provider integration and verified payment-to-enrolment processing; explicit archive/purge lifecycle; approved supplementary prayer-time data and editor; comprehensive redesign of all public pages. These are not declared complete by this first commit.
