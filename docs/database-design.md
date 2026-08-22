# ClientOps — Database Design & ERD

## 1. Purpose

Dokumen ini menerjemahkan business requirements ClientOps menjadi desain database relasional.

Database utama:

```text
PostgreSQL
```

ORM:

```text
GORM
```

Prinsip desain:

* Business integrity tidak hanya dijaga application layer.
* Relasi penting menggunakan foreign key.
* Constraint digunakan jika rule dapat dijaga di database.
* Historical operational data tidak mudah dihapus.
* Data yang sering dicari memiliki index yang relevan.
* Entity dipisahkan berdasarkan domain responsibility.
* Tidak melakukan premature denormalization.
* Auditability diprioritaskan untuk workflow penting.

---

# 2. Database Design Principles

## 2.1 UUID Primary Key

Entity utama menggunakan UUID.

Contoh:

```text
id UUID PRIMARY KEY
```

Keuntungan:

* Sulit ditebak dibanding sequential public ID.
* Aman untuk distributed/client-facing identifier.
* Tidak expose volume record secara langsung.
* Memudahkan future integration.

PostgreSQL dapat menggunakan:

```sql
gen_random_uuid()
```

---

## 2.2 Internal ID vs Public Identifier

Beberapa entity membutuhkan human-readable identifier.

Contoh:

```text
Issue

id:
550e8400-e29b-41d4-a716-446655440000

issue_number:
ISS-2026-000123
```

UUID digunakan untuk relational identity.

`issue_number` digunakan untuk komunikasi manusia.

Contoh:

> "Tolong cek ISS-2026-000123."

---

## 2.3 Timestamp

Mayoritas table memiliki:

```text
created_at
updated_at
```

Entity tertentu memiliki:

```text
archived_at
deleted_at
```

tetapi penggunaan soft delete tidak diterapkan secara otomatis ke semua table.

---

## 2.4 Historical Data

Entity seperti:

```text
issue_status_histories
audit_logs
client_activities
```

merupakan historical records.

Record tersebut tidak boleh berubah hanya karena state entity utama berubah.

---

# 3. Domain Overview

```text
ClientOps Database
│
├── Identity & Access
│   ├── users
│   ├── roles
│   ├── permissions
│   ├── user_roles
│   └── role_permissions
│
├── Client
│   ├── clients
│   ├── client_contacts
│   └── client_owners
│
├── Issues
│   ├── issues
│   ├── issue_status_histories
│   ├── issue_work_states
│   ├── issue_comments
│   └── issue_attachments
│
├── Feature Requests
│   ├── feature_requests
│   └── feature_request_clients
│
├── Product
│   ├── product_modules
│   ├── product_features
│   └── feature_documentations
│
├── Releases
│   ├── releases
│   ├── release_items
│   ├── release_item_issues
│   ├── release_item_feature_requests
│   └── release_impacts
│
├── Client Operations
│   ├── operational_handoffs
│   ├── client_follow_ups
│   ├── client_activities
│   └── client_health_snapshots
│
├── Platform
│   ├── notifications
│   ├── attachments
│   └── audit_logs
│
└── Configuration
    ├── sla_policies
    └── system_settings
```

---

# 4. High-Level ERD

```text
roles
  │
  │ N:M
  ▼
permissions

users
  │
  ├────────────── N:M roles
  │
  └───────────────┐
                  │
                  ▼
              client_owners
                  │
                  ▼
               clients
                  │
          ┌───────┼──────────────┐
          │       │              │
          ▼       ▼              ▼
       issues  feature_requests client_contacts
          │       │
          │       └──── N:M ─── clients
          │
          ▼
issue_status_histories

issues
  │
  └───────────────┐
                  ▼
              release_items
                  │
                  ▼
               releases
                  │
                  ▼
            release_impacts
                  │
                  ▼
               clients
                  │
                  ▼
       operational_handoffs
                  │
                  ▼
          client_follow_ups
                  │
                  ▼
          client_activities
```

---

# 5. Identity & Access Domain

## 5.1 users

Menyimpan user internal ClientOps.

```text
users
──────────────────────────────
id                  UUID PK
name                VARCHAR(150)
email               VARCHAR(255)
password_hash       TEXT
status              VARCHAR(30)
last_login_at       TIMESTAMP NULL
created_at          TIMESTAMP
updated_at          TIMESTAMP
archived_at         TIMESTAMP NULL
```

Constraint:

```text
UNIQUE(email)
```

Status:

```text
ACTIVE
INACTIVE
SUSPENDED
```

Password tidak pernah disimpan dalam plaintext.

---

# 6. roles

```text
roles
──────────────────────────────
id                  UUID PK
code                VARCHAR(100)
name                VARCHAR(150)
description         TEXT NULL
is_system           BOOLEAN
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

Constraint:

```text
UNIQUE(code)
```

Contoh:

```text
SUPER_ADMIN
OPS_MANAGER
OPS_STAFF
PRODUCT
ENGINEER
SCHOOL_USER
```

---

# 7. permissions

```text
permissions
──────────────────────────────
id                  UUID PK
code                VARCHAR(150)
name                VARCHAR(150)
description         TEXT NULL
created_at          TIMESTAMP
```

Constraint:

```text
UNIQUE(code)
```

Contoh:

```text
issue.read
issue.create
issue.assign
issue.resolve

client.read
client.update

release.publish

audit.read
```

---

# 8. user_roles

```text
user_roles
──────────────────────────────
user_id             UUID FK
role_id             UUID FK
created_at          TIMESTAMP
```

Composite constraint:

```text
PRIMARY KEY(user_id, role_id)
```

Relasi:

```text
users N:M roles
```

---

# 9. role_permissions

```text
role_permissions
──────────────────────────────
role_id             UUID FK
permission_id       UUID FK
created_at          TIMESTAMP
```

Constraint:

```text
PRIMARY KEY(role_id, permission_id)
```

Relasi:

```text
roles N:M permissions
```

---

# 10. Client Domain

## 10.1 clients

Walaupun domain bisnisnya sekolah, kita menggunakan nama `clients` di database agar domain tetap fleksibel.

```text
clients
──────────────────────────────────
id                  UUID PK
code                VARCHAR(100)
name                VARCHAR(255)
slug                VARCHAR(255)
type                VARCHAR(50)
status              VARCHAR(30)

province            VARCHAR(150) NULL
city                VARCHAR(150) NULL
address             TEXT NULL

subscription_start  DATE NULL
subscription_end    DATE NULL

created_at          TIMESTAMP
updated_at          TIMESTAMP
archived_at         TIMESTAMP NULL
```

Constraint:

```text
UNIQUE(code)
UNIQUE(slug)
```

Status:

```text
ACTIVE
ONBOARDING
INACTIVE
ARCHIVED
```

Type contoh:

```text
ELEMENTARY
JUNIOR_HIGH
SENIOR_HIGH
VOCATIONAL
OTHER
```

---

# 11. client_contacts

Satu sekolah dapat memiliki beberapa PIC.

```text
client_contacts
──────────────────────────────────
id                  UUID PK
client_id           UUID FK
name                VARCHAR(150)
position            VARCHAR(150) NULL
email               VARCHAR(255) NULL
phone               VARCHAR(50) NULL
is_primary          BOOLEAN
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

Relasi:

```text
clients 1:N client_contacts
```

Business rule:

Satu client idealnya hanya memiliki satu:

```text
is_primary = true
```

Rule ini dapat dijaga application layer atau partial unique index.

---

# 12. client_owners

Menyimpan internal responsibility terhadap client.

```text
client_owners
──────────────────────────────────
id                  UUID PK
client_id           UUID FK
user_id             UUID FK
owner_type          VARCHAR(30)
assigned_at         TIMESTAMP
unassigned_at       TIMESTAMP NULL
created_at          TIMESTAMP
```

Owner type:

```text
PRIMARY
SECONDARY
TECHNICAL
```

Relasi:

```text
clients N:M users
```

dengan metadata ownership.

Business rule:

```text
ACTIVE client
→ exactly one active PRIMARY owner
```

Partial unique index dapat digunakan:

```text
unique active primary owner per client
```

---

# 13. Issue Domain

## 13.1 issues

Ini salah satu table inti.

```text
issues
────────────────────────────────────
id                    UUID PK
issue_number          VARCHAR(50)
client_id             UUID FK

title                 VARCHAR(255)
description           TEXT

category              VARCHAR(100)
severity              VARCHAR(20)
status                VARCHAR(30)

reporter_id           UUID FK
assignee_id           UUID FK NULL

resolution_summary    TEXT NULL

reported_at           TIMESTAMP
triaged_at            TIMESTAMP NULL
resolved_at           TIMESTAMP NULL
closed_at             TIMESTAMP NULL

version               INTEGER

created_at            TIMESTAMP
updated_at            TIMESTAMP
```

Constraint:

```text
UNIQUE(issue_number)

CHECK severity IN (
  LOW,
  MEDIUM,
  HIGH,
  CRITICAL
)
```

Primary status:

```text
REPORTED
TRIAGED
INVESTIGATING
IN_DEVELOPMENT
QA
RELEASED
FOLLOW_UP
CLOSED
CANCELLED
REOPENED
```

---

# 14. Why `version` Exists

Field:

```text
version INTEGER
```

digunakan untuk optimistic locking.

Contoh:

```text
Current DB:
version = 5

Ops update:
version = 5

Engineer lebih dulu save:
version menjadi 6

Ops mencoba save:
WHERE version = 5

affected rows = 0

Result:
409 CONFLICT
```

Tujuannya mencegah lost update saat beberapa user mengubah issue secara bersamaan.

---

# 15. issue_status_histories

Setiap perubahan primary status disimpan.

```text
issue_status_histories
──────────────────────────────────
id                  UUID PK
issue_id            UUID FK
from_status         VARCHAR(30) NULL
to_status           VARCHAR(30)
changed_by          UUID FK
reason              TEXT NULL
created_at          TIMESTAMP
```

Contoh:

```text
ISS-00123

REPORTED
→ TRIAGED
by Sarah

TRIAGED
→ INVESTIGATING
by Engineer A
```

History bersifat append-only.

---

# 16. issue_work_states

Primary status tidak digunakan untuk menyimpan semua jenis waiting condition.

```text
issue_work_states
──────────────────────────────────
id                  UUID PK
issue_id            UUID FK
state               VARCHAR(50)
reason              TEXT NULL
started_at          TIMESTAMP
ended_at            TIMESTAMP NULL
created_by          UUID FK
```

State:

```text
ACTIVE
WAITING_CLIENT
WAITING_OPS
WAITING_PRODUCT
WAITING_ENGINEERING
WAITING_RELEASE
BLOCKED
```

Dari table ini kita dapat menghitung:

```text
active_duration
blocked_duration
waiting_client_duration
waiting_internal_duration
```

---

# 17. issue_comments

```text
issue_comments
──────────────────────────────────
id                  UUID PK
issue_id            UUID FK
author_id           UUID FK
body                TEXT
is_internal         BOOLEAN
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

`is_internal` disiapkan agar future client portal dapat membedakan:

```text
internal discussion
```

dengan:

```text
client-visible update
```

---

# 18. Attachment Strategy

Jangan membuat table attachment khusus untuk setiap domain jika fungsi dasarnya sama.

Gunakan:

```text
attachments
```

sebagai metadata object storage.

```text
attachments
──────────────────────────────────
id                  UUID PK
storage_provider    VARCHAR(30)
bucket              VARCHAR(150)
object_key          TEXT

original_name       VARCHAR(255)
mime_type           VARCHAR(150)
size_bytes          BIGINT

uploaded_by         UUID FK
created_at          TIMESTAMP
```

Binary:

```text
MinIO
```

Metadata:

```text
PostgreSQL
```

---

# 19. issue_attachments

Join table:

```text
issue_attachments
──────────────────────────────────
issue_id            UUID FK
attachment_id       UUID FK
created_at          TIMESTAMP
```

Constraint:

```text
PRIMARY KEY(issue_id, attachment_id)
```

---

# 20. Feature Request Domain

## 20.1 feature_requests

Feature request disimpan berdasarkan **problem/capability**, bukan satu ticket identik per client.

```text
feature_requests
────────────────────────────────────
id                    UUID PK
request_number        VARCHAR(50)

title                 VARCHAR(255)
problem_statement     TEXT
expected_outcome      TEXT

status                VARCHAR(30)
priority              VARCHAR(20) NULL

product_owner_id      UUID FK NULL

rejection_reason      TEXT NULL
duplicate_of_id       UUID FK NULL

first_requested_at    TIMESTAMP

version               INTEGER

created_at            TIMESTAMP
updated_at            TIMESTAMP
```

Status:

```text
SUBMITTED
UNDER_REVIEW
ACCEPTED
PLANNED
IN_DEVELOPMENT
RELEASED
DELIVERED

REJECTED
DUPLICATE
CANCELLED
```

Constraint:

```text
UNIQUE(request_number)
```

---

# 21. feature_request_clients

Satu capability dapat diminta banyak sekolah.

```text
feature_request_clients
────────────────────────────────────
id                    UUID PK
feature_request_id    UUID FK
client_id             UUID FK
requested_by          UUID FK
requested_at          TIMESTAMP
client_context        TEXT NULL
created_at            TIMESTAMP
```

Constraint:

```text
UNIQUE(feature_request_id, client_id)
```

Relasi:

```text
feature_requests N:M clients
```

Dengan ini kita dapat menghitung:

```text
Demand Count
Affected Clients
Oldest Request
```

tanpa membuat duplicate feature request.

---

# 22. Product Domain

## 22.1 product_modules

Contoh:

```text
Student Management
Attendance
Academic
Finance
Admission
Parent Portal
```

Schema:

```text
product_modules
────────────────────────────────
id                  UUID PK
code                VARCHAR(100)
name                VARCHAR(150)
description         TEXT NULL
status              VARCHAR(30)
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

Constraint:

```text
UNIQUE(code)
```

---

# 23. product_features

Feature yang benar-benar tersedia pada produk.

```text
product_features
────────────────────────────────
id                  UUID PK
module_id           UUID FK

code                VARCHAR(100)
name                VARCHAR(255)
description         TEXT

status              VARCHAR(30)

released_at         TIMESTAMP NULL

created_at          TIMESTAMP
updated_at          TIMESTAMP
```

Status:

```text
PLANNED
ACTIVE
DEPRECATED
RETIRED
```

---

# 24. Documentation Domain

## 24.1 documentations

Documentation dibuat generic agar tidak terbatas ke feature.

```text
documentations
──────────────────────────────────
id                  UUID PK
title               VARCHAR(255)
slug                VARCHAR(255)
summary             TEXT NULL
content             TEXT

status              VARCHAR(30)

author_id           UUID FK
reviewer_id         UUID FK NULL

published_at        TIMESTAMP NULL
last_reviewed_at    TIMESTAMP NULL
review_due_at       TIMESTAMP NULL

created_at          TIMESTAMP
updated_at          TIMESTAMP
archived_at         TIMESTAMP NULL
```

Status:

```text
DRAFT
IN_REVIEW
PUBLISHED
ARCHIVED
```

Constraint:

```text
UNIQUE(slug)
```

---

# 25. documentation_relations

Daripada membuat banyak nullable FK:

```text
feature_id
issue_id
release_id
module_id
```

kita dapat menggunakan relation table.

```text
documentation_relations
──────────────────────────────────
id                  UUID PK
documentation_id    UUID FK
entity_type         VARCHAR(50)
entity_id           UUID
created_at          TIMESTAMP
```

Entity type:

```text
PRODUCT_FEATURE
PRODUCT_MODULE
ISSUE
RELEASE
```

Catatan:

Polymorphic relation mengurangi referential integrity database.

Untuk MVP, alternatif yang lebih strict adalah menggunakan join table eksplisit:

```text
product_feature_documentations
release_documentations
```

### Decision

Untuk take-home:

> **Gunakan explicit join tables untuk entity utama.**

Alasannya:

* Relational integrity lebih kuat.
* Lebih mudah dijelaskan.
* Tidak perlu polymorphic foreign key.
* Domain relation masih sedikit.

---

# 26. product_feature_documentations

```text
product_feature_documentations
──────────────────────────────────
product_feature_id  UUID FK
documentation_id    UUID FK
```

---

# 27. Release Domain

## 27.1 releases

```text
releases
──────────────────────────────────
id                  UUID PK

version             VARCHAR(100)
title               VARCHAR(255)
summary             TEXT

status              VARCHAR(30)
release_date        TIMESTAMP NULL

created_by          UUID FK
published_by        UUID FK NULL

created_at          TIMESTAMP
updated_at          TIMESTAMP
```

Status:

```text
DRAFT
READY
PUBLISHED
CANCELLED
```

Constraint:

```text
UNIQUE(version)
```

---

# 28. release_items

Satu release memiliki banyak changes.

```text
release_items
──────────────────────────────────
id                  UUID PK
release_id          UUID FK

type                VARCHAR(30)
title               VARCHAR(255)
description         TEXT

product_feature_id  UUID FK NULL

created_at          TIMESTAMP
updated_at          TIMESTAMP
```

Type:

```text
FEATURE
BUG_FIX
IMPROVEMENT
SECURITY
```

---

# 29. release_item_issues

```text
release_item_issues
────────────────────────────────
release_item_id     UUID FK
issue_id            UUID FK
```

Constraint:

```text
PRIMARY KEY(
  release_item_id,
  issue_id
)
```

---

# 30. release_item_feature_requests

```text
release_item_feature_requests
────────────────────────────────
release_item_id         UUID FK
feature_request_id      UUID FK
```

Dengan ini:

```text
Feature Request
→ Release Item
→ Release
```

dapat ditelusuri.

---

# 31. Release Impact

## 31.1 release_impacts

Mencatat client yang terdampak suatu release.

```text
release_impacts
────────────────────────────────────
id                    UUID PK
release_id            UUID FK
client_id             UUID FK

impact_type           VARCHAR(30)
requires_follow_up    BOOLEAN

created_at            TIMESTAMP
```

Constraint:

```text
UNIQUE(release_id, client_id)
```

Impact type:

```text
DIRECT
GENERAL
OPTIONAL
```

---

# 32. Operational Handoff Domain

## 32.1 operational_handoffs

Inilah salah satu table pembeda ClientOps.

```text
operational_handoffs
────────────────────────────────────
id                    UUID PK
release_id            UUID FK
client_id             UUID FK
ops_owner_id          UUID FK

status                VARCHAR(30)

requires_follow_up    BOOLEAN

acknowledged_at       TIMESTAMP NULL
acknowledged_by       UUID FK NULL

completed_at          TIMESTAMP NULL
completed_by          UUID FK NULL

created_at            TIMESTAMP
updated_at            TIMESTAMP
```

Status:

```text
PENDING
ACKNOWLEDGED
FOLLOW_UP_REQUIRED
FOLLOWED_UP
COMPLETED
```

Constraint:

```text
UNIQUE(release_id, client_id)
```

---

# 33. Why Handoff Is Separate From Release Impact

`release_impacts` menjawab:

> Client mana yang terdampak?

Sedangkan:

`operational_handoffs` menjawab:

> Sudahkah organisasi menangani dampak tersebut?

Contoh:

```text
Release
v2.5

Affected Client
SMA ABC

Impact detected
✓

Ops aware
✓

Client informed
✗
```

Informasi ini tidak seharusnya dicampur ke satu status release.

---

# 34. Client Follow-up

## 34.1 client_follow_ups

```text
client_follow_ups
────────────────────────────────────
id                    UUID PK
client_id             UUID FK
handoff_id            UUID FK NULL
issue_id              UUID FK NULL

owner_id              UUID FK

type                  VARCHAR(50)
reason                TEXT

status                VARCHAR(30)
due_at                TIMESTAMP

started_at            TIMESTAMP NULL
completed_at          TIMESTAMP NULL
result                TEXT NULL

created_at            TIMESTAMP
updated_at            TIMESTAMP
```

Status:

```text
OPEN
IN_PROGRESS
COMPLETED
CANCELLED
```

Type:

```text
ISSUE_RESOLUTION
RELEASE_UPDATE
TRAINING
RELATIONSHIP_CHECK
OTHER
```

---

# 35. Client Timeline

Kita tidak perlu menyimpan setiap timeline sebagai manually editable text.

Gunakan normalized event table.

## client_activities

```text
client_activities
────────────────────────────────────
id                    UUID PK
client_id             UUID FK

type                  VARCHAR(100)

actor_id              UUID FK NULL

entity_type           VARCHAR(50)
entity_id             UUID

title                 VARCHAR(255)
description           TEXT NULL

metadata              JSONB NULL

occurred_at           TIMESTAMP
created_at            TIMESTAMP
```

Contoh:

```text
ISSUE_REPORTED
ISSUE_RELEASED
FEATURE_REQUESTED
RELEASE_PUBLISHED
FOLLOW_UP_COMPLETED
DOCUMENTATION_PUBLISHED
```

---

# 36. Why JSONB Only for Metadata

Core relational information jangan dimasukkan ke JSON.

Tidak:

```json
{
  "client": {},
  "issue": {},
  "assignee": {}
}
```

di satu field JSONB.

JSONB hanya digunakan untuk supplemental event metadata seperti:

```json
{
  "from_status": "QA",
  "to_status": "RELEASED"
}
```

Data penting tetap relational.

---

# 37. Client Health

## 37.1 client_health_snapshots

Kita menyimpan hasil historical calculation.

```text
client_health_snapshots
────────────────────────────────────
id                    UUID PK
client_id             UUID FK

score                 SMALLINT
classification        VARCHAR(30)

factors               JSONB

calculated_at         TIMESTAMP
created_at            TIMESTAMP
```

Constraint:

```text
CHECK score >= 0
CHECK score <= 100
```

Classification:

```text
HEALTHY
ATTENTION
AT_RISK
```

Contoh `factors`:

```json
[
  {
    "code": "SLA_BREACH",
    "impact": -15
  },
  {
    "code": "OVERDUE_FOLLOW_UP",
    "impact": -10
  }
]
```

Di sini JSONB masuk akal karena factor calculation dapat berkembang.

---

# 38. Current Client Health

Untuk MVP:

Current health tidak harus disimpan langsung di table `clients`.

Kita dapat mengambil latest:

```sql
ORDER BY calculated_at DESC
LIMIT 1
```

Jika nanti performance menjadi problem, kita bisa mempertimbangkan:

```text
clients.current_health_score
```

sebagai denormalized value.

Tetapi belum perlu sekarang.

---

# 39. SLA Configuration

## 39.1 sla_policies

```text
sla_policies
────────────────────────────────────
id                    UUID PK
severity              VARCHAR(20)

first_response_minutes INTEGER
resolution_minutes     INTEGER

is_active             BOOLEAN

created_at            TIMESTAMP
updated_at            TIMESTAMP
```

Constraint:

```text
UNIQUE(severity)
```

Tidak hardcode SLA di source code.

---

# 40. Notifications

```text
notifications
────────────────────────────────────
id                    UUID PK
user_id               UUID FK

type                  VARCHAR(100)
title                 VARCHAR(255)
message               TEXT

entity_type           VARCHAR(50) NULL
entity_id             UUID NULL

read_at               TIMESTAMP NULL

created_at            TIMESTAMP
```

Index penting:

```text
(user_id, read_at)
(user_id, created_at)
```

---

# 41. Audit Log

## audit_logs

```text
audit_logs
────────────────────────────────────
id                    UUID PK

actor_id              UUID FK NULL

action                VARCHAR(150)
resource_type         VARCHAR(100)
resource_id           UUID

before_data           JSONB NULL
after_data            JSONB NULL

request_id            VARCHAR(100) NULL
ip_address            INET NULL
user_agent            TEXT NULL

created_at            TIMESTAMP
```

Tidak memiliki:

```text
updated_at
deleted_at
```

karena audit bersifat append-only.

---

# 42. Sensitive Data in Audit

Jangan pernah log:

```text
password
password_hash
access_token
refresh_token
csrf_secret
authorization header
secret key
```

Audit serialization harus memiliki sanitization layer.

---

# 43. Authentication Sessions

Karena kita akan menggunakan cookie-based authentication dengan refresh mechanism, kita butuh server-side refresh session tracking.

## auth_sessions

```text
auth_sessions
────────────────────────────────────
id                    UUID PK
user_id               UUID FK

refresh_token_hash    TEXT

user_agent            TEXT NULL
ip_address            INET NULL

expires_at            TIMESTAMP
revoked_at            TIMESTAMP NULL
last_used_at          TIMESTAMP NULL

created_at            TIMESTAMP
```

Token asli tidak disimpan.

Yang disimpan:

```text
refresh_token_hash
```

Keuntungan:

* Logout satu device.
* Revoke session.
* Session management.
* Refresh rotation.
* Detect reuse.

---

# 44. Refresh Token Rotation

Saat refresh:

```text
Old refresh token
        ↓
Validate hash/session
        ↓
Revoke / rotate old token
        ↓
Issue new refresh token
        ↓
Update session
```

Ini memberi dasar untuk secure session handling.

---

# 45. Suggested Core Indexes

## users

```sql
UNIQUE(email)
```

## clients

```sql
UNIQUE(code)
UNIQUE(slug)
INDEX(status)
INDEX(name)
```

Untuk flexible search nanti dapat mempertimbangkan:

```text
pg_trgm
```

tetapi tidak perlu di awal.

---

## issues

```text
UNIQUE(issue_number)

INDEX(client_id)
INDEX(status)
INDEX(severity)
INDEX(assignee_id)
INDEX(reported_at)

COMPOSITE:
(client_id, status)

COMPOSITE:
(status, severity)
```

---

## issue_status_histories

```text
INDEX(issue_id, created_at)
```

---

## feature_requests

```text
UNIQUE(request_number)

INDEX(status)
INDEX(priority)
INDEX(first_requested_at)
```

---

## feature_request_clients

```text
INDEX(client_id)
INDEX(feature_request_id)
```

---

## operational_handoffs

```text
INDEX(ops_owner_id, status)
INDEX(client_id, status)
```

---

## client_follow_ups

```text
INDEX(owner_id, status)
INDEX(client_id)
INDEX(due_at, status)
```

---

# 46. Referential Delete Strategy

Kita tidak menggunakan:

```text
ON DELETE CASCADE
```

secara sembarangan.

Contoh:

Client memiliki Issue.

Jika client dihapus:

```text
Client
  ↓
Issue
  ↓
Status History
  ↓
Audit
```

historical data tidak boleh hilang.

Sehingga untuk major business entity:

```text
RESTRICT
```

atau archival lebih disukai.

Cascade hanya masuk akal untuk pure dependent mapping tertentu.

Contoh:

```text
role_permissions
```

dapat menggunakan cascade ketika role benar-benar dihapus melalui administrative process.

---

# 47. Transaction Boundaries

Beberapa operation harus atomic.

Contoh:

## Issue Transition

```text
BEGIN

validate version
validate transition

UPDATE issues

INSERT issue_status_history

INSERT client_activity

INSERT audit_log

COMMIT
```

Jika salah satu gagal:

```text
ROLLBACK
```

---

# 48. Release Publish Transaction

```text
BEGIN

release
DRAFT → PUBLISHED

generate release impacts

generate operational handoffs

insert activities

audit

COMMIT
```

Notification tidak harus dilakukan dalam DB transaction.

Setelah commit:

```text
enqueue notification job
```

---

# 49. Queue Reliability Consideration

Ada satu problem klasik:

```text
DB commit success
↓
application crash
↓
queue publish gagal
```

Data tersimpan tetapi notification tidak pernah dikirim.

Untuk MVP, kita dapat menerima simple implementation.

Tetapi secara architecture, future improvement yang tepat adalah:

# Transactional Outbox Pattern

```text
Business Transaction
        │
        ├── Update Business Data
        │
        └── Insert Outbox Event
               │
             COMMIT
               │
               ▼
            Worker
               │
               ▼
             Redis
```

Kita tidak perlu implement langsung jika waktu terbatas.

Tetapi sangat bagus menjadi documented trade-off.

---

# 50. MVP Tables

Agar scope implementasi tetap realistis, table wajib MVP:

```text
users
roles
permissions
user_roles
role_permissions

auth_sessions

clients
client_contacts
client_owners

issues
issue_status_histories
issue_work_states
issue_comments

feature_requests
feature_request_clients

releases
release_items
release_item_issues
release_item_feature_requests
release_impacts

operational_handoffs
client_follow_ups

documentations

client_activities
notifications
audit_logs

sla_policies
```

---

# 51. MVP+ Tables

Dikerjakan jika core flow sudah selesai:

```text
attachments
issue_attachments

product_modules
product_features
product_feature_documentations

client_health_snapshots
```

---

# 52. Future Tables

Belum perlu diimplementasikan:

```text
school_achievements
achievement_definitions

product_usage_metrics
client_feature_adoptions

training_sessions
training_participants

subscriptions
renewals

client_feedbacks
satisfaction_surveys
```

---

# 53. Simplified MVP ERD

```text
                    ┌─────────────┐
                    │    roles    │
                    └──────┬──────┘
                           │
                      user_roles
                           │
                    ┌──────▼──────┐
                    │    users    │
                    └──────┬──────┘
                           │
                     client_owners
                           │
                    ┌──────▼──────┐
                    │   clients   │
                    └──────┬──────┘
                           │
         ┌─────────────────┼────────────────┐
         │                 │                │
         ▼                 ▼                ▼
      issues        feature_request     contacts
         │                 │
         │           request_clients
         │                 │
         ▼                 │
 issue histories           │
         │                 │
         └───────┐         │
                 ▼         ▼
              release_items
                   │
                   ▼
               releases
                   │
                   ▼
            release_impacts
                   │
                   ▼
         operational_handoffs
                   │
                   ▼
            client_followups
                   │
                   ▼
            client_activity
```

---

# 54. Main Data Journey

Contoh satu issue:

```text
SMA ABC
   │
   ▼
clients
   │
   ▼
ISS-2026-001
   │
   ├── issue_status_histories
   ├── issue_work_states
   ├── issue_comments
   │
   ▼
release_item
   │
   ▼
v2.4.0 release
   │
   ▼
release_impact
   │
   ▼
SMA ABC affected
   │
   ▼
operational_handoff
   │
   ▼
Ops acknowledges
   │
   ▼
client_follow_up
   │
   ▼
completed
   │
   ▼
issue CLOSED
```

Inilah relational representation dari:

> **Technical completion → Operational completion**

---

# 55. Example Data

## Client

```text
CLI-001

SMA Nusantara
Status: ACTIVE
Primary Ops: Sarah
```

---

## Issue

```text
ISS-2026-000123

Client:
SMA Nusantara

Problem:
Nilai siswa tidak dapat disimpan.

Severity:
HIGH

Status:
IN_DEVELOPMENT

Assignee:
Engineer A
```

---

## Status History

```text
10:05 REPORTED
10:20 TRIAGED
10:42 INVESTIGATING
12:15 IN_DEVELOPMENT
```

---

## Work State

```text
10:42 ACTIVE
11:03 WAITING_CLIENT
11:37 ACTIVE
```

Maka sistem dapat mengetahui:

```text
Elapsed:
1h 33m

Waiting Client:
34m

Active:
59m
```

---

## Release

```text
v2.4.1

Release Item:
Fix nilai siswa tidak tersimpan.

Related Issue:
ISS-2026-000123
```

---

## Release Impact

```text
SMA Nusantara
requires_follow_up = true
```

---

## Operational Handoff

```text
Ops Owner:
Sarah

Status:
PENDING
```

---

## Follow-up

```text
Sarah informed SMA Nusantara.

Result:
Client confirmed issue resolved.
```

---

## Final State

```text
ISS-2026-000123

Technical:
RELEASED ✓

Operational:
COMPLETED ✓

Final status:
CLOSED
```

---

# 56. Database Constraints Summary

Database minimal menjaga:

```text
UNIQUE user email

UNIQUE client code
UNIQUE client slug

UNIQUE issue number

UNIQUE feature request number

UNIQUE release version

UNIQUE feature-request/client pair

UNIQUE release/client impact

FK integrity

health score 0..100

valid required entity relationships
```

---

# 57. What Belongs in Database vs Service Layer

Tidak semua business rules harus dipaksakan menjadi SQL constraint.

## Database

Cocok untuk:

```text
FK integrity
UNIQUE
NOT NULL
CHECK
data type
relational existence
```

## Service Layer

Cocok untuk:

```text
status transition rules

permission checking

client ownership requirement

release publication rules

operational completion rules

follow-up requirements

health score calculation
```

---

# 58. Migration Strategy

Migration menggunakan explicit migration files.

Contoh:

```text
migrations/
│
├── 000001_create_users.up.sql
├── 000001_create_users.down.sql
│
├── 000002_create_rbac.up.sql
├── 000002_create_rbac.down.sql
│
├── 000003_create_clients.up.sql
├── 000003_create_clients.down.sql
│
├── 000004_create_issues.up.sql
├── 000004_create_issues.down.sql
│
└── ...
```

Command:

```bash
make migrate-up
make migrate-down
```

Requirement assessment memang meminta migration dapat create/alter/rollback dan dijalankan reproducibly dari database kosong.

---

# 59. Do Not Use GORM AutoMigrate as Production Migration

GORM tetap digunakan untuk:

```text
ORM
query
association
transaction
```

Tetapi:

```go
db.AutoMigrate(...)
```

tidak menjadi source of truth schema production.

Alasannya:

* Rollback tidak eksplisit.
* Perubahan schema lebih sulit direview.
* Migration history kurang jelas.
* Reproducibility lebih baik dengan versioned migration.

---

# 60. Database Source of Truth

Source of truth database:

```text
migrations/
```

GORM model harus mengikuti schema migration, bukan sebaliknya.

---

# 61. Scalability Considerations

Jika data bertambah besar:

### Issue

Partitioning belum diperlukan di MVP.

Mulai dari:

```text
proper indexes
query pagination
avoid N+1
select required columns
```

---

### Audit Logs

Audit kemungkinan menjadi salah satu table terbesar.

Future:

```text
time-based partitioning
archive strategy
retention policy
```

---

### Client Activities

Sama:

```text
index(client_id, occurred_at)
```

Jika besar:

```text
cursor pagination
```

lebih baik daripada offset pagination sangat dalam.

---

# 62. Final Database Decision

ClientOps menggunakan:

```text
PostgreSQL
+
GORM
+
Explicit SQL Migrations
+
Relational Integrity
+
Service-Level Business Rules
+
Optimistic Locking
+
Historical Auditability
```

Desain database tidak hanya dibuat agar data dapat disimpan.

Tujuannya memastikan bahwa:

> **workflow ClientOps dapat dipercaya, ditelusuri, dan tetap konsisten ketika digunakan oleh beberapa role secara bersamaan.**
