# ClientOps — Implementation Milestones & Development Plan

## 1. Purpose

Dokumen ini mendefinisikan urutan implementasi ClientOps dari repository kosong sampai siap submission.

Fokus utamanya:

* Menjaga scope tetap realistis.
* Memprioritaskan area dengan bobot penilaian terbesar.
* Menyelesaikan core business flow end-to-end lebih dulu.
* Menghindari over-engineering.
* Menentukan dependency antar milestone.
* Menyediakan Definition of Done untuk setiap tahap.

Assessment paling berat pada:

* Backend Architecture & Code Quality — 15%
* API & Business Logic — 15%
* Authentication & Security — 15%
* UI/UX — 15%
* Database & Migration — 10%
* Frontend Architecture — 10%

Testing, documentation, dan Git practice tetap penting tetapi bobotnya lebih kecil.

Karena itu strategi implementasi bukan:

> selesaikan sebanyak mungkin fitur

melainkan:

> selesaikan critical flow dengan kualitas tinggi terlebih dahulu.

---

# 2. Priority Model

Kita gunakan tiga level:

## P0 — Mandatory / Critical

Harus selesai dan stabil sebelum submission.

Jika P0 belum selesai, jangan mengejar bonus.

---

## P1 — High Value

Sangat meningkatkan kualitas project dan sebaiknya selesai setelah P0 stabil.

---

## P2 — Differentiator / Bonus

Dikerjakan hanya jika P0 dan P1 sudah aman.

---

# 3. Core Demo Journey

Seluruh implementation plan diarahkan agar scenario ini dapat berjalan:

```text
Login as Ops
    ↓
Open Client
    ↓
Create Issue
    ↓
Triage
    ↓
Assign Engineer
    ↓
Investigate
    ↓
Development
    ↓
QA
    ↓
Create / Publish Release
    ↓
Map Client Impact
    ↓
Operational Handoff
    ↓
Ops Acknowledgement
    ↓
Client Follow-up
    ↓
Close Issue
    ↓
Client Timeline Updated
```

Kalau flow ini bekerja dengan baik, kita sudah menunjukkan:

```text
Auth
RBAC
Database relationship
Workflow
Business rules
Concurrency
Audit
Cross-role collaboration
UI states
Client relationship
```

---

# 4. Development Strategy

Gunakan:

# Vertical Slice Development

Jangan membangun:

```text
semua backend
↓
baru semua frontend
↓
baru integrate
```

Preferred:

```text
Auth
BE + FE + Test
        ↓
Client
BE + FE + Test
        ↓
Issue Create
BE + FE + Test
        ↓
Issue Workflow
BE + FE + Test
```

Tujuannya agar integration problem ditemukan lebih awal.

---

# 5. Phase Overview

```text
PHASE 0
Project Bootstrap

PHASE 1
Infrastructure & Database Foundation

PHASE 2
Authentication & Security

PHASE 3
RBAC & User Management

PHASE 4
Client Management

PHASE 5
Issue Management Core

PHASE 6
Issue Workflow & SLA Visibility

PHASE 7
Feature Requests

PHASE 8
Release Management

PHASE 9
Operational Handoff

PHASE 10
Follow-up & Operational Closure

PHASE 11
Client Timeline & Dashboard

PHASE 12
Documentation

PHASE 13
Notifications & Worker

PHASE 14
Testing Hardening

PHASE 15
UI/UX Hardening

PHASE 16
Documentation & Engineering Review

PHASE 17
Bonus Engineering

PHASE 18
Final Submission
```

---

# 6. PHASE 0 — Repository Bootstrap

Priority:

```text
P0
```

Goal:

Membuat repository dapat dikembangkan dengan struktur final.

Tasks:

```text
[ ] Initialize git repository

[ ] Create backend/

[ ] Initialize Go module

[ ] Create frontend/

[ ] Initialize React + TypeScript + Vite

[ ] Configure Tailwind CSS

[ ] Add docs/

[ ] Add .gitignore

[ ] Add root .env.example

[ ] Add Makefile

[ ] Add initial README

[ ] Add docker-compose.yml skeleton

[ ] Add GitHub Actions skeleton
```

Expected tree:

```text
clientops/
├── backend/
├── frontend/
├── docs/
├── docker-compose.yml
├── Makefile
├── .env.example
└── README.md
```

Definition of Done:

```text
go build succeeds
frontend npm build succeeds
repository has clean structure
no secrets committed
```

---

# 7. PHASE 1 — Infrastructure & Database Foundation

Priority:

```text
P0
```

Goal:

Menyiapkan infrastructure lokal reproducible.

Services:

```text
PostgreSQL
Redis
MinIO
```

Tasks:

```text
[ ] PostgreSQL Docker service

[ ] Redis Docker service

[ ] MinIO Docker service

[ ] Backend config loader

[ ] PostgreSQL connection

[ ] Redis connection

[ ] MinIO client

[ ] /health endpoint

[ ] /ready endpoint

[ ] Database migration tooling

[ ] make migrate-up

[ ] make migrate-down
```

Backend:

```text
pkg/config
pkg/database
pkg/logger
```

Initial migration:

```text
extensions
users
roles
permissions
```

Definition of Done:

```text
docker compose up works

backend connects to PostgreSQL

migration from empty DB succeeds

rollback succeeds

health endpoint works

ready endpoint detects DB status
```

---

# 8. PHASE 2 — Authentication & Security

Priority:

```text
P0 — VERY HIGH
```

Authentication & Security memiliki bobot 15% dan requirement cukup spesifik.

Implement:

```text
Login
Logout
/me
Refresh
Session expiry
HttpOnly cookies
CSRF protection
```

Database:

```text
auth_sessions
```

Tasks Backend:

```text
[ ] Password hashing

[ ] Login service

[ ] JWT access token

[ ] Refresh token

[ ] Refresh token hashing

[ ] Auth session persistence

[ ] Refresh rotation

[ ] Logout session revoke

[ ] Current user endpoint

[ ] Authentication middleware

[ ] CSRF middleware

[ ] Auth rate limiting

[ ] Secure cookie configuration
```

Tasks Frontend:

```text
[ ] Login page

[ ] Auth bootstrap

[ ] Protected routes

[ ] Axios withCredentials

[ ] Axios interceptor

[ ] Refresh single-flight

[ ] Logout

[ ] Session expired handling
```

Required interceptor behaviour:

```text
401 → refresh / logout

403 → permission feedback

422 → validation feedback

429 → rate-limit feedback

500 → generic error
```

Assessment memang meminta mekanisme interceptor tersebut dan memperingatkan duplicate refresh, race condition, serta infinite retry.

Tests:

```text
[ ] login success

[ ] invalid credentials

[ ] protected route without auth

[ ] refresh success

[ ] revoked refresh rejected

[ ] logout invalidates session

[ ] CSRF rejected

[ ] multiple refresh handling frontend
```

Definition of Done:

```text
No auth token in localStorage

No auth token in sessionStorage

HttpOnly cookie works

Refresh rotation works

CSRF works

Concurrent refresh safe
```

---

# 9. PHASE 3 — RBAC & User Management

Priority:

```text
P0
```

Tasks:

```text
[ ] roles migration

[ ] permissions migration

[ ] user_roles

[ ] role_permissions

[ ] system seed permissions

[ ] system seed roles

[ ] permission middleware

[ ] resource policy foundation

[ ] user listing

[ ] create user

[ ] update user

[ ] assign roles
```

Default roles:

```text
SUPER_ADMIN
OPS_MANAGER
OPS_STAFF
PRODUCT
ENGINEER
```

Frontend:

```text
[ ] User management page

[ ] Role management page

[ ] Permission matrix

[ ] Sidebar permission filtering

[ ] RequirePermission route component
```

Backend remains authority, sesuai requirement authorization assessment.

Tests:

```text
[ ] unauthorized permission → 403

[ ] frontend hidden menu

[ ] direct backend request still rejected

[ ] role permission mapping
```

---

# 10. PHASE 4 — Client Management

Priority:

```text
P0
```

Database:

```text
clients
client_contacts
client_owners
```

Backend:

```text
[ ] create client

[ ] client listing

[ ] client detail

[ ] update client

[ ] archive client

[ ] contacts

[ ] primary owner assignment

[ ] primary owner replacement
```

Business rule:

```text
ACTIVE client
→ exactly one active PRIMARY Ops owner
```

Frontend:

```text
[ ] Client List

[ ] Search

[ ] Filter

[ ] Sort

[ ] Pagination

[ ] Client Detail

[ ] Client form

[ ] Contacts section

[ ] Owner section
```

Listing harus memenuhi requirement search/filter/sorting/pagination.

Tests:

```text
[ ] duplicate code rejected

[ ] duplicate slug rejected

[ ] active client cannot lose primary owner

[ ] ownership permission scope
```

---

# 11. PHASE 5 — Issue Management Core

Priority:

```text
P0 — CORE PRODUCT
```

Database:

```text
issues
issue_status_histories
issue_comments
```

Backend:

```text
[ ] issue number generation

[ ] create issue

[ ] issue listing

[ ] issue detail

[ ] edit permitted fields

[ ] status history

[ ] comments

[ ] optimistic locking
```

Frontend:

```text
[ ] Issue List

[ ] New Issue

[ ] Issue Detail

[ ] Severity Badge

[ ] Status Badge

[ ] Client context

[ ] Assignee context

[ ] Comments

[ ] History
```

Tests:

```text
[ ] issue creation

[ ] invalid client rejected

[ ] optimistic version conflict

[ ] issue number uniqueness
```

---

# 12. PHASE 6 — Issue Workflow & SLA Visibility

Priority:

```text
P0 — CORE DIFFERENTIATOR
```

Implement state machine:

```text
REPORTED
→ TRIAGED
→ INVESTIGATING
→ IN_DEVELOPMENT
→ QA
→ RELEASED
→ FOLLOW_UP
→ CLOSED
```

Backend actions:

```text
[ ] triage

[ ] assign

[ ] start investigation

[ ] start development

[ ] mark QA

[ ] QA failed

[ ] mark released

[ ] start follow-up

[ ] close

[ ] reopen
```

State transition tests are mandatory.

Examples:

```text
REPORTED → TRIAGED        ✓

REPORTED → CLOSED         ✕

QA → RELEASED
without release           ✕

FOLLOW_UP → CLOSED
without completed follow-up ✕
```

Assessment secara eksplisit meminta business workflow dan rule di backend.

---

# 13. Work State

Database:

```text
issue_work_states
```

Implement:

```text
ACTIVE
WAITING_CLIENT
WAITING_OPS
WAITING_PRODUCT
WAITING_ENGINEERING
WAITING_RELEASE
BLOCKED
```

Frontend:

```text
Current Work State
Time Breakdown
Workflow Stepper
```

This is one of ClientOps's critical product differentiators.

Definition of Done:

Ops melihat:

```text
Current Stage
Current Owner
Current Waiting State
Elapsed Time
```

tanpa bertanya kepada Engineer.

---

# 14. SLA

Database:

```text
sla_policies
```

Implement:

```text
LOW
MEDIUM
HIGH
CRITICAL
```

MVP:

```text
first response target
resolution target
```

Frontend:

```text
On Track
Due Soon
Breached
```

Do not overbuild business-hours calendar initially unless time allows.

---

# 15. PHASE 7 — Feature Requests

Priority:

```text
P1
```

Database:

```text
feature_requests
feature_request_clients
```

Core:

```text
[ ] create feature request

[ ] feature request list

[ ] detail

[ ] add another requesting client

[ ] review

[ ] accept

[ ] reject

[ ] duplicate

[ ] planned
```

Important innovation:

```text
1 capability
N requesting schools
```

Frontend must emphasize:

```text
Demand count
Oldest request
Requesting clients
```

rather than only displaying ticket status.

---

# 16. PHASE 8 — Release Management

Priority:

```text
P0
```

Database:

```text
releases
release_items
release_item_issues
release_item_feature_requests
release_impacts
```

Core:

```text
[ ] create release

[ ] add release item

[ ] associate issues

[ ] define client impact

[ ] ready

[ ] publish
```

Business rule:

```text
Issue cannot become RELEASED
without valid published/associated release according to final rule.
```

Frontend:

```text
[ ] Release List

[ ] Release Detail

[ ] Add Release Item

[ ] Client Impact

[ ] Publish Confirmation
```

---

# 17. PHASE 9 — Operational Handoff

Priority:

```text
P0 — PRIMARY DIFFERENTIATOR
```

Database:

```text
operational_handoffs
```

On release publish:

```text
Affected Client
      ↓
Handoff Created
      ↓
Assigned Ops Owner
```

Core:

```text
[ ] pending handoff

[ ] acknowledgement

[ ] follow-up required state

[ ] completion
```

Frontend:

```text
[ ] Handoff List

[ ] Handoff Detail

[ ] Pending counter

[ ] Acknowledge action
```

Demo message:

> Release is technically complete, but this client still requires operational handoff.

---

# 18. PHASE 10 — Follow-up & Operational Closure

Priority:

```text
P0
```

Database:

```text
client_follow_ups
```

Core:

```text
[ ] create follow-up

[ ] start follow-up

[ ] complete follow-up

[ ] overdue detection

[ ] result logging
```

Business rule:

```text
if handoff.requires_follow_up == true

handoff cannot complete
until follow-up completed
```

Issue:

```text
FOLLOW_UP
→ CLOSED
```

only after business criteria satisfied.

This completes:

# Technical Completion → Operational Completion

---

# 19. PHASE 11 — Client Timeline

Priority:

```text
P1
```

Database:

```text
client_activities
```

Generate from:

```text
issue created
issue transitioned
request submitted
release published
handoff acknowledged
follow-up completed
```

Frontend:

```text
Client Detail
→ Timeline
```

Purpose:

One chronological source of relationship history.

---

# 20. Dashboard

Priority:

```text
P1
```

Implement:

```text
Open Issues
Critical Issues
SLA Breached
Pending Handoffs
Pending Follow-ups
```

Additionally:

```text
Issue Status Distribution
Waiting Time Breakdown
Top Feature Demand
```

Every dashboard metric should link to actionable listing where appropriate.

Example:

```text
SLA Breached: 4
↓ click
/issues?sla=breached
```

---

# 21. PHASE 12 — Living Documentation

Priority:

```text
P1
```

Database:

```text
documentations
```

Core:

```text
DRAFT
→ IN_REVIEW
→ PUBLISHED
```

Implement:

```text
[ ] documentation list

[ ] detail

[ ] create

[ ] edit

[ ] review

[ ] publish
```

Frontend should look more like a knowledge base than CRUD table.

This directly answers the real problem of minimal internal documentation.

---

# 22. Documentation Integration

Connect documentation to:

```text
feature
release
```

At minimum.

Show documentation from release/handoff context so Ops doesn't have to ask IT how a feature works.

---

# 23. PHASE 13 — Notifications & Worker

Priority:

```text
P1
```

Assessment lists Redis/RabbitMQ background worker as bonus.

Use Redis.

Jobs:

```text
release published
→ notify Ops

issue assigned
→ notify Engineer

follow-up approaching
→ notify Ops

SLA approaching
→ notify responsible role
```

Worker:

```text
backend/cmd/worker
```

Frontend:

```text
notification bell
unread count
notification list
```

---

# 24. Queue Failure

Implement minimum:

```text
retry
structured error log
failed job handling
```

Document future:

```text
Transactional Outbox
```

Do not implement outbox unless P0/P1 are fully done.

---

# 25. PHASE 14 — Testing Hardening

Priority:

```text
P0
```

Testing is only 5%, but weak tests would undermine claims about architecture/business logic.

Backend Unit:

Focus heavily on business rules.

```text
Issue transitions
Handoff completion
Client owner
Feature request duplicate
Release publish
```

---

# 26. Backend Integration Tests

Important:

```text
Auth
RBAC
Issue Create
Issue Transition
Optimistic Lock
Release Publish
Handoff
Follow-up
```

Use real PostgreSQL test environment.

---

# 27. Frontend Component Tests

Priority components:

```text
IssueWorkflowStepper
IssueForm
Permission guards
Error mapping
Handoff actions
```

---

# 28. E2E

At least one critical E2E flow if time allows:

```text
Login
→ Create Issue
→ Progress Workflow
→ Release
→ Handoff
→ Follow-up
→ Close
```

This is a strong bonus because the assessment explicitly cites critical-flow E2E as advanced testing.

---

# 29. PHASE 15 — UI/UX Hardening

Priority:

```text
P0
```

UI/UX is 15%. Do not leave this until 30 minutes before submission.

Every important page must handle:

```text
Loading
Empty
Error
Success
Disabled
Responsive
```

Assessment explicitly requires these states.

---

# 30. UX Checklist

For forms:

```text
[ ] Label

[ ] Inline error

[ ] Required indication

[ ] Submit loading

[ ] Disabled during submit

[ ] Success feedback

[ ] Server validation mapped
```

For destructive/high-impact:

```text
[ ] confirmation dialog
```

For listing:

```text
[ ] loading skeleton

[ ] empty state

[ ] error state

[ ] pagination

[ ] responsive behaviour
```

---

# 31. Responsive Review

Validate:

```text
Desktop
Tablet
Mobile
```

Do not merely rely on Tailwind classes without testing actual layouts.

Key screens:

```text
Dashboard
Issue List
Issue Detail
Client Detail
Handoff
```

---

# 32. PHASE 16 — Documentation & Engineering Review

Priority:

```text
P0
```

README must contain all items requested by assessment, including overview, problem, target user, architecture, DB design, installation, testing, technical decisions, trade-offs, and future improvements.

Prepare:

```text
[ ] README

[ ] OpenAPI

[ ] Architecture docs

[ ] Database docs

[ ] Product/business docs

[ ] Trade-offs

[ ] Future improvements

[ ] Demo scenario
```

---

# 33. OpenAPI

Priority:

```text
P0
```

Document all implemented APIs:

```text
method
path
auth
permission
request
query
response
error
examples
```

The assessment explicitly requires API documentation to be usable by other developers.

---

# 34. Technical Decision Record

Create:

```text
docs/architecture/technical-decisions.md
```

Include:

```text
Why modular monolith
Why PostgreSQL
Why Redis
Why not RabbitMQ
Why cookie auth
Why refresh session
Why CSRF mechanism
Why optimistic locking
Why MinIO
Why explicit workflow endpoint
```

This prepares the interview discussion.

---

# 35. PHASE 17 — Bonus Engineering

Priority:

```text
P2
```

Only start after P0 and P1 are stable.

Recommended order:

## Bonus 1 — Audit Trail

Actually close to P1 because valuable.

```text
who
what
before
after
when
request ID
```

---

## Bonus 2 — MinIO Attachments

Assessment bonus explicitly values external/object storage rather than local filesystem.

Implement:

```text
Issue screenshot
PDF
```

Do not overbuild media library.

---

## Bonus 3 — Client Health

Deterministic:

```text
0–100
HEALTHY
ATTENTION
AT_RISK
```

Factors visible.

No AI required.

---

## Bonus 4 — CI/CD

GitHub Actions:

```text
Backend lint
Backend test
Frontend lint
Frontend test
Build
Migration verification
```

---

## Bonus 5 — Observability

```text
Structured logging
Request ID
Health
Readiness
Metrics optional
```

---

# 36. Features We Explicitly Do Not Prioritize

Do not implement early:

```text
AI chatbot
WebSocket realtime
Kafka
Microservices
Kubernetes
Elasticsearch
Full client portal
School achievement system
Subscription billing
Full analytics engine
```

These are future vision.

---

# 37. MVP Cut Line

If deadline becomes tight, the absolute minimum complete product is:

```text
Auth
RBAC
Clients
Issues
Issue workflow
Releases
Release impact
Operational handoff
Follow-up
Audit
Core UI
Tests
Docs
```

Feature Requests and Knowledge can be simplified if necessary, but should ideally remain because they directly reflect discovered business problems.

---

# 38. P0 Checklist

```text
[ ] Repository bootstrap

[ ] Docker local environment

[ ] PostgreSQL

[ ] Explicit migrations

[ ] Auth

[ ] CSRF

[ ] Refresh concurrency

[ ] RBAC

[ ] Users

[ ] Clients

[ ] Issues

[ ] Issue workflow

[ ] Optimistic locking

[ ] Releases

[ ] Release impact

[ ] Operational handoff

[ ] Follow-up

[ ] Operational closure

[ ] Search/filter/sort/pagination

[ ] Error handling

[ ] Required UI states

[ ] Backend tests

[ ] OpenAPI

[ ] README
```

---

# 39. P1 Checklist

```text
[ ] Feature Requests

[ ] Multi-client demand

[ ] Work state time breakdown

[ ] SLA

[ ] Client Timeline

[ ] Documentation

[ ] Notification

[ ] Worker

[ ] Dashboard analytics

[ ] Audit log UI
```

---

# 40. P2 Checklist

```text
[ ] MinIO attachments

[ ] Client Health

[ ] Auth session management UI

[ ] E2E full flow

[ ] CI/CD

[ ] Metrics

[ ] Advanced caching

[ ] Transactional Outbox

[ ] Email notifications
```

---

# 41. Suggested Milestone Groups

For GitHub milestones/issues:

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

# 42. M0 — Bootstrap

Expected output:

```text
repository runnable
frontend starts
backend starts
CI skeleton
documentation tree
```

---

# 43. M1 — Platform Foundation

Expected output:

```text
PostgreSQL
Redis
MinIO
migration
config
logger
health
error handling
```

---

# 44. M2 — Security & Access

Expected output:

```text
auth
sessions
CSRF
RBAC
permissions
user management
```

---

# 45. M3 — Client Core

Expected output:

```text
clients
contacts
ownership
client listing/detail
```

---

# 46. M4 — Issue Lifecycle

Expected output:

```text
issue creation
workflow
history
work states
SLA
comments
```

---

# 47. M5 — Release & Handoff

Expected output:

```text
release
release item
impact
handoff
acknowledgement
```

---

# 48. M6 — Client Success

Expected output:

```text
follow-up
operational closure
timeline
health optional
```

---

# 49. M7 — Knowledge & Communication

Expected output:

```text
feature request
documentation
notification
worker
```

---

# 50. M8 — Quality & Testing

Expected output:

```text
backend tests
frontend tests
E2E
UI states
responsive
performance review
security review
```

---

# 51. M9 — Engineering Bonus

Expected output:

```text
MinIO
CI
metrics
cache
additional observability
```

---

# 52. M10 — Submission

Expected output:

```text
clean repository
README
API docs
working setup
demo data
zero broken critical flow
interview preparation
```

---

# 53. Demo Data Strategy

Before final UI review, create useful demo data.

Users:

```text
Admin
Ops Manager
Ops Staff
Product
Engineer
```

Clients:

```text
SMA Nusantara
SMK Digital Indonesia
SMP Harapan Bangsa
```

Issues:

```text
one investigating
one waiting client
one QA
one released
one closed
```

Feature requests:

```text
one request from 4 schools
one planned
```

Release:

```text
one published release
```

Handoffs:

```text
pending
follow-up required
completed
```

This allows every dashboard state to be visible immediately.

---

# 54. Example Demo Story

Use one coherent story rather than random seed.

Example:

```text
SMA Nusantara reports:

"Nilai siswa tidak dapat disimpan."

Ops creates:
ISS-2026-00123

Engineer investigates.

Needs sample data:
WAITING_CLIENT

Client provides data.

Development continues.

QA passes.

Fix included in:
v2.4.1

Release published.

SMA Nusantara detected as affected.

Ops receives handoff.

Ops acknowledges.

Ops contacts school.

School confirms resolution.

Issue CLOSED.
```

This story directly demonstrates why ClientOps exists.

---

# 55. Security Review Before Submission

Check:

```text
[ ] No token localStorage

[ ] Secure cookie settings documented

[ ] Password hashing

[ ] CSRF enforced

[ ] CORS explicit

[ ] Rate limit login

[ ] Refresh token hashed

[ ] Refresh rotation

[ ] Authorization backend

[ ] No SQL/internal errors exposed

[ ] File validation if upload enabled

[ ] No secret committed

[ ] Audit sanitization
```

---

# 56. Database Review Before Submission

```text
[ ] PK correct

[ ] FK correct

[ ] unique constraints

[ ] indexes justified

[ ] nullable fields intentional

[ ] rollback works

[ ] clean migration works

[ ] no AutoMigrate source-of-truth

[ ] concurrency tested
```

These directly reflect the database requirements in the assignment.

---

# 57. Frontend Review Before Submission

```text
[ ] protected routes

[ ] permission-aware nav

[ ] 401 handling

[ ] 403 handling

[ ] 422 field mapping

[ ] 429 feedback

[ ] 500 feedback

[ ] loading

[ ] empty

[ ] error

[ ] disabled

[ ] confirmation dialog

[ ] toast

[ ] desktop

[ ] tablet

[ ] mobile
```

---

# 58. Engineering Review Before Submission

Ask every dependency:

```text
Why is this here?
```

Examples:

```text
Redis
→ Queue + rate limiting

MinIO
→ Attachments need object storage

Optimistic Lock
→ Ops and Engineering may edit concurrently

Worker
→ Notification shouldn't block release publish

Composite API
→ Coherent dashboard/detail views
```

If we cannot explain a dependency, consider removing it.

---

# 59. Interview Readiness

For every major architectural decision prepare:

```text
Problem
↓
Options considered
↓
Decision
↓
Reason
↓
Trade-off
↓
Future alternative
```

Example:

```text
Why Modular Monolith?

Problem:
Need domain separation.

Option:
Microservices.

Decision:
Modular Monolith.

Reason:
Simpler deployment and transaction consistency.

Trade-off:
Shared runtime/database.

Future:
Extract services only if independent scaling becomes necessary.
```

---

# 60. The Most Important Interview Topic

Be prepared to explain:

> Why does ClientOps exist?

Answer should not start with technology.

Start with:

```text
Client reports problem
↓
Ops passes information
↓
Engineering works
↓
visibility breaks
↓
Ops perceives delay
↓
feature/fix can be technically done
but not operationally delivered
```

Then explain the product.

---

# 61. Final Implementation Principle

When deadline pressure appears, prioritize:

```text
Correctness
>
Business Flow
>
Security
>
UX
>
Documentation
>
Bonus Features
```

Do not sacrifice working core flow for five incomplete bonus capabilities.

---

# 62. Final Delivery Target

The submitted application should allow the reviewer to experience:

```text
A real business problem
        ↓
A clear domain model
        ↓
A controlled business workflow
        ↓
Secure cross-role collaboration
        ↓
A technically completed change
        ↓
An operational handoff
        ↓
Actual client follow-up
        ↓
Traceable completion
```

That is the main story ClientOps needs to tell.

---

# 63. Implementation Readiness

After this document, ClientOps has:

```text
Problem Definition             ✓

Product Foundation             ✓

Business Requirements          ✓

Database Design                ✓

API Contract                   ✓

Frontend IA                    ✓

System Architecture            ✓

Repository Structure           ✓

Implementation Plan            ✓
```

The project is now sufficiently defined to begin implementation without inventing major product decisions while coding.
