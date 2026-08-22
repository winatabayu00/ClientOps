# ClientOps

## School Success & Operational Visibility Platform for B2B EdTech

## 1. Background

Perusahaan EdTech B2B tidak hanya menjual software kepada sekolah, tetapi juga perlu memastikan bahwa sekolah mendapatkan value dari produk, memperoleh support yang baik, memahami perubahan produk, dan memiliki hubungan yang sehat dengan perusahaan.

Dalam operasional saat ini, terdapat beberapa friction utama:

* Informasi issue dan request dari sekolah tidak selalu memiliki visibility yang baik lintas tim.
* Tim Operations tidak selalu mengetahui perkembangan issue atau feature yang sedang dikerjakan tim IT.
* Feature atau bug fix yang secara teknis sudah selesai belum tentu diketahui oleh Ops maupun client.
* Dokumentasi produk dan feature masih minim, sehingga knowledge banyak bergantung pada individu tertentu.
* Tim Operations merasa response IT lambat karena tidak memiliki visibility terhadap tahapan pekerjaan.
* Status issue sering dipahami hanya sebagai “belum selesai” atau “sudah selesai”, tanpa melihat actual progress, blocked time, dan ownership.
* Hubungan dengan sekolah masih berpotensi terlalu transactional: sekolah membayar subscription dan perusahaan menyediakan software/support.
* Perusahaan belum memiliki satu tempat yang menunjukkan kondisi relationship, issue history, feature demand, product adoption, dan value yang telah diberikan kepada setiap sekolah.

---

## 2. Core Problem

Masalah utama bukan sekadar kurangnya komunikasi atau tidak adanya CRM.

Masalah utamanya adalah:

> **Informasi penting terkait client, issue, request, product changes, documentation, dan delivery sebenarnya ada, tetapi tidak selalu berubah menjadi organizational awareness pada orang yang tepat dan waktu yang tepat.**

Akibatnya:

* Ops harus bertanya manual kepada IT mengenai progress.
* Client tidak memiliki visibility yang jelas terhadap issue/request mereka.
* Feature yang sudah tersedia berpotensi tidak dimanfaatkan.
* Knowledge tersebar di chat atau berada di kepala individu.
* Perceived response time menjadi lebih buruk daripada actual engineering progress.
* Follow-up client dapat terlewat.
* Management sulit mengetahui client mana yang membutuhkan perhatian.
* Keberhasilan digital sekolah tidak terdokumentasi sebagai value yang bisa ditunjukkan.

---

## 3. Product Thesis

**Technical completion is not the same as operational completion.**

Sebuah issue atau feature belum benar-benar selesai hanya karena code sudah merge atau release sudah deployed.

Delivery dianggap selesai ketika:

1. Perubahan teknis telah tersedia.
2. Informasi perubahan terdokumentasi.
3. Tim Operations mengetahui perubahan tersebut.
4. Client yang terdampak telah teridentifikasi.
5. Follow-up dilakukan jika diperlukan.
6. Client dapat menggunakan atau memperoleh value dari perubahan tersebut.

---

## 4. Product Vision

Membangun satu platform yang menjadi **shared operational layer** antara:

```text
School / Client
      ↓
Operations
      ↓
Product / Engineering
      ↓
Release & Documentation
      ↓
Client Follow-up
      ↓
Product Adoption
      ↓
Client Success
```

ClientOps bukan sekadar database customer.

ClientOps membantu perusahaan memahami:

* Siapa client kita?
* Apa masalah yang sedang mereka alami?
* Apa yang mereka minta?
* Apa yang sedang dikerjakan?
* Siapa owner-nya?
* Apa yang sudah dirilis?
* Client mana yang terdampak?
* Apakah Ops sudah mengetahui perubahan?
* Apakah client sudah mendapatkan follow-up?
* Apakah feature yang dibuat benar-benar digunakan?
* Bagaimana kondisi hubungan dengan client?
* Value apa yang sudah diberikan kepada sekolah?

---

## 5. Product Goals

### Goal 1 — Operational Visibility

Membuat lifecycle issue/request dapat dilihat lintas tim secara transparan.

Contoh:

```text
Reported
→ Triaged
→ Investigating
→ In Development
→ QA
→ Released
→ Client Follow-up
→ Closed
```

---

### Goal 2 — Reduce Communication Dependency

Mengurangi kebutuhan komunikasi manual seperti:

> “Mas, ini progress-nya gimana?”

Informasi progress, owner, blocker, dan timeline tersedia di sistem.

---

### Goal 3 — Build Living Product Knowledge

Membuat documentation menjadi bagian dari workflow produk, bukan aktivitas terpisah.

Feature dapat memiliki:

* Description
* Usage guide
* Known limitations
* Related issues
* Related requests
* Release history
* Affected modules
* Client availability

---

### Goal 4 — Close the Delivery Loop

Membedakan:

```text
TECHNICALLY DELIVERED
```

dengan:

```text
OPERATIONALLY DELIVERED
```

Release tertentu belum dianggap selesai secara operasional apabila knowledge dan client handoff belum dilakukan.

---

### Goal 5 — Improve Client Relationship

Memberikan tim Ops contextual view terhadap setiap sekolah sehingga hubungan dengan client menjadi lebih proaktif.

---

### Goal 6 — Demonstrate Client Value

Membantu perusahaan menunjukkan value yang telah diterima sekolah dari penggunaan produk.

Contoh:

* Feature adoption
* Issue resolution
* Training
* Digital transactions
* School milestones
* Product usage

---

## 6. Target Users

### Operations Staff

Kebutuhan:

* Melihat status issue/request client.
* Mengetahui perubahan produk.
* Mengetahui apakah perlu follow-up.
* Melihat histori komunikasi dan activity client.
* Mengakses documentation.

---

### Operations Manager

Kebutuhan:

* Memantau SLA.
* Mengetahui issue overdue.
* Melihat kondisi client.
* Melihat workload Ops.
* Mengetahui bottleneck antara Ops dan IT.

---

### Product / Engineering

Kebutuhan:

* Menerima contextual issue/request.
* Mengetahui client impact.
* Menghubungkan issue dengan release.
* Mempublikasikan documentation.
* Memberikan delivery status yang transparan.

---

### Management

Kebutuhan:

* Mengetahui kondisi relationship client.
* Mengetahui recurring problems.
* Mengetahui product demand.
* Mengetahui bottleneck operasional.
* Mengetahui value yang diberikan kepada client.

---

### School / Client

Untuk MVP, akses client dapat dibatasi.

Future capability dapat menyediakan portal agar client dapat:

* Melihat issue mereka.
* Melihat request.
* Melihat product updates.
* Mengakses documentation.
* Melihat achievements dan value delivered.

---

## 7. Core Product Domains

ClientOps dibagi menjadi domain utama:

```text
ClientOps
│
├── Client Management
├── Issue Management
├── Feature Request Management
├── Product / Feature Knowledge
├── Release Management
├── Client Impact
├── Client Timeline
├── Operational Handoff
├── Client Health
├── Notifications
└── Audit Trail
```

---

## 8. MVP Scope

### 8.1 Client Management

Menyimpan informasi sekolah/client:

* School profile
* Contacts
* Ops owner
* Subscription/product information
* Status
* Timeline

---

### 8.2 Issue Management

Ops dapat membuat issue berdasarkan laporan client.

Issue memiliki:

* Client
* Title
* Description
* Severity
* Category
* Reporter
* Assignee
* Status
* Timeline
* Attachment
* Related release

Lifecycle:

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

---

### 8.3 Feature Request Management

Mencatat kebutuhan client terhadap perubahan produk.

Feature request dapat terhubung dengan lebih dari satu client sehingga perusahaan dapat mengetahui demand yang sama dari beberapa sekolah.

---

### 8.4 Release Management

Release menyimpan:

* Version
* Release date
* Summary
* Bug fixes
* Features
* Related issues
* Related requests

Release dapat menentukan client mana yang terdampak.

---

### 8.5 Living Documentation

Feature atau release dapat memiliki dokumentasi.

Documentation lifecycle:

```text
DRAFT
→ REVIEW
→ PUBLISHED
```

---

### 8.6 Operational Handoff

Ketika feature/bug fix dirilis:

```text
Release
   ↓
Affected Clients
   ↓
Ops Owner
   ↓
Ops Acknowledgement
   ↓
Client Follow-up
```

---

### 8.7 Client Timeline

Setiap client memiliki chronological timeline:

```text
Issue reported
Feature requested
Issue resolved
Release published
Ops follow-up
Documentation viewed
Training completed
Achievement unlocked
```

---

### 8.8 Client Health

MVP menggunakan deterministic health score.

Contoh faktor:

* Critical unresolved issue
* SLA breach
* Open issue duration
* Recent interaction
* Feature adoption
* Follow-up status

Tidak menggunakan AI sebagai decision-maker.

---

### 8.9 Notification

Notification untuk event penting:

* Issue assigned
* Status changed
* SLA approaching
* Release published
* Follow-up required
* Documentation published

---

### 8.10 Audit Trail

Aktivitas penting harus dapat ditelusuri.

Contoh:

```text
User A changed Issue #123
status:
IN_DEVELOPMENT → QA

22 Aug 2026 14:30
```

---

## 9. Out of Scope for MVP

Untuk menghindari over-engineering, fitur berikut belum menjadi bagian MVP:

* Full ERP
* Reimbursement management
* Finance accounting
* Inventory
* HR
* Payroll
* AI chatbot
* AI autonomous decision making
* Full public school website
* Complex billing/subscription engine
* Real-time chat
* Advanced recommendation engine

---

## 10. Future Vision

### Client Portal

Sekolah mendapatkan self-service portal.

### School Success Profile

Menampilkan digital transformation achievements.

### Value Delivered Dashboard

Contoh:

```text
Academic processes digitized
Parent interactions
Payments processed
Issues resolved
Features delivered
Training completed
```

### School Achievements

Contoh:

```text
10,000 Digital Attendance Records
100% Digital Report Distribution
95% Parent Portal Adoption
```

### Relationship Intelligence

Mendeteksi client yang membutuhkan perhatian berdasarkan operational signals.

### Product Demand Intelligence

Mengelompokkan request serupa untuk membantu product prioritization.

---

## 11. Key Product Principle

ClientOps harus menjawab prinsip berikut:

> **A client should never have to wonder whether their problem is being handled, and Operations should never have to ask Engineering just to know what stage the work is in.**

Dan dari sisi perusahaan:

> **A feature is not finished when it is deployed. It is finished when the organization understands it and the client can receive its value.**
