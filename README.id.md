# ClientOps

Platform Visibilitas Kesuksesan Sekolah & Operasional untuk B2B EdTech.

ClientOps adalah aplikasi web fullstack yang dirancang untuk meningkatkan visibilitas operasional antara klien sekolah, Operations, Product, dan Engineering.

Ide intinya sederhana:

> **Selesai secara teknis tidak sama dengan selesai secara operasional.**

Sebuah perbaikan bug atau fitur tidak dianggap sepenuhnya tersampaikan hanya karena sudah diimplementasikan dan dirilis. Organisasi juga harus mengetahuinya, klien yang terdampak harus diidentifikasi, follow-up yang diperlukan harus dilakukan, dan hasilnya harus tetap dapat ditelusuri.

---

## Status

Kemampuan P0 backend dan frontend sudah diimplementasikan: autentikasi cookie, CSRF, RBAC, clients, issues dan workflow, releases, handoffs, follow-ups, catatan audit, dokumentasi API, dan UI operasional. Kemampuan P1 yang juga sudah ada meliputi feature requests, SLA/work states, client timeline, documentation, notifications, metrik dashboard, dan lampiran MinIO.

## Local Development

```bash
cp .env.example .env
make up
make migrate-up
make seed
```

`make seed` memerlukan `ADMIN_EMAIL` dan `ADMIN_PASSWORD` di `.env`; `ADMIN_NAME` opsional. Perintah ini melakukan upsert peran dan izin yang terdokumentasi dengan aman, memberikan semua izin ke `SUPER_ADMIN`, serta membuat atau memperbarui administrator tersebut dengan hash password Argon2id PHC.

Health API: `http://localhost:8080/health`.

Readiness API: `http://localhost:8080/ready`.

Metrik Prometheus plaintext: `http://localhost:8080/metrics`. Sengaja tidak diautentikasi untuk jaringan scraper privat; jangan diekspos ke publik.

Dashboard overview menggunakan Redis untuk cache ber-versi 30 detik. Penulisan API yang berhasil dan eksekusi worker memajukan versi, mencegah data dashboard menjadi basi setelah mutasi. Kegagalan Redis melewati cache.

Notifications menggunakan transactional outbox PostgreSQL. Publikasi assignment dan release mengantrekan pengiriman in-app/email secara atomik; worker mencoba ulang kegagalan setelah lima menit. `SMTP_URL` opsional. `SMTP_URL` kosong, atau URL tanpa `from`, secara aman menonaktifkan email. Tidak ada kredensial SMTP yang dicatat ke log.

Swagger UI: `http://localhost:8080/api/docs`. Menampilkan dokumen OpenAPI yang disajikan di `http://localhost:8080/api/docs/openapi.yaml`; sumbernya ada di [`docs/api/openapi.yaml`](docs/api/openapi.yaml).

Build dan test:

```bash
make backend-test
make backend-vet
make frontend-build
make openapi-check
make test
make build
```

`make test` menjalankan Go vet/test, build TypeScript/Vite frontend, dan validasi OpenAPI.

Implementasi dimulai dari [`Documentation and Delivery Map`](docs/README.md), yang menghubungkan dokumen source-of-truth, urutan pengiriman, traceability, dan gerbang Definition of Done.

---

## Problem

Dalam operasional B2B EdTech, sebuah sekolah dapat melaporkan masalah atau meminta fitur melalui tim Operations.

Alur umumnya dapat terlihat seperti:

```text
School
   ↓
Operations
   ↓
Product / Engineering
   ↓
Development
   ↓
Release
```

Alur teknisnya bisa berjalan, tetapi visibilitas informasi dapat terputus antar tim.

Situasi umum yang terjadi antara lain:

```text
Operations tidak tahu
apakah sebuah issue sudah diinvestigasi.

Operations tidak tahu
apakah development sudah dimulai.

Engineering sudah merilis perbaikan,
tetapi Operations belum mengetahuinya.

Sebuah fitur sudah dikirim,
tetapi sekolah yang terdampak tidak pernah diinformasikan secara proaktif.

Documentation ada secara tidak konsisten
atau sangat bergantung pada pengetahuan individu.
```

Hal ini menciptakan kesenjangan visibilitas.

Dari sudut pandang Operations:

> "Kenapa Engineering lama sekali?"

Dari sudut pandang Engineering:

> "Ini sudah diinvestigasi / diperbaiki / dirilis."

Masalah intinya bukan sekadar manajemen tiket.

Masalahnya adalah:

> **Informasi operasional ada, tetapi tidak secara konsisten menjadi kesadaran organisasi.**

---

## Product Vision

ClientOps berperan sebagai lapisan operasional bersama antara:

```text
School / Client
      ↓
Operations
      ↓
Product / Engineering
      ↓
Release
      ↓
Operational Handoff
      ↓
Client Follow-up
      ↓
Client Success
```

Platform ini membantu menjawab:

* Masalah apa yang sedang dialami klien?
* Di tahap mana pekerjaan saat ini?
* Siapa yang memiliki (own) pekerjaan tersebut?
* Apa yang saat ini menghambat progres?
* Berapa banyak waktu yang dihabiskan untuk bekerja aktif?
* Berapa banyak waktu yang dihabiskan untuk menunggu?
* Apakah perbaikan atau fitur sudah dirilis?
* Klien mana yang terdampak?
* Apakah Operations sudah mengakui rilis tersebut?
* Apakah klien memerlukan follow-up?
* Apakah klien benar-benar sudah menerima nilainya?

---

## Core Product Principle

ClientOps memisahkan dua konsep:

### Technical Completion

```text
Implementation complete
      ↓
QA passed
      ↓
Release published
```

### Operational Completion

```text
Technical completion
      ↓
Affected clients identified
      ↓
Operations informed
      ↓
Documentation available
      ↓
Required client follow-up completed
      ↓
Outcome recorded
```

Sebuah workflow belum sepenuhnya selesai sampai tindakan operasional yang diperlukan juga sudah diselesaikan.

---

## Target Users

### Operations Staff

Kebutuhan utama:

* Membuat issue klien dan feature request.
* Melacak progres terkini.
* Memahami hambatan dan status menunggu.
* Mengetahui kapan rilis memengaruhi klien mereka.
* Melakukan follow-up klien.
* Mengakses dokumentasi produk yang relevan.

### Operations Manager

Kebutuhan utama:

* Memantau SLA issue.
* Mengidentifikasi hambatan operasional.
* Memantau follow-up yang tertunda.
* Memahami risiko hubungan klien.
* Mengelola kepemilikan (ownership) klien.

### Product

Kebutuhan utama:

* Meninjau feature request.
* Memahami permintaan di banyak sekolah.
* Memprioritaskan permintaan berdasarkan dampak ke klien.
* Menghubungkan permintaan ke rilis dan dokumentasi.

### Engineering

Kebutuhan utama:

* Menerima konteks klien yang terstruktur.
* Menginvestigasi issue.
* Memperbarui workflow teknis.
* Mengomunikasikan hambatan.
* Menghubungkan perbaikan ke rilis.

### Management

Kebutuhan utama:

* Memahami kesehatan operasional secara keseluruhan.
* Mengidentifikasi masalah berulang.
* Melihat risiko klien.
* Memahami permintaan fitur.
* Mengevaluasi apakah pengiriman produk benar-benar sampai ke klien.

---

## Core Features

### Client Management

Menyediakan tampilan terpusat untuk klien sekolah termasuk:

* Profil sekolah
* Kontak
* Pemilik Operations utama
* Riwayat issue
* Feature request
* Follow-up
* Timeline aktivitas

---

### Issue Management

Siklus hidup issue:

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

Transisi yang tidak valid ditolak oleh backend.

---

### Work State Visibility

Status workflow utama dipisahkan dari kondisi bekerja/menunggu saat ini.

Contoh:

```text
ACTIVE
WAITING_CLIENT
WAITING_OPS
WAITING_PRODUCT
WAITING_ENGINEERING
WAITING_RELEASE
BLOCKED
```

Hal ini memungkinkan ClientOps membedakan:

```text
Elapsed Time
Active Work Time
Blocked Time
Waiting Time
```

alih-alih memperlakukan setiap issue yang berjalan lama sebagai keterlambatan Engineering.

---

### Feature Request Demand

Sebuah feature request mewakili kapabilitas atau masalah produk, bukan satu tiket terisolasi per klien.

Contoh:

```text
Attendance Export

Requested by:
├── SMA Nusantara
├── SMA Merdeka
├── SMK Digital
└── SMP Harapan
```

Dengan demikian ClientOps dapat menampilkan:

* Jumlah permintaan (demand count)
* Klien yang meminta
* Permintaan terlama
* Status saat ini
* Prioritas

---

### Release Management

Releases menghubungkan pengiriman teknis dengan dampak ke klien.

Sebuah release dapat berisi:

* Fitur
* Perbaikan bug
* Peningkatan
* Perubahan keamanan
* Issue terkait
* Feature request terkait
* Klien yang terdampak

---

### Operational Handoff

Ketika sebuah release memengaruhi klien:

```text
Release Published
       ↓
Client Impact
       ↓
Operational Handoff
       ↓
Ops Acknowledgement
       ↓
Client Follow-up
       ↓
Completed
```

Ini adalah salah satu pembeda utama ClientOps.

---

### Client Follow-up

Operations dapat melacak tindakan follow-up setelah:

* Penyelesaian issue
* Rilis fitur
* Pembaruan produk penting
* Kebutuhan pelatihan
* Kekhawatiran hubungan

Catatan follow-up meliputi:

* Pemilik
* Alasan
* Tenggat waktu
* Status
* Hasil

---

### Living Documentation

Documentation terhubung dengan pengiriman produk.

Siklus hidup:

```text
DRAFT
→ IN_REVIEW
→ PUBLISHED
```

Documentation dapat terkait dengan:

* Fitur produk
* Releases
* Issues
* Modul produk

---

### Client Timeline

Aktivitas klien ditampilkan secara kronologis.

Contoh:

```text
Issue reported
Issue moved to QA
Feature requested
Release published
Ops acknowledged release
Follow-up completed
```

Hal ini menciptakan riwayat kontekstual dari hubungan dengan klien.

---

## Planned Differentiators

Setelah workflow inti stabil, ClientOps dapat menyertakan:

### Client Health

Skor kesehatan klien yang deterministik dan dapat dijelaskan berdasarkan sinyal seperti:

* Issue kritis yang belum terselesaikan
* Pelanggaran SLA
* Follow-up yang terlambat
* Interaksi terkini
* Adopsi produk

Skor tersebut harus selalu menampilkan faktor-faktor penyebabnya.

---

### Value Delivered

Kemampuan masa depan yang berorientasi klien untuk menunjukkan nilai produk yang terukur, seperti:

* Issue yang terselesaikan
* Fitur yang dikirim
* Adopsi produk
* Pelatihan yang diselesaikan
* Pencapaian proses digital

---

### School Success

Kemampuan masa depan yang memungkinkan sekolah melihat atau membagikan pencapaian terverifikasi yang diraih melalui penggunaan produk.

Ini bukan bagian dari MVP awal.

---

## Tech Stack

### Backend

```text
Go
Gin
GORM
PostgreSQL
```

### Frontend

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

### Infrastructure

```text
Docker Compose
Redis
MinIO
Go Background Worker
```

### Documentation

```text
OpenAPI
Swagger UI
Markdown Architecture Documentation
```

---

## Architecture

ClientOps menggunakan:

> **Modular Monolith + Background Worker**

Arsitektur tingkat tinggi:

```text
                         User
                          │
                          ▼
                 ┌──────────────────┐
                 │ React Frontend   │
                 └────────┬─────────┘
                          │
                     HTTPS / REST
                          │
                          ▼
                 ┌──────────────────┐
                 │ Go API           │
                 │ Gin + GORM       │
                 └───┬────┬────┬────┘
                     │    │    │
                     ▼    ▼    ▼
                PostgreSQL Redis MinIO
                              │
                              ▼
                         Go Worker
```

Proyek ini sengaja menghindari microservices untuk cakupan saat ini.

Alasannya antara lain:

* Deployment lebih sederhana
* Konsistensi transaksi lebih mudah
* Debugging lebih mudah
* Kompleksitas operasional lebih rendah
* Skalabilitas cukup untuk kasus penggunaan saat ini

Lihat:

```text
docs/system-architecture.md
```

---

## Backend Architecture

Alur request:

```text
HTTP Request
    ↓
Middleware
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

Tanggung jawab:

### Handler

Menangani:

* Parsing HTTP
* Binding DTO
* Pemicu validasi request
* Serialisasi respons

### Service

Menangani:

* Aturan bisnis
* Transisi workflow
* Transaksi
* Orkestrasi lintas domain

### Repository

Menangani:

* Persistensi
* Query
* Interaksi GORM

Aturan bisnis tidak boleh diimplementasikan langsung di dalam handler.

---

## Authentication

Autentikasi berbasis cookie.

Model yang direncanakan:

```text
Short-lived access token
+
Rotating refresh token
+
HttpOnly secure cookies
+
Server-side refresh session tracking
```

Token autentikasi tidak akan disimpan di:

```text
localStorage
sessionStorage
```

---

## CSRF Protection

Karena autentikasi menggunakan cookie, request yang mengubah state memerlukan perlindungan CSRF.

Desain awal:

```text
Double Submit Cookie
```

Metode yang dilindungi meliputi:

```text
POST
PUT
PATCH
DELETE
```

---

## Authorization

ClientOps menggunakan:

```text
RBAC
+
Permissions
+
Resource-level authorization
```

Contoh:

```text
issue.read
issue.create
issue.assign
issue.mark_released

client.read
client.update

release.publish

handoff.acknowledge
```

Pemeriksaan izin di frontend hanya untuk UX.

Backend tetap menjadi otoritas keamanan.

---

## Database

Database utama:

```text
PostgreSQL
```

ORM:

```text
GORM
```

Migrasi skema:

```text
golang-migrate
```

Source of truth skema produksi:

```text
backend/migrations/
```

GORM `AutoMigrate` tidak digunakan sebagai source of truth migrasi produksi.

---

## Database Design Principles

Database menggunakan:

* UUID primary key
* Foreign key
* Unique constraint
* Index yang sesuai
* Nullability yang eksplisit
* Pembaruan bisnis transaksional
* Optimistic locking untuk pembaruan konkuren
* Catatan status historis
* Audit trail

Desain rinci:

```text
docs/database-design.md
```

---

## Optimistic Concurrency

Resource kritis menggunakan optimistic locking berbasis versi.

Contoh:

```text
Current issue:
version = 7

User A updates version 7
→ success
→ version becomes 8

User B updates old version 7
→ 409 VERSION_CONFLICT
```

Hal ini mencegah kehilangan pembaruan secara diam-diam saat beberapa tim bekerja pada resource yang sama.

---

## API

Base API:

```text
/api/v1
```

Contoh resource:

```text
/api/v1/auth
/api/v1/clients
/api/v1/issues
/api/v1/feature-requests
/api/v1/releases
/api/v1/handoffs
/api/v1/follow-ups
/api/v1/documentations
/api/v1/notifications
/api/v1/dashboard
```

Transisi workflow kritis menggunakan aksi bisnis eksplisit.

Contoh:

```text
POST /api/v1/issues/:id/triage
POST /api/v1/issues/:id/start-investigation
POST /api/v1/issues/:id/mark-qa
POST /api/v1/issues/:id/mark-released
POST /api/v1/issues/:id/close
```

alih-alih pembaruan status tanpa batasan melalui request PATCH generik.

---

## API Response

Respons sukses standar:

```json
{
  "success": true,
  "data": {},
  "message": "Success"
}
```

Respons error standar:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATUS_TRANSITION"
  },
  "message": "Issue cannot transition to the requested state"
}
```

---

## API Documentation

Sumber spesifikasi OpenAPI:

```text
docs/api/openapi.yaml
```

Swagger UI:

```text
/api/docs
```

---

## Repository Structure

```text
clientops/
├── AGENTS.md
├── DESIGN.md
├── README.md
│
├── backend/
│   ├── cmd/
│   │   ├── api/
│   │   └── worker/
│   │
│   ├── internal/
│   ├── pkg/
│   ├── migrations/
│   ├── seeds/
│   └── tests/
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── types/
│   │
│   └── tests/
│
├── docs/
│   ├── assignment/
│   ├── product/
│   ├── architecture/
│   ├── database/
│   ├── api/
│   └── interview/
│
├── scripts/
├── docker/
├── .github/
│
├── .env.example
├── docker-compose.yml
└── Makefile
```

---

## Documentation

Mulai dari:

```text
docs/README.md
```

### Assessment Specification

```text
docs/assignment.md
```

### Product

```text
docs/clientops.md
docs/business-requirements.md
```

### Architecture

```text
docs/system-architecture.md
docs/frontend-ia.md
DESIGN.md
```

### Database

```text
docs/database-design.md
```

### API

```text
docs/api-contract.md          # kontrak perencanaan
docs/api/openapi.yaml         # kontrak yang diimplementasikan; dibuat bersamaan dengan API
```

---

## Development Milestones

Roadmap saat ini:

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

## Current MVP Priority

### P0

Harus stabil sebelum submission:

```text
Authentication
CSRF
RBAC
Client Management
Issue Management
Issue Workflow
Optimistic Locking
Release Management
Release Impact
Operational Handoff
Client Follow-up
Operational Closure
Database Migration
Validation
Error Handling
Search / Filter / Sort / Pagination
Core UI/UX
Tests
OpenAPI
README
```

### P1

Nilai tinggi:

```text
Feature Request Demand
Work State Time Breakdown
SLA
Client Timeline
Documentation
Notifications
Background Worker
Dashboard Analytics
```

### P2

Hanya setelah inti stabil:

```text
MinIO Attachments
Client Health
Session Management UI
Full E2E
CI/CD
Metrics
Advanced Cache
Transactional Outbox
Email Notifications
```

---

## UI/UX

ClientOps menggunakan pendekatan dashboard SaaS B2B modern.

Prinsip desain:

> **Clarity over decoration.**

UI memprioritaskan:

```text
Current state
Ownership
Next action
Operational risk
Client impact
```

di atas dashboard dekoratif.

Layar penting:

* Dashboard
* Client List
* Client Detail
* Issue List
* Issue Detail
* Release Detail
* Handoff Queue
* Follow-up Queue
* Documentation

Aturan desain rinci terdokumentasi di:

```text
DESIGN.md
```

---

## Required UI States

Layar penting harus mendukung:

```text
Loading
Empty
Error
Success
Disabled
Responsive
```

Formulir harus menyediakan:

* Label
* Validasi inline
* Status submit tertunda
* Submit nonaktif (disabled)
* Umpan balik validasi server
* Umpan balik sukses

---

## Search, Filter, Sort & Pagination

Listing utama digerakkan oleh server.

Contoh:

### Clients

```text
search
status
health
owner
sort
page
limit
```

### Issues

```text
search
client
status
severity
assignee
work_state
date
sort
page
limit
```

Frontend tidak boleh mengambil seluruh dataset besar lalu melakukan pemfilteran utama hanya di memori.

---

## Background Worker

Pekerjaan background diproses melalui Redis.

Kasus penggunaan awal:

* Notifications
* SLA checks
* Follow-up reminders
* Perhitungan ulang client health (opsional)

Entry point worker:

```text
backend/cmd/worker/main.go
```

State bisnis tetap disimpan di PostgreSQL.

Redis bukan source of truth bisnis.

---

## File Storage

Ketika dukungan lampiran diimplementasikan:

```text
Binary file
→ MinIO

Metadata
→ PostgreSQL
```

Filesystem aplikasi lokal tidak digunakan sebagai penyimpanan lampiran produksi yang persisten.

Upload akan memvalidasi:

* Authorization
* Tipe MIME
* Ukuran file
* Nama objek yang aman

---

## Testing

Stack yang direncanakan:

### Backend

```text
Go testing
Testify
PostgreSQL integration tests
```

### Frontend

```text
Vitest
React Testing Library
MSW
```

### E2E

```text
Playwright
```

---

## Highest Priority Tests

Testing berfokus pada perilaku bisnis.

Kasus kritis:

```text
Issue state transitions
Authentication
Refresh rotation
CSRF
RBAC
Resource authorization
Optimistic locking
Release publishing
Operational handoff
Follow-up completion
Operational closure
Migration reproducibility
Axios refresh concurrency
```

Strategi rinci:

```text
docs/testing-strategy.md
```

---

## Critical Demo Flow

Demo akhir yang dimaksudkan:

```text
1. Login sebagai Operations.

2. Buka SMA Nusantara.

3. Buat sebuah issue.

4. Issue muncul sebagai REPORTED.

5. Engineering mengambil kepemilikan.

6. Issue bergerak melalui:
   TRIAGED
   INVESTIGATING
   IN_DEVELOPMENT
   QA

7. Tampilkan periode WAITING_CLIENT.

8. Lanjutkan pekerjaan aktif.

9. Buat dan publikasikan sebuah release.

10. SMA Nusantara teridentifikasi sebagai terdampak.

11. Sebuah operational handoff dibuat.

12. Operations melihat handoff tersebut.

13. Operations mengakuinya.

14. Follow-up klien diselesaikan.

15. Issue bergerak ke CLOSED.

16. Client timeline menampilkan seluruh perjalanan.
```

Skenario ini menunjukkan tesis produk utama:

> **Perbaikan teknis baru menjadi lengkap ketika organisasi dan klien menerima nilainya.**

---

## Installation

```bash
git clone git@github.com:winatabayu00/school-success-platform.git
cd school-success-platform

cp .env.example .env
```

Edit `.env` untuk mengatur `ACCESS_TOKEN_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, dan `MINIO_SECRET_KEY` sebelum menjalankan pertama kali. Nilai bawaan hanya placeholder untuk development.

## Environment Configuration

Variabel utama di `.env`:

| Variable | Kegunaan |
| --- | --- |
| `APP_ENV` | `development` / `production` |
| `APP_PORT` | Port API (bawaan `8080`) |
| `FRONTEND_ORIGIN` | Origin CORS frontend (bawaan `http://localhost:5173`) |
| `VITE_API_BASE_URL` | Base URL API frontend |
| `DATABASE_URL` | DSN PostgreSQL yang dipakai API, worker, dan seed |
| `ACCESS_TOKEN_KEY` | Kunci penandatanganan HMAC untuk access token — atur ke nilai acak yang panjang |
| `COOKIE_SECURE` | `false` di lokal, `true` di produksi melalui HTTPS |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | Administrator awal yang dibuat oleh `make seed` |
| `REDIS_ADDR` | Alamat Redis untuk queue dan rate limiting |
| `SMTP_URL` | Opsional; kosong menonaktifkan email sambil tetap menyediakan notifikasi in-app |
| `MINIO_ENDPOINT` / `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` / `MINIO_BUCKET` | Object storage untuk lampiran |

`.env` dan kredensial asli tidak boleh pernah di-commit.

## Migration

```bash
make migrate-up     # terapkan semua migrasi tertunda
make migrate-down   # rollback satu migrasi terakhir
make migrate-fresh  # hapus volume dan bangun ulang skema dari kosong
```

Migrasi berada di `backend/migrations/` sebagai pasangan file `.up.sql` / `.down.sql` dan mereproduksi seluruh skema dari database kosong. API tidak bergantung pada GORM `AutoMigrate`.

## Running the Application

```bash
make up    # docker compose up --build (postgres, redis, minio, api, worker)
make seed  # buat roles, permissions, dan administrator awal
make down  # hentikan container
```

| Service | URL |
| --- | --- |
| Frontend | `http://localhost:5173` |
| API | `http://localhost:8080` |
| Swagger UI | `http://localhost:8080/api/docs` |
| MinIO console | `http://localhost:9001` |

Health: `http://localhost:8080/health`. Readiness: `http://localhost:8080/ready`.

## Developer Commands

```text
make up              mulai stack
make down            hentikan stack

make migrate-up      terapkan migrasi
make migrate-down    rollback satu migrasi
make migrate-fresh   reset database
make seed            seed roles, permissions, dan admin

make backend-test    go test ./...
make backend-vet     go vet ./...
make frontend-build  npm run build
make frontend-e2e    suite end-to-end Playwright

make openapi-check   validasi docs/api/openapi.yaml
make test            vet + backend test + frontend build + OpenAPI check
make build           alias untuk make test
```

## Demo Accounts

`make seed` membuat satu `SUPER_ADMIN` dari `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME`. Perintah ini juga melakukan upsert lima role (`SUPER_ADMIN`, `OPS_MANAGER`, `OPS_STAFF`, `PRODUCT`, `ENGINEER`) dan semua permission, memberikan setiap permission ke `SUPER_ADMIN`.

Tidak ada kredensial demo yang di-hardcode dan di-commit. Login sebagai administrator hasil seed lalu buat pengguna tambahan dengan role lain melalui management UI.

---

## Security Principles

ClientOps akan mengikuti aturan dasar berikut:

```text
No plaintext passwords

No authentication tokens in localStorage

No authentication tokens in sessionStorage

HttpOnly cookies

Secure cookies in production

CSRF protection

Explicit CORS

Backend authorization

Refresh rotation

Session revocation

Input validation

Login rate limiting

Safe error responses

Safe file uploads

Audit trail

No secrets committed
```

---

## Error Handling

Error dipusatkan dan dikategorikan.

Contoh:

```text
VALIDATION_ERROR
AUTHENTICATION_REQUIRED
PERMISSION_DENIED
RESOURCE_NOT_FOUND
RESOURCE_CONFLICT
INVALID_STATUS_TRANSITION
VERSION_CONFLICT
RATE_LIMIT_EXCEEDED
INTERNAL_SERVER_ERROR
```

Error internal tak terduga mengembalikan pesan yang disanitasi.

Detail teknis tetap berada di log aplikasi terstruktur.

---

## Observability

Observability awal meliputi:

```text
Structured logging
Request ID
Health endpoint
Readiness endpoint
Worker logs
```

Peningkatan masa depan dapat meliputi:

```text
Metrics
OpenTelemetry
Tracing
```

Ini hanya akan ditambahkan jika memberikan nilai yang cukup dibanding kompleksitas implementasinya.

---

## Technical Decisions

Keputusan penting meliputi:

### Modular Monolith over Microservices

Alasan:

* Kompleksitas operasional lebih rendah
* Konsistensi transaksi lebih mudah
* Skala yang sesuai untuk cakupan take-home
* Setup reviewer lebih mudah

### Explicit SQL Migrations over GORM AutoMigrate

Alasan:

* Skema yang dapat direproduksi
* Rollback eksplisit
* Perubahan dapat ditinjau
* Riwayat database yang jelas

### Redis over RabbitMQ

Beban kerja awal hanya memerlukan pemrosesan background job sederhana dan rate limiting.

Redis menyediakan kemampuan yang cukup sambil mengurangi kompleksitas infrastruktur.

### Explicit Workflow Endpoints

Operasi bisnis seperti penutupan issue dan publikasi release memerlukan validasi kontekstual.

Oleh karena itu mereka direpresentasikan sebagai aksi API eksplisit, bukan mutasi status tanpa batasan.

### Optimistic Locking

Operations, Product, dan Engineering dapat mengedit resource yang sama secara bersamaan.

Deteksi konflik berbasis versi mencegah kehilangan pembaruan secara diam-diam.

---

## Trade-offs

ClientOps dengan sengaja menerima beberapa trade-off.

### Shared Database

Modular monolith berbagi PostgreSQL antar modul.

Hal ini menyederhanakan transaksi tetapi memerlukan kepemilikan modul yang jelas untuk menghindari coupling yang erat.

### Redis Queue

Redis lebih sederhana daripada message broker khusus tetapi menyediakan semantik messaging yang lebih sedikit.

Ini dapat diterima untuk beban kerja awal.

### Post-Commit Queue Dispatch

Async job awal dapat di-antrekan setelah commit database.

Ada jendela kegagalan kecil antara commit dan enqueue.

Peningkatan reliabilitas di masa depan adalah:

```text
Transactional Outbox Pattern
```

Ini sengaja tidak diimplementasikan sebelum fungsionalitas inti stabil.

### Offset Pagination

Listing administratif standar pada awalnya dapat menggunakan offset pagination.

Dataset besar yang hanya menambah (append-only) seperti audit log dapat beralih ke cursor pagination nantinya.

---

## Non-Goals

Aplikasi awal tidak dimaksudkan untuk menjadi:

```text
ERP
Accounting system
Payroll system
Inventory system
Generic Jira replacement
Generic CRM
Realtime chat platform
Marketing automation platform
AI autonomous system
```

Domain inti tetap:

> **Visibilitas operasional klien dan pengiriman loop tertutup.**

---

## Future Improvements

Kemampuan masa depan yang potensial:

* Client portal
* School success dashboard
* Client health intelligence
* Product adoption analytics
* Value-delivered reports
* School achievements
* Training management
* Renewal intelligence
* Email/WhatsApp notifications
* Transactional outbox
* Advanced observability
* Cursor pagination untuk dataset historis besar

Pekerjaan masa depan hanya boleh diimplementasikan ketika kualitas produk inti tetap stabil.

---

## Engineering Principles

Saat memilih antara:

```text
more features
```

dan:

```text
fewer features that are
correct
secure
tested
documented
explainable
```

ClientOps memilih yang kedua.

Tujuan proyek ini bukan untuk menunjukkan berapa banyak teknologi yang dapat ditambahkan.

Tujuannya adalah menunjukkan keputusan engineering yang matang di sekitar masalah operasional yang nyata.

---

## Assignment Alignment

ClientOps sengaja dirancang untuk menunjukkan lebih dari sekadar CRUD.

Aplikasi ini mencakup:

* Masalah bisnis dan target pengguna yang jelas
* Workflow multi-role
* Transisi status
* Aturan bisnis
* Entitas terkait
* Autentikasi berbasis cookie yang aman
* Perlindungan CSRF
* Otorisasi backend
* Relasi PostgreSQL dan migrasi
* Versi REST API
* Validasi
* Search/filter/sort/pagination
* UI responsif
* Error handling
* Komponen yang dapat digunakan ulang
* Testing
* Dokumentasi API
* Trade-off engineering

Area-area ini secara langsung selaras dengan persyaratan take-home.

## Final Product Statement

ClientOps ada untuk mengubah:

```text
"Apakah ini sudah selesai?"
```

menjadi:

```text
Berikut secara tepat:

di mana pekerjaan berada,
siapa yang memilikinya,
apa yang menghambatnya,
apa yang sudah dirilis,
klien mana yang terdampak,
apa yang harus dilakukan Operations selanjutnya,
dan apakah klien benar-benar sudah menerima nilainya.
```

Itulah masalah operasional yang dirancang untuk dipecahkan oleh proyek ini.
