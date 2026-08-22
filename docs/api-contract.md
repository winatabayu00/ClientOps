# ClientOps — API Contract

## 1. Purpose

Dokumen ini mendefinisikan kontrak REST API ClientOps.

Base URL:

```text
/api/v1
```

Tujuan:

* Menjadi contract antara frontend dan backend.
* Menstandarkan request/response.
* Menjaga consistency error handling.
* Menjadi dasar Swagger/OpenAPI.
* Memungkinkan frontend dan backend dikerjakan paralel.
* Menetapkan authorization dan business action secara eksplisit.

---

# 2. API Principles

## 2.1 Versioning

Semua endpoint menggunakan prefix:

```text
/api/v1
```

Contoh:

```http
GET /api/v1/clients
POST /api/v1/issues
```

---

## 2.2 JSON

Default content type:

```http
Content-Type: application/json
```

Exception:

```text
multipart/form-data
```

digunakan untuk file upload jika diperlukan.

---

## 2.3 Authentication

Authentication menggunakan cookie-based authentication.

Browser mengirim:

```text
access token cookie
refresh token cookie
```

Frontend tidak menyimpan credential authentication di:

```text
localStorage
sessionStorage
```

Requirement ini wajib dalam assessment.

---

# 3. Standard Success Response

## Single Resource

```json
{
  "success": true,
  "data": {
    "id": "uuid"
  },
  "message": "Success"
}
```

---

## Collection

```json
{
  "success": true,
  "data": [
    {}
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 120,
    "total_pages": 6
  },
  "message": "Success"
}
```

---

## Delete / No Content

Untuk operation yang tidak membutuhkan response body:

```http
204 No Content
```

---

# 4. Standard Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "details": null
  },
  "message": "Invalid request"
}
```

---

# 5. Validation Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "fields": {
      "title": [
        "Title is required"
      ],
      "severity": [
        "Severity must be one of LOW, MEDIUM, HIGH, CRITICAL"
      ]
    }
  },
  "message": "Validation failed"
}
```

HTTP:

```text
422 Unprocessable Entity
```

---

# 6. Business Error Response

Contoh invalid transition:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "details": {
      "from": "REPORTED",
      "to": "CLOSED"
    }
  },
  "message": "Issue cannot transition from REPORTED to CLOSED"
}
```

HTTP:

```text
409 Conflict
```

---

# 7. Error Codes

## Authentication

```text
AUTHENTICATION_REQUIRED
INVALID_CREDENTIALS
SESSION_EXPIRED
SESSION_REVOKED
INVALID_REFRESH_TOKEN
CSRF_VALIDATION_FAILED
```

## Authorization

```text
PERMISSION_DENIED
RESOURCE_ACCESS_DENIED
```

## Validation

```text
VALIDATION_ERROR
INVALID_UUID
INVALID_QUERY_PARAMETER
INVALID_FILE_TYPE
FILE_TOO_LARGE
```

## Resource

```text
RESOURCE_NOT_FOUND
RESOURCE_ALREADY_EXISTS
RESOURCE_CONFLICT
```

## Business

```text
INVALID_STATUS_TRANSITION
ISSUE_ASSIGNEE_REQUIRED
RELEASE_REFERENCE_REQUIRED
CLIENT_OWNER_REQUIRED
FOLLOW_UP_NOT_COMPLETED
DOCUMENTATION_REQUIRED
DUPLICATE_FEATURE_REQUEST
VERSION_CONFLICT
```

## System

```text
RATE_LIMIT_EXCEEDED
INTERNAL_SERVER_ERROR
SERVICE_UNAVAILABLE
```

---

# 8. HTTP Status Code Strategy

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

Ini sesuai status code yang diminta assessment.

---

# 9. Pagination

Default:

```text
page=1
limit=20
```

Maximum:

```text
limit=100
```

Contoh:

```http
GET /api/v1/issues?page=1&limit=20
```

Response:

```json
{
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 91,
    "total_pages": 5
  }
}
```

---

# 10. Sorting

Format:

```text
sort=created_at
order=desc
```

Allowed order:

```text
asc
desc
```

Backend wajib whitelist sortable fields.

Jangan langsung memasukkan query string user ke raw SQL.

---

# 11. Filtering

Contoh:

```http
GET /api/v1/issues
?page=1
&limit=20
&search=nilai
&status=IN_DEVELOPMENT
&severity=HIGH
&client_id=uuid
&assignee_id=uuid
&sort=reported_at
&order=desc
```

Requirement search/filter/sort/pagination memang diwajibkan pada beberapa listing.

---

# 12. Authentication API

## POST /auth/login

```http
POST /api/v1/auth/login
```

Request:

```json
{
  "email": "user@example.com",
  "password": "secret"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "user@example.com",
      "roles": [
        "OPS_STAFF"
      ],
      "permissions": [
        "client.read",
        "issue.create"
      ]
    }
  },
  "message": "Login successful"
}
```

Authentication tokens diberikan melalui secure cookies.

---

# 13. POST /auth/logout

```http
POST /api/v1/auth/logout
```

Behaviour:

```text
revoke current auth session
clear access cookie
clear refresh cookie
```

Response:

```http
204 No Content
```

---

# 14. POST /auth/refresh

```http
POST /api/v1/auth/refresh
```

Flow:

```text
Refresh cookie
      ↓
Validate session
      ↓
Rotate refresh token
      ↓
Issue new cookies
```

Response:

```json
{
  "success": true,
  "data": null,
  "message": "Session refreshed"
}
```

---

# 15. GET /auth/me

```http
GET /api/v1/auth/me
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "roles": [
      "OPS_STAFF"
    ],
    "permissions": [
      "client.read",
      "issue.read",
      "issue.create"
    ]
  },
  "message": "Success"
}
```

---

# 16. GET /auth/sessions

Optional but useful:

```http
GET /api/v1/auth/sessions
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user_agent": "Chrome on macOS",
      "ip_address": "192.0.2.10",
      "last_used_at": "2026-08-22T14:00:00Z",
      "current": true
    }
  ],
  "message": "Success"
}
```

---

# 17. DELETE /auth/sessions/:id

Untuk revoke device/session tertentu:

```http
DELETE /api/v1/auth/sessions/:id
```

Response:

```http
204 No Content
```

---

# 18. CSRF Endpoint

Jika mekanisme membutuhkan explicit token endpoint:

```http
GET /api/v1/auth/csrf
```

Response dapat berupa CSRF cookie atau token response sesuai implementation decision.

---

# 19. Users API

## GET /users

```http
GET /api/v1/users
```

Permission:

```text
user.manage
```

Filters:

```text
search
status
role
page
limit
sort
order
```

---

# 20. POST /users

```http
POST /api/v1/users
```

Request:

```json
{
  "name": "Sarah",
  "email": "sarah@example.com",
  "password": "TemporaryPassword123!",
  "role_ids": [
    "uuid"
  ]
}
```

Response:

```http
201 Created
```

---

# 21. GET /users/:id

```http
GET /api/v1/users/:id
```

---

# 22. PATCH /users/:id

```http
PATCH /api/v1/users/:id
```

Example:

```json
{
  "name": "Sarah Doe",
  "status": "ACTIVE"
}
```

---

# 23. PUT /users/:id/roles

```http
PUT /api/v1/users/:id/roles
```

Request:

```json
{
  "role_ids": [
    "uuid-1",
    "uuid-2"
  ]
}
```

---

# 24. Roles API

```http
GET    /api/v1/roles
POST   /api/v1/roles
GET    /api/v1/roles/:id
PATCH  /api/v1/roles/:id
DELETE /api/v1/roles/:id
```

---

# 25. Permissions API

```http
GET /api/v1/permissions
```

Untuk MVP permissions sebaiknya system-defined/seeded.

Tidak harus menyediakan CRUD penuh terhadap permission.

---

# 26. Client API

## GET /clients

```http
GET /api/v1/clients
```

Query:

```text
page
limit
search
status
type
owner_id
health
sort
order
```

Example:

```http
GET /api/v1/clients?status=ACTIVE&owner_id=uuid&page=1&limit=20
```

---

# 27. POST /clients

```http
POST /api/v1/clients
```

Permission:

```text
client.create
```

Request:

```json
{
  "code": "SCH-001",
  "name": "SMA Nusantara",
  "type": "SENIOR_HIGH",
  "province": "Jawa Timur",
  "city": "Surabaya",
  "address": "..."
}
```

Response:

```http
201 Created
```

---

# 28. GET /clients/:id

```http
GET /api/v1/clients/:id
```

Response dapat menjadi **composite API** karena detail client membutuhkan beberapa context sekaligus.

Example:

```json
{
  "success": true,
  "data": {
    "client": {},
    "primary_contact": {},
    "owners": [],
    "summary": {
      "open_issues": 3,
      "pending_requests": 2,
      "pending_followups": 1
    },
    "health": {
      "score": 76,
      "classification": "ATTENTION"
    }
  },
  "message": "Success"
}
```

---

# 29. PATCH /clients/:id

```http
PATCH /api/v1/clients/:id
```

Optimistic locking dapat menggunakan:

```json
{
  "version": 5,
  "name": "SMA Nusantara Baru"
}
```

Jika version conflict:

```http
409 Conflict
```

---

# 30. POST /clients/:id/archive

```http
POST /api/v1/clients/:id/archive
```

Lebih eksplisit daripada hard delete.

---

# 31. Client Contacts

```http
GET    /api/v1/clients/:clientId/contacts
POST   /api/v1/clients/:clientId/contacts
PATCH  /api/v1/clients/:clientId/contacts/:contactId
DELETE /api/v1/clients/:clientId/contacts/:contactId
```

---

# 32. Client Owners

## GET

```http
GET /api/v1/clients/:id/owners
```

## POST

```http
POST /api/v1/clients/:id/owners
```

Request:

```json
{
  "user_id": "uuid",
  "owner_type": "PRIMARY"
}
```

Business rule:

Active client tidak boleh memiliki dua active primary owner.

---

# 33. Change Primary Owner

Lebih aman menggunakan explicit business action:

```http
POST /api/v1/clients/:id/change-primary-owner
```

Request:

```json
{
  "new_owner_id": "uuid"
}
```

Backend transaction:

```text
unassign old primary
assign new primary
audit
```

---

# 34. GET /clients/:id/timeline

```http
GET /api/v1/clients/:id/timeline
```

Query:

```text
page
limit
type
from
to
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "ISSUE_REPORTED",
      "title": "Issue ISS-2026-001 reported",
      "occurred_at": "2026-08-22T10:00:00Z"
    }
  ]
}
```

---

# 35. GET /clients/:id/health

```http
GET /api/v1/clients/:id/health
```

Response:

```json
{
  "success": true,
  "data": {
    "score": 68,
    "classification": "ATTENTION",
    "factors": [
      {
        "code": "SLA_BREACH",
        "impact": -15,
        "description": "1 issue breached SLA"
      }
    ],
    "calculated_at": "2026-08-22T10:00:00Z"
  }
}
```

Explainability wajib dipertahankan.

---

# 36. Issue API

## GET /issues

```http
GET /api/v1/issues
```

Query:

```text
page
limit
search
client_id
status
severity
category
assignee_id
reporter_id
work_state
reported_from
reported_to
sort
order
```

---

# 37. POST /issues

```http
POST /api/v1/issues
```

Request:

```json
{
  "client_id": "uuid",
  "title": "Nilai siswa tidak dapat disimpan",
  "description": "Saat admin menyimpan nilai...",
  "category": "ACADEMIC",
  "severity": "HIGH"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "issue_number": "ISS-2026-000123",
    "status": "REPORTED"
  },
  "message": "Issue created"
}
```

HTTP:

```text
201 Created
```

---

# 38. GET /issues/:id

```http
GET /api/v1/issues/:id
```

Response composite:

```json
{
  "success": true,
  "data": {
    "issue": {},
    "client": {},
    "assignee": {},
    "current_work_state": {},
    "sla": {},
    "release": {},
    "operational_handoff": {}
  },
  "message": "Success"
}
```

---

# 39. PATCH /issues/:id

Digunakan hanya untuk editable attributes:

```text
title
description
category
severity
```

Bukan untuk primary workflow transition.

Request:

```json
{
  "version": 4,
  "severity": "CRITICAL"
}
```

---

# 40. Why Status Is Not Updated Through Generic PATCH

Jangan:

```http
PATCH /issues/:id
```

```json
{
  "status": "CLOSED"
}
```

karena status transition memiliki business rules.

Gunakan explicit action endpoint.

---

# 41. POST /issues/:id/triage

```http
POST /api/v1/issues/:id/triage
```

Request:

```json
{
  "version": 1,
  "category": "ACADEMIC",
  "severity": "HIGH",
  "note": "Confirmed as product issue"
}
```

---

# 42. POST /issues/:id/assign

```http
POST /api/v1/issues/:id/assign
```

Request:

```json
{
  "version": 2,
  "assignee_id": "uuid"
}
```

---

# 43. POST /issues/:id/start-investigation

```http
POST /api/v1/issues/:id/start-investigation
```

---

# 44. POST /issues/:id/start-development

```http
POST /api/v1/issues/:id/start-development
```

Request:

```json
{
  "version": 4,
  "technical_note": "Root cause located in..."
}
```

---

# 45. POST /issues/:id/mark-qa

```http
POST /api/v1/issues/:id/mark-qa
```

Request:

```json
{
  "version": 5,
  "resolution_summary": "Fixed validation..."
}
```

---

# 46. POST /issues/:id/qa-failed

```http
POST /api/v1/issues/:id/qa-failed
```

Request:

```json
{
  "version": 6,
  "reason": "Regression found in..."
}
```

Transition:

```text
QA → IN_DEVELOPMENT
```

---

# 47. POST /issues/:id/mark-released

```http
POST /api/v1/issues/:id/mark-released
```

Request:

```json
{
  "version": 7,
  "release_id": "uuid"
}
```

Requirement:

```text
release_id required
```

---

# 48. POST /issues/:id/start-follow-up

```http
POST /api/v1/issues/:id/start-follow-up
```

---

# 49. POST /issues/:id/close

```http
POST /api/v1/issues/:id/close
```

Request:

```json
{
  "version": 9,
  "follow_up_id": "uuid",
  "closure_note": "Client confirmed issue resolved"
}
```

Backend verifies:

```text
follow-up completed
operational rules satisfied
```

---

# 50. POST /issues/:id/reopen

```http
POST /api/v1/issues/:id/reopen
```

Request:

```json
{
  "version": 10,
  "reason": "Problem reproduced again"
}
```

---

# 51. Issue Work State API

## POST /issues/:id/work-state

```http
POST /api/v1/issues/:id/work-state
```

Request:

```json
{
  "state": "WAITING_CLIENT",
  "reason": "Need screenshot from school"
}
```

System:

```text
ends current work-state interval
creates new interval
```

---

# 52. GET /issues/:id/history

```http
GET /api/v1/issues/:id/history
```

Returns status transitions.

---

# 53. GET /issues/:id/work-history

```http
GET /api/v1/issues/:id/work-history
```

Returns work-state intervals and duration.

---

# 54. Issue Comments

```http
GET  /api/v1/issues/:id/comments
POST /api/v1/issues/:id/comments
```

Request:

```json
{
  "body": "Client confirmed...",
  "is_internal": true
}
```

---

# 55. Feature Request API

## GET /feature-requests

```http
GET /api/v1/feature-requests
```

Filters:

```text
search
status
priority
client_id
product_owner_id
page
limit
sort
order
```

---

# 56. POST /feature-requests

```http
POST /api/v1/feature-requests
```

Request:

```json
{
  "client_id": "uuid",
  "title": "Attendance Export",
  "problem_statement": "Admin melakukan rekap manual...",
  "expected_outcome": "Attendance dapat diekspor..."
}
```

---

# 57. GET /feature-requests/:id

Response:

```json
{
  "success": true,
  "data": {
    "feature_request": {},
    "requesting_clients": [],
    "demand": {
      "client_count": 4,
      "oldest_request_at": "..."
    },
    "release": null
  }
}
```

---

# 58. POST /feature-requests/:id/add-client

Jika request capability yang sama datang dari client lain:

```http
POST /api/v1/feature-requests/:id/add-client
```

Request:

```json
{
  "client_id": "uuid",
  "client_context": "Needed for monthly reporting"
}
```

---

# 59. Feature Request Workflow Actions

```http
POST /api/v1/feature-requests/:id/start-review
POST /api/v1/feature-requests/:id/accept
POST /api/v1/feature-requests/:id/reject
POST /api/v1/feature-requests/:id/mark-planned
POST /api/v1/feature-requests/:id/start-development
POST /api/v1/feature-requests/:id/mark-released
POST /api/v1/feature-requests/:id/mark-delivered
POST /api/v1/feature-requests/:id/mark-duplicate
```

Reject:

```json
{
  "reason": "..."
}
```

Duplicate:

```json
{
  "original_request_id": "uuid"
}
```

---

# 60. Release API

## GET /releases

```http
GET /api/v1/releases
```

---

# 61. POST /releases

```http
POST /api/v1/releases
```

Request:

```json
{
  "version": "v2.4.1",
  "title": "Academic Stability Update",
  "summary": "..."
}
```

---

# 62. GET /releases/:id

Response:

```json
{
  "success": true,
  "data": {
    "release": {},
    "items": [],
    "affected_clients": [],
    "handoff_summary": {
      "total": 12,
      "pending": 4,
      "completed": 8
    }
  }
}
```

---

# 63. POST /releases/:id/items

```http
POST /api/v1/releases/:id/items
```

Request:

```json
{
  "type": "BUG_FIX",
  "title": "Fix nilai siswa tidak tersimpan",
  "description": "...",
  "issue_ids": [
    "uuid"
  ],
  "feature_request_ids": []
}
```

---

# 64. POST /releases/:id/impacts

```http
POST /api/v1/releases/:id/impacts
```

Request:

```json
{
  "clients": [
    {
      "client_id": "uuid",
      "impact_type": "DIRECT",
      "requires_follow_up": true
    }
  ]
}
```

---

# 65. POST /releases/:id/ready

```http
POST /api/v1/releases/:id/ready
```

Transition:

```text
DRAFT → READY
```

---

# 66. POST /releases/:id/publish

```http
POST /api/v1/releases/:id/publish
```

Backend action:

```text
validate release
↓
publish release
↓
generate release impact records
↓
generate handoffs
↓
client activities
↓
audit
↓
commit
↓
queue notifications
```

Response:

```json
{
  "success": true,
  "data": {
    "release_id": "uuid",
    "handoffs_created": 12
  },
  "message": "Release published"
}
```

---

# 67. Operational Handoff API

## GET /handoffs

```http
GET /api/v1/handoffs
```

Filters:

```text
client_id
release_id
ops_owner_id
status
requires_follow_up
page
limit
```

---

# 68. GET /handoffs/:id

```http
GET /api/v1/handoffs/:id
```

---

# 69. POST /handoffs/:id/acknowledge

```http
POST /api/v1/handoffs/:id/acknowledge
```

Business rule:

Only assigned Ops or authorized manager.

---

# 70. POST /handoffs/:id/complete

```http
POST /api/v1/handoffs/:id/complete
```

Backend checks:

```text
published documentation related to the handoff release must exist

if requires_follow_up = true
then completed follow-up must exist
```

---

# 71. Follow-up API

## GET /follow-ups

```http
GET /api/v1/follow-ups
```

Query:

```text
client_id
owner_id
status
type
overdue
due_from
due_to
page
limit
```

---

# 72. POST /follow-ups

```http
POST /api/v1/follow-ups
```

Request:

```json
{
  "client_id": "uuid",
  "handoff_id": "uuid",
  "owner_id": "uuid",
  "type": "ISSUE_RESOLUTION",
  "reason": "Inform school that issue has been resolved",
  "due_at": "2026-08-23T09:00:00Z"
}
```

---

# 73. POST /follow-ups/:id/start

```http
POST /api/v1/follow-ups/:id/start
```

---

# 74. POST /follow-ups/:id/complete

```http
POST /api/v1/follow-ups/:id/complete
```

Request:

```json
{
  "result": "Client confirmed issue resolved"
}
```

---

# 75. Documentation API

## GET /documentations

```http
GET /api/v1/documentations
```

Filters:

```text
search
status
author_id
feature_id
page
limit
```

---

# 76. POST /documentations

```http
POST /api/v1/documentations
```

Request:

```json
{
  "title": "Bulk Student Import",
  "summary": "...",
  "content": "...",
  "product_feature_ids": [
    "uuid"
  ]
}
```

---

# 77. GET /documentations/:id

```http
GET /api/v1/documentations/:id
```

---

# 78. PATCH /documentations/:id

Only editable content.

Workflow transition menggunakan action endpoint.

---

# 79. POST /documentations/:id/submit-review

```text
DRAFT → IN_REVIEW
```

---

# 80. POST /documentations/:id/publish

```text
IN_REVIEW → PUBLISHED
```

Backend verifies required fields.

---

# 81. POST /documentations/:id/archive

```text
PUBLISHED → ARCHIVED
```

---

# 82. Notification API

## GET /notifications

```http
GET /api/v1/notifications
```

Query:

```text
read
page
limit
```

---

# 83. GET /notifications/unread-count

```http
GET /api/v1/notifications/unread-count
```

Response:

```json
{
  "success": true,
  "data": {
    "count": 7
  }
}
```

---

# 84. POST /notifications/:id/read

```http
POST /api/v1/notifications/:id/read
```

---

# 85. POST /notifications/read-all

```http
POST /api/v1/notifications/read-all
```

---

# 86. Audit API

```http
GET /api/v1/audit-logs
```

Permission:

```text
audit.read
```

Filters:

```text
actor_id
action
resource_type
resource_id
from
to
page
limit
```

Audit log is read-only through normal API.

---

# 87. Dashboard API

Dashboard menggunakan composite endpoints agar frontend tidak perlu membuat terlalu banyak request.

## GET /dashboard/overview

```http
GET /api/v1/dashboard/overview
```

Response:

```json
{
  "success": true,
  "data": {
    "issues": {
      "open": 34,
      "critical": 2,
      "sla_breached": 4
    },
    "clients": {
      "healthy": 42,
      "attention": 8,
      "at_risk": 3
    },
    "follow_ups": {
      "pending": 7,
      "overdue": 2
    },
    "handoffs": {
      "pending": 5
    }
  }
}
```

---

# 88. GET /dashboard/issue-metrics

```http
GET /api/v1/dashboard/issue-metrics
```

Query:

```text
from
to
client_id
```

Returns:

```text
average resolution time
average first response
issue count by severity
issue count by status
waiting time breakdown
```

---

# 89. GET /dashboard/client-health

```http
GET /api/v1/dashboard/client-health
```

---

# 90. GET /dashboard/feature-demand

```http
GET /api/v1/dashboard/feature-demand
```

Response example:

```json
{
  "success": true,
  "data": [
    {
      "feature_request_id": "uuid",
      "title": "Attendance Export",
      "client_count": 7,
      "oldest_request_at": "..."
    }
  ]
}
```

---

# 91. File Upload API

Jika attachment bonus diimplementasikan:

```http
POST /api/v1/attachments
```

Content type:

```text
multipart/form-data
```

Backend validation:

```text
size
MIME
extension
authentication
authorization
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "original_name": "screenshot.png",
    "mime_type": "image/png",
    "size_bytes": 102400
  }
}
```

File binary disimpan di object storage, bukan local filesystem, sesuai bonus specification.

---

# 92. Rate Limiting

Endpoint sensitif:

```text
POST /auth/login
POST /auth/refresh
POST /attachments
```

mendapat rate limiting lebih ketat.

Saat limit terlampaui:

```http
429 Too Many Requests
```

Response:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED"
  },
  "message": "Too many requests"
}
```

Optional header:

```http
Retry-After: 60
```

---

# 93. Idempotency

Untuk operation tertentu yang berpotensi diulang karena network retry:

```text
release publish
follow-up creation
```

future improvement dapat mendukung:

```http
Idempotency-Key: uuid
```

MVP belum wajib apabila implementation complexity terlalu besar.

---

# 94. Request ID

Semua request mendapatkan:

```text
request_id
```

Response header:

```http
X-Request-ID: ...
```

Error response dapat menyertakan:

```json
{
  "error": {
    "request_id": "..."
  }
}
```

tanpa mengekspos internal detail.

---

# 95. API Security Headers

Minimal pertimbangkan:

```text
Content-Security-Policy
X-Content-Type-Options
Referrer-Policy
Strict-Transport-Security
```

sesuai deployment environment.

---

# 96. CORS

Production menggunakan explicit frontend origin.

Contoh:

```text
https://clientops.example.com
```

Jangan:

```text
Access-Control-Allow-Origin: *
```

bersamaan dengan credentialed requests.

Frontend Axios:

```text
withCredentials: true
```

---

# 97. Axios Behaviour Contract

Assessment mewajibkan behaviour khusus untuk beberapa status.

## 401

```text
request
↓
401
↓
attempt refresh
↓
success
→ retry original request

failure
→ clear auth state
→ redirect login
```

Multiple concurrent 401:

```text
ONE refresh request only
```

Request lain menunggu hasil refresh.

---

## 403

```text
do not refresh token
↓
show permission feedback
```

---

## 422

```text
map error.fields
↓
form inline errors
```

---

## 429

```text
show rate limit feedback
respect Retry-After
```

---

## 500

```text
generic server error feedback
request ID available for support
```

---

# 98. API Permission Example

Endpoint:

```http
POST /api/v1/issues/:id/mark-released
```

Request pipeline:

```text
Authenticate
    ↓
CSRF validation
    ↓
Require permission:
issue.mark_released
    ↓
Resource access policy
    ↓
Request validation
    ↓
Business service
    ↓
Transaction
```

Frontend hide/show button bukan security boundary.

---

# 99. API Transaction Example

Issue transition:

```text
POST /issues/:id/mark-qa
        ↓
load issue
        ↓
validate version
        ↓
validate permission
        ↓
validate state transition
        ↓
BEGIN
        ↓
update issue
        ↓
status history
        ↓
client activity
        ↓
audit log
        ↓
COMMIT
```

---

# 100. API Documentation

Seluruh endpoint dibuat sebagai OpenAPI specification.

Recommended:

```text
docs/api/openapi.yaml
```

dan Swagger UI:

```text
/api/docs
```

Dokumentasi minimal harus mencakup endpoint, method, auth, request, query parameter, response, error response, dan example sebagaimana diminta assessment.

---

# 101. MVP Endpoint Summary

## Authentication

```text
POST   /auth/login
POST   /auth/logout
POST   /auth/refresh
GET    /auth/me
```

## Clients

```text
GET    /clients
POST   /clients
GET    /clients/:id
PATCH  /clients/:id

GET    /clients/:id/contacts
POST   /clients/:id/contacts

GET    /clients/:id/owners
POST   /clients/:id/change-primary-owner

GET    /clients/:id/timeline
GET    /clients/:id/health
```

## Issues

```text
GET    /issues
POST   /issues
GET    /issues/:id
PATCH  /issues/:id

POST   /issues/:id/triage
POST   /issues/:id/assign
POST   /issues/:id/start-investigation
POST   /issues/:id/start-development
POST   /issues/:id/mark-qa
POST   /issues/:id/qa-failed
POST   /issues/:id/mark-released
POST   /issues/:id/start-follow-up
POST   /issues/:id/close
POST   /issues/:id/reopen

POST   /issues/:id/work-state

GET    /issues/:id/history
GET    /issues/:id/comments
POST   /issues/:id/comments
```

## Feature Requests

```text
GET    /feature-requests
POST   /feature-requests
GET    /feature-requests/:id

POST   /feature-requests/:id/add-client
POST   /feature-requests/:id/start-review
POST   /feature-requests/:id/accept
POST   /feature-requests/:id/reject
POST   /feature-requests/:id/mark-planned
POST   /feature-requests/:id/start-development
POST   /feature-requests/:id/mark-released
POST   /feature-requests/:id/mark-delivered
POST   /feature-requests/:id/mark-duplicate
```

## Releases

```text
GET    /releases
POST   /releases
GET    /releases/:id

POST   /releases/:id/items
POST   /releases/:id/impacts
POST   /releases/:id/ready
POST   /releases/:id/publish
```

## Operational Handoffs

```text
GET    /handoffs
GET    /handoffs/:id
POST   /handoffs/:id/acknowledge
POST   /handoffs/:id/complete
```

## Follow-ups

```text
GET    /follow-ups
POST   /follow-ups
POST   /follow-ups/:id/start
POST   /follow-ups/:id/complete
```

## Documentation

```text
GET    /documentations
POST   /documentations
GET    /documentations/:id
PATCH  /documentations/:id

POST   /documentations/:id/submit-review
POST   /documentations/:id/publish
POST   /documentations/:id/archive
```

## Notifications

```text
GET    /notifications
GET    /notifications/unread-count
POST   /notifications/:id/read
POST   /notifications/read-all
```

## Dashboard

```text
GET /dashboard/overview
GET /dashboard/issue-metrics
GET /dashboard/client-health
GET /dashboard/feature-demand
```

---

# 102. API Design Decision Summary

ClientOps menggunakan:

```text
REST
+
/api/v1 versioning
+
resource endpoints
+
explicit workflow action endpoints
+
consistent envelope
+
typed business errors
+
backend authorization
+
optimistic concurrency
+
composite read endpoints where useful
```

Alasan menggunakan explicit action endpoint:

```text
POST /issues/:id/close
```

daripada generic:

```text
PATCH /issues/:id
{
  "status": "CLOSED"
}
```

adalah karena workflow transition merupakan **business operation**, bukan sekadar perubahan field.

Dengan pendekatan ini:

> API merepresentasikan business intent, bukan hanya struktur database.
