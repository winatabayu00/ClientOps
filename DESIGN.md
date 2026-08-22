# DESIGN.md

## 1. Purpose

Dokumen ini mendefinisikan arah desain ClientOps dari sisi:

* Visual identity
* Layout system
* Navigation
* Page hierarchy
* Component system
* Interaction pattern
* Status visualization
* Responsive behaviour
* UX states
* Domain-specific UI patterns

Tujuan desain bukan sekadar membuat dashboard terlihat modern.

ClientOps harus membuat informasi operasional yang kompleks menjadi mudah dipahami dalam beberapa detik.

Pertanyaan yang harus selalu bisa dijawab user:

```text
Apa yang sedang terjadi?

Sudah sampai tahap mana?

Siapa yang bertanggung jawab?

Apa yang sedang menunggu?

Apa yang harus dilakukan berikutnya?

Apakah client sudah menerima hasilnya?
```

---

# 2. Design Philosophy

ClientOps menggunakan prinsip:

> **Clarity over decoration.**

Desain harus:

```text
clean
professional
calm
information-dense
easy to scan
action-oriented
consistent
```

Hindari:

```text
excessive gradient
heavy glassmorphism
too many colors
decorative animation
oversized cards
dashboard gimmicks
```

ClientOps adalah operational application.

UI harus terasa seperti:

```text
reliable work system
```

bukan landing page marketing.

---

# 3. Product Personality

Karakter visual:

```text
Professional
Trustworthy
Modern
Calm
Operational
Human
```

Karena domain berhubungan dengan sekolah/client, visual tidak boleh terlalu:

```text
corporate-finance
dark-dev-tool
aggressive
```

Tetap terasa approachable.

---

# 4. Design Direction

Gunakan gaya:

> **Modern B2B SaaS Dashboard**

Referensi karakter, bukan copy visual:

```text
Linear
Attio
Stripe Dashboard
Vercel Dashboard
Notion
Modern enterprise admin tools
```

Target akhirnya:

```text
minimal visual noise
strong hierarchy
compact but breathable
clear status
fast navigation
```

---

# 5. Color System

Gunakan neutral-dominant interface.

## Background

```text
Application background:
very light neutral

Surface:
white

Secondary surface:
light neutral
```

Dark mode tidak wajib untuk MVP.

---

# 6. Primary Color

Pilih satu primary brand color.

Recommended direction:

```text
Blue / Indigo family
```

Reason:

```text
trust
technology
education
professional
calm
```

Jangan menggunakan primary color pada semua komponen.

Primary digunakan untuk:

```text
primary action
active navigation
selected states
links
focus
```

---

# 7. Semantic Colors

Semantic colors harus konsisten.

## Success

Digunakan untuk:

```text
healthy
completed
on track
published
resolved
```

## Warning

```text
attention
due soon
waiting
review required
```

## Danger

```text
critical
SLA breach
failed
destructive action
at risk
```

## Information

```text
active workflow
processing
general informational state
```

Jangan menggunakan warna saja sebagai informasi.

Selalu sertakan:

```text
text
icon
label
```

---

# 8. Status Color Consistency

Contoh:

```text
REPORTED
neutral

TRIAGED
info

INVESTIGATING
info

IN_DEVELOPMENT
primary

QA
warning

RELEASED
success

FOLLOW_UP
warning

CLOSED
success
```

Status tidak perlu masing-masing memiliki warna berbeda.

Yang penting user dapat membedakan kategori:

```text
not started
active
waiting
done
problem
```

---

# 9. Severity

Severity memiliki visual hierarchy lebih kuat.

```text
LOW
neutral

MEDIUM
info

HIGH
warning

CRITICAL
danger
```

Critical harus mudah terlihat dalam table tanpa membuat seluruh row merah.

Preferred:

```text
badge
icon
small accent
```

bukan full destructive background.

---

# 10. Typography

Gunakan sans-serif modern.

Recommended:

```text
Inter
```

atau system font equivalent.

Hierarchy:

```text
Page Title
24–30 px
semibold

Section Title
18–20 px
semibold

Card Title
14–16 px
medium / semibold

Body
14 px

Metadata
12–13 px
```

Hindari terlalu banyak ukuran font.

---

# 11. Text Hierarchy

Contoh Issue:

```text
ISS-2026-00123
small / muted

Nilai siswa tidak dapat disimpan
large / strong

SMA Nusantara • HIGH • In Development
secondary
```

User harus melihat title terlebih dahulu, bukan ID.

---

# 12. Spacing System

Gunakan spacing scale konsisten.

Concept:

```text
4
8
12
16
20
24
32
40
48
```

Page:

```text
24–32px horizontal desktop
16–20px mobile
```

Cards:

```text
16–24px padding
```

Jangan menggunakan spacing arbitrary di setiap halaman.

---

# 13. Border Radius

Recommended:

```text
Input:
6–8px

Button:
6–8px

Card:
8–12px

Dialog:
10–12px
```

Hindari rounded sangat besar karena dapat membuat enterprise interface terasa terlalu playful.

---

# 14. Shadows

Gunakan shadow minimal.

Primary separation:

```text
border
```

bukan heavy shadow.

Card:

```text
subtle border
optional tiny shadow
```

Modal/dropdown dapat memakai shadow lebih jelas.

---

# 15. Layout Architecture

Desktop application menggunakan:

```text
Sidebar
+
Topbar
+
Main Content
```

Structure:

```text
┌─────────────────────────────────────────────────┐
│ Topbar                                          │
├─────────────┬───────────────────────────────────┤
│             │                                   │
│ Sidebar     │ Main Content                      │
│             │                                   │
│             │                                   │
└─────────────┴───────────────────────────────────┘
```

---

# 16. Sidebar

Desktop width:

```text
240–260px
```

Collapsed optional:

```text
64–72px
```

MVP tidak wajib collapsed state jika waktunya terbatas.

---

# 17. Sidebar Groups

```text
OVERVIEW
  Dashboard

CLIENT SUCCESS
  Clients
  Follow-ups

PRODUCT OPERATIONS
  Issues
  Feature Requests
  Releases
  Handoffs

KNOWLEDGE
  Documentation

MANAGEMENT
  Users
  Roles & Permissions
  Audit Logs
```

Gunakan group label kecil dan muted.

---

# 18. Active Navigation

Active item:

```text
subtle primary background
primary text/icon
medium font weight
```

Hindari:

```text
giant colored block
heavy left border + background + shadow simultaneously
```

---

# 19. Topbar

Contents:

```text
Page context / breadcrumb
Global Search [future]
Notification
User profile
```

Height:

```text
56–64px
```

Topbar tidak perlu dipenuhi informasi.

---

# 20. Page Header Pattern

Semua main page mengikuti pola:

```text
Page Title
Short Description                       Primary Action
──────────────────────────────────────────────────────
Page Content
```

Example:

```text
Issues
Track client issues from report to operational closure.

                                    + New Issue
```

---

# 21. Breadcrumb

Gunakan untuk nested detail.

Example:

```text
Clients / SMA Nusantara / Issues / ISS-2026-00123
```

Mobile dapat disederhanakan.

---

# 22. Content Width

Listing/dashboard:

```text
full available width
```

Documentation/forms:

```text
max-width constrained
```

Jangan membuat long-form documentation menggunakan 1600px full width.

---

# 23. Dashboard Design

Dashboard tidak boleh hanya menjadi grid angka.

Hierarchy:

```text
1. Immediate attention
2. Operational overview
3. Client health
4. Trends / demand
5. Recent activity
```

---

# 24. Dashboard Top Area

Recommended:

```text
┌───────────────┐
│ SLA Breached  │
│      4        │
└───────────────┘

┌───────────────┐
│ Critical      │
│      2        │
└───────────────┘

┌───────────────┐
│ Follow-ups    │
│      7        │
└───────────────┘

┌───────────────┐
│ Handoffs      │
│      5        │
└───────────────┘
```

Metrics yang memerlukan perhatian didahulukan daripada vanity metrics.

---

# 25. Metric Card

Metric card:

```text
Label
Value
Context / change
Optional icon
```

Avoid oversized 72px numbers.

Value harus clickable jika memiliki target listing.

Example:

```text
SLA Breached
4 issues
View issues →
```

---

# 26. Dashboard Charts

Maksimal beberapa chart meaningful.

Preferred:

```text
Issue by Status
Waiting Time Breakdown
Client Health Distribution
Feature Demand
```

Avoid:

```text
pie chart everywhere
3D chart
decorative graph
```

Jika data lebih mudah dibaca dalam list, gunakan list.

---

# 27. Data Table Design

Table adalah komponen utama.

Structure:

```text
Toolbar
Filter
Search
────────────────────
Header
Rows
────────────────────
Pagination
```

Rows:

```text
44–52px height
```

Tidak terlalu besar.

---

# 28. Table Actions

Primary row action:

```text
click row
```

Secondary:

```text
⋯ menu
```

Jangan menaruh 5 icon actions di setiap row.

---

# 29. Table Columns

Prioritize meaningful information.

Issue example:

```text
Issue
Client
Severity
Status
Assignee
SLA
Updated
```

Avoid database-centric:

```text
UUID
Created At
Updated At
Version
```

unless operationally useful.

---

# 30. Search

Search input:

```text
Search issues...
```

Width desktop:

```text
240–320px
```

Search should not occupy entire screen.

---

# 31. Filters

Use:

```text
Select
Combobox
Popover
```

Example:

```text
Status
Severity
Client
Assignee
```

Active filters should be visible.

Example:

```text
Status: QA ×
Severity: High ×
```

Provide:

```text
Clear filters
```

when several are active.

---

# 32. Pagination

Desktop:

```text
Showing 1–20 of 128

Previous
1
2
3
...
Next
```

Mobile:

```text
Previous
Page 2 of 7
Next
```

---

# 33. Client List Design

Client is not merely a row.

Useful columns:

```text
School
Primary Ops
Health
Open Issues
Pending Follow-up
Last Activity
```

School name can include:

```text
small school avatar/logo
```

but logo should not dominate.

---

# 34. Client Health

Display:

```text
86
Healthy
```

Avoid circular gauge unless it materially helps.

A simple:

```text
badge
score
factor list
```

is clearer.

---

# 35. Client Detail Hero

Header:

```text
SMA Nusantara
Senior High School • Surabaya

HEALTHY 86

Primary Ops
Sarah

[ Add Follow-up ] [ Edit ]
```

Under header:

```text
Overview
Issues
Requests
Timeline
Contacts
Relationship
```

---

# 36. Client Overview

Top:

```text
Health
Operational Summary
```

Then:

```text
Current Attention
Recent Activity
```

Do not show all historical information at once.

---

# 37. Attention Card

If client requires attention:

```text
Needs Attention

1 SLA breached
2 pending follow-ups
1 issue open > 14 days
```

CTA:

```text
Review issues
```

This is more useful than simply showing score 58.

---

# 38. Issue Detail — Core Screen

This screen gets highest design priority.

Layout desktop:

```text
┌────────────────────────────────────┬─────────────────────┐
│ Main                               │ Context             │
│                                    │                     │
│ Title                              │ Client              │
│ Workflow                           │ Assignee            │
│ Timeline                           │ Severity            │
│ Discussion                         │ SLA                 │
│                                    │ Work State          │
│                                    │ Release             │
│                                    │                     │
└────────────────────────────────────┴─────────────────────┘
```

Suggested ratio:

```text
70 / 30
```

or:

```text
2fr / 1fr
```

---

# 39. Issue Header

Example:

```text
ISS-2026-00123

Nilai siswa tidak dapat disimpan

[ HIGH ] [ In Development ]

Reported by Sarah
2 hours ago
```

Right:

```text
[ Change Work State ] [ ⋯ ]
```

Actions should depend on role/status.

---

# 40. Workflow Stepper

Primary horizontal component desktop:

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

Mobile:

```text
vertical compact timeline
```

---

# 41. Workflow Stepper Rules

Completed:

```text
check icon
muted/positive
```

Current:

```text
primary highlight
strong label
```

Future:

```text
muted
```

Rejected/failure:

Use context inside timeline rather than permanently changing primary workflow visualization.

---

# 42. Work State Card

Example:

```text
Waiting for Client

Need screenshot showing failed save.

Started
2h 14m ago

[ Resume Work ]
```

Use warning/information surface.

Avoid presenting waiting as error automatically.

---

# 43. Time Breakdown

Display compact:

```text
Elapsed
3d 4h

Active
12h

Waiting Client
19h

Internal Waiting
18h

Blocked
7h
```

Potential visualization:

```text
horizontal stacked bar
```

but labels and actual durations remain visible.

---

# 44. Why Time Breakdown Matters

This is not decoration.

It represents core product insight:

```text
Elapsed time
≠
Engineering active time
```

Make this understandable visually without explanation.

---

# 45. Issue Timeline

Timeline entries:

```text
[icon] 14:30
John moved issue to QA

[comment] 13:20
Fix implemented...

[waiting] 11:05
Waiting for client

[created] 09:10
Issue reported by Sarah
```

Use chronological layout.

---

# 46. Timeline Density

Keep event row compact.

Long comment can expand.

Avoid giant cards per activity.

---

# 47. Comments

Internal comments should visually distinguish from client-visible updates if future portal is enabled.

Example label:

```text
Internal note
```

Do not depend only on color.

---

# 48. Feature Request UI

Primary information:

```text
Problem
Expected Outcome
Demand
Status
```

Not just title/status.

---

# 49. Demand Visualization

Example:

```text
Requested by 7 schools

SMA Nusantara
SMA Merdeka
SMK Digital
+4 others
```

Add:

```text
Oldest request: 41 days
```

This emphasizes prioritization context.

---

# 50. Feature Request List

Columns:

```text
Request
Status
Demand
Oldest Request
Priority
Owner
```

Demand can use:

```text
7 schools
```

badge/text.

---

# 51. Release Detail

Hierarchy:

```text
Version + Title
Status
Publish Date

Release Summary

Changes

Affected Clients

Operational Handoff Status
```

---

# 52. Release Item Cards

Compact item:

```text
BUG FIX

Nilai siswa tidak dapat disimpan

ISS-2026-00123
3 affected schools
```

Type badge small.

---

# 53. Release Impact

Table:

```text
School
Impact
Follow-up
Ops Owner
Handoff
```

This is more important than purely technical release metadata.

---

# 54. Publish Release

High-impact action.

Button:

```text
Publish Release
```

Confirmation dialog should explain consequences:

```text
Publishing this release will:

• mark the release as published
• create impacts for 12 clients
• create operational handoffs
• notify responsible Operations users
```

Use explicit primary action.

---

# 55. Handoff List

Design as work queue.

Top filters:

```text
My Handoffs
Pending
Follow-up Required
Completed
```

Rows should prioritize:

```text
Client
Release
Why affected
Required action
Due/status
```

---

# 56. Handoff Detail

Show:

```text
Client
Release
Affected Changes
Documentation
Assigned Ops
Required Follow-up
```

Primary action:

```text
Acknowledge
```

then:

```text
Start / Complete Follow-up
```

---

# 57. Handoff Progress

Visual:

```text
Release Published
      ✓
Ops Acknowledged
      ✓
Client Follow-up
      ●
Completed
      ○
```

This reinforces operational completion concept.

---

# 58. Follow-up List

Should feel like actionable task list.

Groups:

```text
Overdue
Today
Upcoming
Completed
```

Each card/row:

```text
School
Reason
Related Issue/Release
Due
Owner
```

---

# 59. Overdue Follow-up

Use danger semantics carefully.

Example:

```text
Overdue by 1 day
```

Not entire card red.

---

# 60. Documentation Design

Documentation page should feel like internal knowledge base.

Layout:

```text
Sidebar / category
+
Article content
```

or simple:

```text
Search
Category
Recent docs
```

depending scope.

---

# 61. Documentation Article

Readable max width:

```text
700–850px
```

Include:

```text
Title
Summary
Status
Author
Last Reviewed
Related Feature
Related Release
```

Then content.

---

# 62. Documentation State

Draft:

```text
Draft
```

Review:

```text
In Review
```

Published:

```text
Published
```

Stale:

```text
Review overdue
```

Stale is metadata, not necessarily primary lifecycle status.

---

# 63. Form Design

Labels above fields.

Example:

```text
Title *
[________________________]

Description *
[                        ]
[                        ]

Severity *
[ High                ▼ ]
```

Avoid placeholder as label.

---

# 64. Form Sections

Large forms grouped.

Example Client:

```text
Basic Information
Contact Information
Ownership
Subscription
```

Avoid 20 fields in one undifferentiated card.

---

# 65. Form Width

Forms should not use full desktop width unnecessarily.

Suggested:

```text
640–800px
```

for standard create/edit form.

---

# 66. Inline Validation

Example:

```text
Email

[ wrong-email ]

Enter a valid email address.
```

Server error mapped to same field.

Do not rely solely on top-level toast.

---

# 67. Submit State

Normal:

```text
Save Client
```

Pending:

```text
Saving...
```

Button disabled.

Avoid duplicate submission.

---

# 68. Dialog Design

Use modal for:

```text
confirmation
small focused form
high-impact decision
```

Don't place huge complex multi-step workflow in modal.

Use full page/drawer where more context is needed.

---

# 69. Drawer

Drawer suitable for:

```text
quick detail
filter on mobile
audit detail
notification detail
```

Desktop width:

```text
400–520px
```

depending content.

---

# 70. Toast

Toast position:

```text
top-right
```

or:

```text
bottom-right
```

consistent.

Use:

```text
Success
Info
Warning
Error
```

Avoid toast for permanent critical state.

---

# 71. Empty States

Every empty state should explain context.

Examples:

### Issues

```text
No issues found

There are no issues matching the current filters.
```

### Handoffs

```text
No pending handoffs

All released changes have been acknowledged by Operations.
```

### Clients

```text
No clients yet

Add the first school to begin tracking client operations.
```

---

# 72. Error State

Page:

```text
We couldn't load this page.

Try again or contact support with Request ID:
REQ-ABC123

[ Try Again ]
```

Do not show technical backend message.

---

# 73. Loading

Use skeleton for:

```text
table
cards
detail
```

Use spinner for:

```text
button
small contained async action
```

Avoid full-screen spinner after application bootstrap where skeleton provides better continuity.

---

# 74. 403

```text
Access denied

You do not have permission to view this page.

[ Back to Dashboard ]
```

Don't make it look like application failure.

---

# 75. 404

```text
Page not found

The page may have been moved or no longer exists.

[ Back to Dashboard ]
```

---

# 76. Responsive Strategy

## Desktop

```text
sidebar visible
tables
split layout
horizontal workflow
```

## Tablet

```text
collapsible sidebar
reduced columns
responsive cards
```

## Mobile

```text
navigation drawer
single column
sticky action
vertical workflow
card-based list if table becomes unreadable
```

---

# 77. Mobile Table Adaptation

Do not simply horizontal-scroll every table.

For high-priority tables:

Desktop:

```text
table
```

Mobile:

```text
stacked cards
```

Example Issue card:

```text
ISS-123
Nilai tidak tersimpan

SMA Nusantara

HIGH
In Development

John
Due in 2h
```

---

# 78. Mobile Actions

Primary page action can be:

```text
sticky bottom action
```

when meaningful.

Avoid floating action button unless it fits the UI consistently.

---

# 79. Responsive Issue Detail

Mobile order:

```text
Issue Header
Workflow
Current Work State
SLA / Context
Time Breakdown
Timeline
Comments
```

Desktop right-context column becomes stacked.

---

# 80. Iconography

Use one icon set.

Recommended:

```text
Lucide
```

Use icons to support text, not replace important labels.

Examples:

```text
Bell
Search
Users
School
Bug
Rocket
BookOpen
CheckCircle
AlertTriangle
```

---

# 81. Icon Size

Common:

```text
16px
18px
20px
```

Avoid mixing random icon scales.

---

# 82. Animation

Use subtle animation only:

```text
dialog
dropdown
drawer
loading
hover
```

Duration:

```text
150–250ms
```

No decorative page transition needed.

---

# 83. Hover

Interactive row/card:

```text
subtle background change
cursor
```

Do not create large movement or scale transform for enterprise table rows.

---

# 84. Focus States

Keyboard focus visible.

Use primary focus ring.

Never remove outline without replacement.

---

# 85. Design Tokens

Recommended semantic tokens:

```text
background
surface
surface-muted

border
border-strong

text
text-muted
text-subtle

primary
primary-hover

success
warning
danger
info
```

Avoid direct hex values scattered across components.

---

# 86. Tailwind Strategy

Use Tailwind utility classes.

But centralize common semantic design through:

```text
CSS variables
Tailwind theme tokens
shared UI components
```

Do not copy giant utility combinations everywhere.

---

# 87. UI Component Library

Use custom/shared components built on stable primitives.

Possible:

```text
Radix UI primitives
```

or equivalent lightweight accessible primitives.

Do not introduce a full heavyweight visual system that fights Tailwind unless justified.

---

# 88. Core UI Components

Required:

```text
Button
IconButton

Input
Textarea
Select
Combobox
Checkbox

Badge
Card

Dialog
ConfirmationDialog
Drawer

Tabs
Breadcrumb

Table
DataTable
Pagination

Dropdown

Toast

Skeleton
Spinner

EmptyState
ErrorState

FormField
```

---

# 89. Domain Components

```text
StatusBadge
SeverityBadge
SLAIndicator
HealthBadge

IssueWorkflowStepper
IssueWorkStateCard
IssueTimeBreakdown

ClientHealthCard
ClientTimeline

FeatureDemandSummary

ReleaseImpactTable

OperationalHandoffProgress

FollowUpCard
```

---

# 90. Component Rule

Generic components know nothing about ClientOps business.

Example:

```text
Button
```

doesn't know issue status.

Domain component:

```text
IssueWorkflowStepper
```

does.

Keep those layers separate.

---

# 91. Page Loading Pattern

Each page uses same pattern:

```text
Query Pending
→ Skeleton

Query Error
→ Error State

Success Empty
→ Empty State

Success Data
→ Content
```

No blank flashes.

---

# 92. Permission Design

If action unavailable due permission:

Preferred:

```text
hide action
```

for obvious role-based action.

In some contexts, disabled + explanation can be better if awareness matters.

Example:

```text
Publish Release
```

for Product read-only user could be hidden.

But a blocked action due business state:

```text
Close Issue
```

can remain disabled with reason:

```text
Complete client follow-up first.
```

Important distinction:

```text
Permission restriction
vs
Business workflow restriction
```

---

# 93. Workflow Action Bar

Issue detail can have context-aware primary action.

Example IN_DEVELOPMENT:

```text
Primary:
Mark Ready for QA

Secondary:
Change Work State
Add Comment
```

Avoid displaying all possible lifecycle buttons simultaneously.

---

# 94. Business Rule Explanation in UI

If action unavailable:

```text
Cannot close issue

The required client follow-up has not been completed.
```

This makes business rule visible and teaches workflow.

---

# 95. Notification Design

Bell with unread badge.

Dropdown item:

```text
Release v2.4.1 requires acknowledgement

SMA Nusantara

2 minutes ago
```

Unread item visually stronger.

Click goes to relevant context.

---

# 96. Notification Noise

Only meaningful events should trigger notifications.

Do not notify user for every comment/status field modification.

UI should support work, not create alert fatigue.

---

# 97. Audit UI

Audit log visually compact.

Table:

```text
Time
Actor
Action
Resource
```

Details in drawer.

Before/after can be:

```text
structured key/value diff
```

instead of raw giant JSON where possible.

---

# 98. Client Timeline vs Audit

Different visual purpose.

Client Timeline:

```text
relationship story
human-readable
```

Audit:

```text
technical/accountability history
exact mutation context
```

Do not reuse exact same component blindly.

---

# 99. Dashboard Information Priority

Dashboard should prioritize:

```text
Needs Action
↓
Operational Risk
↓
Client Risk
↓
Work Overview
↓
Product Demand
```

Not:

```text
total users
total roles
database count
```

unless relevant.

---

# 100. Design Success Criteria

UI is successful if Ops can open ClientOps and answer in under a few seconds:

```text
Client mana yang butuh perhatian?

Issue saya sedang di tahap apa?

Apa yang sedang menunggu client?

Release mana yang perlu saya acknowledge?

Follow-up apa yang overdue?
```

Engineer should answer:

```text
Issue mana yang assigned ke saya?

Apa context dari client?

Apa yang sedang blocked?

Apa next workflow action?
```

Management:

```text
Di mana bottleneck?

Berapa client at risk?

Apa feature demand terbesar?

Apakah release benar-benar sampai ke client?
```

---

# 101. Screens with Highest Design Priority

P0 visual quality:

```text
Login

Dashboard

Client List
Client Detail

Issue List
Issue Detail

Release Detail

Handoff List
Handoff Detail

Follow-up List
```

P1:

```text
Feature Request

Documentation

Management
```

---

# 102. Design Non-Goals

Do not spend excessive time on:

```text
complex illustrations
animated landing page
dark mode
theme customization
custom icon design
3D charts
complex motion system
```

until core application quality is complete.

---

# 103. Demo Design Story

The strongest demo should visually tell:

```text
Issue reported
      ↓
Visible workflow
      ↓
Current waiting state
      ↓
Engineering progresses
      ↓
Release published
      ↓
Affected school shown
      ↓
Ops handoff appears
      ↓
Follow-up completed
      ↓
Client timeline updated
      ↓
Operational completion
```

The reviewer should understand the product thesis from the UI without needing a long explanation.

---

# 104. Final Design Principle

ClientOps design should not optimize for:

> **“How impressive does this dashboard look in a screenshot?”**

It should optimize for:

> **“How quickly can a user understand the current operational truth and know what to do next?”**

The visual system exists to reduce ambiguity between Client, Operations, Product, and Engineering.
