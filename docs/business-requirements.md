# ClientOps — Business Requirements

## 1. Document Purpose

Dokumen ini mendefinisikan **business requirements, actors, workflows, state transitions, permissions, ownership rules, SLA rules, operational handoff, dan business constraints** untuk ClientOps.

Dokumen ini menjadi dasar sebelum menyusun:

* ERD
* Database schema
* API contract
* Frontend information architecture
* Technical architecture
* Implementation task

Prinsip utama:

> **Business rules harus ditentukan terlebih dahulu sebelum data model dan endpoint dibuat.**

---

# 2. Business Context

ClientOps digunakan oleh perusahaan B2B EdTech yang memiliki hubungan operasional langsung dengan sekolah sebagai client.

Dalam aktivitas sehari-hari terdapat tiga kelompok utama:

```text
School / Client
      ↓
Operations
      ↓
Product / Engineering
```

Permasalahan terjadi ketika informasi mengenai:

* Bug
* Issue
* Feature request
* Development progress
* Release
* Documentation
* Client impact
* Client follow-up

tidak memiliki lifecycle dan ownership yang dapat dilihat secara konsisten oleh semua pihak terkait.

ClientOps menjadi **shared operational layer** untuk memastikan informasi tersebut memiliki:

```text
Owner
Status
History
Responsibility
Expected action
Documentation
Client impact
Closure criteria
```

---

# 3. Business Objectives

## BO-001 — Increase Work Visibility

Operations harus dapat mengetahui posisi pekerjaan tanpa harus meminta update secara manual kepada Engineering.

---

## BO-002 — Reduce Perceived Response Delay

ClientOps harus membedakan:

```text
Total Elapsed Time
Active Work Time
Blocked Time
Waiting Time
```

agar keterlambatan dapat dianalisis berdasarkan sumber sebenarnya.

---

## BO-003 — Establish Clear Ownership

Setiap issue, request, handoff, dan follow-up harus memiliki owner yang jelas.

Tidak boleh ada pekerjaan penting yang berada dalam kondisi:

```text
"Sedang dikerjakan"

tetapi tidak diketahui siapa yang bertanggung jawab.
```

---

## BO-004 — Close the Operational Delivery Loop

Sebuah pekerjaan tidak selalu selesai ketika technical implementation selesai.

ClientOps membedakan:

```text
Technical Completion
        ↓
Operational Handoff
        ↓
Client Follow-up
        ↓
Operational Completion
```

---

## BO-005 — Centralize Client Context

Informasi client harus dapat dilihat dalam satu contextual view:

* Profile
* Contacts
* Issue history
* Request history
* Release impact
* Follow-up
* Timeline
* Health
* Product usage

---

## BO-006 — Improve Client Relationship

Operations harus dapat bertindak secara proaktif berdasarkan informasi yang tersedia.

Sistem tidak hanya digunakan ketika client menghubungi perusahaan.

---

## BO-007 — Build Organizational Knowledge

Knowledge mengenai product dan feature tidak boleh hanya bergantung kepada individu tertentu.

Documentation menjadi bagian dari lifecycle produk.

---

# 4. Actors

## 4.1 Super Administrator

Bertanggung jawab terhadap konfigurasi sistem.

Kemampuan utama:

* Manage user
* Manage role
* Manage permission
* Manage system configuration
* Melihat audit trail
* Melakukan administrative actions

---

## 4.2 Operations Manager

Bertanggung jawab terhadap operasi dan relationship client secara keseluruhan.

Kemampuan utama:

* Melihat seluruh client
* Assign Ops owner
* Melihat semua issue/request
* Melihat SLA
* Escalate issue
* Melihat client health
* Melihat operational analytics
* Memantau follow-up
* Melakukan management override tertentu

---

## 4.3 Operations Staff

Menjadi penghubung utama antara client dan internal team.

Kemampuan utama:

* Melihat client yang menjadi responsibility-nya
* Membuat issue
* Membuat feature request
* Memberikan informasi tambahan
* Melihat development progress
* Melakukan client follow-up
* Acknowledge release
* Menutup operational handoff sesuai permission

---

## 4.4 Product

Bertanggung jawab terhadap product requirement dan feature lifecycle.

Kemampuan utama:

* Review feature request
* Classify request
* Merge related demand
* Menentukan priority
* Menghubungkan request dengan feature
* Membuat documentation
* Review release information

---

## 4.5 Engineer

Bertanggung jawab terhadap technical investigation dan implementation.

Kemampuan utama:

* Review issue
* Assign issue
* Update technical status
* Add investigation note
* Menandai blocker
* Menghubungkan issue dengan release
* Memberikan technical resolution

Engineer tidak bertanggung jawab langsung terhadap client closure kecuali diberikan permission khusus.

---

## 4.6 School User

Untuk MVP, role ini dapat memiliki akses terbatas atau diposisikan sebagai future capability.

Potensi kemampuan:

* Melihat issue milik sekolah sendiri
* Membuat issue
* Melihat status
* Melihat product update
* Melihat documentation
* Memberikan confirmation

---

# 5. Access Model

ClientOps menggunakan kombinasi:

```text
RBAC
+
Resource Ownership
+
Business Context
```

RBAC menentukan **apa yang dapat dilakukan suatu role**.

Resource ownership menentukan **resource mana yang boleh diakses**.

Contoh:

```text
OPS_STAFF
permission:
issue.read

tetapi:

Ops Staff A
hanya dapat melihat issue
dari client yang berada
dalam responsibility scope-nya.
```

Authorization harus diterapkan di backend sebagaimana diwajibkan assessment; frontend hanya menyembunyikan atau menampilkan UI untuk pengalaman pengguna.

---

# 6. Core Permission Model

## Client

```text
client.read
client.create
client.update
client.archive
client.assign_owner
client.read_health
client.read_timeline
```

## Issue

```text
issue.read
issue.create
issue.update
issue.assign
issue.triage
issue.investigate
issue.start_development
issue.mark_qa
issue.mark_released
issue.follow_up
issue.close
issue.reopen
issue.escalate
```

## Feature Request

```text
feature_request.read
feature_request.create
feature_request.update
feature_request.review
feature_request.prioritize
feature_request.merge
feature_request.close
```

## Release

```text
release.read
release.create
release.update
release.publish
release.manage_impact
```

## Documentation

```text
documentation.read
documentation.create
documentation.update
documentation.review
documentation.publish
documentation.archive
```

## Client Success

```text
client_health.read
client_health.manage
client_followup.create
client_followup.complete
```

## Administration

```text
user.manage
role.manage
permission.manage
audit.read
system.manage
```

---

# 7. Client Ownership

Setiap active client harus memiliki minimal satu **primary Operations owner**.

Optional:

* Secondary Ops owner
* Account manager
* Technical PIC

Rule:

```text
Active Client
→ Primary Ops Owner REQUIRED
```

Client tidak boleh kehilangan primary owner tanpa replacement.

Contoh invalid operation:

```text
Remove Ops Owner
        ↓
No replacement owner
        ↓
REJECT
```

Reason:

Tanpa ownership yang jelas, follow-up dan client responsibility dapat terlewat.

---

# 8. Issue Lifecycle

Issue merupakan masalah yang dilaporkan oleh client atau ditemukan internal dan berdampak kepada client.

Lifecycle utama:

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

Additional states:

```text
BLOCKED
CANCELLED
REOPENED
```

Business process seperti ini memang diperlukan dalam assessment dan business rules-nya harus dijaga backend.

---

# 9. Issue State Transition Rules

## REPORTED → TRIAGED

Allowed by:

```text
Operations Manager
Product
Engineer with triage permission
```

Requirements:

* Category sudah ditentukan
* Severity sudah ditentukan
* Reporter tersedia
* Client tersedia
* Description valid

---

## TRIAGED → INVESTIGATING

Requirements:

* Assignee harus tersedia

Business rule:

```text
issue.assignee_id != null
```

Tanpa assignee:

```text
transition rejected
```

---

## INVESTIGATING → IN_DEVELOPMENT

Requirements:

* Issue confirmed reproducible atau technical reason terdokumentasi
* Engineering owner tersedia

Optional:

* Technical note
* Root cause hypothesis

---

## INVESTIGATING → BLOCKED

Wajib menyertakan:

```text
blocked_reason
blocked_by
```

Optional:

```text
expected_unblock_at
```

---

## BLOCKED → INVESTIGATING

Requirements:

* Blocking condition sudah resolved
* Resolution note tersedia

---

## IN_DEVELOPMENT → QA

Requirements:

* Implementation completed
* Technical resolution tersedia

Optional:

* Pull request reference
* Commit reference

---

## QA → IN_DEVELOPMENT

Digunakan ketika QA gagal.

Requirements:

* Failure reason wajib tersedia

---

## QA → RELEASED

Requirements:

* QA passed
* Release reference tersedia

```text
issue.release_id != null
```

---

## RELEASED → FOLLOW_UP

Requirements:

* Client impact sudah diketahui
* Ops owner tersedia

System membuat operational handoff apabila issue berdampak kepada client.

---

## FOLLOW_UP → CLOSED

Requirements:

* Follow-up sudah dilakukan
* Resolution sudah dikomunikasikan
* Follow-up result tersedia

Optional:

* Client confirmation

---

## CLOSED → REOPENED

Requirements:

* Reopen reason wajib tersedia

Reopen menghasilkan lifecycle baru tetapi tidak menghapus history lama.

---

# 10. Invalid Issue Transitions

Contoh transition yang harus ditolak:

```text
REPORTED → CLOSED
REPORTED → RELEASED
TRIAGED → QA
IN_DEVELOPMENT → CLOSED
BLOCKED → RELEASED
```

Business rules tidak boleh hanya diatur dari disabled button frontend.

Backend harus tetap menolak invalid transition.

---

# 11. Issue Severity

Initial model:

```text
LOW
MEDIUM
HIGH
CRITICAL
```

## LOW

Minor inconvenience.

Tidak menghalangi aktivitas utama client.

---

## MEDIUM

Mengganggu workflow tetapi masih memiliki workaround.

---

## HIGH

Menghambat business workflow penting client.

---

## CRITICAL

Mengakibatkan salah satu:

* Core system tidak dapat digunakan
* Significant client operation stopped
* Major data integrity risk
* Significant security concern

---

# 12. SLA Model

Initial SLA target dapat dibuat configurable.

Contoh:

| Severity | First Response | Target Resolution |
| -------- | -------------: | ----------------: |
| Low      |    8 jam kerja |      5 hari kerja |
| Medium   |    4 jam kerja |      3 hari kerja |
| High     |    1 jam kerja |      1 hari kerja |
| Critical |       30 menit |             4 jam |

Nilai ini merupakan **initial product configuration**, bukan hardcoded permanent business rule.

---

# 13. SLA Clock

Sistem perlu membedakan:

```text
elapsed_duration
active_duration
blocked_duration
waiting_client_duration
waiting_internal_duration
```

Contoh:

```text
Issue age:
72 hours

Active engineering:
17 hours

Waiting client:
31 hours

Blocked:
20 hours

Other:
4 hours
```

Dengan demikian:

> Lama sebuah issue tidak otomatis berarti engineering mengerjakan selama durasi tersebut.

---

# 14. Waiting States

Selain BLOCKED, issue dapat mempunyai contextual waiting condition:

```text
WAITING_CLIENT
WAITING_OPS
WAITING_PRODUCT
WAITING_ENGINEERING
WAITING_RELEASE
```

Lebih baik waiting reason disimpan sebagai **work state / timer context**, bukan memperbanyak primary issue status secara berlebihan.

Contoh:

```text
Primary Status:
INVESTIGATING

Work State:
WAITING_CLIENT
```

Ini menjaga lifecycle tetap mudah dipahami.

---

# 15. Feature Request Lifecycle

Lifecycle:

```text
SUBMITTED
    ↓
UNDER_REVIEW
    ↓
ACCEPTED
    ↓
PLANNED
    ↓
IN_DEVELOPMENT
    ↓
RELEASED
    ↓
DELIVERED
```

Alternatif akhir:

```text
REJECTED
DUPLICATE
CANCELLED
```

---

# 16. Feature Request Business Rules

## SUBMITTED → UNDER_REVIEW

Requirements:

* Requester
* Client
* Problem statement
* Expected outcome

Feature request sebaiknya tidak hanya:

```text
"Tambahkan export Excel"
```

tetapi juga menyimpan:

```text
Problem:
Admin sekolah harus melakukan
rekap manual setiap minggu.

Expected outcome:
Data attendance dapat diekspor
untuk kebutuhan reporting.
```

---

## UNDER_REVIEW → ACCEPTED

Requirements:

* Product review completed
* Business reason tersedia

---

## UNDER_REVIEW → REJECTED

Requirements:

* Rejection reason wajib tersedia

---

## UNDER_REVIEW → DUPLICATE

Requirements:

* Original request reference wajib tersedia

---

# 17. Multi-Client Feature Demand

Satu feature request concept dapat memiliki demand dari beberapa client.

Contoh:

```text
Feature:
Attendance Export

Requested by:
SMA A
SMA B
SMA C
SMP D
```

Business value:

Product tidak melihat empat request sebagai empat isolated tickets.

Sistem dapat menunjukkan:

```text
Demand Count: 4 clients
First Requested: 12 May
Oldest Waiting: 102 days
```

---

# 18. Release Lifecycle

```text
DRAFT
   ↓
READY
   ↓
PUBLISHED
```

Optional:

```text
CANCELLED
```

---

# 19. Release Rules

Release minimal memiliki:

* Version
* Title
* Summary
* Release date
* Release items

Release item dapat berupa:

```text
FEATURE
BUG_FIX
IMPROVEMENT
SECURITY
```

Release dapat terhubung dengan:

* Issues
* Feature requests
* Product features
* Documentation

---

# 20. Release Impact

Setiap release item dapat memiliki client impact.

Jenis impact:

```text
ALL_CLIENTS
SPECIFIC_CLIENTS
PRODUCT_SEGMENT
NONE
```

Untuk MVP:

```text
ALL_CLIENTS
SPECIFIC_CLIENTS
NONE
```

sudah cukup.

---

# 21. Operational Handoff

Operational handoff merupakan salah satu domain terpenting ClientOps.

Ketika suatu change dirilis:

```text
Release Published
        ↓
Identify Client Impact
        ↓
Create Handoff
        ↓
Assign Ops Owner
        ↓
Ops Acknowledges
        ↓
Client Follow-up
        ↓
Operationally Complete
```

---

# 22. Handoff Lifecycle

```text
PENDING
   ↓
ACKNOWLEDGED
   ↓
FOLLOW_UP_REQUIRED
   ↓
FOLLOWED_UP
   ↓
COMPLETED
```

Untuk release yang tidak membutuhkan client contact:

```text
PENDING
   ↓
ACKNOWLEDGED
   ↓
COMPLETED
```

---

# 23. Technical vs Operational Completion

ClientOps mendefinisikan dua completion state:

## Technical Completion

Terjadi ketika:

```text
Implementation finished
QA passed
Release published
```

## Operational Completion

Terjadi ketika:

```text
Technical completion ✓
Documentation available ✓
Ops aware ✓
Affected clients identified ✓
Required client follow-up completed ✓
```

Ini merupakan core differentiation ClientOps.

`Documentation available` berarti minimal satu documentation berstatus
`PUBLISHED` terhubung ke release yang menghasilkan handoff. Setiap handoff,
termasuk yang tidak membutuhkan client contact, tidak dapat masuk `COMPLETED`
sebelum syarat ini terpenuhi.

---

# 24. Documentation Lifecycle

```text
DRAFT
  ↓
IN_REVIEW
  ↓
PUBLISHED
```

Alternative:

```text
ARCHIVED
```

---

# 25. Documentation Rules

Documentation dapat terhubung dengan:

* Feature
* Issue
* Release
* Product module

Feature-request documentation links are many-to-many. They provide product context only and do not change feature-request or documentation lifecycle state.

Published documentation wajib memiliki:

* Title
* Summary
* Content
* Author
* Last reviewed date

Optional:

* Known limitations
* Usage guide
* Screenshots
* Related documentation

---

# 26. Documentation Freshness

Setiap documentation dapat memiliki:

```text
last_reviewed_at
review_due_at
```

Tujuannya agar knowledge tidak hanya tersedia tetapi tetap relevan.

Future rule:

```text
review_due_at passed
→ documentation marked NEEDS_REVIEW
```

---

# 27. Client Follow-up

Follow-up digunakan ketika Ops perlu menghubungi client setelah:

* Issue resolved
* Feature released
* Training required
* Important update
* Relationship risk detected

Follow-up minimal memiliki:

```text
client
owner
reason
due_at
status
result
```

---

# 28. Follow-up Lifecycle

```text
OPEN
   ↓
IN_PROGRESS
   ↓
COMPLETED
```

Alternative:

```text
CANCELLED
```

Overdue apabila:

```text
current_time > due_at
AND
status != COMPLETED
```

---

# 29. Client Timeline

Timeline bukan data yang diedit langsung.

Timeline dibentuk dari domain events.

Contoh event:

```text
CLIENT_CREATED
ISSUE_REPORTED
ISSUE_STATUS_CHANGED
FEATURE_REQUEST_SUBMITTED
RELEASE_PUBLISHED
HANDOFF_ACKNOWLEDGED
CLIENT_FOLLOWED_UP
DOCUMENTATION_PUBLISHED
```

Timeline membantu Ops melihat relationship secara chronological.

---

# 30. Client Health

Client health bukan keputusan subjektif manual sepenuhnya.

MVP menggunakan deterministic scoring.

Range:

```text
0 - 100
```

Classification:

```text
80 - 100  HEALTHY
60 - 79   ATTENTION
0  - 59   AT_RISK
```

---

# 31. Initial Health Factors

Contoh:

```text
Starting Score: 100
```

Penalti:

```text
Critical unresolved issue     -20
SLA breach                    -15
Issue open > threshold        -10
Overdue follow-up             -10
Repeated complaint            -10
No recent interaction          -5
```

Positive signals:

```text
Recent successful follow-up    +5
High feature adoption          +5
Recent training completed      +5
```

Score tetap dibatasi:

```text
0 <= score <= 100
```

Bobot awal harus configurable agar tidak menjadi formula permanen yang sulit diubah.

---

# 32. Client Health Transparency

ClientOps tidak hanya menampilkan:

```text
Score: 58
```

tetapi harus menjelaskan alasan:

```text
Client Health
58 / 100
ATTENTION

Factors:

-15 SLA breach
-10 Issue > 14 days
-10 Overdue follow-up
 -7 Multiple open issues
```

Tujuannya:

> User dapat memahami kenapa sistem menghasilkan score tersebut.

---

# 33. Notifications

Notification dibuat berdasarkan meaningful business event.

Contoh:

```text
Issue assigned
Issue escalated
SLA approaching
SLA breached
Issue released
Release published
Ops handoff created
Follow-up due
Follow-up overdue
Documentation published
```

Tidak semua perubahan harus menghasilkan notification.

---

# 34. Notification Delivery

MVP:

```text
In-app notification
```

Bonus:

```text
Email
```

Future:

```text
WhatsApp
Slack
Telegram
```

---

# 35. Audit Trail

Critical changes wajib memiliki immutable audit trail.

Contoh:

```text
Actor:
John Doe

Action:
ISSUE_STATUS_CHANGED

Resource:
ISS-00123

Before:
IN_DEVELOPMENT

After:
QA

Timestamp:
2026-08-22 14:30:00
```

Audit event minimal menyimpan:

* Actor
* Action
* Resource type
* Resource ID
* Timestamp
* Relevant before/after metadata

---

# 36. Audit Rules

Audit log:

* Tidak dapat diedit user biasa
* Tidak dapat dihapus melalui normal application flow
* Hanya dapat dibaca role dengan permission tertentu
* Tidak menyimpan secret/password/token

---

# 37. Attachments

Issue dan documentation dapat memiliki attachment.

Allowed examples:

```text
image/png
image/jpeg
application/pdf
```

Business rules:

* MIME type validation
* File size limit
* Safe filename generation
* Authorization before download
* File metadata stored in database
* Binary file stored in object storage

Jika fitur ini diimplementasikan, object storage seperti MinIO sesuai dengan bonus requirement assessment.

---

# 38. Search, Filter, Sorting & Pagination

Beberapa major listing harus mendukung:

```text
Search
Filter
Sorting
Pagination
```

Ini juga merupakan requirement eksplisit assessment.

Contoh Client:

```text
search
status
health
ops_owner
sort
page
limit
```

Issue:

```text
search
client
status
severity
assignee
created_from
created_to
sort
page
limit
```

Feature Request:

```text
search
status
client
priority
sort
page
limit
```

---

# 39. Business Errors

Sistem harus membedakan antara technical error dan business error.

Contoh business errors:

```text
INVALID_STATUS_TRANSITION
CLIENT_OWNER_REQUIRED
ISSUE_ASSIGNEE_REQUIRED
FOLLOW_UP_NOT_COMPLETED
DOCUMENTATION_REQUIRED
RELEASE_REFERENCE_REQUIRED
PERMISSION_DENIED
RESOURCE_CONFLICT
```

Error tidak boleh mengekspos:

* SQL error
* Stack trace
* Database schema detail
* Secret

Sesuai centralized error handling yang diminta assessment.

---

# 40. Concurrency Rules

Beberapa resource memiliki kemungkinan diedit oleh beberapa orang bersamaan.

Contoh:

```text
Ops membuka issue
Engineer membuka issue
Ops update
Engineer update berdasarkan version lama
```

Untuk resource penting seperti Issue dan Feature Request, sistem sebaiknya menggunakan:

```text
optimistic locking
```

Contoh:

```text
version = 7

Client update request:
version = 7

Database current version:
version = 8

Result:
409 CONFLICT
```

User harus reload state terbaru.

---

# 41. Soft Delete / Archive Strategy

Tidak semua entity boleh di-hard-delete.

Contoh:

```text
Client
User
Documentation
```

lebih aman menggunakan:

```text
archived_at
```

atau status:

```text
ACTIVE
ARCHIVED
```

Critical operational records seperti:

```text
Issue
Audit Log
Status History
```

tidak boleh hilang hanya karena destructive action biasa.

---

# 42. Data Integrity Principles

Business integrity harus dijaga oleh kombinasi:

```text
Application Business Rules
+
Database Constraints
```

Contoh:

```text
user.email UNIQUE
client.slug UNIQUE

issue.client_id FK
issue.assignee_id FK

role_permissions
UNIQUE(role_id, permission_id)
```

Assessment secara eksplisit meminta perhatian terhadap PK, FK, index, unique constraint, nullable field, relationship, dan data integrity.

---

# 43. Reporting & Analytics

MVP dashboard dapat menampilkan:

## Operational

```text
Open Issues
Critical Issues
SLA Breached
Average Resolution Time
Pending Follow-ups
```

## Client

```text
Healthy Clients
Clients Needing Attention
At-Risk Clients
```

## Product

```text
Top Feature Requests
Repeated Issues
Recently Released Changes
```

---

# 44. Metric Integrity

Metrics harus memiliki definisi yang jelas.

Contoh:

```text
Resolution Time
=
closed_at - reported_at
```

Sedangkan:

```text
Active Work Time
=
sum of active work intervals
```

Jangan menggunakan label metric tanpa definisi yang dapat dijelaskan.

---

# 45. Product Rules Summary

Core rules ClientOps:

```text
RULE-001
Active client wajib memiliki primary Ops owner.

RULE-002
Issue tidak dapat masuk INVESTIGATING tanpa assignee.

RULE-003
Issue tidak dapat masuk RELEASED tanpa release reference.

RULE-004
Issue tidak dapat CLOSED langsung dari technical stage.

RULE-005
Released client-impacting issue harus melalui operational handoff.

RULE-006
Required follow-up harus diselesaikan sebelum operational closure.

RULE-007
Invalid state transition selalu ditolak backend.

RULE-008
Feature request rejection wajib memiliki reason.

RULE-009
Duplicate feature request wajib menunjuk original request.

RULE-010
Published documentation harus memiliki author dan review metadata.

RULE-011
Critical state changes menghasilkan audit event.

RULE-012
Setiap handoff wajib memiliki published release documentation sebelum operational closure.

RULE-012
Client health score harus explainable.

RULE-013
Authorization selalu divalidasi backend.

RULE-014
Critical records tidak boleh hilang melalui hard delete biasa.

RULE-015
Concurrent conflicting update harus dapat dideteksi.
```

---

# 46. MVP Business Flow

Keseluruhan lifecycle utama:

```text
CLIENT REPORTS PROBLEM
          │
          ▼
OPS CREATES ISSUE
          │
          ▼
       TRIAGE
          │
          ▼
    INVESTIGATION
          │
          ▼
     DEVELOPMENT
          │
          ▼
          QA
          │
          ▼
       RELEASE
          │
          ▼
  CLIENT IMPACT MAPPING
          │
          ▼
   OPS ACKNOWLEDGEMENT
          │
          ▼
    CLIENT FOLLOW-UP
          │
          ▼
        CLOSED
          │
          ▼
 CLIENT TIMELINE + HEALTH
```

---

# 47. Definition of Done

## Technical Definition of Done

```text
Implementation complete
Tests passed
QA passed
Release published
```

---

## Operational Definition of Done

```text
Technical DoD complete
+
Relevant documentation available
+
Affected clients identified
+
Operations acknowledged
+
Required follow-up completed
+
Outcome recorded
```

---

# 48. Non-Goals

ClientOps MVP tidak bertujuan menjadi:

* Jira replacement penuh
* GitHub replacement
* ERP
* Accounting application
* HR application
* Payroll system
* Generic project management platform
* Full customer support chat platform
* Full marketing CRM

ClientOps fokus pada:

> **client operational visibility dan closed-loop delivery antara School, Operations, Product, dan Engineering.**

---

# 49. Success Criteria

MVP dianggap berhasil apabila dapat mendemonstrasikan minimal skenario berikut:

```text
1. Admin membuat user dan role.

2. Ops memiliki client responsibility.

3. Ops membuat issue untuk client.

4. Issue melalui valid state transitions.

5. Engineer mengambil dan memperbarui issue.

6. Invalid transition ditolak backend.

7. Issue dihubungkan dengan release.

8. Release menentukan affected client.

9. Operational handoff dibuat.

10. Ops mengetahui bahwa issue sudah released.

11. Ops melakukan client follow-up.

12. Issue baru dapat dianggap operationally closed.

13. Seluruh perubahan penting terlihat di client timeline.

14. Audit trail menunjukkan siapa mengubah apa.

15. Dashboard menunjukkan kondisi client dan operational workload.
```

---

# 50. Business Requirement Principle

Semua implementasi teknis berikutnya harus dapat ditelusuri kembali ke kebutuhan bisnis dalam dokumen ini.

Artinya:

```text
Database table
API endpoint
Queue
Cache
Notification
Permission
Background worker
UI component
```

tidak dibuat hanya karena teknologinya tersedia.

Setiap capability harus menjawab:

> **Problem apa yang diselesaikan, siapa yang membutuhkannya, dan business rule apa yang harus dijaga?**

Ini sekaligus mendukung ekspektasi assessment bahwa kandidat harus mampu menjelaskan alasan di balik keputusan teknis, bukan sekadar menunjukkan fitur berjalan.
