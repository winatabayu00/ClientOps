# ClientOps — Frontend Information Architecture

## 1. Purpose

Dokumen ini mendefinisikan:

* Information architecture
* Route map
* Role-based navigation
* Main page structure
* Page responsibility
* Primary API integration
* UI state
* Interaction pattern
* Responsive behaviour

Frontend menggunakan:

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

Frontend hanya menjadi presentation dan interaction layer.

Business rules dan authorization tetap menjadi tanggung jawab backend.

---

# 2. Frontend Principles

## 2.1 ClientOps Is Workflow-First

UI tidak dibangun berdasarkan table database.

Jangan:

```text
Clients
Issues
Releases
Users
```

hanya sebagai CRUD menu.

UI harus membantu user menjawab:

```text
Apa yang perlu saya kerjakan sekarang?

Client mana yang membutuhkan perhatian?

Issue ini sedang berada di tahap mana?

Apa yang sedang menunggu saya?

Apa yang sudah dirilis tetapi belum dikomunikasikan?

Apa yang sedang menjadi bottleneck?
```

---

# 3. Main Application Layout

Desktop:

```text
┌─────────────────────────────────────────────────────────────┐
│ Top Bar                                                     │
│ Search | Notifications | User                              │
├──────────────┬──────────────────────────────────────────────┤
│              │                                              │
│ Sidebar      │ Main Content                                 │
│              │                                              │
│ Dashboard    │                                              │
│ Clients      │                                              │
│ Issues       │                                              │
│ Requests     │                                              │
│ Releases     │                                              │
│ Handoffs     │                                              │
│ Knowledge    │                                              │
│              │                                              │
│ Management   │                                              │
│              │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

---

# 4. Sidebar Structure

Recommended:

```text
CLIENTOPS

Overview
  Dashboard

CLIENT SUCCESS
  Clients
  Follow-ups

PRODUCT OPERATIONS
  Issues
  Feature Requests
  Releases
  Operational Handoffs

KNOWLEDGE
  Documentation

MANAGEMENT
  Users
  Roles & Permissions
  Audit Logs
  Settings
```

Menu ditampilkan sesuai permission.

---

# 5. Role-Based Navigation

## Super Admin

```text
Dashboard
Clients
Follow-ups
Issues
Feature Requests
Releases
Operational Handoffs
Documentation
Users
Roles & Permissions
Audit Logs
Settings
```

---

## Operations Manager

```text
Dashboard
Clients
Follow-ups
Issues
Feature Requests
Releases
Operational Handoffs
Documentation
Audit Logs [optional]
```

---

## Operations Staff

```text
Dashboard
My Clients
My Follow-ups
Issues
Feature Requests
Releases
Operational Handoffs
Documentation
```

---

## Product

```text
Dashboard
Clients [read]
Issues
Feature Requests
Releases
Documentation
Operational Handoffs [read]
```

---

## Engineer

```text
Dashboard
Issues
Feature Requests [read]
Releases
Documentation
```

---

# 6. Route Map

```text
/
├── /login
│
├── /dashboard
│
├── /clients
│   ├── /clients
│   ├── /clients/new
│   └── /clients/:clientId
│
├── /issues
│   ├── /issues
│   ├── /issues/new
│   └── /issues/:issueId
│
├── /feature-requests
│   ├── /feature-requests
│   ├── /feature-requests/new
│   └── /feature-requests/:requestId
│
├── /releases
│   ├── /releases
│   ├── /releases/new
│   └── /releases/:releaseId
│
├── /handoffs
│   ├── /handoffs
│   └── /handoffs/:handoffId
│
├── /follow-ups
│   ├── /follow-ups
│   └── /follow-ups/:followUpId
│
├── /documentation
│   ├── /documentation
│   ├── /documentation/new
│   └── /documentation/:documentId
│
├── /notifications
│
└── /management
    ├── /management/users
    ├── /management/roles
    ├── /management/audit-logs
    └── /management/settings
```

---

# 7. Authentication Routes

## `/login`

Purpose:

* User login
* Authentication error feedback
* Session initialization

API:

```text
POST /api/v1/auth/login
GET  /api/v1/auth/me
```

State:

```text
idle
submitting
invalid credentials
rate limited
server error
success
```

---

# 8. Application Bootstrap

Saat application load:

```text
App
 ↓
GET /auth/me
 ↓
Authenticated?
 ├── YES → load application
 └── NO  → /login
```

Protected route wrapper:

```text
RequireAuth
```

Permission wrapper:

```text
RequirePermission
```

Tetapi permission frontend hanya untuk UX.

Backend tetap memvalidasi permission.

---

# 9. Dashboard

Route:

```text
/dashboard
```

API:

```text
GET /api/v1/dashboard/overview
GET /api/v1/dashboard/issue-metrics
GET /api/v1/dashboard/client-health
GET /api/v1/dashboard/feature-demand
```

---

# 10. Dashboard Layout

```text
Dashboard
──────────────────────────────────────────

[ Open Issues ] [ SLA Breached ]
[ Follow-ups  ] [ Pending Handoffs ]

Client Health
────────────────
Healthy       42
Attention      8
At Risk        3

Issue Overview
────────────────
chart / status breakdown

Waiting Time Breakdown
────────────────
Engineering
Client
Ops
Product
Release

Clients Needing Attention
───────────────────────────
SMA A
SMA B
SMP C

Top Feature Demand
──────────────────
Attendance Export     7 clients
Bulk Student Import   5 clients

Recent Activity
────────────────
...
```

Dashboard harus actionable, bukan hanya statistik.

Contoh:

Klik:

```text
SLA Breached = 4
```

mengarahkan:

```text
/issues?filter=sla_breached
```

---

# 11. Client List

Route:

```text
/clients
```

API:

```text
GET /api/v1/clients
```

---

# 12. Client List UI

```text
Clients

[ Search school... ]

Status [All ▼]
Health [All ▼]
Owner  [All ▼]

────────────────────────────────────────────
School           Owner       Health    Issues
────────────────────────────────────────────
SMA Nusantara    Sarah       Healthy      1
SMA Merdeka      John        Attention    4
SMK Digital      Sarah       At Risk      7
────────────────────────────────────────────

< Previous     1 2 3      Next >
```

---

# 13. Client Card / Table Data

Minimum:

```text
name
type
status
primary owner
health score
open issues
pending follow-ups
last activity
```

---

# 14. Client Empty State

```text
No clients found

Try changing your filters
or add a new client.
```

CTA jika permission:

```text
+ Add Client
```

---

# 15. Client Detail

Route:

```text
/clients/:clientId
```

Primary API:

```text
GET /api/v1/clients/:id
```

Additional:

```text
GET /api/v1/clients/:id/timeline
GET /api/v1/clients/:id/health
```

---

# 16. Client Detail Structure

Header:

```text
SMA Nusantara
Senior High School

Healthy • 86/100

Primary Ops:
Sarah

[ Edit ] [ Add Follow-up ]
```

Tabs:

```text
Overview
Issues
Requests
Timeline
Contacts
Relationship
```

---

# 17. Client Overview Tab

```text
Relationship Health

86 / 100
HEALTHY

Reasons
✓ No SLA breach
✓ Recent successful follow-up
✓ Low unresolved issue count


Operational Summary

Open Issues           2
Critical Issues       0
Pending Requests      3
Pending Follow-ups    1


Recent Activity

Issue resolved
Release published
Client follow-up
Feature requested
```

---

# 18. Client Issues Tab

Reuse issue table with fixed:

```text
client_id = current client
```

API:

```text
GET /api/v1/issues?client_id=:id
```

---

# 19. Client Requests Tab

API:

```text
GET /api/v1/feature-requests?client_id=:id
```

---

# 20. Client Timeline Tab

API:

```text
GET /api/v1/clients/:id/timeline
```

UI:

```text
22 Aug
Issue ISS-123 moved to QA

21 Aug
Feature request "Attendance Export"

20 Aug
Ops follow-up completed

18 Aug
Issue ISS-123 reported
```

---

# 21. Client Contacts Tab

API:

```text
GET  /clients/:id/contacts
POST /clients/:id/contacts
```

UI:

```text
Primary Contact

Budi Santoso
Head of Administration
0812...
budi@school.id
```

---

# 22. Client Relationship Tab

Shows:

```text
Current health
Follow-up history
Pending follow-up
Interaction frequency
Relationship notes
```

Future:

```text
product adoption
training
success milestones
value delivered
```

---

# 23. Issue List

Route:

```text
/issues
```

API:

```text
GET /api/v1/issues
```

---

# 24. Issue List Filters

```text
Search

Status
Severity
Client
Assignee
Work State
Date

Sort:
Newest
Oldest
Severity
SLA
```

---

# 25. Issue Table

```text
Issue        Client       Severity   Status         Assignee
────────────────────────────────────────────────────────────
ISS-123      SMA A        HIGH       Development    John
ISS-124      SMP B        MEDIUM     Investigating  Sarah
ISS-125      SMA C        CRITICAL   QA             Alex
```

Additional:

```text
SLA indicator
age
current waiting state
```

---

# 26. SLA Indicator

Example:

```text
✓ On Track
⚠ Due in 45m
✕ Breached
```

Visual status harus memiliki text, bukan hanya color.

---

# 27. New Issue

Route:

```text
/issues/new
```

API:

```text
POST /api/v1/issues
```

Fields:

```text
Client *
Title *
Description *
Category *
Severity *
Attachments
```

Form:

```text
React Hook Form
+
Zod
```

Backend `422` mapped ke inline field errors.

---

# 28. Issue Detail

Route:

```text
/issues/:issueId
```

API:

```text
GET /api/v1/issues/:id
```

---

# 29. Issue Detail Layout

Desktop:

```text
┌─────────────────────────────────────┬───────────────┐
│                                     │               │
│ Issue Details                       │ Context       │
│                                     │               │
│ Timeline / Discussion               │ Client        │
│                                     │ Assignee      │
│                                     │ SLA           │
│                                     │ Work State    │
│                                     │ Release       │
│                                     │               │
└─────────────────────────────────────┴───────────────┘
```

---

# 30. Issue Header

```text
ISS-2026-00123

Nilai siswa tidak dapat disimpan

HIGH

IN DEVELOPMENT

SMA Nusantara
```

Actions based on current state + permission:

```text
Assign
Start Investigation
Start Development
Mark QA
Mark Released
Start Follow-up
Close
Reopen
```

---

# 31. Workflow Stepper

```text
Reported
   ✓
Triaged
   ✓
Investigating
   ✓
Development
   ●
QA
   ○
Released
   ○
Follow-up
   ○
Closed
```

User langsung tahu posisi issue.

Ini salah satu UI paling penting untuk menjawab problem:

> "Ini sudah di tahap apa?"

---

# 32. Current Work State

Example:

```text
Current Work State

WAITING CLIENT

Waiting since:
2 hours 14 minutes

Reason:
Need screenshot from school.
```

CTA:

```text
Resume Work
Change Waiting State
```

---

# 33. Time Breakdown

Issue detail:

```text
Elapsed            3d 4h

Active Work        12h
Waiting Client     19h
Waiting Internal   18h
Blocked            7h
```

Tujuan:

membedakan perceived delay dari actual work.

---

# 34. Issue Timeline

Gabungkan:

```text
status history
comments
assignment
work state changes
release linkage
follow-up
```

UI:

```text
14:30
John moved issue
IN DEVELOPMENT → QA

13:20
John
"Fix implemented..."

11:05
Work resumed

09:20
Waiting for client
"Need example student data"
```

---

# 35. Feature Request List

Route:

```text
/feature-requests
```

API:

```text
GET /api/v1/feature-requests
```

Table:

```text
Request        Status      Demand      Oldest    Priority
────────────────────────────────────────────────────────
Attendance     Review      7 schools   41 days   High
Bulk Import    Planned     5 schools   19 days   Medium
```

---

# 36. Feature Demand Is Primary

Jangan hanya tampilkan:

```text
request title
status
```

Tampilkan:

```text
number of requesting schools
oldest request age
affected clients
```

Karena tujuan modul ini adalah membantu melihat **demand**, bukan hanya ticket.

---

# 37. Feature Request Detail

Route:

```text
/feature-requests/:requestId
```

Layout:

```text
Problem
Expected Outcome
Status
Priority

Demand
7 Schools

Requesting Clients
──────────────────
SMA A
SMA B
SMA C

Timeline
──────────────────

Related Release
──────────────────
v2.5.0
```

Actions:

```text
Start Review
Accept
Reject
Mark Planned
Start Development
Mark Released
Mark Delivered
Mark Duplicate
```

---

# 38. Add Existing Demand

If Ops menemukan request sama:

```text
This capability already exists as request FR-102.

[ Add SMA XYZ to Existing Demand ]
```

Tujuannya menghindari duplicate requests.

---

# 39. Release List

Route:

```text
/releases
```

API:

```text
GET /api/v1/releases
```

UI:

```text
Version    Status      Date        Clients
──────────────────────────────────────────
v2.4.1     Published   Aug 22      12
v2.5.0     Draft       -            -
```

---

# 40. Release Detail

Route:

```text
/releases/:releaseId
```

Sections:

```text
Release Summary
Release Items
Affected Clients
Operational Handoffs
Documentation
Activity
```

---

# 41. Release Item

Example:

```text
BUG FIX

Fix nilai siswa tidak tersimpan

Related:
ISS-2026-00123

Affected:
SMA Nusantara
```

---

# 42. Publish Release Confirmation

Publishing is high-impact.

Dialog:

```text
Publish Release v2.4.1?

This will:

• Mark the release as published
• Generate client impacts
• Create operational handoffs
• Notify relevant Operations users

[ Cancel ]
[ Publish Release ]
```

Loading state required.

---

# 43. Operational Handoff List

Route:

```text
/handoffs
```

API:

```text
GET /api/v1/handoffs
```

This is one of ClientOps differentiators.

---

# 44. Handoff List Layout

```text
Operational Handoffs

[ Pending 5 ] [ Follow-up 3 ] [ Completed 42 ]

Client          Release     Status       Owner
──────────────────────────────────────────────
SMA A           v2.4.1      Pending      Sarah
SMA B           v2.4.1      Follow-up    John
SMP C           v2.4.0      Completed    Sarah
```

---

# 45. Handoff Detail

Route:

```text
/handoffs/:handoffId
```

Show:

```text
Client
Release
Affected Changes
Ops Owner
Acknowledgement
Required Follow-up
Related Documentation
```

Workflow:

```text
Pending
  ↓
Acknowledged
  ↓
Follow-up
  ↓
Completed
```

---

# 46. Acknowledge Action

```text
I understand this change
and its impact on the client.

[ Acknowledge ]
```

API:

```text
POST /handoffs/:id/acknowledge
```

---

# 47. Follow-up List

Route:

```text
/follow-ups
```

API:

```text
GET /api/v1/follow-ups
```

Filters:

```text
My follow-ups
Overdue
Due today
Completed
Client
```

---

# 48. Follow-up Card

```text
SMA Nusantara

Issue Resolution

Due:
Today 16:00

Reason:
Inform school that grade issue
has been fixed.

[ Start Follow-up ]
```

---

# 49. Complete Follow-up

Dialog/form:

```text
Follow-up Result *

[ Client confirmed issue resolved... ]

[ Complete Follow-up ]
```

API:

```text
POST /follow-ups/:id/complete
```

---

# 50. Documentation List

Route:

```text
/documentation
```

API:

```text
GET /api/v1/documentations
```

UI style should feel more like knowledge base, not spreadsheet.

```text
Search documentation...

Product Modules
───────────────
Academic
Attendance
Student Management

Recently Updated
────────────────
Bulk Student Import
Report Card Generation
Attendance Export
```

---

# 51. Documentation Detail

Route:

```text
/documentation/:documentId
```

Show:

```text
Title
Status
Author
Last reviewed
Review due
Related feature
Related release

Content
```

If stale:

```text
⚠ Documentation review overdue
```

---

# 52. Documentation Editor

Route:

```text
/documentation/new
```

or edit mode.

Fields:

```text
Title
Summary
Content
Related Feature
```

Workflow action:

```text
Save Draft
Submit for Review
Publish
```

---

# 53. Notifications

Topbar bell.

API:

```text
GET /notifications/unread-count
GET /notifications
```

Dropdown:

```text
5 New Notifications

Issue ISS-123 assigned to you

Release v2.4.1 requires
your acknowledgement

Follow-up with SMA ABC
is due in 1 hour
```

---

# 54. Users Management

Route:

```text
/management/users
```

API:

```text
GET /users
POST /users
PATCH /users/:id
PUT /users/:id/roles
```

UI:

```text
Users

Name       Email        Role       Status
─────────────────────────────────────────
Sarah      ...          Ops Staff  Active
John       ...          Engineer   Active
```

---

# 55. Role Management

Route:

```text
/management/roles
```

UI:

```text
Role
OPS_MANAGER

Permissions

Clients
[x] read
[x] update
[x] health

Issues
[x] read
[x] create
[x] assign
[x] escalate
...
```

Permission configuration should be clear enough to demonstrate RBAC.

---

# 56. Audit Logs

Route:

```text
/management/audit-logs
```

API:

```text
GET /api/v1/audit-logs
```

Table:

```text
Time       Actor     Action                  Resource
─────────────────────────────────────────────────────
14:30      John      ISSUE_STATUS_CHANGED    ISS-123
14:20      Sarah     CLIENT_OWNER_CHANGED    SMA ABC
```

Detail drawer:

```text
Before
After
Request ID
IP
Timestamp
```

Sensitive values must already be sanitized backend-side.

---

# 57. Global Search

Future or MVP+:

Topbar:

```text
Search clients, issues, requests...
```

Results grouped:

```text
Clients
SMA Nusantara

Issues
ISS-123

Feature Requests
Attendance Export
```

Not required for initial MVP.

---

# 58. Loading State

Every data screen must handle:

```text
loading
success
empty
error
```

Required by assessment.

Preferred:

```text
Skeleton
```

for list/detail.

Spinner only for smaller actions.

---

# 59. Mutation Loading

Example:

```text
[ Publish Release ]
```

becomes:

```text
[ Publishing... ]
```

and disabled.

Prevent double submit.

---

# 60. Error State

Page error:

```text
Something went wrong

We couldn't load this data.

Request ID:
REQ-ABC123

[ Try Again ]
```

Don't show stack trace.

---

# 61. Empty State

Context specific.

Bad:

```text
No data.
```

Better:

```text
No pending handoffs

All released changes have been
acknowledged by Operations.
```

---

# 62. Permission State

If menu action unavailable:

Prefer not rendering destructive/action controls.

But direct route access:

```text
403
```

UI:

```text
You don't have permission
to access this page.
```

---

# 63. 404

Route:

```text
/not-found
```

Display:

```text
Page not found

The resource may have been removed
or the URL is incorrect.

[ Back to Dashboard ]
```

---

# 64. 429 State

Toast:

```text
Too many requests.

Please try again in 45 seconds.
```

Respect:

```text
Retry-After
```

---

# 65. Responsive Behaviour

Desktop:

```text
sidebar expanded
large data tables
split detail layouts
```

Tablet:

```text
sidebar collapsible
table horizontal scroll / adaptive cards
```

Mobile:

```text
drawer navigation
cards instead of dense tables
single-column detail
sticky primary actions where appropriate
```

Assessment explicitly meminta desktop, tablet, dan mobile.

---

# 66. Reusable Components

Core UI:

```text
Button
IconButton
Input
Textarea
Select
Combobox
Checkbox
DatePicker

Badge
Card

Dialog
ConfirmationDialog
Drawer

Table
DataTable
Pagination

Tabs
Breadcrumb

Dropdown
Menu

Toast

Skeleton
Spinner
EmptyState
ErrorState

FormField

StatusBadge
SeverityBadge
HealthBadge
SLAIndicator
```

Requirement juga meminta reusable components dan menghindari duplikasi fungsi.

---

# 67. Domain Components

Avoid making everything generic.

Create meaningful domain components:

```text
IssueWorkflowStepper
IssueTimeBreakdown
IssueWorkStateCard

ClientHealthCard
ClientActivityTimeline

FeatureDemandSummary

ReleaseImpactTable

OperationalHandoffCard

FollowUpCard
```

These contain presentation logic specific to ClientOps.

---

# 68. Frontend Folder Structure

Recommended:

```text
frontend/
├── src/
│   ├── app/
│   │   ├── router/
│   │   ├── providers/
│   │   └── layouts/
│   │
│   ├── components/
│   │   ├── ui/
│   │   └── shared/
│   │
│   ├── features/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── clients/
│   │   ├── issues/
│   │   ├── feature-requests/
│   │   ├── releases/
│   │   ├── handoffs/
│   │   ├── follow-ups/
│   │   ├── documentation/
│   │   ├── notifications/
│   │   └── management/
│   │
│   ├── lib/
│   │   ├── axios/
│   │   ├── query/
│   │   └── validation/
│   │
│   ├── hooks/
│   ├── types/
│   └── main.tsx
```

---

# 69. Feature Module Example

```text
features/issues/
├── api/
│   ├── get-issues.ts
│   ├── get-issue.ts
│   ├── create-issue.ts
│   └── transition-issue.ts
│
├── components/
│   ├── issue-table.tsx
│   ├── issue-detail.tsx
│   ├── issue-workflow-stepper.tsx
│   └── issue-time-breakdown.tsx
│
├── hooks/
├── schemas/
├── types/
└── pages/
```

---

# 70. API Access Pattern

Don't scatter direct Axios calls inside components.

Bad:

```text
IssuePage
→ axios.get(...)
```

Preferred:

```text
features/issues/api/get-issue.ts
        ↓
TanStack Query hook
        ↓
IssuePage
```

---

# 71. Query Keys

Structured keys:

```text
["clients", filters]

["client", clientId]

["issues", filters]

["issue", issueId]

["issue", issueId, "history"]

["handoffs", filters]
```

---

# 72. Mutation Invalidation

Example:

Issue transition:

```text
POST transition
       ↓
success
       ↓
invalidate:
["issue", id]
["issues"]
["client", clientId]
["dashboard"]
```

Avoid global invalidation unnecessarily.

---

# 73. Axios Instance

Centralized:

```text
lib/axios/client.ts
```

Config:

```text
baseURL
withCredentials: true
timeout
CSRF header
```

Interceptors:

```text
401
403
422
429
500
```

---

# 74. Refresh Token Concurrency

Frontend must implement:

```text
request A → 401
request B → 401
request C → 401

        ↓

ONE refresh request

        ↓

A/B/C wait

        ↓

success
→ retry A/B/C

or failure
→ logout once
```

Assessment explicitly menyoroti infinite retry, duplicate refresh, race condition, dan failed refresh.

---

# 75. Form Error Mapping

Backend:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "fields": {
      "title": ["Title is required"]
    }
  }
}
```

Frontend:

```text
setError("title", ...)
```

No generic toast-only validation.

---

# 76. Confirmation Dialog

Required for destructive/high-impact action:

```text
Archive client
Reject request
Publish release
Revoke session
Change primary owner
```

---

# 77. Toast Strategy

Toast used for:

```text
success feedback
short operational errors
background notification feedback
```

Not for critical form validation.

Example:

```text
Issue moved to QA.
```

---

# 78. Accessibility

Minimum:

```text
semantic HTML
form labels
keyboard navigation
focus state
dialog focus trap
aria labels where needed
contrast
```

Don't rely solely on color.

Example:

```text
CRITICAL
```

must display text in addition to red styling.

---

# 79. URL as State

List filters should sync with URL where useful.

Example:

```text
/issues?status=QA&severity=HIGH&page=2
```

Benefits:

```text
shareable
bookmarkable
browser back/forward
```

---

# 80. Page → API Mapping

| Page             | Main API                    |
| ---------------- | --------------------------- |
| Login            | `POST /auth/login`          |
| Dashboard        | `/dashboard/*`              |
| Client List      | `GET /clients`              |
| Client Detail    | `GET /clients/:id`          |
| Client Timeline  | `GET /clients/:id/timeline` |
| Issue List       | `GET /issues`               |
| Issue Detail     | `GET /issues/:id`           |
| Feature Requests | `GET /feature-requests`     |
| Release Detail   | `GET /releases/:id`         |
| Handoffs         | `GET /handoffs`             |
| Follow-ups       | `GET /follow-ups`           |
| Documentation    | `GET /documentations`       |
| Notifications    | `GET /notifications`        |
| Users            | `GET /users`                |
| Audit            | `GET /audit-logs`           |

---

# 81. MVP Pages

Must complete:

```text
/login

/dashboard

/clients
/clients/:id

/issues
/issues/new
/issues/:id

/feature-requests
/feature-requests/:id

/releases
/releases/:id

/handoffs

/follow-ups

/documentation
/documentation/:id

/management/users
/management/roles

403
404
```

---

# 82. MVP+ Pages

If time allows:

```text
/client health analytics
audit logs
auth session management
documentation editor
attachment manager
notification center
```

---

# 83. Future Client Portal

Not part of initial internal application.

Future route concept:

```text
/portal
├── /portal/issues
├── /portal/requests
├── /portal/updates
├── /portal/knowledge
└── /portal/success
```

This can later extend the same domain without redesigning the core.

---

# 84. UI Product Differentiators

ClientOps should visually emphasize three concepts.

## Visibility

```text
Where is the work now?
```

Use:

```text
workflow stepper
ownership
SLA
work state
time breakdown
```

---

## Handoff

```text
Who needs to know after technical delivery?
```

Use:

```text
release impact
ops acknowledgement
follow-up
```

---

## Client Success

```text
Is the client relationship healthy?
```

Use:

```text
health score
timeline
pending follow-up
issue context
```

---

# 85. Critical Demo Flow

The UI must make this scenario easy to demonstrate:

```text
1. Login as Ops

2. Open SMA Nusantara

3. Create issue

4. Issue appears REPORTED

5. Login as Engineer

6. Triage + investigate

7. Show work state:
   WAITING_CLIENT

8. Resume work

9. Move through Development → QA

10. Publish release

11. Show affected school

12. Login as Ops

13. See handoff notification

14. Acknowledge release

15. Complete client follow-up

16. Close issue

17. Return to client timeline

18. Show complete history
```

This flow should be the centerpiece of the take-home demo.

---

# 86. Frontend Definition of Done

A page is not considered complete merely because data renders.

Each completed page must account for:

```text
authorization
loading
empty
error
success
responsive layout
validation
mutation loading
feedback
accessibility
```

This directly aligns with the UI/UX requirements in the assessment.

---

# 87. Final Frontend Principle

ClientOps frontend should make organizational state visible without requiring the user to reconstruct context from chat, spreadsheets, or conversations.

The UI should consistently answer:

> **What happened?**

> **What is happening now?**

> **Who owns it?**

> **What is waiting?**

> **What needs to happen next?**

> **Has the client actually received the value?**
