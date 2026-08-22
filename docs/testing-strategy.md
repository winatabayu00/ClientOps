# ClientOps — Testing Strategy

## 1. Purpose

Dokumen ini mendefinisikan strategi testing ClientOps agar kualitas aplikasi tidak hanya dibuktikan dari UI yang terlihat berjalan, tetapi juga dari:

* Business rules
* Authentication
* Authorization
* Database integrity
* API contract
* Concurrency handling
* Frontend interaction
* Critical end-to-end flow

Assessment mewajibkan minimal backend unit test dan frontend component test, serta menyebut integration dan E2E sebagai peningkatan yang bernilai.

---

# 2. Testing Goals

Testing ClientOps harus menjawab:

```text
Apakah business rule benar?

Apakah unauthorized action benar-benar ditolak?

Apakah workflow tidak dapat dilompati?

Apakah database tetap konsisten?

Apakah concurrent update aman?

Apakah frontend menangani error dengan benar?

Apakah critical business flow benar-benar berjalan end-to-end?
```

---

# 3. Test Pyramid

Strategi utama:

```text
                E2E
               /   \
              /     \
        Integration Tests
           /           \
          /             \
        Unit / Service Tests
```

Distribusi fokus:

```text
Unit / Service      HIGH
Integration         MEDIUM-HIGH
Frontend Component  MEDIUM
E2E                 LOW but critical
```

Kita tidak perlu membuat ratusan E2E test.

Yang paling penting adalah business logic memiliki test coverage kuat.

---

# 4. Backend Unit Tests

Tool:

```text
Go testing
+
Testify
```

Target utama:

```text
Service Layer
Domain Transition
Validation Helper
Security Helper
```

Tidak perlu unit-test framework/library internal Go secara berlebihan.

---

# 5. Business Logic Tests

Ini merupakan test paling penting ClientOps.

## Issue Workflow

Test matrix:

| From           | To             | Expected                        |
| -------------- | -------------- | ------------------------------- |
| REPORTED       | TRIAGED        | Allowed                         |
| REPORTED       | CLOSED         | Rejected                        |
| TRIAGED        | INVESTIGATING  | Allowed jika assignee ada       |
| TRIAGED        | INVESTIGATING  | Rejected tanpa assignee         |
| INVESTIGATING  | IN_DEVELOPMENT | Allowed                         |
| IN_DEVELOPMENT | QA             | Allowed                         |
| QA             | IN_DEVELOPMENT | Allowed melalui QA failed       |
| QA             | RELEASED       | Allowed dengan release          |
| QA             | RELEASED       | Rejected tanpa release          |
| RELEASED       | FOLLOW_UP      | Allowed                         |
| FOLLOW_UP      | CLOSED         | Allowed jika follow-up complete |
| FOLLOW_UP      | CLOSED         | Rejected jika follow-up pending |
| CLOSED         | REOPENED       | Allowed dengan reason           |

---

# 6. Table-Driven Workflow Tests

Go sangat cocok menggunakan table-driven test.

Concept:

```go
tests := []struct {
    name      string
    from      IssueStatus
    to        IssueStatus
    shouldErr bool
}{
    {
        name:      "reported to triaged",
        from:      IssueStatusReported,
        to:        IssueStatusTriaged,
        shouldErr: false,
    },
    {
        name:      "reported to closed",
        from:      IssueStatusReported,
        to:        IssueStatusClosed,
        shouldErr: true,
    },
}
```

Tujuan:

Semua allowed/invalid transition terlihat eksplisit.

---

# 7. Client Ownership Tests

Business rules:

```text
Active client wajib memiliki primary Ops owner.
```

Test:

```text
create active client without owner
→ rejected / requires assignment according to final flow

remove current primary owner without replacement
→ rejected

change primary owner
→ previous owner closed
→ new owner active

two active primary owners
→ rejected
```

---

# 8. Operational Handoff Tests

Test:

```text
release has affected client
→ handoff created

release has no affected client
→ no handoff

requires follow-up = true
and follow-up incomplete
→ handoff cannot complete

follow-up completed
→ handoff can complete
```

---

# 9. Feature Request Tests

Test:

```text
create feature request
→ SUBMITTED

reject without reason
→ rejected

mark duplicate without original request
→ rejected

add same client twice
→ conflict

add another client
→ demand count increases
```

---

# 10. Release Tests

Test:

```text
DRAFT → READY
→ allowed if requirements satisfied

DRAFT → PUBLISHED directly
→ rejected if final workflow requires READY

publish
→ release status changes

publish
→ impacts generated

publish
→ handoffs generated

publish twice
→ rejected / idempotent according to final implementation
```

---

# 11. Optimistic Lock Tests

Initial:

```text
issue version = 4
```

Request A:

```text
version 4
```

succeeds:

```text
version = 5
```

Request B with stale:

```text
version 4
```

result:

```text
409 VERSION_CONFLICT
```

Test both service/repository behaviour.

---

# 12. Authentication Unit Tests

Test:

```text
password verify success
password verify failure

access token generate
access token expired

refresh token generate

refresh token hash verify

refresh rotation

revoked session rejected

expired session rejected
```

---

# 13. CSRF Tests

Test state-changing endpoint:

```text
valid auth
no CSRF
→ rejected

valid auth
invalid CSRF
→ rejected

valid auth
valid CSRF
→ accepted
```

Read-only:

```text
GET
```

tidak membutuhkan CSRF validation.

---

# 14. RBAC Tests

Test:

```text
Engineer + issue.read
→ can read issue

Engineer without client.manage
→ cannot update client

Ops Staff + issue.create
→ can create issue

Unauthorized direct backend call
→ 403
```

Hal ini penting karena assessment menegaskan authorization harus diterapkan backend, bukan hanya frontend.

---

# 15. Resource Policy Tests

RBAC saja tidak cukup.

Example:

```text
Ops A assigned to Client A.

Issue belongs Client B.
```

Jika policy membatasi ownership:

```text
Ops A GET Issue B
→ RESOURCE_ACCESS_DENIED
```

Manager:

```text
→ allowed
```

---

# 16. Repository Integration Tests

Gunakan real PostgreSQL.

Recommended:

```text
Testcontainers
```

atau database container dari test environment.

Jangan mock GORM untuk test repository.

Yang ingin kita test justru:

```text
SQL
FK
constraint
index-sensitive query behavior
transaction
locking
```

---

# 17. Migration Tests

Critical.

Test:

```text
empty database
↓
migrate up all
↓
success

migrate down
↓
success

migrate up again
↓
success
```

Assessment secara eksplisit meminta migration dapat dijalankan dari kondisi kosong dan rollback.

---

# 18. Database Constraint Tests

Test database directly:

```text
duplicate users.email
→ rejected

duplicate client.code
→ rejected

duplicate client.slug
→ rejected

invalid FK
→ rejected

duplicate feature request/client relation
→ rejected

health score > 100
→ rejected
```

---

# 19. API Integration Tests

Test route lengkap:

```text
HTTP
→ middleware
→ handler
→ service
→ repository
→ PostgreSQL
```

Important routes:

```text
POST /auth/login
POST /auth/refresh

POST /clients

POST /issues
POST /issues/:id/triage
POST /issues/:id/mark-released
POST /issues/:id/close

POST /releases/:id/publish

POST /handoffs/:id/acknowledge
POST /follow-ups/:id/complete
```

---

# 20. API Response Contract Tests

Pastikan response konsisten.

Success:

```json
{
  "success": true,
  "data": {},
  "message": "Success"
}
```

Validation:

```text
422
VALIDATION_ERROR
```

Unauthorized:

```text
401
```

Forbidden:

```text
403
```

Conflict:

```text
409
```

Rate limit:

```text
429
```

Server error:

```text
500
```

Assessment memang meminta status code dan response format konsisten.

---

# 21. Validation Tests

Test:

```text
required
string length
invalid enum
invalid UUID
invalid email
invalid numeric range
invalid date
invalid query
```

Jika attachment implemented:

```text
invalid MIME
oversized file
unsupported extension
```

Requirement validation ini eksplisit di assessment.

---

# 22. Error Sanitization Tests

Simulate database/internal error.

Response tidak boleh berisi:

```text
SQL query
table name detail
stack trace
database password
internal file path
```

Response:

```text
INTERNAL_SERVER_ERROR
request_id
```

Internal log tetap dapat menyimpan technical context yang aman.

---

# 23. Queue Tests

Jika worker sudah implemented:

Test enqueue:

```text
release publish
→ notification job exists
```

Worker:

```text
valid job
→ processed

temporary failure
→ retry

final failure
→ failed status/log
```

---

# 24. Queue Idempotency Tests

Same job processed twice:

```text
notification
```

tidak menghasilkan duplicate side effect jika design mengharuskan uniqueness.

---

# 25. MinIO Integration Tests

Jika implemented:

```text
valid PNG
→ uploaded

invalid MIME
→ rejected

oversized file
→ rejected

unauthorized resource
→ rejected

metadata
→ saved PostgreSQL
```

Tidak perlu menguji internal MinIO implementation.

---

# 26. Frontend Testing Stack

Recommended:

```text
Vitest
React Testing Library
MSW
Playwright
```

Roles:

```text
Vitest
→ test runner

React Testing Library
→ component behaviour

MSW
→ controlled API mocking

Playwright
→ E2E
```

---

# 27. Frontend Test Principle

Test dari perspektif user.

Prefer:

```text
User sees "Issue moved to QA"
```

daripada:

```text
component.state.status === ...
```

Hindari test implementation detail.

---

# 28. Authentication Frontend Tests

Test:

```text
authenticated bootstrap
→ dashboard shown

/auth/me 401
→ login shown

login success
→ protected application available

login error
→ message shown
```

---

# 29. Axios Interceptor Tests

Sangat penting karena requirement eksplisit.

## 401

Test:

```text
request gets 401
→ refresh called
→ original request retried
```

---

# 30. Concurrent 401 Test

Simulate:

```text
A → 401
B → 401
C → 401
```

Assert:

```text
refresh endpoint called exactly once
```

Then:

```text
A/B/C retried after success
```

---

# 31. Failed Refresh Test

```text
request → 401

refresh → 401
```

Expect:

```text
no infinite retry
auth state cleared
login redirect
```

Ini secara langsung menguji race/infinite retry problem yang disebut assessment.

---

# 32. 403 Test

Response:

```text
403
```

Expect:

```text
no refresh attempt
permission feedback
```

---

# 33. 422 Test

Backend:

```json
{
  "fields": {
    "title": [
      "Title is required"
    ]
  }
}
```

Frontend:

```text
inline field error appears
```

---

# 34. 429 Test

Expect:

```text
rate limit feedback
Retry-After respected where implemented
```

---

# 35. 500 Test

Expect:

```text
generic server error
request ID shown if available
```

No technical detail.

---

# 36. Reusable Component Tests

High-value components:

```text
Button
Dialog
DataTable
Pagination
FormField
EmptyState
ErrorState
```

Tidak harus memberi exhaustive test untuk setiap class/style.

Focus behavior.

---

# 37. Domain Component Tests

Higher priority:

```text
IssueWorkflowStepper

IssueTimeBreakdown

SLAIndicator

ClientHealthCard

OperationalHandoffCard

FeatureDemandSummary
```

---

# 38. Issue Workflow Stepper Tests

Given:

```text
status = IN_DEVELOPMENT
```

Expect:

```text
Reported ✓
Triaged ✓
Investigating ✓
Development active
QA pending
Released pending
```

---

# 39. Form Tests

Create Issue:

Test:

```text
empty submit
→ local validation

valid fields
→ submit

API 422
→ inline errors

submission pending
→ button disabled

success
→ feedback/navigation
```

Assessment meminta inline validation, loading submit, disabled submit, error message, dan success feedback.

---

# 40. Permission UI Tests

User without permission:

```text
Publish Release button
```

tidak tampil.

Tetapi ini hanya UX test.

Security tetap divalidasi backend integration test.

---

# 41. Loading State Tests

Page query pending:

```text
Skeleton visible
```

Success:

```text
content replaces skeleton
```

---

# 42. Empty State Tests

No handoffs:

Expected:

```text
No pending handoffs
```

bukan generic blank screen.

---

# 43. Error State Tests

API failure:

```text
ErrorState visible
Try Again action works
```

---

# 44. Responsive Testing

Automated E2E smoke sizes:

```text
desktop
tablet
mobile
```

Key routes:

```text
/dashboard
/clients/:id
/issues
/issues/:id
/handoffs
```

Tidak perlu pixel-perfect visual regression untuk MVP.

---

# 45. E2E Strategy

Tool:

```text
Playwright
```

E2E digunakan hanya pada critical flows.

Jangan mengubah seluruh test suite menjadi E2E.

---

# 46. E2E 01 — Authentication

Scenario:

```text
Open app
↓
redirect login
↓
login Ops
↓
dashboard
↓
logout
↓
login screen
```

---

# 47. E2E 02 — Issue Creation

```text
Login Ops
↓
Clients
↓
SMA Nusantara
↓
Create Issue
↓
Submit
↓
Issue appears REPORTED
```

---

# 48. E2E 03 — Core Lifecycle

Best critical E2E:

```text
Ops creates issue
        ↓
Engineer logs in
        ↓
triage
        ↓
investigation
        ↓
development
        ↓
QA
        ↓
release created/published
        ↓
Ops logs in
        ↓
handoff appears
        ↓
acknowledge
        ↓
follow-up
        ↓
close
```

---

# 49. E2E Role Handling

Potentially avoid repeated browser logout/login by using:

```text
Playwright storage states
```

per role.

Example:

```text
ops.json
engineer.json
admin.json
```

This only applies to automated test fixtures—not application auth storage design.

---

# 50. E2E Assertions

Do not only assert URL.

Verify:

```text
status text
workflow progress
handoff existence
follow-up completion
client timeline entry
```

---

# 51. Seed Data for Tests

Separate:

```text
development demo seed
```

from:

```text
test fixture
```

Tests should not depend on random manually changed demo DB.

---

# 52. Test Isolation

Each integration test should:

```text
setup known state
run test
cleanup/rollback
```

Options:

```text
transaction rollback
truncate known tables
fresh container
```

Pick strategy that keeps tests reliable and reasonably fast.

---

# 53. Time-Dependent Testing

SLA and overdue logic depends on current time.

Do not directly spread:

```go
time.Now()
```

through business logic if it prevents deterministic test.

Prefer injectable clock abstraction where useful:

```text
Clock.Now()
```

This makes tests deterministic.

---

# 54. SLA Test

Set fake current time:

```text
Reported:
08:00

Now:
10:00
```

Policy:

```text
High first response:
1 hour
```

Expected:

```text
SLA breached
```

---

# 55. Work Duration Test

Intervals:

```text
ACTIVE
08:00–09:00

WAITING_CLIENT
09:00–11:00

ACTIVE
11:00–12:00
```

Expected:

```text
active = 2h
waiting_client = 2h
elapsed = 4h
```

This is a key differentiating metric, so test it carefully.

---

# 56. Health Score Tests

If client health is implemented:

Starting:

```text
100
```

Factors:

```text
SLA breach       -15
Overdue followup -10
```

Expected:

```text
75
ATTENTION
```

Test lower/upper boundaries:

```text
< 0 → 0
>100 → 100
```

---

# 57. Audit Tests

Critical operation:

```text
Issue status change
```

Expect:

```text
audit entry exists
actor correct
resource correct
before correct
after correct
```

Sensitive fields must be absent.

---

# 58. Client Timeline Tests

Issue created:

```text
ISSUE_REPORTED activity
```

Release published:

```text
RELEASE_PUBLISHED activity
```

Follow-up completed:

```text
FOLLOW_UP_COMPLETED activity
```

Order:

```text
occurred_at DESC
```

according to API contract.

---

# 59. Performance Smoke Tests

No full load test required.

But inspect major listing:

```text
clients
issues
audit
timeline
```

Check:

```text
no obvious N+1
pagination works
reasonable query count
```

Optional:

```text
EXPLAIN ANALYZE
```

for key queries.

---

# 60. Security Test Checklist

Automated where practical:

```text
[ ] protected route → 401

[ ] wrong permission → 403

[ ] invalid CSRF → reject

[ ] stale version → 409

[ ] invalid body → 422

[ ] login rate limit → 429

[ ] refresh reuse → reject

[ ] raw DB error hidden

[ ] secret not returned

[ ] unauthorized file access rejected
```

---

# 61. Backend Coverage

Do not optimize for artificial 100% coverage.

Priority:

```text
business rules
auth/security
critical service
workflow
```

A realistic high-value target:

```text
core service packages:
high coverage

simple DTO/model code:
lower concern
```

Coverage metric is supporting evidence, not target itself.

---

# 62. Frontend Coverage

Same principle.

Prioritize:

```text
forms
interceptors
workflow
permission UI
complex domain components
```

Do not write meaningless tests just to raise percentage.

---

# 63. CI Test Pipeline

Pull Request / push:

```text
Backend
├── gofmt check
├── go vet
├── lint
├── unit test
├── integration test
└── build

Frontend
├── lint
├── typecheck
├── component test
└── build
```

Optional:

```text
Playwright
```

can run on main/selected pipeline if runtime is high.

---

# 64. Migration CI

Run:

```text
fresh PostgreSQL
↓
migrate up
↓
migrate down
↓
migrate up
```

This gives strong proof that migration requirements are satisfied.

---

# 65. API Documentation Validation

If OpenAPI tooling supports:

```text
schema validation
```

run in CI.

At minimum ensure `openapi.yaml` is valid.

---

# 66. Test Naming Standard

Backend:

```text
Test<Service>_<Action>_<Scenario>
```

Example:

```text
TestIssueService_CloseIssue_Success

TestIssueService_CloseIssue_FollowUpIncomplete

TestIssueService_MarkReleased_ReleaseMissing
```

Frontend:

```text
describe("IssueWorkflowStepper")
```

with user behaviour-focused cases.

---

# 67. Test Data Naming

Use clear values.

Good:

```text
SMA Nusantara
Ops Sarah
Engineer John
ISS-2026-000123
```

Better than:

```text
foo
bar
abc
```

because failed test output remains understandable.

---

# 68. Do Not Mock What We Need To Prove

Do not mock:

```text
PostgreSQL constraint
```

when testing repository integrity.

Do not mock:

```text
Gin middleware chain
```

when testing API authorization.

Do mock:

```text
repository
```

when testing pure service business rules.

Choose the correct test boundary.

---

# 69. Critical Regression Suite

Before submission, always run:

```text
Auth
RBAC
Issue workflow
Release
Handoff
Follow-up
Optimistic lock
Migration
```

These are the flows that must never regress.

---

# 70. Manual Exploratory Testing

Automated tests cannot cover every UX issue.

Perform manual session as:

```text
Admin
Ops
Engineer
Product
```

Questions:

```text
Can I understand where issue is?

Can I accidentally perform forbidden action?

Does an error explain what happened?

Does mobile layout remain usable?

Does a release clearly create operational responsibility?
```

---

# 71. Browser Review

Minimum:

```text
Chrome
```

Optional:

```text
Firefox
Safari
```

Since project uses standard React/Tailwind, extensive browser matrix is unnecessary for the take-home.

---

# 72. Final Test Commands

Root:

```bash
make backend-test
make frontend-test
make test
```

Optional:

```bash
make test-e2e
make test-integration
```

Reviewer should not need to know internal command details.

---

# 73. Definition of Test Complete

P0 is test-ready when:

```text
[ ] Business state transition tests exist

[ ] Auth tests exist

[ ] RBAC backend tests exist

[ ] API integration tests cover core path

[ ] Migration is tested

[ ] Optimistic locking is tested

[ ] Axios 401 refresh flow is tested

[ ] 422 form mapping is tested

[ ] Important components have tests

[ ] At least one critical E2E exists if schedule permits

[ ] All tests reproducibly pass
```

---

# 74. Testing Philosophy

ClientOps should not be tested as a collection of CRUD screens.

It should be tested as a **business process**.

The most important assertion is not:

> `PATCH /issues/:id returned 200`.

It is:

> **An issue cannot be considered operationally complete until the required technical and client-facing workflow has actually been completed.**

Testing exists to prove that this rule remains true even when different roles, concurrent updates, invalid requests, and failure conditions are involved.
