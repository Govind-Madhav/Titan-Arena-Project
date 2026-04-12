# Titan Arena Technical Documentation

Version: 1.0
Date: 2026-03-23
Audience: Product, Engineering, DevOps, QA, Security, and Operations teams

## 1. Purpose and Scope

This document is the primary technical reference for the Titan Arena platform. It describes:

- Platform goals and business context
- High-level architecture and component responsibilities
- Backend, frontend, and tournament engine internals
- Data model and event-driven communication contracts
- Security and authentication model
- Deployment, operations, and incident response practices
- Testing strategy and quality controls
- Troubleshooting and known failure modes

This version is intended to serve as the baseline technical volume. It is intentionally structured for incremental expansion into a multi-volume documentation set that can exceed 100 pages as the product matures.

## 2. Product Overview

Titan Arena is a multi-service esports tournament platform designed to support:

- User registration, identity, and role-based access
- Tournament management from registration to completion
- Bracket orchestration and match lifecycle management
- Wallet, payments, and transactional operations
- Notifications, stats aggregation, and leaderboards
- Event-driven integration using Kafka across services

### 2.1 Core Roles

- Player: joins tournaments, competes in matches, tracks stats
- Host: manages tournament operations, participants, outcomes
- Admin: moderation, policy enforcement, platform governance
- SuperAdmin: high-trust operational and policy controls

### 2.2 Role Matrix

| Role | Primary Scope | Key Capabilities |
|---|---|---|
| Player | Personal account and participation | Join tournaments, manage profile, wallet, teams/clans, stats, disputes, notifications |
| Host | Own tournament operations | Create and manage own tournaments, handle participants, payments, stream setup, declare winners |
| Admin | Platform operations and moderation | Manage tournaments, users, hosts, applications, disputes, and revenue reporting |
| SuperAdmin | Full platform control | Everything an Admin can do, plus role and policy control, elevated governance, and top-level system administration |

Notes:

- Admin users should use the Admin Dashboard as their single control center.
- Host users should use the Host Dashboard for tournament operations.
- SuperAdmin users inherit Admin capabilities and should not need a separate dashboard for standard operations.

## 3. System Architecture

Titan Arena follows a polyglot microservices pattern.

### 3.1 Services

- Frontend: React + Vite SPA, served through Nginx
- Backend API: Node.js + Express, domain modules, orchestration layer
- Tournament Engine: Java + Spring Boot service for bracket orchestration
- PostgreSQL: operational data store
- Redis: cache/session/ephemeral state support
- Kafka + Zookeeper: event backbone

### 3.2 Design Rationale

- Node.js API service prioritizes fast iteration and feature delivery for product-facing endpoints.
- Java tournament engine isolates bracket logic and heavy orchestration from API request path.
- Kafka decouples match/tournament side-effects and supports asynchronous scaling.
- Redis reduces pressure on DB for latency-sensitive operations.

## 4. Repository Structure

Root highlights:

- docker-compose.yml: full local orchestration
- CODE/BACKEND: Node API service
- CODE/FRONTEND: React client
- CODE/JAVA-TOURNAMENT-ENGINE: Java bracket/orchestration service
- docs/: technical documentation set

### 4.1 Backend Structure

Key backend folders:

- src/modules: domain modules (auth, tournament, wallet, stats, etc.)
- src/config: redis, firebase, kafka, socket, and system configs
- src/middleware: auth, security, rate limiting, etc.
- src/db: data access and schema bindings
- workers: background worker flows

### 4.2 Frontend Structure

Key frontend folders:

- src/pages: route-level views
- src/Components: reusable UI components
- src/store: Zustand state stores
- src/lib: API clients and SDK integration

### 4.3 Java Engine Structure

Key engine packages:

- bracket: strategy-based bracket generation
- orchestration: lifecycle coordination
- event: inbound and outbound Kafka integration
- api: bracket and orchestration endpoints

## 5. Backend API Service

### 5.1 Runtime Profile

- Framework: Express
- Language: JavaScript (Node.js)
- Startup flow:
  - dotenv load
  - middleware wiring
  - service initialization (Firebase/Redis/DB/Kafka consumers)
  - route registration
  - websocket attachment

### 5.2 Key Responsibilities

- Authentication and session lifecycle
- User profile and role control
- Tournament and match APIs
- Wallet and payment workflows
- Notifications/stats endpoints
- Event publishing to Kafka

### 5.3 Service Initialization Behavior

Backend boot includes health-aware initialization with partial failure tolerance for selected dependencies:

- Redis treated as critical for healthy operational status
- Firebase can degrade platform features when unavailable
- Kafka consumers are started non-blocking to avoid hard stop on transient broker issues

### 5.4 Route Surface (Representative)

- /api/auth
- /api/admin
- /api/tournaments
- /api/games
- /api/teams
- /api/wallet
- /api/payment
- /api/social
- /api/stats
- /api/notifications
- /api/users
- /api/matches

## 6. Frontend Architecture

### 6.1 Runtime Profile

- Framework: React
- Bundler: Vite
- State: Zustand
- Transport: Axios client with interceptors
- Deployment form:
  - Dev: Vite server
  - Docker: built assets served by Nginx

### 6.2 Authentication UX Flow

- Initialize store and determine session state
- Attempt token/session refresh only when session hints exist
- Resolve profile context from backend
- Clear auth on invalid/expired authenticated context

### 6.3 API Integration Pattern

- Base URL: /api (proxy-relative)
- Request interceptor:
  - prefer in-memory access token
  - fallback to Firebase token if present
- Response interceptor:
  - route-level handling for expected auth failures

## 7. Java Tournament Engine

### 7.1 Runtime Profile

- Framework: Spring Boot
- Language: Java
- Role: bracket computation and orchestration

### 7.2 Interaction Model

- Consumes tournament/match events from Kafka
- Produces scheduling-related events
- Exposes health and bracket APIs

### 7.3 Bracket Strategy Pattern

The engine is structured to support pluggable tournament formats:

- Single elimination (implemented)
- Double elimination (planned/extendable)
- Round robin (planned/extendable)

## 8. Data Layer

### 8.1 Primary Store

PostgreSQL is the system of record for:

- users and profiles
- tournaments and matches
- wallet and payment entities
- session/refresh tokens
- audit and operational metadata

### 8.2 Cache Layer

Redis supports:

- OTP and short-lived auth flows
- lightweight state synchronization
- latency-sensitive lookup support

### 8.3 Migration Strategy

- Drizzle-based migration/push flow for backend schema
- Prisma artifacts may exist from historical migration paths
- Production migration policy should enforce explicit, audited migration steps

## 9. Event-Driven Architecture

### 9.1 Event Backbone

Kafka topics support decoupled service responsibilities and asynchronous side effects.

Representative topics:

- tournament.created
- tournament.started
- tournament.ended
- match.completed
- match.scheduled
- wallet.credited
- wallet.debited

### 9.2 Event Guarantees (Practical)

- At-least-once processing assumptions should be used
- Consumers must be idempotent
- Side-effect handlers should tolerate replay/retry

### 9.3 Failure Considerations

- Broker unavailable at startup
- Consumer lag accumulation
- Poison event payloads
- Ordering assumptions across partitions

## 10. Authentication and Security

### 10.1 Hybrid Auth Model

Titan Arena uses a hybrid model:

- Firebase token path for identity proof and sync flows
- Session token path for backend-issued access and refresh mechanics

### 10.2 Security Controls

- CORS allowlist with preview-domain guards
- Rate limiting middleware
- Role/permission middleware checks
- httpOnly refresh cookie usage
- Input validation and guarded route access

### 10.3 Security Risk Notes

Operationally high-impact concerns to track:

- secrets management discipline (.env and compose variables)
- overexposed credentials in local/shared files
- unrotated SMTP/payment credentials
- inconsistent environment parity between dev and docker

## 11. Deployment Topologies

### 11.1 Docker Compose (Local Integration)

Compose runs a complete environment:

- frontend
- backend
- tournament-engine
- postgres
- redis
- kafka
- zookeeper

### 11.2 Developer Mode (Service-by-Service)

- frontend: npm run dev
- backend: npm run dev
- java engine: mvn spring-boot:run
- infrastructure: docker compose for db/cache/broker

### 11.3 Environment Variables

Two layers are in active use:

- root .env for compose-time substitutions
- CODE/BACKEND/.env for local backend runtime

Guideline:

- keep runtime envs explicit and environment-specific
- maintain non-secret .env.example templates
- never commit production secrets

## 12. Operations and Runbook

### 12.1 Startup Order Considerations

- postgres/redis/kafka/zookeeper before backend
- backend before frontend proxy health expectation
- java engine can start after db and kafka are healthy

### 12.2 Health Endpoints

- backend: /api/health
- tournament engine: /actuator/health

### 12.3 Operational Checks

- container status via docker compose ps
- targeted logs via docker compose logs <service>
- endpoint probes from host

## 13. Testing and Quality Strategy

### 13.1 Test Layers

- Unit tests for pure domain logic
- Integration tests for API + DB interactions
- Contract tests for event payload compatibility
- E2E tests for major user journeys

### 13.2 Smoke Test Baseline

Minimum post-deploy checks:

- frontend root returns 200
- backend health returns 200
- public catalog endpoints return 200
- unauthenticated refresh returns expected 4xx

### 13.3 Quality Gates

- lint/static analysis clean baseline
- no high-severity known security issues
- migration and rollback rehearsed in staging

## 14. Troubleshooting Guide

### 14.1 Symptom: Frontend blank screen

Likely causes:

- stale frontend bundle cache
- API proxy mismatch
- runtime auth/bootstrap loop

Checks:

- hard refresh
- inspect network responses for /api calls
- verify frontend and backend proxy path consistency

### 14.2 Symptom: API 502 from frontend proxy

Likely causes:

- backend not yet healthy
- Nginx proxy path mismatch
- upstream container restart in progress

Checks:

- backend health endpoint directly and via proxy
- backend container logs
- nginx config proxy_pass correctness

### 14.3 Symptom: Auth refresh loop

Likely causes:

- no refresh cookie but forced refresh bootstrap
- mixed auth mode assumptions
- frontend stale persisted auth state

Checks:

- verify refresh endpoint behavior for anonymous users
- clear local storage/session state
- validate bootstrap condition logic

## 15. Documentation Expansion Plan (Toward 100+ Pages)

This technical baseline can be expanded into a complete documentation set using the following volumes:

- Volume A: Product and domain handbook (15-20 pages)
- Volume B: Architecture and ADRs (15-20 pages)
- Volume C: Backend module-by-module specification (20-25 pages)
- Volume D: Frontend component and route handbook (15-20 pages)
- Volume E: Data model dictionary and migration policy (10-15 pages)
- Volume F: Event contracts and integration playbook (10-15 pages)
- Volume G: Security hardening and incident response (10-15 pages)
- Volume H: Operations, SRE, and release management (10-15 pages)

Estimated aggregate: 105-145 pages depending on depth and appendices.

## 16. Immediate Next Documentation Deliverables

Recommended next deliverables in order:

1. API contract reference with request/response samples by module
2. Data dictionary for all core tables and relationships
3. Event schema catalog for each Kafka topic with producer/consumer mapping
4. Deployment guide for local, staging, and production variants
5. Incident runbook with severity matrix and response SOPs

## 17. Change Log

- 1.0: Baseline cross-service technical documentation created from active architecture and runtime behavior.
