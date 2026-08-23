# ClientOps

School Success & Operational Visibility Platform for B2B EdTech.

ClientOps is a fullstack web application designed to improve operational visibility between school clients, Operations, Product, and Engineering.

The core idea is simple:

> **Technical completion is not the same as operational completion.**

A bug fix or feature is not considered fully delivered only because it has been implemented and released. The organization must also know about it, affected clients must be identified, required follow-up must happen, and the outcome must remain traceable.

---

## Status

P0 backend and frontend capabilities are implemented: cookie authentication, CSRF, RBAC, clients, issues and workflow, releases, handoffs, follow-ups, audit records, API documentation, and operational UI. P1 capabilities also present include feature requests, SLA/work states, client timeline, documentation, notifications, dashboard metrics, and MinIO attachments.

## Local Development

```bash
cp .env.example .env
make up
make migrate-up
make seed
```

`make seed` requires `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`; `ADMIN_NAME` is optional. It safely upserts documented roles and permissions, grants all permissions to `SUPER_ADMIN`, and creates or updates that administrator with an Argon2id PHC password hash.

API health: `http://localhost:8080/health`.

API readiness: `http://localhost:8080/ready`.

Swagger UI: `http://localhost:8080/api/docs`. It loads the served OpenAPI document at `http://localhost:8080/api/docs/openapi.yaml`; source lives at [`docs/api/openapi.yaml`](docs/api/openapi.yaml).

Build and test:

```bash
make backend-test
make frontend-build
make test
make build
```

`make test` runs Go tests and the frontend TypeScript/Vite build. There is no `frontend-test`, `test-integration`, or `test-e2e` target: no frontend test or browser runner is installed, and Docker Compose supplies only the shared development PostgreSQL database. A database integration target would need an isolated test database plus migration lifecycle before it can run safely and reproducibly.

Implementation starts from the [`Documentation and Delivery Map`](docs/README.md), which connects source-of-truth documents, delivery order, traceability, and Definition of Done gates.

---

## Problem

In B2B EdTech operations, a school may report a problem or request a feature through the Operations team.

A typical flow may look like:

```text
School
   ↓
Operations
   ↓
Product / Engineering
   ↓
Development
   ↓
Release
```

The technical flow may work, but information visibility can break between teams.

Common situations include:

```text
Operations does not know
whether an issue has been investigated.

Operations does not know
whether development has started.

Engineering has released a fix,
but Operations is not aware yet.

A feature has been delivered,
but affected schools are never proactively informed.

Documentation exists inconsistently
or depends heavily on individual knowledge.
```

This creates a visibility gap.

From an Operations perspective:

> “Why is Engineering taking so long?”

From Engineering's perspective:

> “This has already been investigated / fixed / released.”

The core problem is therefore not simply ticket management.

It is:

> **Operational information exists, but does not consistently become organizational awareness.**

---

## Product Vision

ClientOps acts as a shared operational layer between:

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
      ↓
Client Success
```

The platform helps answer:

* What problem is the client currently experiencing?
* What stage is the work in?
* Who owns the work?
* What is currently blocking progress?
* How much time has been spent actively working?
* How much time has been spent waiting?
* Has the fix or feature been released?
* Which clients are affected?
* Has Operations acknowledged the release?
* Does the client need follow-up?
* Has the client actually received the value?

---

## Core Product Principle

ClientOps separates two concepts:

### Technical Completion

```text
Implementation complete
      ↓
QA passed
      ↓
Release published
```

### Operational Completion

```text
Technical completion
      ↓
Affected clients identified
      ↓
Operations informed
      ↓
Documentation available
      ↓
Required client follow-up completed
      ↓
Outcome recorded
```

A workflow is not fully complete until required operational actions have also been completed.

---

## Target Users

### Operations Staff

Primary needs:

* Create client issues and feature requests.
* Track current progress.
* Understand blockers and waiting states.
* Know when releases affect their clients.
* Perform client follow-up.
* Access relevant product documentation.

### Operations Manager

Primary needs:

* Monitor issue SLA.
* Identify operational bottlenecks.
* Monitor pending follow-ups.
* Understand client relationship risk.
* Manage client ownership.

### Product

Primary needs:

* Review feature requests.
* Understand demand across multiple schools.
* Prioritize requests based on client impact.
* Connect requests to releases and documentation.

### Engineering

Primary needs:

* Receive structured client context.
* Investigate issues.
* Update technical workflow.
* Communicate blockers.
* Connect fixes to releases.

### Management

Primary needs:

* Understand overall operational health.
* Identify recurring problems.
* See client risk.
* Understand feature demand.
* Evaluate whether product delivery actually reaches clients.

---

## Core Features

### Client Management

Provides a central view of school clients including:

* School profile
* Contacts
* Primary Operations owner
* Issue history
* Feature requests
* Follow-ups
* Activity timeline

---

### Issue Management

Issue lifecycle:

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

Invalid transitions are rejected by the backend.

---

### Work State Visibility

The primary workflow state is separated from the current working/waiting condition.

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

This allows ClientOps to distinguish:

```text
Elapsed Time
Active Work Time
Blocked Time
Waiting Time
```

instead of treating every long-running issue as Engineering delay.

---

### Feature Request Demand

A feature request represents a product capability or problem, rather than one isolated ticket per client.

Example:

```text
Attendance Export

Requested by:
├── SMA Nusantara
├── SMA Merdeka
├── SMK Digital
└── SMP Harapan
```

ClientOps can therefore surface:

* Demand count
* Requesting clients
* Oldest request
* Current status
* Priority

---

### Release Management

Releases connect technical delivery with client impact.

A release can contain:

* Features
* Bug fixes
* Improvements
* Security changes
* Related issues
* Related feature requests
* Affected clients

---

### Operational Handoff

When a release affects a client:

```text
Release Published
       ↓
Client Impact
       ↓
Operational Handoff
       ↓
Ops Acknowledgement
       ↓
Client Follow-up
       ↓
Completed
```

This is one of the core differentiators of ClientOps.

---

### Client Follow-up

Operations can track follow-up actions after:

* Issue resolution
* Feature release
* Important product updates
* Training requirements
* Relationship concerns

Follow-up records include:

* Owner
* Reason
* Due date
* Status
* Result

---

### Living Documentation

Documentation is connected to product delivery.

Lifecycle:

```text
DRAFT
→ IN_REVIEW
→ PUBLISHED
```

Documentation can be related to:

* Product features
* Releases
* Issues
* Product modules

---

### Client Timeline

Client activity is displayed chronologically.

Examples:

```text
Issue reported
Issue moved to QA
Feature requested
Release published
Ops acknowledged release
Follow-up completed
```

This creates a contextual history of the client relationship.

---

## Planned Differentiators

After the core workflow is stable, ClientOps may include:

### Client Health

A deterministic and explainable client health score based on signals such as:

* Critical unresolved issues
* SLA breach
* Overdue follow-up
* Recent interaction
* Product adoption

The score must always show contributing factors.

---

### Value Delivered

Future client-facing capability for showing measurable product value, such as:

* Issues resolved
* Features delivered
* Product adoption
* Training completed
* Digital process milestones

---

### School Success

Future capabilities may allow schools to see or share verified milestones achieved through product usage.

This is not part of the initial MVP.

---

## Tech Stack

### Backend

```text
Go
Gin
GORM
PostgreSQL
```

### Frontend

```text
React
TypeScript
Vite
Tailwind CSS
Axios
React Router
TanStack Query
React Hook Form
Zod
```

### Infrastructure

```text
Docker Compose
Redis
MinIO
Go Background Worker
```

### Documentation

```text
OpenAPI
Swagger UI
Markdown Architecture Documentation
```

---

## Architecture

ClientOps uses:

> **Modular Monolith + Background Worker**

High-level architecture:

```text
                         User
                          │
                          ▼
                 ┌──────────────────┐
                 │ React Frontend   │
                 └────────┬─────────┘
                          │
                     HTTPS / REST
                          │
                          ▼
                 ┌──────────────────┐
                 │ Go API           │
                 │ Gin + GORM       │
                 └───┬────┬────┬────┘
                     │    │    │
                     ▼    ▼    ▼
                PostgreSQL Redis MinIO
                              │
                              ▼
                         Go Worker
```

The project intentionally avoids microservices for the current scope.

Reasons include:

* Simpler deployment
* Easier transaction consistency
* Easier debugging
* Lower operational complexity
* Sufficient scalability for the current use case

See:

```text
docs/system-architecture.md
```

---

## Backend Architecture

Request flow:

```text
HTTP Request
    ↓
Middleware
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

Responsibilities:

### Handler

Handles:

* HTTP parsing
* DTO binding
* Request validation trigger
* Response serialization

### Service

Handles:

* Business rules
* Workflow transitions
* Transactions
* Cross-domain orchestration

### Repository

Handles:

* Persistence
* Queries
* GORM interaction

Business rules must not be implemented directly inside handlers.

---

## Authentication

Authentication is cookie-based.

Planned model:

```text
Short-lived access token
+
Rotating refresh token
+
HttpOnly secure cookies
+
Server-side refresh session tracking
```

Authentication tokens will not be stored in:

```text
localStorage
sessionStorage
```

---

## CSRF Protection

Because authentication uses cookies, state-changing requests require CSRF protection.

Initial design:

```text
Double Submit Cookie
```

Protected methods include:

```text
POST
PUT
PATCH
DELETE
```

---

## Authorization

ClientOps uses:

```text
RBAC
+
Permissions
+
Resource-level authorization
```

Examples:

```text
issue.read
issue.create
issue.assign
issue.mark_released

client.read
client.update

release.publish

handoff.acknowledge
```

Frontend permission checks exist for UX only.

The backend remains the security authority.

---

## Database

Primary database:

```text
PostgreSQL
```

ORM:

```text
GORM
```

Schema migration:

```text
golang-migrate
```

Production schema source of truth:

```text
backend/migrations/
```

GORM `AutoMigrate` is not used as the production migration source of truth.

---

## Database Design Principles

The database uses:

* UUID primary keys
* Foreign keys
* Unique constraints
* Appropriate indexes
* Explicit nullability
* Transactional business updates
* Optimistic locking for concurrent updates
* Historical status records
* Audit trails

Detailed design:

```text
docs/database-design.md
```

---

## Optimistic Concurrency

Critical resources use version-based optimistic locking.

Example:

```text
Current issue:
version = 7

User A updates version 7
→ success
→ version becomes 8

User B updates old version 7
→ 409 VERSION_CONFLICT
```

This prevents silent lost updates when multiple teams work on the same resource.

---

## API

Base API:

```text
/api/v1
```

Example resources:

```text
/api/v1/auth
/api/v1/clients
/api/v1/issues
/api/v1/feature-requests
/api/v1/releases
/api/v1/handoffs
/api/v1/follow-ups
/api/v1/documentations
/api/v1/notifications
/api/v1/dashboard
```

Critical workflow transitions use explicit business actions.

Example:

```text
POST /api/v1/issues/:id/triage
POST /api/v1/issues/:id/start-investigation
POST /api/v1/issues/:id/mark-qa
POST /api/v1/issues/:id/mark-released
POST /api/v1/issues/:id/close
```

instead of unrestricted status updates through generic PATCH requests.

---

## API Response

Standard success response:

```json
{
  "success": true,
  "data": {},
  "message": "Success"
}
```

Standard error response:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATUS_TRANSITION"
  },
  "message": "Issue cannot transition to the requested state"
}
```

---

## API Documentation

OpenAPI specification source:

```text
docs/api/openapi.yaml
```

Swagger UI:

```text
/api/docs
```

---

## Repository Structure

```text
clientops/
├── AGENTS.md
├── DESIGN.md
├── README.md
│
├── backend/
│   ├── cmd/
│   │   ├── api/
│   │   └── worker/
│   │
│   ├── internal/
│   ├── pkg/
│   ├── migrations/
│   ├── seeds/
│   └── tests/
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── types/
│   │
│   └── tests/
│
├── docs/
│   ├── assignment/
│   ├── product/
│   ├── architecture/
│   ├── database/
│   ├── api/
│   └── interview/
│
├── scripts/
├── docker/
├── .github/
│
├── .env.example
├── docker-compose.yml
└── Makefile
```

---

## Documentation

Start with:

```text
docs/README.md
```

### Assessment Specification

```text
docs/assignment.md
```

### Product

```text
docs/clientops.md
docs/business-requirements.md
```

### Architecture

```text
docs/system-architecture.md
docs/frontend-ia.md
DESIGN.md
```

### Database

```text
docs/database-design.md
```

### API

```text
docs/api-contract.md          # planning contract
docs/api/openapi.yaml         # implemented contract; created with the API
```

---

## Development Milestones

Current roadmap:

```text
M0 — Bootstrap
M1 — Platform Foundation
M2 — Security & Access
M3 — Client Core
M4 — Issue Lifecycle
M5 — Release & Handoff
M6 — Client Success
M7 — Knowledge & Communication
M8 — Quality & Testing
M9 — Engineering Bonus
M10 — Submission
```

---

## Current MVP Priority

### P0

Must be stable before submission:

```text
Authentication
CSRF
RBAC
Client Management
Issue Management
Issue Workflow
Optimistic Locking
Release Management
Release Impact
Operational Handoff
Client Follow-up
Operational Closure
Database Migration
Validation
Error Handling
Search / Filter / Sort / Pagination
Core UI/UX
Tests
OpenAPI
README
```

### P1

High value:

```text
Feature Request Demand
Work State Time Breakdown
SLA
Client Timeline
Documentation
Notifications
Background Worker
Dashboard Analytics
```

### P2

Only after the core is stable:

```text
MinIO Attachments
Client Health
Session Management UI
Full E2E
CI/CD
Metrics
Advanced Cache
Transactional Outbox
Email Notifications
```

---

## UI/UX

ClientOps uses a modern B2B SaaS dashboard approach.

Design principle:

> **Clarity over decoration.**

The UI prioritizes:

```text
Current state
Ownership
Next action
Operational risk
Client impact
```

over decorative dashboards.

Important screens:

* Dashboard
* Client List
* Client Detail
* Issue List
* Issue Detail
* Release Detail
* Handoff Queue
* Follow-up Queue
* Documentation

Detailed design rules are documented in:

```text
DESIGN.md
```

---

## Required UI States

Important screens must support:

```text
Loading
Empty
Error
Success
Disabled
Responsive
```

Forms must provide:

* Labels
* Inline validation
* Pending submit state
* Disabled submit
* Server validation feedback
* Success feedback

---

## Search, Filter, Sort & Pagination

Major listings are server-driven.

Examples:

### Clients

```text
search
status
health
owner
sort
page
limit
```

### Issues

```text
search
client
status
severity
assignee
work_state
date
sort
page
limit
```

The frontend must not fetch all large datasets and implement primary filtering only in memory.

---

## Background Worker

Background jobs are processed through Redis.

Initial use cases:

* Notifications
* SLA checks
* Follow-up reminders
* Optional client health recalculation

Worker entry point:

```text
backend/cmd/worker/main.go
```

Business state remains stored in PostgreSQL.

Redis is not the business source of truth.

---

## File Storage

When attachment support is implemented:

```text
Binary file
→ MinIO

Metadata
→ PostgreSQL
```

Local application filesystem is not used as persistent production attachment storage.

Uploads will validate:

* Authorization
* MIME type
* File size
* Safe object name

---

## Testing

Planned stack:

### Backend

```text
Go testing
Testify
PostgreSQL integration tests
```

### Frontend

```text
Vitest
React Testing Library
MSW
```

### E2E

```text
Playwright
```

---

## Highest Priority Tests

Testing focuses on business behaviour.

Critical cases:

```text
Issue state transitions
Authentication
Refresh rotation
CSRF
RBAC
Resource authorization
Optimistic locking
Release publishing
Operational handoff
Follow-up completion
Operational closure
Migration reproducibility
Axios refresh concurrency
```

Detailed strategy:

```text
docs/testing-strategy.md
```

---

## Critical Demo Flow

The intended final demo:

```text
1. Login as Operations.

2. Open SMA Nusantara.

3. Create an issue.

4. Issue appears as REPORTED.

5. Engineering takes ownership.

6. Issue moves through:
   TRIAGED
   INVESTIGATING
   IN_DEVELOPMENT
   QA

7. Show a WAITING_CLIENT period.

8. Resume active work.

9. Create and publish a release.

10. SMA Nusantara is identified as affected.

11. An operational handoff is created.

12. Operations sees the handoff.

13. Operations acknowledges it.

14. Client follow-up is completed.

15. Issue moves to CLOSED.

16. Client timeline shows the entire journey.
```

This scenario demonstrates the main product thesis:

> **A technical fix only becomes complete when the organization and the client receive its value.**

---

## Development Setup

Implementation has not started yet.

The final development setup will follow approximately:

```bash
git clone <repository>
cd clientops

cp .env.example .env

docker compose up
```

Migration, seed, testing, and application URLs will be added here once the corresponding commands exist.

This section intentionally does not document commands that have not yet been implemented.

---

## Planned Developer Commands

The repository is expected to expose root-level commands such as:

```text
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

The README will only mark these commands as available after they are implemented and verified.

---

## Demo Accounts

Demo credentials will be added after authentication and seed data are implemented.

Planned demo roles:

```text
Super Admin
Operations Manager
Operations Staff
Product
Engineer
```

No production credentials will be committed to the repository.

---

## Security Principles

ClientOps will follow these baseline rules:

```text
No plaintext passwords

No authentication tokens in localStorage

No authentication tokens in sessionStorage

HttpOnly cookies

Secure cookies in production

CSRF protection

Explicit CORS

Backend authorization

Refresh rotation

Session revocation

Input validation

Login rate limiting

Safe error responses

Safe file uploads

Audit trail

No secrets committed
```

---

## Error Handling

Errors are centralized and categorized.

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

Unexpected internal errors return sanitized messages.

Technical details remain in structured application logs.

---

## Observability

Initial observability includes:

```text
Structured logging
Request ID
Health endpoint
Readiness endpoint
Worker logs
```

Future improvements may include:

```text
Metrics
OpenTelemetry
Tracing
```

These will only be added if they provide sufficient value relative to implementation complexity.

---

## Technical Decisions

Important decisions include:

### Modular Monolith over Microservices

Reason:

* Lower operational complexity
* Easier transactional consistency
* Appropriate scale for the take-home scope
* Easier reviewer setup

### Explicit SQL Migrations over GORM AutoMigrate

Reason:

* Reproducible schema
* Explicit rollback
* Reviewable changes
* Clear database history

### Redis over RabbitMQ

Initial workload only requires simple background job processing and rate limiting.

Redis provides sufficient capability while reducing infrastructure complexity.

### Explicit Workflow Endpoints

Business operations such as issue closure and release publishing require contextual validation.

They are therefore represented as explicit API actions rather than unrestricted status mutation.

### Optimistic Locking

Operations, Product, and Engineering may edit the same resources concurrently.

Version-based conflict detection prevents silent lost updates.

---

## Trade-offs

ClientOps intentionally accepts several trade-offs.

### Shared Database

The modular monolith shares PostgreSQL between modules.

This simplifies transactions but requires clear module ownership to avoid tight coupling.

### Redis Queue

Redis is simpler than a dedicated messaging broker but provides fewer advanced messaging semantics.

This is acceptable for the initial workload.

### Post-Commit Queue Dispatch

Initial async jobs may be enqueued after database commit.

There is a small failure window between commit and enqueue.

A future reliability improvement is:

```text
Transactional Outbox Pattern
```

This is intentionally not implemented before core functionality is stable.

### Offset Pagination

Standard administrative listings may initially use offset pagination.

Large append-only datasets such as audit logs may move to cursor pagination later.

---

## Non-Goals

The initial application is not intended to become:

```text
ERP
Accounting system
Payroll system
Inventory system
Generic Jira replacement
Generic CRM
Realtime chat platform
Marketing automation platform
AI autonomous system
```

The core domain remains:

> **Client operational visibility and closed-loop delivery.**

---

## Future Improvements

Potential future capabilities:

* Client portal
* School success dashboard
* Client health intelligence
* Product adoption analytics
* Value-delivered reports
* School achievements
* Training management
* Renewal intelligence
* Email/WhatsApp notifications
* Transactional outbox
* Advanced observability
* Cursor pagination for large historical datasets

Future work should only be implemented when core product quality remains stable.

---

## Engineering Principles

When choosing between:

```text
more features
```

and:

```text
fewer features that are
correct
secure
tested
documented
explainable
```

ClientOps chooses the second.

The goal of this project is not to demonstrate how many technologies can be added.

The goal is to demonstrate sound engineering decisions around a real operational problem.

---

## Assignment Alignment

ClientOps is intentionally designed to demonstrate more than simple CRUD.

The application includes:

* Clear business problem and target users
* Multi-role workflow
* Status transitions
* Business rules
* Related entities
* Secure cookie-based authentication
* CSRF protection
* Backend authorization
* PostgreSQL relationships and migrations
* REST API versioning
* Validation
* Search/filter/sort/pagination
* Responsive UI
* Error handling
* Reusable components
* Testing
* API documentation
* Engineering trade-offs

## These areas directly align with the take-home requirements.

## Final Product Statement

ClientOps exists to transform:

```text
"Is this already done?"
```

into:

```text
Here is exactly:

where the work is,
who owns it,
what is blocking it,
what was released,
which client is affected,
what Operations must do next,
and whether the client has actually received the value.
```

That is the operational problem this project is designed to solve.
