# ClientOps Documentation and Delivery Map

This document connects product intent, implementation, verification, and delivery. Start here before planning or implementing work. Detailed rules remain in their owning documents.

## Current Status

```text
Planning: Complete
Implementation: Not Started
Current milestone: M0 - Bootstrap
Current priority: P0
```

Update this block and the matching status in the root [`README.md`](../README.md) when a milestone gate passes.

## Document Authority

When documents overlap, use the source with the highest authority for that subject. Do not resolve a material conflict silently.

| Subject | Source of truth | Purpose |
|---|---|---|
| Assessment constraints | [`assignment.md`](assignment.md) | Mandatory stack, security, deliverables, scoring |
| Agent implementation rules | [`../AGENTS.md`](../AGENTS.md) | Repository-wide engineering constraints and feature DoD |
| Product scope | [`clientops.md`](clientops.md) | Problem, users, product goals, product MVP vision |
| Business behavior | [`business-requirements.md`](business-requirements.md) | Roles, permissions, workflow, ownership, closure rules |
| Production database | `../backend/migrations/` once implemented | Actual schema and integrity constraints |
| Planned database | [`database-design.md`](database-design.md) | Intended entities, constraints, indexes, transactions |
| Implemented API | `api/openapi.yaml` once implemented | Actual HTTP contract |
| Planned API | [`api-contract.md`](api-contract.md) | Contract used until OpenAPI exists |
| System architecture | [`system-architecture.md`](system-architecture.md) | Boundaries, security, runtime, deployment |
| Frontend behavior | [`frontend-ia.md`](frontend-ia.md) | Routes, role-aware UI, states, API mapping |
| Repository conventions | [`repository-structure.md`](repository-structure.md) | Module layout, naming, implementation sequence |
| Verification | [`testing-strategy.md`](testing-strategy.md) | Test levels, critical matrices, completion gate |
| Delivery order | [`milestones.md`](milestones.md) | Detailed phase tasks and milestone gates |
| Reviewer operation | [`../README.md`](../README.md) | Setup, commands, demo, architecture summary |

Precedence rules:

1. The assessment wins over internal preferences.
2. Business requirements win over UI behavior and persistence convenience.
3. Implemented migrations and OpenAPI win over their planning documents after implementation.
4. A conflict affecting business rules, security, schema, API, workflow, or scope blocks implementation until resolved.

## Canonical Delivery Order

Execute one vertical slice at a time. A slice includes business rule, database, backend, API, frontend, tests, and documentation where applicable.

| Order | Milestone | Required outcome | Exit gate |
|---:|---|---|---|
| 0 | M0 Bootstrap | Repository, backend, frontend, root commands | Both applications build; no secrets |
| 1 | M1 Platform Foundation | PostgreSQL, configuration, migrations, logging, health | Clean migration up/down; readiness works |
| 2 | M2 Security and Access | Authentication, cookies, refresh rotation, CSRF, RBAC, users | Security tests pass; direct unauthorized API calls fail |
| 3 | M3 Client Core | Clients, primary Operations ownership, scoped access | Active clients cannot become ownerless |
| 4 | M4 Issue Lifecycle | Issue CRUD, optimistic locking, P0 workflow | Transition matrix and stale-update tests pass |
| 5 | M5 Release and Handoff | Releases, affected clients, handoff creation and acknowledgement | Released work is traceable to client impact and owner |
| 6 | M6 Operational Closure | Required follow-up, handoff completion, issue closure | Required follow-up cannot be bypassed |
| 7 | M7 Client Success | Timeline, feature demand, documentation, notifications | Add only after P0 is stable; each P1 slice passes its gate |
| 8 | M8 Quality | Test, UI/UX, accessibility, responsive, API documentation hardening | All P0, security, database, frontend, and test gates pass |
| 9 | M9 Bonus | P2 capabilities with demonstrated need | No P0 regression; optional capability complete end to end |
| 10 | M10 Submission | Seed data, reviewer setup, demo, final review | Fresh clone can run, test, and demonstrate the critical journey |

This order is canonical when summaries elsewhere differ. Detailed tasks remain in [`milestones.md`](milestones.md).

## Capability Traceability

Use this table to find every layer required for a capability. `P0` is the submission cut line. `P1` follows only after P0 stability. `P2` is optional.

| Capability | Priority | Milestone | Business | Database | API | Frontend | Required verification |
|---|---:|---|---|---|---|---|---|
| Authentication and CSRF | P0 | M2 | Business security rules | Sessions and token hashes | Auth endpoints/cookies | Login/session recovery | Auth, CSRF, rotation, concurrent refresh |
| RBAC and users | P0 | M2 | Actor permissions | Roles and permissions | User/role endpoints | Permission-aware routes/actions | Backend `401`/`403`; resource policy |
| Clients and ownership | P0 | M3 | Client ownership | Client owner constraints | Client actions | Client list/detail/forms | Active client ownership invariant |
| Issues | P0 | M4 | Issue rules | Issues/history/version | Issue endpoints | List/create/detail | Validation, pagination, optimistic locking |
| Issue workflow | P0 | M4 | Transition and release rules | Status history/audit | Explicit action endpoints | Available actions/current state | Valid and invalid transition matrix |
| Releases and impact | P0 | M5 | Release relationship | Releases/items/impacts | Release actions | Release list/detail/publish | Publish transaction and release requirement |
| Operational handoff | P0 | M5 | Acknowledgement/ownership | Handoffs | Handoff actions | Handoff queue/detail | One affected client creates owned responsibility |
| Follow-up and closure | P0 | M6 | Operational closure | Follow-ups/history | Complete/close actions | Follow-up queue/actions | Required follow-up bypass rejected |
| Audit for critical mutations | P0 | M2-M6 | Traceability rules | Audit records | Included in mutations | UI deferred | Actor, action, resource, before/after, request ID |
| Client timeline | P1 | M7 | Visibility rules | Client activities | Timeline endpoint | Client timeline | Chronology and resource links |
| Feature demand | P1 | M7 | One demand, many clients | Feature requests/client links | Feature request endpoints | Demand list/detail | Count, oldest request, requesting clients |
| Living documentation | P1 | M7 | Documentation lifecycle | Documents/links | Documentation endpoints | Documentation list/detail | Lifecycle, metadata, related resources |
| Notifications and worker | P1 | M7 | Notification triggers | Jobs/notifications | Notification endpoints | Notification states | Commit before enqueue; retry safety |
| Attachments | P2 | M9 | Authorized file access | Metadata only | Upload/download | Attachment UI | MIME, size, authorization, object key safety |
| Client health | P2 | M9 | Explainable score | Health inputs/history | Health endpoint | Health explanation | Deterministic and explainable calculation |

Read the linked subject owner in **Document Authority** before implementing a row.

## Vertical Slice Workflow

For every capability or business action:

1. Select the next row in **Canonical Delivery Order**. Do not start P1 while a P0 dependency is incomplete.
2. Read the assessment, relevant business rules, planned database, API, frontend, and testing sections.
3. Record unresolved material decisions in **Decision Gate**. Stop that slice until resolved.
4. Define acceptance scenarios, including invalid and unauthorized behavior.
5. Implement the smallest complete slice in this order: migration, repository, service, service test, handler/API, integration test, frontend API/hook, UI, component test, documentation.
6. Run the feature gate below. Incomplete layers mean the slice remains in progress.
7. Run the milestone exit gate in [`milestones.md`](milestones.md).
8. Update status only after reproducible verification passes.

## Definition of Done

### Every Feature

- Approved business rule implemented; no silent rule change.
- Backend authorization and resource policy enforced.
- Trust-boundary input validated; typed errors returned.
- Database constraints, concurrency, and transaction boundary handled.
- Critical mutations produce history/audit where required.
- API implementation matches and updates OpenAPI.
- Frontend includes loading, empty, error, disabled/pending, and success behavior where relevant.
- Forms include client validation plus server field errors.
- Responsive and accessible behavior verified.
- Relevant unit, integration, component, and regression tests pass.
- No stub, fake final response, unresolved placeholder, secret, or dead route.

### Every Workflow Action

- Current state and requested action validated.
- Actor permission and resource access validated by backend.
- Required related records validated.
- Expected version checked; stale writes return `409 VERSION_CONFLICT`.
- Multi-record mutation is transactional.
- History and audit are written in the same business transaction where required.
- Invalid transition returns a typed error and changes no data.

### Every Milestone

- All included feature gates pass.
- Milestone-specific checklist in [`milestones.md`](milestones.md) passes.
- Tests are reproducible through root commands.
- Documentation and status reflect implemented behavior.
- No later milestone is required to make the current milestone correct or secure.

### Submission

- P0 checklist in [`milestones.md`](milestones.md) is complete.
- Definition of Test Complete in [`testing-strategy.md`](testing-strategy.md) passes.
- Security, database, frontend, and repository quality reviews pass.
- Migrations reproduce a fresh database and support rollback.
- OpenAPI validates and covers implemented endpoints.
- README supports clone, configure, run, migrate, seed, login, test, and Swagger use.
- Demo data covers active workflow, release, handoff, required follow-up, and closure.
- Critical journey succeeds from login through traceable operational closure.

## Critical Journey

The final demo and regression path is:

```text
Login
Create or select client with a primary Operations owner
Create issue
Triage and assign
Investigate
Develop
Mark QA
Publish related release with affected client
Create and acknowledge operational handoff
Complete required client follow-up
Close issue
Verify history, timeline, and audit trail
```

Technical release alone does not complete this journey. Completion requires affected-client ownership, acknowledgement, follow-up when required, and traceable outcome.

## Decision Gate

These conflicts are known. Resolve each relevant item in its owning document before implementing that behavior.

| Decision | Current conflict | Required owner |
|---|---|---|
| Release publication | Whether `DRAFT` may publish directly or only `READY` may publish | Business requirements, then API/tests |
| Release impact persistence | Whether impacts are created before publish or generated during publish | Business requirements, then database/API |
| Documentation closure gate | Whether documentation is mandatory for every handoff or only selected release types | Business requirements |
| Product MVP versus submission scope | Product vision includes capabilities classified P1/P2 by delivery plan | Product scope and milestones |
| Assessment score | Listed categories total 95 while text states 100 | Upstream assessment; document only, do not alter silently |

Canonical clarifications already supported by the detailed documents:

- `BLOCKED` is a work state, not a primary issue status.
- Documentation review status is `IN_REVIEW`.
- An active client has exactly one active primary Operations owner; secondary owners are separate.
- Issue-to-release validity uses the release-item relationship, not an `issues.release_id` column.
- Critical backend audit is P0; audit browsing UI is P1.
- Redis starts when rate limiting or worker use requires it. MinIO starts with attachments.

## Progress Rule

Use one status for every tracked item:

```text
NOT_STARTED
IN_PROGRESS
BLOCKED
DONE
```

`DONE` means its full feature DoD and milestone gate passed. Code merged or deployed without operational acceptance is not sufficient.
