# AGENTS.md

## 1. Project Identity

Project name:

```text
ClientOps
```

Product positioning:

> **School Success & Operational Visibility Platform for B2B EdTech**

ClientOps is designed to close the visibility gap between:

```text
School / Client
      ↓
Operations
      ↓
Product / Engineering
      ↓
Release
      ↓
Operational Handoff
      ↓
Client Follow-up
```

The core product principle is:

> **Technical completion is not the same as operational completion.**

A change is not considered fully delivered only because code has been merged or deployed.

Operational delivery requires the relevant people to understand the change, affected clients to be identified, required follow-up to be completed, and the result to be traceable.

---

# 2. Agent Mission

Any coding agent working in this repository must prioritize:

```text
Correctness
Business Rules
Security
Maintainability
User Experience
Testing
Documentation
```

over:

```text
feature quantity
clever abstractions
premature optimization
unnecessary infrastructure
```

Do not add technology merely because it is available.

Every implementation decision should answer:

```text
What problem does this solve?

Who needs it?

What business rule does it protect?

Why is this implementation appropriate for the current scope?
```

---

# 3. Source of Truth

Use the following documents as project source of truth.

Start with the documentation and delivery map:

```text
docs/README.md
```

## Assessment Requirements

```text
docs/assignment.md
```

Defines mandatory technologies, security requirements, UI/UX expectations, API expectations, deliverables, and scoring criteria.

---

## Product Definition

```text
docs/clientops.md
```

Defines:

* Problem
* Product thesis
* Product vision
* Goals
* Target users
* MVP scope
* Non-goals

---

## Business Rules

```text
docs/business-requirements.md
```

This is the primary source of truth for:

* Actors
* Permissions
* Workflow
* Status transition
* Client ownership
* SLA
* Release impact
* Operational handoff
* Client follow-up
* Operational closure

Do not invent or change business rules silently.

---

## Database

```text
docs/database-design.md
```

Defines intended entities, relationships, integrity rules, indexing strategy, and migration principles.

Actual production schema source of truth is:

```text
backend/migrations/
```

---

## API

```text
docs/api/openapi.yaml
```

The OpenAPI contract becomes the API source of truth once implemented.

Before the OpenAPI file is complete, use the API contract documentation agreed in project planning.

Current planning contract:

```text
docs/api-contract.md
```

---

## Frontend

```text
docs/frontend-ia.md
```

Defines:

* Route structure
* Navigation
* Page responsibility
* Role-based UI
* UI states
* Page-to-API relationship

---

## Architecture

```text
docs/system-architecture.md
```

Defines system boundaries and technical decisions.

---

# 4. Mandatory Technology Constraints

Do not replace the required technologies.

## Backend

Required:

```text
Go
Gin
GORM
PostgreSQL
```

---

## Frontend

Required:

```text
React
TypeScript
Tailwind CSS
Axios
```

Current approved supporting stack:

```text
Vite
React Router
TanStack Query
React Hook Form
Zod
```

---

## Infrastructure

Approved:

```text
Docker Compose
PostgreSQL
Redis
MinIO
Go Worker
```

---

# 5. Architecture Style

The project uses:

> **Modular Monolith + Background Worker**

Do not introduce microservices unless explicitly requested.

Do not introduce:

```text
Kafka
Kubernetes
service mesh
distributed database
event sourcing
CQRS infrastructure
```

without a demonstrated requirement.

---

# 6. Repository Boundary

Expected root structure:

```text
clientops/
├── backend/
├── frontend/
├── docs/
├── scripts/
├── docker/
├── .github/
├── AGENTS.md
├── .env.example
├── docker-compose.yml
├── Makefile
└── README.md
```

Frontend and backend are separate application codebases but belong to one repository and one product.

---

# 7. Backend Architecture Rules

Backend module structure follows domain boundaries.

Expected modules include:

```text
auth
users
rbac
clients
issues
feature_requests
releases
handoffs
followups
documentation
notifications
audit
dashboard
```

Preferred flow:

```text
HTTP
 ↓
Handler
 ↓
Service
 ↓
Repository
 ↓
GORM
 ↓
PostgreSQL
```

---

# 8. Handler Rules

Handlers may:

```text
parse request
bind DTO
parse path/query parameters
invoke validation
call service
return response
```

Handlers must not contain core business logic.

Do not implement workflow rules directly inside Gin handlers.

Bad:

```go
if issue.Status == "QA" {
    issue.Status = "RELEASED"
}
```

Preferred:

```go
issueService.MarkReleased(...)
```

---

# 9. Service Rules

Service layer owns business orchestration.

Examples:

```text
TriageIssue
AssignIssue
StartInvestigation
StartDevelopment
MarkIssueQA
MarkIssueReleased
CloseIssue
PublishRelease
AcknowledgeHandoff
CompleteFollowUp
```

Use business-language function names.

Avoid generic names such as:

```text
Process
Handle
UpdateData
SaveData
```

when a more meaningful domain name exists.

---

# 10. Repository Rules

Repositories own persistence, not business policy.

Repository may determine:

```text
how to find data
how to persist data
how to query list/filter
how to update with optimistic locking
```

Repository must not determine:

```text
whether an issue may move from QA to RELEASED
```

That belongs to service/domain logic.

---

# 11. Cross-Module Ownership

A module must not directly mutate another module's tables merely because GORM access is available.

Example:

```text
releases module
```

must not arbitrarily write:

```text
operational_handoffs
```

through direct table access if that behaviour belongs to the handoff domain.

Prefer explicit service collaboration.

---

# 12. Database Migration Rules

Production schema source of truth:

```text
backend/migrations/
```

Do not use:

```go
db.AutoMigrate(...)
```

as the production schema migration system.

Migrations must support:

```text
up
down
fresh database reproducibility
```

Naming:

```text
000001_create_users.up.sql
000001_create_users.down.sql
```

Do not modify already-shared migrations to represent new schema changes.

Create a new migration.

---

# 13. Database Integrity

Use database constraints when appropriate:

```text
PRIMARY KEY
FOREIGN KEY
UNIQUE
NOT NULL
CHECK
INDEX
```

Business correctness must not rely entirely on frontend validation.

---

# 14. UUID

Primary business entities use UUID identifiers unless there is a documented exception.

Human-readable resources may additionally use identifiers such as:

```text
ISS-2026-000123
FR-2026-000045
```

Do not generate these with:

```text
COUNT(*) + 1
```

Use a concurrency-safe strategy.

---

# 15. Optimistic Locking

Critical concurrently editable resources should use version-based optimistic locking.

Expected pattern:

```text
WHERE id = ?
AND version = ?
```

Successful mutation:

```text
version = version + 1
```

Stale update:

```text
409 VERSION_CONFLICT
```

Do not silently overwrite newer data.

---

# 16. Issue Workflow

The main issue lifecycle is:

```text
REPORTED
   ↓
TRIAGED
   ↓
INVESTIGATING
   ↓
IN_DEVELOPMENT
   ↓
QA
   ↓
RELEASED
   ↓
FOLLOW_UP
   ↓
CLOSED
```

Additional lifecycle capability includes:

```text
REOPENED
CANCELLED
```

Work/waiting state is separate from primary status.

---

# 17. Work State

Examples:

```text
ACTIVE
WAITING_CLIENT
WAITING_OPS
WAITING_PRODUCT
WAITING_ENGINEERING
WAITING_RELEASE
BLOCKED
```

Do not inflate the primary status enum with every waiting condition.

---

# 18. Invalid Status Transition

Workflow transitions must be enforced by backend.

Examples that must not be accepted:

```text
REPORTED → CLOSED
REPORTED → RELEASED
TRIAGED → QA
IN_DEVELOPMENT → CLOSED
```

Frontend disabled buttons are not sufficient protection.

---

# 19. Release Rule

An issue may not be marked released without a valid release relationship according to the implemented business rules.

A release may affect one or more clients.

Affected clients create operational responsibility.

---

# 20. Operational Handoff

Operational handoff is a first-class domain.

Release flow:

```text
Release Published
      ↓
Affected Client Identified
      ↓
Operational Handoff
      ↓
Ops Acknowledgement
      ↓
Required Client Follow-up
      ↓
Operational Completion
```

Do not simplify this into a single boolean such as:

```text
ops_notified = true
```

unless explicitly changing the business design.

---

# 21. Operational Closure Rule

If client follow-up is required:

```text
handoff cannot complete
```

until the required follow-up has been completed.

Similarly, an issue should not become operationally closed by bypassing this process.

---

# 22. Client Ownership

Active clients require a clear primary Operations owner.

The system must prevent an active client from becoming ownerless through normal workflow.

Ownership changes must be traceable.

---

# 23. Feature Request Principle

Feature requests represent a **problem/capability demand**, not merely duplicate tickets per school.

One feature request may be related to many clients.

Example:

```text
Attendance Export
├── SMA A
├── SMA B
├── SMA C
└── SMA D
```

The product should surface:

```text
demand count
oldest request
requesting clients
```

---

# 24. Documentation Principle

Documentation is part of product delivery.

Lifecycle:

```text
DRAFT
→ IN_REVIEW
→ PUBLISHED
```

Do not treat documentation as unrelated static files if the feature requires living documentation in the product.

---

# 25. Authentication

Authentication must be cookie-based.

Do not store authentication tokens in:

```text
localStorage
sessionStorage
```

Approved model:

```text
short-lived access token
+
refresh token
+
HttpOnly cookies
+
server-side refresh session tracking
```

---

# 26. Password Security

Passwords must be hashed using an established secure algorithm.

Approved:

```text
Argon2id
```

or an appropriately configured established alternative if justified.

Never implement custom cryptography.

Never store plaintext passwords.

---

# 27. Refresh Tokens

Store refresh token hashes, not raw refresh tokens.

Refresh mechanism should support:

```text
expiration
revocation
rotation
```

Failed refresh must lead to session cleanup/logout as appropriate.

---

# 28. Concurrent Refresh

Frontend must prevent concurrent `401` responses from causing duplicate refresh requests.

Expected behaviour:

```text
A → 401
B → 401
C → 401

     ↓

ONE refresh request

     ↓

A/B/C wait

     ↓

retry after success
```

Prevent:

```text
infinite refresh loops
duplicate refresh calls
retry races
```

---

# 29. CSRF

Cookie-based authentication requires CSRF protection.

Approved initial approach:

```text
Double Submit Cookie
```

or another explicitly documented equivalent mechanism.

State-changing requests must be protected.

Do not remove CSRF simply because `SameSite` is configured.

---

# 30. Authorization

Backend is the authorization authority.

Authorization includes:

```text
RBAC
Permission
Resource-level policy
```

Frontend permission handling exists for UX only.

Never assume:

```text
button hidden
=
secure
```

---

# 31. API Versioning

All application REST APIs use:

```text
/api/v1
```

unless explicitly documented otherwise.

---

# 32. API Response Consistency

Success response:

```json
{
  "success": true,
  "data": {},
  "message": "Success"
}
```

Paginated response may additionally use:

```json
{
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "total_pages": 5
  }
}
```

---

# 33. API Errors

Errors must use typed application error codes.

Examples:

```text
VALIDATION_ERROR
AUTHENTICATION_REQUIRED
PERMISSION_DENIED
RESOURCE_NOT_FOUND
RESOURCE_CONFLICT
INVALID_STATUS_TRANSITION
VERSION_CONFLICT
RATE_LIMIT_EXCEEDED
INTERNAL_SERVER_ERROR
```

Do not expose database errors or stack traces.

---

# 34. HTTP Status Usage

Use HTTP status codes intentionally.

Examples:

```text
200 OK
201 Created
204 No Content

400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
429 Too Many Requests
500 Internal Server Error
```

---

# 35. Explicit Workflow APIs

Do not update critical workflow status through unrestricted generic PATCH.

Avoid:

```http
PATCH /issues/:id

{
  "status": "CLOSED"
}
```

Prefer business actions:

```text
POST /issues/:id/triage
POST /issues/:id/start-investigation
POST /issues/:id/mark-qa
POST /issues/:id/mark-released
POST /issues/:id/close
```

The API should communicate business intent.

---

# 36. Input Validation

Backend validates:

```text
request body
path parameters
query parameters
UUID
enum
date
numeric range
email
file type
file size
```

Frontend validation exists for immediate UX only.

Backend remains source of truth.

---

# 37. Search / Filter / Sort / Pagination

Major listing endpoints must support server-side:

```text
search
filter
sorting
pagination
```

Never implement large business listings by fetching all records and filtering only in the browser.

---

# 38. Sorting Security

Sort fields must be whitelisted.

Do not pass user-provided sort values directly into raw SQL.

---

# 39. Transactions

Use transactions for multi-record business mutations.

Example issue transition:

```text
BEGIN

update issue
insert status history
insert client activity
insert audit log

COMMIT
```

Failure must roll back related changes.

---

# 40. Side Effects

Do not send asynchronous/external side effects before the business transaction successfully commits.

Preferred:

```text
DB COMMIT
↓
enqueue side effect
```

Future reliability improvement may use transactional outbox.

Do not introduce transactional outbox prematurely unless the core implementation is complete.

---

# 41. Redis

Approved initial responsibilities:

```text
background queue
rate limiting
```

Optional:

```text
short-lived cache
```

Redis is not the source of truth for business data.

---

# 42. Background Worker

Worker runtime:

```text
backend/cmd/worker
```

Suitable work:

```text
notifications
email
scheduled SLA checks
health recalculation
file processing
```

Jobs should be retry-safe and preferably idempotent.

---

# 43. MinIO

Use MinIO/object storage for binary files.

Do not store production attachments in:

```text
./uploads
```

PostgreSQL stores metadata.

MinIO stores binary object.

---

# 44. File Upload Security

Validate:

```text
authentication
authorization
MIME type
size
safe object name
allowed extension where relevant
```

Do not trust original filenames as storage keys.

Suggested object pattern:

```text
issues/{issue_id}/{uuid}.png
```

---

# 45. Audit Trail

Critical business mutations should produce an audit record.

Audit should capture relevant information such as:

```text
actor
action
resource
before
after
timestamp
request ID
```

Never log secrets into audit records.

---

# 46. Application Log vs Audit Log

Application logs:

```text
engineering diagnostics
errors
latency
worker execution
```

Audit logs:

```text
business accountability
who changed what
```

Do not use one as a replacement for the other.

---

# 47. Logging

Use structured logging.

Important fields:

```text
request_id
method
path
status
duration
user_id where appropriate
resource identifiers where helpful
```

Never log:

```text
password
access token
refresh token
cookie value
secret key
authorization header
```

---

# 48. Request ID

Every API request should have a request/correlation ID.

Use it in:

```text
response headers
structured logs
error troubleshooting
```

---

# 49. Error Handling

Use centralized error handling.

Unexpected internal failure:

```text
log detailed safe internal context
↓
return sanitized error
```

Example user response:

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "request_id": "..."
  },
  "message": "An unexpected error occurred"
}
```

---

# 50. Frontend Architecture

Frontend is feature-oriented.

Expected:

```text
src/
├── app/
├── components/
├── features/
├── hooks/
├── lib/
└── types/
```

Major features:

```text
auth
dashboard
clients
issues
feature-requests
releases
handoffs
follow-ups
documentation
notifications
management
```

---

# 51. Axios

Use one centralized Axios client.

Configure:

```text
base URL
withCredentials
CSRF header
interceptors
```

Do not scatter direct Axios configuration throughout components.

---

# 52. Server State

Use:

```text
TanStack Query
```

for server state.

Do not use global state management merely to duplicate API responses.

---

# 53. Frontend API Calls

Components should not normally contain:

```ts
axios.get(...)
```

directly.

Preferred:

```text
Feature API Function
↓
Query / Mutation Hook
↓
Component
```

---

# 54. Forms

Use:

```text
React Hook Form
+
Zod
```

Expected behaviour:

```text
inline validation
server field errors
disabled submit while pending
success feedback
```

---

# 55. Required UI States

Important pages/components must handle:

```text
loading
empty
error
disabled
success
```

Do not ship pages that only handle the success state.

---

# 56. Destructive Actions

Use confirmation dialogs for actions such as:

```text
archive client
reject request
publish release
revoke session
change important ownership
```

---

# 57. Responsive UI

Critical pages must work on:

```text
desktop
tablet
mobile
```

Do not treat responsive classes alone as verification.

Test actual layouts.

---

# 58. Accessibility

At minimum:

```text
semantic HTML
labels
keyboard navigation
focus states
accessible dialogs
sufficient contrast
text labels for statuses
```

Do not communicate severity/status with color alone.

---

# 59. Frontend Route State

Search/filter state should be reflected in URL when useful.

Example:

```text
/issues?status=QA&severity=HIGH&page=2
```

This allows:

```text
bookmarking
sharing
browser history
```

---

# 60. UI Product Principle

ClientOps UI must answer:

```text
What happened?

What is happening now?

Who owns this?

What is blocked/waiting?

What should happen next?

Has the client actually received the value?
```

---

# 61. Issue Detail Priority

The issue detail screen is one of the most important screens.

It should clearly display:

```text
current workflow step
assignee
client
severity
SLA
work/waiting state
time breakdown
history
release
handoff/follow-up state
```

Do not reduce it to a generic edit form.

---

# 62. Dashboard Principle

Dashboard must be actionable.

Bad:

```text
42 Issues
```

Better:

```text
4 SLA Breached
```

with navigation to the relevant filtered list.

Metrics must have documented definitions.

---

# 63. Testing Strategy

Use:

```text
Go testing
Testify
Vitest
React Testing Library
Playwright
```

Test business behaviour, not just code execution.

---

# 64. Highest Priority Tests

Always prioritize:

```text
Issue state transitions

Authentication

CSRF

RBAC backend enforcement

Optimistic locking

Release publish

Operational handoff

Follow-up completion

Operational closure

Migration reproducibility

Axios refresh concurrency
```

---

# 65. State Transition Tests

Transition matrix must include valid and invalid cases.

Example:

```text
REPORTED → TRIAGED       ✓
REPORTED → CLOSED        ✕
QA → RELEASED + release  ✓
QA → RELEASED no release ✕
```

---

# 66. Integration Tests

Use real PostgreSQL for persistence integration tests where database behaviour matters.

Do not mock database constraints that need to be proven.

---

# 67. E2E

At least one critical flow should ideally be covered:

```text
login
→ create issue
→ progress workflow
→ release
→ handoff
→ follow-up
→ close
```

Do not try to make all testing E2E.

---

# 68. Test Data

Use clear domain-oriented fixture names.

Good:

```text
SMA Nusantara
Ops Sarah
Engineer John
ISS-2026-000123
```

Avoid meaningless fixture names unless the test specifically needs them.

---

# 69. Clock / Time Logic

SLA and time calculations must be testable.

Avoid uncontrolled calls to:

```go
time.Now()
```

deep inside business logic when deterministic testing requires an injectable clock.

---

# 70. Demo Data

Provide coherent demo data.

Recommended roles:

```text
Admin
Ops Manager
Ops Staff
Product
Engineer
```

Recommended demo states:

```text
issue investigating
issue waiting client
issue in QA
issue released
issue closed

pending handoff
follow-up required
completed handoff
```

The reviewer should not open an empty system.

---

# 71. Documentation

When implementing a major behaviour, update relevant documentation if the implementation changes or clarifies the approved design.

Do not allow code and docs to intentionally diverge.

If implementation must deviate, document:

```text
what changed
why
trade-off
```

---

# 72. OpenAPI

Implemented endpoints must be documented.

Include:

```text
method
path
authentication
permission
request
query
response
error response
examples
```

Frontend and backend should follow the documented contract.

---

# 73. README

Reviewer should be able to:

```text
clone
configure
run
migrate
seed
login
test
view Swagger
understand architecture
```

from README alone.

---

# 74. Root Commands

Prefer root-level developer commands.

Examples:

```bash
make up
make down

make migrate-up
make migrate-down

make seed

make backend-test
make frontend-test
make test

make lint
make build
```

Do not require reviewers to memorize long internal command sequences.

---

# 75. Git Practices

Use meaningful branches and commits.

Recommended:

```text
feature/auth
feature/issues
feature/release-handoff
fix/refresh-race
docs/architecture
```

Conventional commits preferred:

```text
feat:
fix:
refactor:
test:
docs:
chore:
ci:
```

---

# 76. No Placeholder Completion

Never mark a task complete if it consists of:

```text
stub handler
TODO implementation
hardcoded fake response
empty service
frontend mocked as final implementation
```

Mocks/fixtures are acceptable in tests and explicit demo scaffolding only.

---

# 77. No Silent Scope Expansion

Do not independently add large modules such as:

```text
Finance
Payroll
Inventory
Marketing CRM
Chat
AI assistant
Billing
ERP
```

The current core domain is:

```text
Client Success
Operational Visibility
Issue Lifecycle
Feature Demand
Release
Operational Handoff
Follow-up
Documentation
```

---

# 78. No Premature AI

Do not add AI simply as a creativity feature.

Current product reasoning prefers deterministic and auditable business logic.

AI may be considered later for:

```text
classification assistance
similar issue suggestions
documentation assistance
insight generation
```

but should not become a decision-maker for core workflow without explicit approval.

---

# 79. No Premature Realtime

Do not add WebSocket/realtime infrastructure unless a real requirement emerges.

Polling/query invalidation is acceptable for MVP.

---

# 80. No Premature Caching

Do not cache an endpoint without identifying:

```text
why it is expensive
how often it is read
acceptable staleness
invalidation strategy
```

Correctness first.

---

# 81. No Premature Generic Abstraction

Avoid creating:

```text
BaseRepository[T]
GenericCRUDService[T]
GenericStatusEngine
UniversalEntityManager
```

before repeated patterns justify them.

ClientOps contains real domain behaviour that should remain explicit.

---

# 82. No N+1

Review GORM queries for listing/detail endpoints.

Do not allow:

```text
1 issue query
+
20 client queries
+
20 user queries
```

Use appropriate joins/preloads/batched queries.

---

# 83. Performance Priority

Before introducing complex infrastructure, optimize through:

```text
proper indexes
pagination
query review
selective loading
connection pooling
```

---

# 84. Dependency Policy

Add a dependency only when it:

```text
solves a real problem
reduces risk
is maintainable
fits the architecture
```

Major dependencies must be explainable during interview.

---

# 85. Code Comments

Comments should explain:

```text
why
trade-off
security concern
non-obvious business rule
```

Avoid comments that merely restate the code.

---

# 86. TODO Policy

Do not leave numerous unresolved:

```text
TODO
FIXME
HACK
```

in final submission.

Put planned work in documentation instead.

---

# 87. Language

Use consistent English for:

```text
code
API
status
error codes
main UI copy
technical documentation
```

Domain-specific Indonesian school examples may be used in demo data.

---

# 88. Definition of Done — Backend Feature

A backend capability is not done until relevant items are satisfied:

```text
[ ] business rule implemented
[ ] permission enforced
[ ] input validated
[ ] database integrity considered
[ ] transaction used if needed
[ ] error mapping implemented
[ ] audit/activity created where relevant
[ ] service test
[ ] integration test where valuable
[ ] API documented
```

---

# 89. Definition of Done — Frontend Feature

A frontend capability is not done until relevant items are satisfied:

```text
[ ] correct API integration
[ ] loading state
[ ] error state
[ ] empty state where relevant
[ ] permission-aware UI
[ ] validation
[ ] mutation pending state
[ ] user feedback
[ ] responsive behaviour
[ ] important tests
```

---

# 90. Definition of Done — Workflow Feature

Any workflow mutation must verify:

```text
current state
target action
actor permission
resource access
required related data
concurrent version
transaction integrity
history/audit
```

---

# 91. Implementation Order

Follow current project milestones.

High-level order:

```text
Bootstrap
↓
Infrastructure
↓
Authentication
↓
RBAC
↓
Clients
↓
Issues
↓
Issue Workflow
↓
Releases
↓
Operational Handoff
↓
Follow-up
↓
Client Timeline
↓
Feature Requests
↓
Documentation
↓
Notifications
↓
Quality Hardening
↓
Bonus
```

Do not jump into bonus modules while P0 functionality is incomplete.

---

# 92. Current P0

P0 includes:

```text
repository bootstrap
Docker environment
PostgreSQL
migration
authentication
CSRF
RBAC
clients
issues
issue workflow
optimistic locking
releases
release impact
operational handoff
follow-up
operational closure
required UI states
testing
OpenAPI
README
```

---

# 93. Current P1

P1 includes:

```text
feature request demand
work-state time breakdown
SLA
client timeline
documentation
notifications
worker
dashboard analytics
```

---

# 94. Current P2

P2 includes:

```text
MinIO attachments
client health
session management UI
full E2E
CI/CD
metrics
advanced cache
transactional outbox
email notification
```

---

# 95. Review Before Making a Major Change

Before changing an existing architectural or product decision, verify:

```text
Does this conflict with assessment constraints?

Does this conflict with business requirements?

Does this alter API contract?

Does this alter database schema?

Does this alter user workflow?

Does this add unnecessary complexity?
```

If yes, update the relevant documentation as part of the change.

---

# 96. When Requirements Are Ambiguous

Do not silently guess critical behaviour.

For minor implementation details, choose the simplest option consistent with existing docs.

For major ambiguity affecting:

```text
business rule
security
schema
API
workflow
scope
```

stop and request clarification.

---

# 97. Refactoring Rule

Refactor when:

```text
duplication is real
code becomes difficult to test
module boundary becomes unclear
business vocabulary is obscured
```

Do not perform large speculative refactoring during feature implementation unless necessary.

---

# 98. Final Quality Principle

The repository should demonstrate critical engineering thinking.

The goal is not to show that the agent can generate the largest amount of code.

The goal is to demonstrate that ClientOps:

```text
solves a real operational problem

uses clear business rules

protects data and access

handles concurrent collaboration

provides traceable workflows

has understandable architecture

provides good user experience

can be reproduced and reviewed
```

---

# 99. Core Product Reminder

The project exists because a common workflow currently looks like:

```text
Client reports problem
      ↓
Ops forwards information
      ↓
Engineering works
      ↓
Ops loses visibility
      ↓
"Is this done yet?"
```

ClientOps changes the lifecycle into:

```text
Client Issue
      ↓
Visible Workflow
      ↓
Engineering Delivery
      ↓
Release
      ↓
Client Impact
      ↓
Ops Handoff
      ↓
Client Follow-up
      ↓
Traceable Completion
```

Whenever implementation starts drifting toward generic CRUD, return to this product problem.

---

# 100. Final Agent Rule

When choosing between:

```text
more features
```

and:

```text
a smaller set of correct, secure, tested, explainable features
```

always choose the second option.
