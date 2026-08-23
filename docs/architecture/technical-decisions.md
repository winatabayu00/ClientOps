# Technical Decisions

## Modular monolith

ClientOps uses one Go API, organized by domain modules. This keeps workflow transactions, authorization, and audit records consistent without microservice coordination. A separate Go worker process is reserved for retry-safe background work.

## PostgreSQL as source of truth

PostgreSQL stores business data. Versioned SQL migrations in `backend/migrations/` define the production schema; application startup does not run `AutoMigrate`. Database constraints protect identity, ownership, workflow relationships, and concurrency invariants.

## HTTP API

Gin serves versioned REST routes under `/api/v1`. `docs/api/openapi.yaml` is the implemented API contract. The API serves Swagger UI at `/api/docs` and its specification at `/api/docs/openapi.yaml`.

## Authentication and authorization

Authentication uses short-lived access and rotating refresh tokens in HttpOnly cookies, with server-side refresh-session hashes. State-changing requests require double-submit CSRF protection. The backend enforces RBAC and resource access; frontend permission checks are UX only.

## Frontend

React, TypeScript, Vite, Tailwind CSS, Axios, React Router, TanStack Query, React Hook Form, and Zod provide the browser application. Axios is centrally configured for credentialed requests, CSRF headers, and serialized token refresh.

## Supporting infrastructure

Docker Compose runs PostgreSQL, Redis, MinIO, and the API. Redis supports rate limiting and future worker queues. MinIO stores validated issue attachment bytes; PostgreSQL stores attachment metadata.
