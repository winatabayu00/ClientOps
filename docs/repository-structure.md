# ClientOps — Repository Structure & Coding Standards

## 1. Purpose

Dokumen ini mendefinisikan struktur repository final ClientOps dan standar implementasi agar:

* Frontend dan backend tetap memiliki boundary yang jelas.
* Reviewer mudah memahami repository.
* Semua developer menggunakan pola yang konsisten.
* Migration, testing, documentation, worker, dan infrastructure memiliki lokasi yang jelas.
* Root repository dapat digunakan sebagai entry point utama development.
* Implementasi tetap sejalan dengan requirement take-home test.

Repository menggunakan model:

> **Single Repository / Monorepo sederhana**

dengan frontend dan backend terpisah secara directory.

---

# 2. Root Repository

Nama repository:

```text
clientops
```

Struktur utama:

```text
clientops/
├── backend/
├── frontend/
├── docs/
├── scripts/
├── docker/
├── .github/
├── .env.example
├── .gitignore
├── docker-compose.yml
├── Makefile
├── README.md
└── LICENSE
```

`LICENSE` optional jika project hanya digunakan untuk assessment/internal.

---

# 3. Full Repository Tree

```text
clientops/
│
├── backend/
│   ├── cmd/
│   │   ├── api/
│   │   │   └── main.go
│   │   │
│   │   └── worker/
│   │       └── main.go
│   │
│   ├── internal/
│   │   ├── auth/
│   │   │   ├── handler.go
│   │   │   ├── service.go
│   │   │   ├── repository.go
│   │   │   ├── model.go
│   │   │   ├── dto.go
│   │   │   ├── validator.go
│   │   │   ├── routes.go
│   │   │   ├── errors.go
│   │   │   └── service_test.go
│   │   │
│   │   ├── users/
│   │   ├── rbac/
│   │   ├── clients/
│   │   ├── issues/
│   │   ├── feature_requests/
│   │   ├── releases/
│   │   ├── handoffs/
│   │   ├── followups/
│   │   ├── documentation/
│   │   ├── notifications/
│   │   ├── audit/
│   │   └── dashboard/
│   │
│   ├── pkg/
│   │   ├── config/
│   │   ├── database/
│   │   ├── logger/
│   │   ├── middleware/
│   │   ├── response/
│   │   ├── validator/
│   │   ├── errors/
│   │   ├── security/
│   │   ├── storage/
│   │   ├── queue/
│   │   └── pagination/
│   │
│   ├── migrations/
│   │   ├── 000001_create_users.up.sql
│   │   ├── 000001_create_users.down.sql
│   │   ├── 000002_create_rbac.up.sql
│   │   ├── 000002_create_rbac.down.sql
│   │   └── ...
│   │
│   ├── seeds/
│   │   ├── permissions.go
│   │   ├── roles.go
│   │   └── admin.go
│   │
│   ├── tests/
│   │   ├── integration/
│   │   ├── fixtures/
│   │   └── helpers/
│   │
│   ├── go.mod
│   ├── go.sum
│   ├── Dockerfile
│   └── .golangci.yml
│
├── frontend/
│   ├── public/
│   │
│   ├── src/
│   │   ├── app/
│   │   │   ├── layouts/
│   │   │   ├── providers/
│   │   │   ├── router/
│   │   │   └── guards/
│   │   │
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   └── shared/
│   │   │
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   ├── clients/
│   │   │   ├── issues/
│   │   │   ├── feature-requests/
│   │   │   ├── releases/
│   │   │   ├── handoffs/
│   │   │   ├── follow-ups/
│   │   │   ├── documentation/
│   │   │   ├── notifications/
│   │   │   └── management/
│   │   │
│   │   ├── hooks/
│   │   ├── lib/
│   │   │   ├── axios/
│   │   │   ├── query/
│   │   │   ├── validation/
│   │   │   └── utils/
│   │   │
│   │   ├── types/
│   │   ├── styles/
│   │   ├── main.tsx
│   │   └── vite-env.d.ts
│   │
│   ├── tests/
│   │   └── e2e/
│   │
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── eslint.config.js
│   ├── Dockerfile
│   └── .env.example
│
├── docs/
│   ├── assignment/
│   │   └── take-home-test-specification.md
│   │
│   ├── product/
│   │   ├── product-foundation.md
│   │   ├── business-requirements.md
│   │   └── scope.md
│   │
│   ├── architecture/
│   │   ├── system-architecture.md
│   │   ├── frontend-information-architecture.md
│   │   └── technical-decisions.md
│   │
│   ├── database/
│   │   └── database-design.md
│   │
│   ├── api/
│   │   └── openapi.yaml
│   │
│   └── interview/
│       └── technical-decisions.md
│
├── scripts/
│   ├── wait-for-postgres.sh
│   └── setup-local.sh
│
├── docker/
│   ├── postgres/
│   └── minio/
│
├── .github/
│   └── workflows/
│       ├── backend.yml
│       ├── frontend.yml
│       └── ci.yml
│
├── .env.example
├── .gitignore
├── docker-compose.yml
├── Makefile
└── README.md
```

---

# 4. Repository Ownership

## `/backend`

Semua backend runtime:

```text
REST API
business logic
database access
worker
auth
RBAC
migrations
backend tests
```

---

## `/frontend`

Semua browser application:

```text
React
routes
UI
forms
query state
Axios integration
component tests
E2E entry
```

---

## `/docs`

Semua design dan engineering documentation.

Dokumentasi bukan sekadar pelengkap README.

Dokumentasi menjadi evidence bahwa keputusan teknis dibuat secara sadar.

---

# 5. Backend Module Standard

Default module structure:

```text
internal/issues/
├── handler.go
├── service.go
├── repository.go
├── model.go
├── dto.go
├── validator.go
├── routes.go
├── errors.go
├── transition.go
└── service_test.go
```

Namun:

> Jangan membuat file kosong hanya demi mengikuti template.

Jika sebuah module tidak membutuhkan `transition.go`, file tersebut tidak perlu dibuat.

---

# 6. `model.go`

Berisi persistence model GORM.

Contoh conceptual:

```go
type Issue struct {
    ID        uuid.UUID
    ClientID  uuid.UUID
    Title     string
    Status    IssueStatus
    Version   int
    CreatedAt time.Time
    UpdatedAt time.Time
}
```

Model database tidak langsung digunakan sebagai HTTP response.

---

# 7. `dto.go`

Berisi request dan response DTO.

Contoh:

```go
type CreateIssueRequest struct {
    ClientID    string `json:"client_id"`
    Title       string `json:"title"`
    Description string `json:"description"`
    Severity    string `json:"severity"`
}
```

Response DTO dapat berbeda dari model.

Tujuan:

```text
Database Model
≠
API Contract
```

---

# 8. Why Model Must Not Become API Contract

Jika frontend menerima GORM model secara langsung:

```text
database schema change
→ API accidentally changes
```

Selain itu dapat mengekspos field internal seperti:

```text
password_hash
internal foreign key
deleted_at
version metadata
```

Gunakan explicit response mapper.

---

# 9. `handler.go`

Handler bertanggung jawab:

```text
HTTP parsing
DTO binding
request validation trigger
service invocation
response mapping
```

Handler tidak bertanggung jawab:

```text
business workflow
database query
permission-specific domain logic
```

---

# 10. `service.go`

Service merupakan pusat business use case.

Naming berdasarkan intent:

Good:

```text
CreateIssue
TriageIssue
AssignIssue
StartInvestigation
MarkIssueReleased
CloseIssue
```

Kurang baik:

```text
UpdateIssueStatus
UpdateIssue
ProcessIssue
```

Business intent harus terlihat dari function name.

---

# 11. `repository.go`

Recommended pattern:

```go
type IssueRepository interface {
    FindByID(ctx context.Context, id uuid.UUID) (*Issue, error)
    Create(ctx context.Context, issue *Issue) error
    UpdateWithVersion(
        ctx context.Context,
        issue *Issue,
        expectedVersion int,
    ) error
}
```

Implementation dapat berada di file yang sama untuk module sederhana atau:

```text
repository.go
repository_gorm.go
```

jika separation membantu.

---

# 12. Repository Naming

Avoid:

```text
GetData()
SaveData()
UpdateData()
```

Use domain language:

```text
FindByID
FindByNumber
List
Create
UpdateWithVersion
FindPendingHandoffs
```

---

# 13. `validator.go`

Structural validation:

```text
required
length
UUID
enum
format
range
```

Business validation tetap di service.

Contoh:

```text
severity valid enum
```

boleh validator.

Tetapi:

```text
QA cannot transition to RELEASED without release
```

harus service/domain rule.

---

# 14. `errors.go`

Module-specific error constants:

```text
ErrIssueNotFound
ErrInvalidTransition
ErrAssigneeRequired
ErrVersionConflict
```

Error nanti dipetakan centralized error handler menjadi API error code.

---

# 15. Domain Types

Jangan menggunakan raw string untuk semua status jika typed enum membantu.

Contoh:

```go
type IssueStatus string
```

Constants:

```go
const (
    IssueStatusReported       IssueStatus = "REPORTED"
    IssueStatusTriaged        IssueStatus = "TRIAGED"
    IssueStatusInvestigating  IssueStatus = "INVESTIGATING"
)
```

Benefits:

```text
less typo
discoverability
clear domain vocabulary
```

---

# 16. Status Transition

Jangan menyebar validation:

```text
if status == ...
```

ke banyak file.

Centralize transition rule:

```text
transition.go
```

Concept:

```text
CanTransition(from, to)
```

atau domain-specific transition functions.

---

# 17. Cross-Module Dependencies

Module boleh bergantung pada capability module lain melalui service/interface yang jelas.

Contoh:

```text
releases
   ↓
handoffs service
```

Tidak:

```text
release service
directly updates operational_handoffs table
```

melalui GORM secara langsung.

Module harus menghormati ownership data.

---

# 18. Database Ownership

Conceptual ownership:

```text
issues module
→ issues
→ issue_status_histories
→ issue_work_states

releases module
→ releases
→ release_items
→ release_impacts

handoffs module
→ operational_handoffs
```

Module lain tidak boleh sembarang memodifikasi tabel tersebut.

---

# 19. Shared Packages

`backend/pkg/` hanya untuk capability generik.

Good:

```text
database
logger
response
pagination
security
storage
queue
```

Bad:

```text
pkg/issues
pkg/clients
pkg/business
```

Domain-specific capability tetap di `internal/`.

---

# 20. Avoid "utils" Dumping Ground

Backend jangan membuat:

```text
pkg/utils/
```

berisi puluhan unrelated functions.

Gunakan package berdasarkan responsibility.

Contoh:

```text
security/password.go
pagination/query.go
response/json.go
```

---

# 21. Context Usage

Semua repository/service yang berhubungan dengan request menerima:

```go
context.Context
```

Contoh:

```go
func (s *IssueService) Create(
    ctx context.Context,
    req CreateIssueInput,
) (*Issue, error)
```

Context bukan disimpan sebagai field global.

---

# 22. Constructor Dependency Injection

Gunakan constructor injection.

```text
main
↓
database
↓
repository
↓
service
↓
handler
```

Contoh:

```go
issueRepo := issues.NewRepository(db)

issueService := issues.NewService(
    issueRepo,
    auditService,
    activityService,
)

issueHandler := issues.NewHandler(issueService)
```

Tidak membutuhkan DI framework.

---

# 23. Backend Configuration

Package:

```text
pkg/config
```

Load configuration satu kali saat startup.

Concept:

```go
type Config struct {
    App      AppConfig
    Database DatabaseConfig
    Redis    RedisConfig
    MinIO    MinIOConfig
    Auth     AuthConfig
}
```

Fail fast jika required environment variable hilang.

---

# 24. Environment Files

Root:

```text
.env.example
```

Optional:

```text
backend/.env.example
frontend/.env.example
```

Tetapi usahakan root `.env.example` menjadi entry utama Docker Compose.

---

# 25. Environment Naming

Gunakan konsisten:

```text
APP_ENV
APP_PORT

POSTGRES_HOST
POSTGRES_PORT
POSTGRES_DB
POSTGRES_USER
POSTGRES_PASSWORD

REDIS_ADDR

MINIO_ENDPOINT
MINIO_ACCESS_KEY
MINIO_SECRET_KEY
MINIO_BUCKET

JWT_ACCESS_SECRET
JWT_REFRESH_SECRET

FRONTEND_ORIGIN
```

---

# 26. No Secret Defaults in Production

Development defaults boleh digunakan pada Docker Compose lokal.

Tetapi production config harus require explicit secrets.

README harus menjelaskan perbedaan.

---

# 27. Migration Naming Convention

```text
<number>_<description>.up.sql
<number>_<description>.down.sql
```

Example:

```text
000001_create_users.up.sql
000001_create_users.down.sql

000002_create_roles_permissions.up.sql
000002_create_roles_permissions.down.sql
```

---

# 28. Migration Rule

Migration yang sudah masuk shared branch dan digunakan jangan diedit sembarangan.

Jika schema berubah:

```text
new migration
```

bukan edit history.

---

# 29. Migration Responsibilities

Migration harus mencakup:

```text
table
constraint
index
FK
enum/check
extension if required
```

Jangan bergantung pada GORM `AutoMigrate`.

---

# 30. Seed Strategy

Seed hanya untuk initial required data:

```text
permissions
system roles
development admin
optional demo data
```

Pisahkan:

```text
system seed
```

dengan:

```text
demo seed
```

---

# 31. Demo Data

Untuk take-home, demo dataset sangat membantu.

Example:

```text
3 clients
5 users
multiple roles
10 issues
3 feature requests
2 releases
several handoffs
```

Tujuannya agar reviewer tidak membuka dashboard kosong.

---

# 32. Demo Credentials

README dapat menyediakan **development-only demo account**.

Misalnya:

```text
admin@example.local
ops@example.local
engineer@example.local
```

Credential hanya untuk local demo environment.

Tidak digunakan production.

---

# 33. Backend Response Helper

Centralized package:

```text
pkg/response
```

Functions conceptual:

```text
Success
Created
Paginated
NoContent
Error
```

Jangan masing-masing handler membangun envelope dengan format berbeda.

---

# 34. Error Mapping

Centralized:

```text
domain/application error
        ↓
error mapper
        ↓
HTTP status + API error code
```

Example:

```text
ErrInvalidTransition
→ 409
→ INVALID_STATUS_TRANSITION
```

---

# 35. Logging Convention

Gunakan structured fields.

Good:

```text
logger.Error(
  "failed to publish release",
  "release_id", releaseID,
  "request_id", requestID,
  "error", err,
)
```

Jangan:

```text
fmt.Println("ERROR HERE BRO", err)
```

---

# 36. Go Formatting

Wajib:

```bash
gofmt
```

Recommended:

```text
go vet
golangci-lint
```

---

# 37. Go Naming

Follow Go conventions.

Package:

```text
issues
feature_requests
```

Untuk Go package, lebih baik:

```text
featurerequests
```

atau short meaningful package name jika underscore tidak idiomatic.

Directory bisa:

```text
feature_requests/
```

dengan:

```go
package featurerequests
```

---

# 38. Go Interfaces

Jangan membuat interface untuk setiap struct tanpa kebutuhan.

Interface digunakan terutama di consumer boundary.

Misalnya service membutuhkan repository contract.

Jangan:

```text
InterfaceFactoryManagerProvider
```

hanya karena ingin terlihat clean architecture.

---

# 39. Go Error Wrapping

Internal error dapat di-wrap:

```go
fmt.Errorf("find issue: %w", err)
```

tetapi public error tetap disanitasi.

Gunakan `errors.Is` / `errors.As` untuk classification.

---

# 40. Frontend Feature-Based Architecture

Frontend bukan:

```text
components/
pages/
services/
```

dengan ratusan unrelated files.

Primary organization:

```text
features/
```

berdasarkan domain.

---

# 41. Frontend Feature Structure

Contoh:

```text
features/issues/
├── api/
├── components/
├── hooks/
├── pages/
├── schemas/
├── types/
└── utils/
```

Hanya buat subfolder yang memang dibutuhkan.

---

# 42. UI Components vs Domain Components

## Generic UI

```text
components/ui/button.tsx
components/ui/input.tsx
components/ui/dialog.tsx
```

## Shared Application

```text
components/shared/page-header.tsx
components/shared/data-table.tsx
```

## Domain Specific

```text
features/issues/components/issue-workflow-stepper.tsx
```

Jangan memindahkan domain component ke generic UI hanya karena digunakan dua kali.

---

# 43. TypeScript Strictness

Enable:

```text
strict: true
```

Hindari:

```text
any
```

kecuali unavoidable external boundary dan dijelaskan.

---

# 44. API Types

API response types harus explicit.

Example:

```ts
export interface Issue {
  id: string;
  issueNumber: string;
  title: string;
  severity: IssueSeverity;
  status: IssueStatus;
}
```

---

# 45. Naming Convention Frontend

Files:

```text
kebab-case.ts
kebab-case.tsx
```

Components:

```text
PascalCase
```

Functions/variables:

```text
camelCase
```

Types:

```text
PascalCase
```

Constants:

```text
UPPER_SNAKE_CASE
```

untuk true constants jika relevan.

---

# 46. Query Hooks

Example:

```text
useClients
useClient
useIssues
useIssue
```

Mutation:

```text
useCreateIssue
useTriageIssue
usePublishRelease
```

Business intent tetap terlihat.

---

# 47. Axios Structure

```text
lib/axios/
├── client.ts
├── interceptors.ts
└── errors.ts
```

Feature API functions menggunakan shared client.

---

# 48. Direct Axios Rule

Tidak diperbolehkan:

```tsx
useEffect(() => {
  axios.get(...)
}, [])
```

di page/component biasa.

Use:

```text
feature API layer
+
TanStack Query
```

---

# 49. Form Validation

Schema diletakkan di feature:

```text
features/issues/schemas/create-issue.schema.ts
```

Example:

```text
Zod
```

Validation message diselaraskan dengan backend tetapi frontend bukan source of truth.

---

# 50. API Error Type

Frontend harus memiliki normalized error type:

```text
ApiError
```

Concept:

```ts
interface ApiError {
  code: string;
  message: string;
  fields?: Record<string, string[]>;
  requestId?: string;
}
```

Interceptor/adapter melakukan normalization.

---

# 51. Date Handling

Backend mengirim ISO 8601.

Example:

```text
2026-08-22T14:30:00Z
```

Frontend bertanggung jawab terhadap display timezone.

Jangan kirim formatted string:

```text
22 Agustus 2026 jam 14:30
```

sebagai API contract.

---

# 52. Enum Handling

Backend values:

```text
IN_DEVELOPMENT
WAITING_CLIENT
CRITICAL
```

Frontend display mapper:

```text
IN_DEVELOPMENT
→ In Development
```

Jangan menggantungkan business values pada display text.

---

# 53. Route Guards

Frontend:

```text
RequireAuth
RequirePermission
```

Contoh:

```tsx
<RequirePermission permission="user.manage">
  <UsersPage />
</RequirePermission>
```

Tetapi backend tetap authority.

---

# 54. Feature Flags

Tidak perlu feature flag framework untuk MVP.

Future jika diperlukan:

```text
simple configuration-based flags
```

Hindari menambah platform feature flag tanpa use case.

---

# 55. Testing Placement Backend

Unit:

```text
internal/issues/service_test.go
```

Integration:

```text
backend/tests/integration/
```

Fixture/helper:

```text
backend/tests/helpers/
```

---

# 56. Testing Naming

Go:

```text
TestIssueService_CloseIssue
TestIssueService_CloseIssue_InvalidTransition
```

Table-driven tests sangat cocok untuk transition matrix.

---

# 57. State Transition Tests

Example cases:

```text
REPORTED → TRIAGED       allowed
REPORTED → CLOSED        rejected
QA → RELEASED            allowed with release
QA → RELEASED            rejected without release
FOLLOW_UP → CLOSED       allowed if follow-up complete
```

Ini adalah test dengan value terbesar untuk domain kita.

---

# 58. Frontend Test Placement

Component tests dekat feature/component atau dalam file:

```text
*.test.tsx
```

E2E:

```text
frontend/tests/e2e/
```

---

# 59. Critical E2E

Minimal satu flow:

```text
login
→ create issue
→ progress issue
→ publish release
→ acknowledge handoff
→ complete follow-up
→ close issue
```

Jika full multi-role E2E terlalu panjang, dapat dipisah menjadi beberapa scenario.

---

# 60. Git Branch Convention

Untuk take-home individual project cukup:

```text
main
feature/<name>
fix/<name>
docs/<name>
```

Example:

```text
feature/auth
feature/issues
feature/release-handoff
fix/refresh-race
docs/architecture
```

---

# 61. Commit Convention

Recommended Conventional Commits:

```text
feat:
fix:
refactor:
test:
docs:
chore:
ci:
```

Example:

```text
feat(issue): add workflow transition service
```

---

# 62. Commit Quality

Hindari:

```text
update
fix again
wip 2
final final
```

Commit history ikut menunjukkan engineering practice.

Git & Engineering Practice memang termasuk area penilaian assessment.

---

# 63. Pull Request

Walaupun project individual, optional menggunakan PR untuk major milestone.

Benefit:

```text
self-review
clean history
demonstrate engineering practice
```

Tidak wajib jika memperlambat delivery.

---

# 64. Makefile

Root `Makefile` menjadi command interface utama.

Recommended:

```text
make setup
make up
make down
make restart

make migrate-up
make migrate-down
make migrate-version

make seed

make backend-test
make frontend-test
make test

make backend-lint
make frontend-lint
make lint

make build
```

---

# 65. `make setup`

Concept:

```text
copy env if missing
install dependencies if local mode
start infrastructure
run migration
seed development data
```

Jangan membuat setup terlalu magic sampai reviewer tidak tahu apa yang terjadi.

---

# 66. Docker Compose Service Naming

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
```

Service names sederhana dan predictable.

---

# 67. Docker Network

Satu internal application network cukup untuk MVP.

Jangan membuat kompleks network topology tanpa kebutuhan.

---

# 68. Docker Volumes

Persistent:

```text
postgres_data
minio_data
redis_data [optional]
```

Redis persistence tidak wajib jika hanya cache/queue sederhana, tergantung reliability choice.

---

# 69. Docker Health Checks

Recommended:

```text
postgres
redis
minio
backend
```

Backend dapat menggunakan `/health`.

Compose dependency sebaiknya mempertimbangkan readiness, bukan hanya container started.

---

# 70. Backend Dockerfile

Gunakan multi-stage build.

Concept:

```text
builder
↓
compile Go binary
↓
minimal runtime
```

Jangan membawa Go toolchain penuh ke runtime image tanpa alasan.

---

# 71. Frontend Dockerfile

Development dapat menggunakan Vite.

Production build:

```text
npm build
↓
static assets
↓
serve with nginx or appropriate web server
```

Untuk take-home, production-like Docker setup menjadi bonus yang baik.

---

# 72. Root README

README menjadi starting point reviewer.

Struktur:

```text
ClientOps
├── Overview
├── Problem
├── Product Idea
├── Demo Accounts
├── Tech Stack
├── Architecture
├── Repository Structure
├── Requirements
├── Quick Start
├── Environment
├── Migration
├── Seed
├── Running Tests
├── API Docs
├── Business Flow
├── Security Decisions
├── Technical Decisions
├── Trade-offs
├── Future Improvements
└── Screenshots
```

Ini sesuai dengan requirement README yang cukup detail dari assessment.

---

# 73. Documentation Linking

README jangan menduplikasi seluruh docs.

Gunakan:

```text
Architecture → docs/architecture/system-architecture.md
Database → docs/database/database-design.md
API → docs/api/openapi.yaml
Business Rules → docs/product/business-requirements.md
```

---

# 74. Source of Truth

Tentukan jelas.

```text
Business rules
→ docs/product/business-requirements.md + backend service tests

Database schema
→ migrations/

API contract
→ OpenAPI

Implementation behaviour
→ code + tests

Setup
→ README + Makefile
```

Hindari dua source of truth yang sering tidak sinkron.

---

# 75. OpenAPI Source

Preferred:

```text
docs/api/openapi.yaml
```

Jika Swagger generation tool digunakan dari annotations, generated spec dapat menjadi artifact.

Yang penting reviewer dapat melihat API secara konsisten.

---

# 76. API Documentation Route

Example:

```text
http://localhost:8080/api/docs
```

README memberikan link.

---

# 77. No Generated Files in Git Where Unnecessary

Jangan commit:

```text
node_modules
dist
binary executable
coverage temporary
.env
IDE-specific large state
```

---

# 78. `.gitignore`

Minimal:

```text
.env
.env.local

node_modules/
dist/

coverage/

*.log

.DS_Store

backend/bin/
```

Tetapi:

```text
.env.example
```

wajib commit.

---

# 79. IDE Files

Tidak harus melarang semua.

Shared IDE config hanya commit jika memang memberi value project.

Default:

```text
.idea/
.vscode/
```

ignore, kecuali ada alasan jelas.

---

# 80. Linting

Backend:

```text
gofmt
go vet
golangci-lint
```

Frontend:

```text
ESLint
TypeScript check
```

Optional formatting:

```text
Prettier
```

Jika digunakan, commit configuration.

---

# 81. CI Required Checks

Recommended:

```text
backend:
  format/lint
  test
  build

frontend:
  lint
  typecheck
  test
  build
```

Integration:

```text
migration test
```

---

# 82. No Warnings-as-Normal Strategy

CI ideally gagal untuk:

```text
type errors
test failures
lint error
build error
```

Tidak perlu menjadikan semua stylistic warning fatal jika menghambat tanpa value.

---

# 83. Dependency Policy

Gunakan dependency eksternal jika:

```text
solves meaningful problem
mature enough
reduces implementation risk
```

Jangan install library untuk satu helper trivial.

---

# 84. Dependency Documentation

Major dependency perlu dapat dijelaskan saat interview.

Contoh:

```text
TanStack Query
→ server state/cache

React Hook Form
→ form state

Zod
→ frontend schema validation

golang-migrate
→ explicit migration

Redis
→ queue + rate limit

MinIO
→ object storage
```

---

# 85. Avoid Over-Abstraction Early

Jangan membuat:

```text
BaseRepository[T]
BaseService[T]
GenericCrudHandler[T]
```

untuk semua domain.

Alasannya:

ClientOps bukan generic CRUD framework.

Issue workflow berbeda dari:

```text
client update
release publish
handoff completion
```

Abstraction dilakukan setelah duplication benar-benar terlihat.

---

# 86. Business Language in Code

Gunakan vocabulary product.

Good:

```text
OperationalHandoff
ClientFollowUp
FeatureDemand
IssueWorkState
```

Avoid generic:

```text
ProcessData
TaskRecord
EntityStatus
```

Domain language membuat code lebih mudah dipahami reviewer.

---

# 87. Comment Policy

Komentar menjelaskan:

```text
why
trade-off
non-obvious behaviour
security consideration
```

Bukan mengulang code.

Bad:

```go
// increment version
version++
```

Good:

```text
// Version is checked to prevent silent lost updates when Ops
// and Engineering modify the same issue concurrently.
```

---

# 88. TODO Policy

Jangan meninggalkan banyak:

```text
TODO implement later
FIXME
hack
```

di final submission.

Future improvement masuk dokumentasi, bukan source code placeholder.

---

# 89. Error Message Language

API user-facing messages:

```text
English
```

agar konsisten.

UI juga sebaiknya memilih satu language secara konsisten.

Untuk take-home profesional, saya menyarankan:

```text
English UI
```

meskipun domain Indonesia.

README dapat English atau bilingual.

---

# 90. Data Fixtures

Fixtures harus deterministic.

Contoh:

```text
known client IDs not necessarily fixed UUID
but predictable relationships
```

Seeder harus idempotent jika memungkinkan.

Menjalankan seed dua kali tidak membuat duplicate system roles/permissions.

---

# 91. System Role Protection

System role:

```text
SUPER_ADMIN
OPS_MANAGER
OPS_STAFF
PRODUCT
ENGINEER
```

dapat ditandai:

```text
is_system = true
```

User tidak boleh menghapus system role sembarangan.

Custom role future dapat didukung.

---

# 92. Permission Seeding

Permission code merupakan system vocabulary.

Seed examples:

```text
client.read
client.create
issue.read
issue.create
issue.triage
release.publish
handoff.acknowledge
```

Jangan membuat permission otomatis dari frontend menu.

---

# 93. Status Source

Status enum harus didefinisikan jelas backend.

Frontend dapat mirror generated/manual union types.

Future improvement:

```text
generate TypeScript API types from OpenAPI
```

tetapi tidak wajib MVP.

---

# 94. API Client Generation

Untuk take-home, manual typed client cukup.

Jika menggunakan OpenAPI codegen:

```text
document reason
```

Jangan menambah complexity hanya untuk terlihat sophisticated.

---

# 95. Feature Implementation Sequence

Ketika coding suatu feature:

```text
1. Business rule
2. Migration
3. Repository
4. Service
5. Service tests
6. Handler/API
7. Integration test
8. Frontend API
9. Frontend UI
10. E2E where critical
11. Documentation
```

Tidak selalu harus benar-benar serial, tetapi ini menjadi preferred flow.

---

# 96. Vertical Slice Principle

Lebih baik menyelesaikan:

```text
Create Issue
→ DB
→ API
→ UI
→ test
```

end-to-end,

daripada:

```text
buat semua table
buat semua handler
buat semua UI
baru integrate terakhir
```

Vertical slice mengurangi integration surprise.

---

# 97. Definition of Done per Feature

Sebuah feature dianggap selesai jika:

```text
business rules implemented
backend authorization
validation
migration if needed
API documented
unit/integration test
frontend loading state
frontend error state
frontend empty state if relevant
form validation
responsive behaviour
audit event if critical
```

---

# 98. Example: Issue Create Definition of Done

```text
✓ migration exists
✓ POST /issues works
✓ permission enforced
✓ client existence validated
✓ request validated
✓ issue number generated safely
✓ audit/client activity created
✓ unit test
✓ integration test
✓ create form
✓ loading/error/success UX
✓ issue appears in list
```

---

# 99. Example: Release Publish Definition of Done

```text
✓ only READY release can publish
✓ affected clients resolved
✓ release impacts stored
✓ handoffs created
✓ transaction used
✓ audit created
✓ notifications queued
✓ duplicate publish prevented
✓ confirmation dialog
✓ loading state
✓ integration tests
```

---

# 100. Reviewer Experience Goal

Reviewer seharusnya dapat melakukan:

```text
git clone
↓
read README
↓
copy env
↓
docker compose up
↓
migrate
↓
seed
↓
open frontend
↓
login
↓
test core business flow
↓
open Swagger
↓
run tests
```

tanpa harus bertanya kepada developer.

---

# 101. Repository Quality Checklist

Sebelum submission:

```text
[ ] README complete
[ ] .env.example complete
[ ] no secrets committed
[ ] docker compose works
[ ] clean database can migrate
[ ] migration rollback works
[ ] seed works
[ ] frontend builds
[ ] backend builds
[ ] backend tests pass
[ ] frontend tests pass
[ ] API docs available
[ ] no obvious TODO/stub
[ ] no dead major code
[ ] no broken route
[ ] demo credentials work
[ ] core workflow demo works
```

---

# 102. Final Repository Principle

Repository ClientOps harus terasa seperti **satu product**, meskipun memiliki dua application codebases:

```text
clientops
├── backend
└── frontend
```

Frontend dan backend tetap memiliki ownership masing-masing, tetapi repository root menyediakan:

```text
setup
infrastructure
documentation
commands
assessment context
```

Prinsip:

> **A reviewer should understand how the system is designed, how to run it, and why it was built this way without needing hidden context from the developer.**
