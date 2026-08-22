# ClientOps — System Architecture

## 1. Purpose

Dokumen ini mendefinisikan arsitektur teknis ClientOps, meliputi:

* System boundaries
* Frontend / backend interaction
* Authentication flow
* Authorization flow
* Database access
* Background worker
* Queue
* File storage
* Transaction boundaries
* Error handling
* Caching
* Observability
* Deployment topology
* Scalability considerations
* Technical trade-off

Arsitektur utama:

> **Modular Monolith + Background Worker**

Bukan microservices.

---

# 2. Architecture Goals

Arsitektur ClientOps harus:

* Mudah dipahami.
* Mudah dijalankan reviewer.
* Maintainable.
* Testable.
* Memiliki boundary domain yang jelas.
* Mendukung transaction consistency.
* Tidak over-engineered.
* Dapat berkembang menjadi sistem lebih besar jika kebutuhan muncul.

---

# 3. High-Level Architecture

```text
                         USER
                           │
                           ▼
                ┌────────────────────┐
                │     Frontend       │
                │ React + TypeScript │
                │ Vite + Tailwind    │
                └─────────┬──────────┘
                          │
                    HTTPS / REST
                    Cookies + CSRF
                          │
                          ▼
                ┌────────────────────┐
                │      Go API        │
                │ Gin + GORM         │
                │ Modular Monolith   │
                └───────┬──┬──┬─────┘
                        │  │  │
             ┌──────────┘  │  └───────────┐
             ▼             ▼              ▼
        PostgreSQL       Redis          MinIO
             │             │              │
             │             │              │
             │             ▼              │
             │        ┌──────────┐         │
             └───────►│  Worker  │◄────────┘
                      │    Go    │
                      └──────────┘
```

---

# 4. Technology Stack

## Frontend

```text
React
TypeScript
Vite
Tailwind CSS
React Router
TanStack Query
React Hook Form
Zod
Axios
```

## Backend

```text
Go
Gin
GORM
```

## Database

```text
PostgreSQL
```

## Migration

```text
golang-migrate
```

## Background Processing

```text
Redis
Go Worker
```

## Object Storage

```text
MinIO
```

## API Documentation

```text
OpenAPI
Swagger UI
```

## Infrastructure

```text
Docker Compose
```

---

# 5. Why Modular Monolith

ClientOps memiliki beberapa domain:

```text
Auth
Users
RBAC
Clients
Issues
Feature Requests
Releases
Handoffs
Follow-ups
Documentation
Notifications
Audit
```

Domain tersebut cukup kompleks untuk membutuhkan modular boundaries, tetapi belum membutuhkan independent deployment.

Karena itu digunakan:

```text
MODULAR MONOLITH
```

---

# 6. Why Not Microservices

Microservices akan menambahkan:

```text
network calls
distributed transactions
service discovery
independent deployment
distributed tracing
message delivery complexity
schema ownership complexity
failure modes
```

Tanpa kebutuhan bisnis yang membenarkan kompleksitas tersebut.

Untuk MVP:

```text
one API deployment
one database
one worker
```

lebih tepat.

---

# 7. Modular Boundaries

Backend:

```text
internal/
│
├── auth/
├── users/
├── rbac/
├── clients/
├── issues/
├── feature_requests/
├── releases/
├── handoffs/
├── followups/
├── documentation/
├── notifications/
├── audit/
└── dashboard/
```

Setiap module memiliki ownership terhadap:

```text
HTTP handler
service
repository
domain rules
DTO
model
validation
```

---

# 8. Module Internal Structure

Contoh:

```text
internal/issues/
│
├── handler.go
├── service.go
├── repository.go
├── model.go
├── dto.go
├── validator.go
├── errors.go
├── routes.go
└── transition.go
```

Tidak semua module harus memiliki file identik jika tidak diperlukan.

---

# 9. Layer Responsibilities

Flow utama:

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

# 10. Handler Layer

Handler bertanggung jawab terhadap:

* Read HTTP input
* Parse parameter
* Bind request DTO
* Call validator
* Call service
* Convert service result menjadi API response

Handler **tidak boleh memiliki core business rule**.

Contoh yang salah:

```text
Handler:

if issue.status == "QA" {
    issue.status = "RELEASED"
}
```

Yang benar:

```text
Handler
 ↓
IssueService.MarkReleased(...)
```

---

# 11. Service Layer

Service merupakan tempat utama business orchestration.

Contoh:

```text
IssueService.MarkReleased()
```

bertanggung jawab terhadap:

```text
load issue
verify version
validate state transition
validate release
apply state
create history
create activity
create audit
commit transaction
dispatch post-commit event
```

---

# 12. Repository Layer

Repository bertanggung jawab terhadap persistence.

Contoh:

```text
IssueRepository
```

Capabilities:

```text
FindByID
List
Create
Update
UpdateWithVersion
CreateStatusHistory
```

Repository tidak menentukan:

```text
apakah QA boleh menjadi RELEASED
```

Itu domain/service responsibility.

---

# 13. GORM Usage

GORM digunakan untuk:

* Query construction
* Model mapping
* Relationships
* Transactions
* Optimistic update

Tetapi GORM model bukan source of truth schema.

Source of truth:

```text
migrations/
```

---

# 14. Request Flow

Normal authenticated request:

```text
Browser
   │
   ▼
HTTP Request
   │
   ▼
Request ID Middleware
   │
   ▼
Logger Middleware
   │
   ▼
CORS
   │
   ▼
Authentication
   │
   ▼
CSRF [state-changing requests]
   │
   ▼
Authorization
   │
   ▼
Validation
   │
   ▼
Handler
   │
   ▼
Service
   │
   ▼
Repository
   │
   ▼
PostgreSQL
   │
   ▼
Response
```

---

# 15. Middleware Order

Recommended order:

```text
Recovery
   ↓
Request ID
   ↓
Structured Logger
   ↓
Security Headers
   ↓
CORS
   ↓
Rate Limiter
   ↓
Authentication
   ↓
CSRF
   ↓
Authorization
   ↓
Handler
```

Exact middleware dapat berbeda per route.

---

# 16. Public Routes

Contoh:

```text
POST /api/v1/auth/login
POST /api/v1/auth/refresh
GET  /health
GET  /ready
```

Tetap dapat memiliki:

```text
request ID
logging
rate limiting
security headers
```

---

# 17. Authentication Architecture

ClientOps menggunakan:

```text
short-lived access token
+
rotating refresh token
+
HttpOnly cookies
+
server-side refresh session tracking
```

---

# 18. Authentication Flow

## Login

```text
Browser
   │
POST /auth/login
   │
   ▼
Validate credentials
   │
   ▼
Create auth session
   │
   ▼
Generate:
access token
refresh token
   │
   ▼
Hash refresh token
   │
   ▼
Store session
   │
   ▼
Set HttpOnly cookies
   │
   ▼
Authenticated
```

---

# 19. Cookie Strategy

Example production configuration:

```text
HttpOnly = true
Secure   = true
SameSite = Lax
Path     = /
```

Access and refresh token dapat memiliki:

```text
different expiration
different cookie path
```

jika implementation membutuhkan.

---

# 20. Token Storage

Browser:

```text
HttpOnly Cookie
```

Backend database:

```text
refresh token HASH
```

Tidak menyimpan raw refresh token.

Tidak menggunakan:

```text
localStorage
sessionStorage
```

untuk authentication token.

---

# 21. Access Token

Access token:

```text
short lifetime
example: 15 minutes
```

Digunakan untuk authenticating normal API request.

Claims minimal:

```text
sub
session_id
iat
exp
```

Tidak perlu menyimpan seluruh permissions di JWT apabila permission dapat berubah selama session.

---

# 22. Permission Resolution

Recommended:

```text
access token
→ identify user/session
→ load effective permission
```

Permission dapat di-cache secara singkat jika diperlukan.

Keuntungan:

Role/permission changes dapat berlaku tanpa menunggu token sangat lama.

---

# 23. Refresh Flow

```text
API returns 401
      │
      ▼
Axios interceptor
      │
POST /auth/refresh
      │
      ▼
Validate refresh cookie
      │
Validate session
      │
Validate token hash
      │
      ▼
Rotate refresh token
      │
      ▼
New access + refresh cookie
      │
      ▼
Retry request
```

---

# 24. Concurrent Refresh

Problem:

```text
Request A → 401
Request B → 401
Request C → 401
```

Jangan:

```text
3 refresh requests
```

Frontend memiliki **single-flight refresh**:

```text
            ┌─ A waits
401 ────────┼─ B waits
            └─ C waits
                  │
                  ▼
             one refresh
                  │
             ┌────┴────┐
             ▼         ▼
          success    failure
             │         │
          retry      logout
```

Ini penting karena assessment memang menyoroti duplicate refresh dan race condition.

---

# 25. Refresh Token Rotation

Refresh token lama menjadi invalid setelah berhasil digunakan.

```text
refresh token A
      ↓
used
      ↓
rotate
      ↓
token B
```

Jika token A digunakan kembali:

```text
possible token reuse
```

Session dapat direvoke sebagai security response.

---

# 26. Logout Flow

```text
POST /auth/logout
      ↓
revoke session
      ↓
clear cookies
      ↓
204
```

Logout harus invalidasi server-side session.

Tidak hanya menghapus cookie di browser.

---

# 27. CSRF Architecture

Cookie-based auth membuat browser mengirim cookie otomatis.

Karena itu state-changing request membutuhkan CSRF protection.

Recommended MVP:

```text
Double Submit Cookie
```

Flow:

```text
CSRF token cookie
        │
        ▼
Frontend reads token
        │
        ▼
X-CSRF-Token header
        │
        ▼
Backend validates
```

Applied to:

```text
POST
PUT
PATCH
DELETE
```

---

# 28. Why CSRF and SameSite Both

`SameSite` mengurangi risiko cross-site request.

Tetapi kita tidak hanya bergantung pada satu mekanisme.

Gunakan:

```text
SameSite
+
CSRF token
```

sebagai defense-in-depth.

---

# 29. Authorization Architecture

Authorization memiliki tiga lapisan:

```text
RBAC
+
Permission
+
Resource Policy
```

Contoh:

```text
OPS_STAFF
has:
issue.read

but issue belongs to client
outside assigned responsibility

→ RESOURCE_ACCESS_DENIED
```

---

# 30. Authorization Flow

```text
Authenticated User
       ↓
Permission Middleware
       ↓
Resource Policy
       ↓
Business Service
```

Middleware dapat memverifikasi coarse permission.

Resource-level access lebih tepat diverifikasi setelah resource diketahui.

---

# 31. Authorization Example

Request:

```text
POST /issues/:id/close
```

Flow:

```text
has issue.close?
      ↓
load issue
      ↓
can user access client's issue?
      ↓
validate business transition
      ↓
close
```

---

# 32. PostgreSQL Architecture

PostgreSQL menyimpan:

```text
identity
RBAC
clients
issues
requests
releases
handoffs
follow-ups
documentation metadata
notifications
audit
sessions
```

Tidak menyimpan binary attachment.

---

# 33. Database Connection

Gunakan connection pool.

Configuration:

```text
max open connections
max idle connections
connection max lifetime
```

Nilai ditentukan environment.

Jangan hardcode production configuration.

---

# 34. Transaction Boundary

Transaction digunakan pada business operation yang mengubah beberapa record terkait.

Contoh Issue transition:

```text
BEGIN
  update issues
  insert status history
  insert client activity
  insert audit
COMMIT
```

---

# 35. Release Publish Transaction

```text
BEGIN

validate release

UPDATE release
DRAFT/READY → PUBLISHED

INSERT release_impacts

INSERT operational_handoffs

INSERT client_activities

INSERT audit_log

COMMIT
```

Setelah commit:

```text
enqueue notifications
```

---

# 36. Why Queue After Commit

Jangan kirim notification sebelum database commit.

Bad flow:

```text
send notification
↓
database transaction fails
```

User mendapat notification untuk state yang tidak pernah tersimpan.

Preferred:

```text
DB commit
↓
enqueue
```

---

# 37. Queue Architecture

Redis digunakan sebagai background job infrastructure.

Use cases:

```text
notifications
email
health recalculation
scheduled SLA checks
optional file processing
```

---

# 38. Worker Architecture

Worker berjalan sebagai executable terpisah:

```text
cmd/worker/main.go
```

Tetapi menggunakan module/service yang sama jika relevan.

Topology:

```text
API
 │
 ▼
Redis Queue
 │
 ▼
Go Worker
 │
 ├─ PostgreSQL
 └─ external delivery
```

---

# 39. Job Structure

Job minimal:

```text
type
payload
attempt
created_at
```

Contoh conceptual payload:

```json
{
  "type": "SEND_NOTIFICATION",
  "payload": {
    "notification_id": "uuid"
  }
}
```

Lebih baik queue membawa identifier daripada full mutable entity snapshot.

---

# 40. Retry Strategy

Background jobs dapat menggunakan:

```text
attempt 1
↓ fail
attempt 2
↓ fail
attempt 3
↓
failed
```

Gunakan exponential/backoff sesuai kebutuhan.

---

# 41. Failed Job Handling

Untuk MVP:

```text
structured log
+
failed status / dead-letter storage
```

Jika queue library mendukung dead queue, gunakan.

Kita harus dapat menjelaskan:

> background job failure tidak boleh mengubah business transaction yang sudah sukses menjadi ambiguous.

---

# 42. Idempotent Worker

Worker sebaiknya idempotent.

Misalnya:

```text
Send notification job retried
```

tidak seharusnya membuat:

```text
notification database record
```

berulang kali.

Gunakan unique identifier/event record sesuai kebutuhan.

---

# 43. Transactional Outbox

MVP dapat menggunakan:

```text
commit
→ enqueue
```

Tetapi ada failure window:

```text
DB commit success
application crash
queue enqueue never happens
```

Future reliability improvement:

```text
Transactional Outbox Pattern
```

Flow:

```text
BEGIN
business update
outbox event
COMMIT
      ↓
outbox worker
      ↓
Redis
```

Tidak wajib pada MVP, tetapi didokumentasikan sebagai trade-off.

---

# 44. Redis Usage

Redis tidak digunakan hanya karena tersedia.

Initial use cases:

```text
background queue
rate limiting
```

Optional:

```text
short-lived cache
```

---

# 45. Cache Strategy

Jangan cache semua endpoint.

Candidate:

```text
dashboard aggregate
permission lookup
static configuration
```

Cache hanya jika:

```text
read frequently
expensive enough
staleness acceptable
```

---

# 46. Cache Invalidation

Jika dashboard cached:

```text
issue transition
release publish
follow-up completed
```

dapat:

```text
invalidate dashboard key
```

atau gunakan short TTL.

Untuk take-home, short TTL sering lebih sederhana dan defensible.

---

# 47. Why Not Redis as Source of Truth

Business state tetap di:

```text
PostgreSQL
```

Redis adalah:

```text
ephemeral acceleration / coordination layer
```

Jika Redis hilang:

Core relational business data tetap aman.

---

# 48. MinIO Architecture

Object storage digunakan untuk:

```text
issue screenshots
PDF evidence
documentation asset
school logo
```

Metadata disimpan PostgreSQL.

File binary:

```text
MinIO
```

---

# 49. File Upload Flow

```text
Frontend
   │
multipart request
   │
   ▼
API
   │
Authenticate
Authorize
Validate
   │
   ├─ size
   ├─ MIME
   ├─ extension
   └─ resource ownership
   │
   ▼
Generate safe object key
   │
   ▼
MinIO
   │
   ▼
Save metadata PostgreSQL
```

---

# 50. File Naming Strategy

Jangan gunakan original filename sebagai storage key.

Example:

```text
issues/{issue_id}/{uuid}.png
```

Original filename tetap disimpan sebagai metadata.

---

# 51. File Access

Jangan expose bucket sebagai public.

Download flow:

```text
GET attachment
     ↓
authenticate
     ↓
authorize resource
     ↓
generate short-lived access
or proxy stream
```

---

# 52. Validation Strategy

Validation dilakukan di dua tempat.

Frontend:

```text
fast UX feedback
```

Backend:

```text
source of truth
```

Backend validation mencakup:

```text
body
query
path
enum
UUID
email
date
range
file
```

---

# 53. Domain Validation

Tidak semua validation adalah structural validation.

Contoh:

```text
status must be enum
```

adalah request/domain validation.

Tetapi:

```text
QA → RELEASED requires release reference
```

adalah business rule.

Business rule ada di service/domain layer.

---

# 54. Error Architecture

Backend memiliki centralized error model.

Concept:

```text
AppError
├── Code
├── HTTPStatus
├── Message
├── Details
└── Cause [internal only]
```

---

# 55. Error Categories

```text
ValidationError
AuthenticationError
AuthorizationError
NotFoundError
ConflictError
BusinessError
RateLimitError
InternalError
```

---

# 56. Internal Error Sanitization

Internal:

```text
pq: duplicate key value violates...
```

User:

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_CONFLICT"
  },
  "message": "Resource already exists"
}
```

Database detail hanya masuk secure log.

---

# 57. Panic Recovery

Gin recovery middleware menangkap unexpected panic.

Flow:

```text
panic
↓
recover
↓
log stack internally
↓
attach request ID
↓
500 generic response
```

Tidak expose stack trace.

---

# 58. Request ID

Setiap request memiliki:

```text
X-Request-ID
```

Jika frontend mengirim ID valid, dapat dipertahankan atau server generate baru sesuai strategy.

Log seluruh lifecycle dengan ID yang sama.

---

# 59. Structured Logging

Gunakan JSON structured logger.

Example:

```json
{
  "level": "info",
  "request_id": "req_x",
  "method": "POST",
  "path": "/api/v1/issues",
  "status": 201,
  "duration_ms": 84,
  "user_id": "uuid"
}
```

---

# 60. What Must Not Be Logged

Jangan log:

```text
password
access token
refresh token
cookie values
CSRF secret
database password
MinIO secret
full authorization header
```

---

# 61. Audit Log vs Application Log

Berbeda.

## Application Log

Untuk engineering:

```text
request
errors
performance
worker execution
```

## Audit Log

Untuk business trace:

```text
who changed what
when
from
to
```

Jangan mencampur keduanya.

---

# 62. Observability

MVP:

```text
structured logging
request ID
health check
readiness check
```

MVP+:

```text
metrics
```

Future:

```text
OpenTelemetry
distributed tracing
```

Karena modular monolith belum membutuhkan distributed trace kompleks.

---

# 63. Health Endpoint

```text
GET /health
```

Menjawab:

```text
process alive
```

Example:

```json
{
  "status": "ok"
}
```

---

# 64. Readiness Endpoint

```text
GET /ready
```

Checks:

```text
PostgreSQL connection
Redis connection [if critical]
```

Object storage dapat menjadi optional readiness dependency tergantung requirement.

---

# 65. Dashboard Query Architecture

Dashboard bukan alasan untuk N frontend requests.

Use composite read service:

```text
DashboardHandler
       ↓
DashboardService
       ↓
multiple repositories / aggregate queries
       ↓
one response
```

---

# 66. Composite API

Client detail juga dapat menggunakan composite response.

Reason:

Frontend membutuhkan:

```text
profile
owners
health
issue summary
follow-up summary
```

dalam satu initial page view.

Ini mengurangi network chatter.

Tetapi jangan membuat:

```text
one giant endpoint for entire app
```

Composite endpoint hanya untuk coherent UI aggregate.

---

# 67. N+1 Prevention

GORM associations harus digunakan dengan hati-hati.

Listing:

```text
20 issues
```

Jangan:

```text
1 query issues
20 query clients
20 query assignees
```

Gunakan:

```text
JOIN
Preload selectively
batch queries
```

dan inspect SQL.

---

# 68. Pagination

Large listing wajib server-side pagination.

Initial:

```text
offset pagination
```

cukup untuk admin dashboard.

Future untuk audit/timeline besar:

```text
cursor pagination
```

---

# 69. Search

MVP:

```text
ILIKE
+
indexed/filter fields
```

Tidak perlu Elasticsearch.

Jika kebutuhan fuzzy/full-text besar muncul:

```text
PostgreSQL FTS
pg_trgm
```

lebih dulu sebelum introducing search engine eksternal.

---

# 70. Optimistic Locking

Resource utama:

```text
issues
feature_requests
clients where needed
```

menggunakan version.

Update:

```text
WHERE id = ?
AND version = ?
```

Success:

```text
version = version + 1
```

No affected row:

```text
409 VERSION_CONFLICT
```

---

# 71. Why Optimistic Lock

Take-home domain mempunyai:

```text
Ops
Engineer
Product
```

yang dapat membuka resource yang sama.

Optimistic locking mencegah silent lost update tanpa membuat long-lived database lock.

---

# 72. Database Locking

Pessimistic lock digunakan hanya jika benar-benar diperlukan.

Misalnya business operation yang membutuhkan serial consistency.

Default:

```text
optimistic locking
+
transaction
```

---

# 73. Number Generation

Human-readable:

```text
ISS-2026-000123
FR-2026-000045
```

harus concurrency-safe.

Jangan:

```text
SELECT COUNT(*) + 1
```

Gunakan:

```text
database sequence
```

atau dedicated counter strategy.

---

# 74. Security Architecture

Defense layers:

```text
TLS
secure cookies
CSRF
CORS
RBAC
resource policies
input validation
rate limiting
password hashing
session rotation
security headers
safe file handling
structured audit
```

---

# 75. Password Hashing

Gunakan strong password hashing.

Recommended:

```text
Argon2id
```

atau bcrypt dengan cost yang sesuai.

Jangan implement cryptography sendiri.

---

# 76. Brute Force Protection

Login memiliki:

```text
rate limiting
```

Optional:

```text
per IP
+
per account identifier
```

Hindari user enumeration:

Bad:

```text
email not found
```

Preferred:

```text
invalid credentials
```

---

# 77. CORS

Development:

```text
http://localhost:<frontend-port>
```

Production:

```text
explicit configured frontend origin
```

Credentialed requests require:

```text
Allow-Credentials: true
```

Tidak menggunakan wildcard origin.

---

# 78. API Rate Limiting

Candidate:

```text
auth/login
auth/refresh
file upload
search-heavy endpoints
```

Redis token bucket/sliding window dapat digunakan.

---

# 79. Frontend State Architecture

Server state:

```text
TanStack Query
```

Local UI state:

```text
React state
```

Auth state:

```text
/auth/me
+
query/cache/context abstraction
```

Tidak menyimpan authentication token di JS state.

---

# 80. Frontend API Layer

```text
Component
    ↓
Query / Mutation Hook
    ↓
Feature API Function
    ↓
Axios Instance
    ↓
Backend
```

Components tidak melakukan direct `axios.get()`.

---

# 81. Frontend Error Boundary

Gunakan error boundary untuk unexpected render failure.

Berbeda dengan API error state.

```text
API failed
→ page error state

React rendering exception
→ Error Boundary
```

---

# 82. Background SLA Monitoring

Untuk mendeteksi:

```text
SLA approaching
SLA breached
follow-up overdue
documentation review due
```

worker dapat menjalankan scheduled jobs.

Contoh:

```text
every N minutes
↓
query eligible records
↓
create notification/event
```

Jangan schedule setiap issue menjadi timer terpisah jika tidak diperlukan.

---

# 83. Client Health Calculation

MVP:

```text
scheduled recalculation
+
event-triggered recalculation
```

Possible flow:

```text
Issue changes
   ↓
enqueue health recalculation
   ↓
worker calculates
   ↓
save health snapshot
```

Namun jika scope terlalu besar, health dapat dihitung synchronous/read-time dahulu.

---

# 84. Domain Events

Kita tidak perlu full event-driven architecture.

Tetapi service dapat menghasilkan internal domain event concept:

```text
IssueReleased
ReleasePublished
FollowUpCompleted
```

Digunakan untuk post-transaction side effects.

---

# 85. Event Handling Strategy

Initial:

```text
service
↓
commit
↓
enqueue relevant background jobs
```

Bukan external event bus.

Future:

```text
transactional outbox
```

---

# 86. Deployment Architecture

Development via Docker Compose:

```text
┌─────────────────┐
│ frontend        │
│ React/Vite      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ backend         │
│ Go API          │
└─┬──────┬──────┬─┘
  │      │      │
  ▼      ▼      ▼
postgres redis  minio
         │
         ▼
      worker
```

---

# 87. Docker Services

```text
frontend
backend
worker
postgres
redis
minio
```

Optional:

```text
minio-init
migration
```

---

# 88. Startup Flow

Preferred developer experience:

```bash
cp .env.example .env
docker compose up
```

Migration dapat:

```text
run manually with make migrate-up
```

atau dedicated migration step.

Untuk interview, explicit migration command justru lebih jelas.

---

# 89. Configuration

12-factor style environment configuration.

Example:

```text
APP_ENV
APP_PORT

DATABASE_URL

REDIS_ADDR

MINIO_ENDPOINT
MINIO_ACCESS_KEY
MINIO_SECRET_KEY

JWT_ACCESS_SECRET
JWT_REFRESH_SECRET

FRONTEND_ORIGIN
```

Tidak commit production credential.

---

# 90. Secret Management

Take-home:

```text
.env
```

local only.

Repository:

```text
.env.example
```

Production improvement:

```text
secret manager
```

---

# 91. Repository Architecture

```text
clientops/
│
├── backend/
├── frontend/
├── docs/
├── docker-compose.yml
├── .env.example
├── Makefile
└── README.md
```

---

# 92. Backend Runtime Entries

```text
backend/cmd/
├── api/
│   └── main.go
│
├── worker/
│   └── main.go
│
└── migrate/
```

API dan worker dapat share packages/modules tanpa menjadi satu process.

---

# 93. Dependency Direction

Desired:

```text
Handler
 ↓
Service
 ↓
Repository interface
 ↓
Repository implementation
```

Shared infrastructure tidak boleh mengontrol domain.

---

# 94. Avoid Global Service Locator

Jangan membuat:

```text
GlobalContainer.Get("issueService")
```

Preferred:

```text
explicit constructor dependency injection
```

Example conceptual:

```text
repo := NewIssueRepository(db)
service := NewIssueService(repo, ...)
handler := NewIssueHandler(service)
```

Mudah ditest dan dipahami.

---

# 95. Testing Architecture

## Service Test

Mock repository:

```text
IssueService
   ↓
Fake/Mock IssueRepository
```

Test business rules:

```text
REPORTED → CLOSED rejected
QA → RELEASED without release rejected
FOLLOW_UP → CLOSED with complete follow-up succeeds
```

---

# 96. Repository Integration Test

Gunakan real PostgreSQL test database/container.

Test:

```text
constraints
queries
transaction
optimistic locking
migration
```

---

# 97. API Integration Test

Flow:

```text
request
→ middleware
→ handler
→ service
→ DB
→ response
```

Important endpoints:

```text
login
issue creation
issue transitions
release publish
handoff
follow-up
```

---

# 98. Frontend Tests

Component tests:

```text
IssueWorkflowStepper
ClientHealthCard
forms
permission rendering
```

Integration:

```text
Issue detail interaction
```

E2E:

```text
login
→ create issue
→ progress workflow
→ release
→ handoff
→ follow-up
→ close
```

---

# 99. CI Architecture

GitHub Actions future/bonus:

```text
push / pull request
     ↓
backend lint
backend test
frontend lint
frontend test
build frontend
build backend
migration verification
```

Optional:

```text
docker build
```

---

# 100. Migration Validation in CI

Useful:

```text
fresh PostgreSQL
↓
migrate up
↓
migrate down selected/all
↓
migrate up again
```

Membuktikan migration reproducible.

---

# 101. Scalability Path

Jika ClientOps berkembang:

## Stage 1

```text
modular monolith
single PostgreSQL
Redis
worker
```

## Stage 2

```text
horizontal API replicas
worker replicas
managed PostgreSQL
shared Redis
object storage
```

## Stage 3

Hanya jika terbukti perlu:

```text
extract high-boundary services
```

Possible candidate:

```text
notification
file processing
analytics
```

bukan memecah domain core secara prematur.

---

# 102. Horizontal Scaling

API harus sebisa mungkin stateless.

Session state ada di:

```text
PostgreSQL
```

dan shared Redis sesuai use case.

Sehingga:

```text
API instance A
API instance B
```

dapat menangani request bergantian.

---

# 103. Database Scaling

Sebelum sharding:

```text
indexes
query optimization
connection pooling
pagination
read analysis
partitioning high-volume tables
```

Audit logs dan client activities kemungkinan tumbuh paling cepat.

---

# 104. Audit Growth

Future:

```text
partition audit_logs by time
```

Possible archival:

```text
hot recent records
cold historical records
```

Belum diperlukan MVP.

---

# 105. Failure Scenarios

Architecture harus dapat menjelaskan beberapa failure.

## PostgreSQL Down

```text
API readiness fails
business operation unavailable
```

Return:

```text
503 / 500 depending failure boundary
```

---

## Redis Down

Core API read/write yang tidak membutuhkan Redis sebaiknya tetap dapat berjalan bila desain memungkinkan.

Queue operation dapat fail/log/retry.

Jika action mengharuskan reliable enqueue, future outbox mengurangi coupling tersebut.

---

## MinIO Down

Normal issue text operation:

```text
still available
```

File upload:

```text
temporarily unavailable
```

Jangan menjadikan MinIO outage mematikan seluruh application.

---

# 106. Graceful Shutdown

Go API dan worker:

```text
SIGTERM
↓
stop accepting new work
↓
finish active requests/jobs
↓
close DB/Redis connections
↓
exit
```

Important untuk Docker/production readiness.

---

# 107. Context and Timeout

Setiap request menggunakan Go `context.Context`.

External/internal calls memiliki timeout.

Database queries menerima request context.

Jangan biarkan request menggantung tanpa batas.

---

# 108. Repository Query Timeout

Long analytics queries dapat mempunyai timeout berbeda dari standard request jika diperlukan.

MVP cukup dengan sane global/request timeout plus query optimization.

---

# 109. API Timeout

Example:

```text
normal API: reasonable timeout
upload: potentially higher controlled timeout
```

Nilai harus configurable.

---

# 110. Technical Decisions Summary

## TD-001

Use Modular Monolith.

**Reason:** domain boundaries dibutuhkan tetapi distributed deployment belum dibutuhkan.

---

## TD-002

Use PostgreSQL as system of record.

**Reason:** strong relational model, transactions, constraints, mature query capability.

---

## TD-003

Use GORM for application persistence.

**Reason:** required by assessment and simplifies standard data access.

---

## TD-004

Use explicit SQL migrations.

**Reason:** reproducibility, rollback, reviewability.

---

## TD-005

Use HttpOnly cookie-based authentication.

**Reason:** assessment requirement dan token tidak dapat dibaca JavaScript.

---

## TD-006

Use refresh session tracking + rotation.

**Reason:** revoke capability dan stronger session security.

---

## TD-007

Use CSRF protection.

**Reason:** cookie authentication requires protection against cross-site state-changing requests.

---

## TD-008

Use Redis for queue and rate limiting.

**Reason:** simple infrastructure sufficient for MVP async workloads.

---

## TD-009

Use MinIO for object storage.

**Reason:** attachment binary tidak bergantung pada local application filesystem.

---

## TD-010

Use optimistic locking.

**Reason:** prevent lost update under concurrent cross-team editing.

---

## TD-011

Use explicit workflow action endpoints.

**Reason:** business action lebih jelas daripada unrestricted status PATCH.

---

## TD-012

Separate technical completion from operational completion.

**Reason:** core business problem ClientOps.

---

# 111. Architecture Trade-Offs

## Modular Monolith

### Benefits

```text
simple deployment
simple transactions
easy local development
easy debugging
clear domain boundary
```

### Trade-off

```text
modules share one runtime/database
poor boundaries can become tightly coupled
```

Mitigation:

```text
clear module ownership
service boundaries
avoid cross-module direct table manipulation
```

---

# 112. Redis Queue Trade-Off

### Benefit

```text
low operational complexity
reuse Redis
sufficient for background jobs
```

### Trade-off

```text
less sophisticated messaging semantics than dedicated broker
```

Accepted because requirements do not require complex routing.

---

# 113. JWT + Server Session Trade-Off

Pure JWT is simpler stateless auth.

But server-side refresh session adds:

```text
revocation
device session
refresh rotation
reuse handling
```

Trade-off:

```text
extra DB access/state
```

Accepted because security is highly weighted in assessment.

---

# 114. Composite API Trade-Off

Benefits:

```text
fewer frontend requests
UI-specific aggregation
```

Trade-off:

```text
endpoint couples to page use case
```

Use only for coherent dashboard/detail reads.

---

# 115. Operational Completion Architecture

Core lifecycle:

```text
CLIENT ISSUE
    │
    ▼
OPS
    │
    ▼
ENGINEERING
    │
    ▼
TECHNICAL RELEASE
    │
    ▼
RELEASE IMPACT
    │
    ▼
OPERATIONAL HANDOFF
    │
    ▼
OPS ACKNOWLEDGEMENT
    │
    ▼
CLIENT FOLLOW-UP
    │
    ▼
OPERATIONAL COMPLETION
```

System architecture harus mempertahankan lifecycle ini sebagai first-class domain process.

---

# 116. Architecture Definition of Done

Architecture dianggap terimplementasi dengan benar apabila:

```text
1. Frontend dan backend dapat dijalankan secara reproducible.

2. Auth menggunakan secure cookie flow.

3. CSRF protection aktif.

4. Backend authorization bekerja.

5. Business transitions hanya melalui service rules.

6. PostgreSQL menjaga relational integrity.

7. Migration dapat up/down.

8. Concurrent update dapat dideteksi.

9. Release publish dapat membuat handoff secara transactional.

10. Async notification diproses worker.

11. File tidak bergantung pada local filesystem.

12. Errors tersanitasi.

13. Request dapat ditelusuri menggunakan request ID.

14. Core business flow memiliki automated tests.
```

---

# 117. Final Architecture Principle

ClientOps tidak dirancang untuk menunjukkan sebanyak mungkin teknologi.

ClientOps dirancang agar setiap teknologi memiliki alasan.

```text
PostgreSQL
→ relational integrity

Redis
→ asynchronous work + rate limiting

MinIO
→ safe object storage

Worker
→ non-blocking side effects

Optimistic locking
→ concurrent collaboration

Audit log
→ accountability

Secure session
→ authentication safety

Modular monolith
→ maintainability without distributed complexity
```

Prinsip akhirnya:

> **Architecture should be as simple as possible, but no simpler than the business problem requires.**
