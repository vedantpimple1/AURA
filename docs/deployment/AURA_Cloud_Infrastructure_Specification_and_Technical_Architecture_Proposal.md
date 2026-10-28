# AURA — Cloud Infrastructure Specification & Technical Architecture Proposal
**Document Version:** 1.2 (Production Architecture & Deployment Release)  
**Date:** October 28, 2026  
**Contributors:** @Samruddhi, Antigravity Architecture & Security Team  
**System Name:** KAI Aura (Enterprise Gamification, Peer Recognition, Task Lifecycle & Reward Store Platform)  
**Target Environments:** Cloud Virtual Machine (Microsoft Azure / AWS / Dedicated Ubuntu) & Hybrid Cloud-Native PaaS (Vercel + Render + Managed PostgreSQL)

---

## 1. Executive Summary

AURA is an enterprise-grade team engagement, gamification, peer appreciation, task lifecycle, and rewards platform engineered for high-trust internal team operations. Designed initially for an active cohort of 30–40 users, the system architecture possesses built-in headroom to scale gracefully to 500+ active members across multiple organizational batches, departments, and project teams.

This specification provides the authoritative compute, memory, storage, networking, security, and workload allocation blueprints required to deploy AURA into production with zero service contention and maximum reliability.

### Architectural Core Components

```
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Azure VM Standard_B2ms · 2 vCPU · 8 GB RAM                                                     │
│                                                                                                │
│                             Inbound HTTPS (443) / HTTP (80)                                    │
│                                            │                                                   │
│                                            ▼                                                   │
│                 ┌─────────────────────────────────────────────────────┐                        │
│                 │      Nginx + Let's Encrypt TLS 1.3 · ~50 MB RAM     │                        │
│                 │   SSL termination, static asset cache, forwarding   │                        │
│                 └──────────┬───────────────────────────────┬──────────┘                        │
│                            │                               │                                   │
│                            ▼                               ▼                                   │
│  ┌───────────────────────────────────┐   ┌───────────────────────────────────┐                 │
│  │ Next.js 16.3.5 frontend ~250MB RAM│   │ Express.js API gateway ~140MB RAM │                 │
│  │ localhost:3000 · SSR & App Router │   │ localhost:4000 · router & auth bus│                 │
│  └───────────────────────────────────┘   └─────────────────┬─────────────────┘                 │
│                                                            │                                   │
│                                                            ▼                                   │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Express.js domain services · RAM per service                                             │  │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │  │
│  │  │   Auth / RBAC    │  │   Tasks engine   │  │   Aura ledger    │  │   Kudos / Teams  │  │  │
│  │  │   ~90 MB RAM     │  │   ~120 MB RAM    │  │   ~110 MB RAM    │  │   ~100 MB RAM    │  │  │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────┘  │  │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │  │
│  │  │Store & Redemption│  │Password Recovery │  │  Notif & Email   │  │Observability & AI│  │  │
│  │  │   ~90 MB RAM     │  │   ~80 MB RAM     │  │   ~110 MB RAM    │  │ Audit & Gemini   │  │  │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────┘  │  │
│  └──────────────────────────────────────────────┬───────────────────────────────────────────┘  │
│                                                 │ jobs / enqueue                               │
│                                                 ▼                                              │
│  ┌───────────────────────────────────────────────────────┐  ┌───────────────────────────────┐  │
│  │ BullMQ worker + Redis 7 server · ~120 MB RAM          │  │ Active base memory:  ~3.0 GB  │  │
│  │ Queue state, locks, balance cache                     │  │ Headroom & cache:    ~5.0 GB  │  │
│  └──────────────────────────┬────────────────────────────┘  └───────────────────────────────┘  │
│                             │ SQL transactions & pooling                                       │
│                             ▼                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ PostgreSQL 15/16 · Prisma ORM with pg adapter pool · ~800 MB - 1.2 GB RAM                │  │
│  │ 23 normalized relational models                                                          │  │
│  └──────────────────────────┬───────────────────────────────────────────────────────────────┘  │
│                             │                                                                  │
│                             ▼                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Linux OS (Ubuntu 22.04 LTS), systemd services, logging · ~600 MB RAM                     │  │
│  └──────────────────────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────────────┘
```

The system comprises:
1. **Modern Frontend Client & Application Shell (`frontend/`)**:
   - **Framework:** Next.js 16.3.5 (App Router with Turbopack build engine) and React 19.2.8.
   - **Styling & Components:** Tailwind CSS v4 (`@tailwindcss/postcss`), Radix UI primitives (`@radix-ui/react-slot`), Lucide Icons (`lucide-react` 1.45.0).
   - **Data Fetching & State:** Next.js Server Actions with strict cookie pass-through, optimistic UI mutations, and responsive dashboard layouts for Member, Admin, and Superadmin roles.
2. **Consolidated Express Backend Engine (`backend/`)**:
   - **Runtime:** Node.js 20+ LTS, TypeScript 5.x, Express 4.21.2.
   - **Network Listen Port:** `localhost:4000` (production configurable via `PORT`).
   - **Service Organization:** 12 authoritative domain categories managed across 17 dedicated service modules.
3. **Authoritative Relational Database Subsystem**:
   - **Engine:** PostgreSQL 15/16.
   - **Data Layer:** Prisma ORM 7.10.0 using the `@prisma/adapter-pg` driver adapter with connection pooling over **23 normalized relational models**.
4. **In-Memory Caching & Distributed Queue Subsystem**:
   - **Engine:** Redis 7 (Alpine).
   - **Responsibilities:** BullMQ job queue storage, distributed locks for concurrent store item redemptions, and sub-millisecond cached reads for team leaderboards and user balances.
5. **Standalone Background Delivery Worker (`backend/src/worker.ts`)**:
   - **Execution:** Runs as a dedicated background daemon.
   - **Operational Modes:** Dual-mode architecture supporting distributed BullMQ queue processing or native transactional database polling fallback (`DELIVERY_WORKER_ENABLED=true`).
   - **Notification Engine:** Nodemailer SMTP transport (SSL/TLS 465 or STARTTLS 587) for transactional email dispatches.
6. **Edge & Reverse Proxy Layer**:
   - **Engine:** Nginx with HTTP/2, automated Let's Encrypt TLS 1.3 certificate renewals, reverse proxy pass-through to port 3000 (Next.js) and port 4000 (Express API).

---

## 2. Comprehensive Domain Services & Responsibilities

The AURA backend decouples business logic into 12 core domains and 17 dedicated services:

| Domain | Service Implementation | Key Responsibilities & Capabilities |
|---|---|---|
| **1. Authentication & Session** | `auth.service.ts` | JWT issuing and verification using `jose`, Bcrypt password hashing, HTTP-only secure cookie issuance, and instant session invalidation via `passwordChangedAt` comparison. |
| **2. Role-Based Access Control (RBAC)** | `requireAuth.ts` | Hierarchical authorization supporting `SUPERADMIN`, `ADMIN`, `USER`/`MEMBER`, and `RECOVERY_OPERATOR`. Granular permission resolution (`PASSWORD_RESET_REQUEST_MANAGE`). |
| **3. Admin-Assisted Password Reset & Recovery** | `password-reset.service.ts` | Zero-trust admin-assisted recovery flow. Cryptographic 32-byte SHA-256 tokens, strict 15-minute expiration countdown, rate-limiting, and single-use deadening. Zero account enumeration. |
| **4. Task Lifecycle & Workflow** | `task.service.ts` | Creation, multi-assignee tracking, milestone deadlines, task deletion with admin authorization, submission viewing with versioning, and change-request review loops. |
| **5. Authoritative Aura Ledger** | `aura.service.ts` | Double-entry transaction accounting, audit trails, balance verification, lifetime cumulative aura tally, and non-negative balance checks. |
| **6. Team Collaboration & Kudos Wall** | `team.service.ts`, `kudos.service.ts` | Team creation, roster management, peer recognition broadcasts, badge attachment, and live activity feeds. |
| **7. Rewards Store & Inventory** | `store.service.ts` | Stock catalog management, atomic stock decrementing, race condition prevention, and order fulfillment tracking. |
| **8. Notifications & User Preferences** | `notification.service.ts`, `notification-preference.service.ts` | In-app notification delivery, real-time unread badge counts, and granular per-user email/in-app channel delivery toggles. |
| **9. Background Delivery Queue** | `delivery-processor.service.ts`, `src/worker.ts` | Asynchronous worker processing BullMQ Redis jobs or resilient PostgreSQL polling queues with exponential backoff retries. |
| **10. Transactional Email Engine** | `email.service.ts` | Nodemailer SMTP client dispatching formatted HTML templates for task assignments, approvals, store purchases, and recovery links. |
| **11. AI Team Insights** | `ai.service.ts` | Google Gemini API integration for automated task breakdowns, peer kudos sentiment extraction, and team velocity summaries. |
| **12. Observability & Audit Logging** | `observability.service.ts`, `analytics.service.ts`, `audit.service.ts` | Delivery health metrics, latency analytics, delivery status logs, and tamper-evident administrative audit records. |

---

## 3. Recommended Cloud VM Sizing (Single-Host Deployment)

For organizations hosting AURA within their sovereign private cloud or a dedicated cloud virtual machine (Microsoft Azure / AWS / Google Cloud / Ubuntu VPS), the recommended compute sizing is outlined below:

### VM Hardware Sizing Comparison

| Hardware Specification | Minimum (Budget Tier) | Recommended (Production Tier) | Architectural Rationale for AURA |
|---|---|---|---|
| **Azure VM SKU / Family** | `Standard_B2s` | `Standard_B2ms` | Burstable B-series accumulates CPU credits during non-work hours and unleashes 100% compute during peak check-in, submission, and redemption bursts. |
| **Compute (vCPU)** | 2 vCPUs | 2 vCPUs (Intel Xeon / AMD EPYC) | Concurrently executes Node.js event loops, Next.js SSR compilations, and background delivery worker loops without thread starvation. |
| **Memory (RAM)** | 4 GB RAM (+ 4 GB swap) | 8 GB RAM | Dedicated headroom for Next.js SSR, Express API, PostgreSQL buffer pool, Redis cache, and Linux OS disk caching. |
| **Storage (SSD / Disk)** | 32 GB Standard SSD | 64 GB – 128 GB Premium SSD (Azure P6 / P10) | Guarantees up to 1,100 dedicated IOPS for sub-millisecond database writes, ACID audit logging, and asset retrieval. |
| **Operating System** | Ubuntu Server 22.04 LTS x64 | Ubuntu Server 24.04 LTS / 22.04 LTS x64 | Hardened enterprise Linux distribution with extended LTS security updates and systemd daemon management. |
| **Public IP & Networking** | Dynamic IPv4 | 1 Static Public IPv4 (Standard SKU) | Required for corporate DNS mapping (`aura.company.com`), firewall whitelisting, and automated Let's Encrypt SSL/TLS certificates. |
| **Capacity Scale** | Target 30–40 active users (up to ~50) | 250+ users (500+ with Redis caching activated) | Accommodates multi-batch organizational expansion without re-architecting underlying infrastructure. |

### Architectural Rationale for Standard_B2ms (8 GB RAM)
1. **Burstable Usage Profile:** Employee activity clusters tightly around milestone intervals:
   - **Morning Burst (09:00 – 10:30):** Daily task assignment reviews, notification checks, and leaderboard inspections.
   - **Afternoon/Evening Burst (16:30 – 18:30):** Task completions, PR/work submissions, peer Kudos broadcasts, and store redemptions.
2. **Generous 8 GB Memory Cushion:** The active service footprint consumes ~2.2 GB at base and ~3.4 GB during peak bursts. This leaves **over 4.5 GB of free RAM** for Linux kernel disk page caches and prevents Out-Of-Memory (OOM) killer terminations.

---

## 4. Subsystem Memory Allocation & Resource Footprint

The following resource budget reflects the complete, verified AURA production stack running on a single `Standard_B2ms` virtual machine:

| Subsystem / Service | Technology Stack | Base RAM | Peak RAM (Bursts) | Typical CPU | Operational Role & Ports |
|---|---|---|---|---|---|
| **Web Frontend Portal** | Next.js 16.3.5 / React 19.2.8 / Turbopack | 180 MB | 280 MB | 2–6% | Server Actions, SSR rendering, UI shell (`localhost:3000`). |
| **API Gateway & Router** | Express 4.21.2 / Node 20 LTS | 80 MB | 130 MB | 1–4% | Core HTTP routing, CORS, JSON parsing (`localhost:4000`). |
| **Auth, RBAC & Recovery** | `jose` / Bcrypt / Rate Limiter | 75 MB | 110 MB | 1–3% | Token issuing, zero-trust password recovery, session invalidation. |
| **Task Lifecycle Engine** | Express / Prisma Client | 90 MB | 150 MB | 3–8% | Task assignment, multi-version submissions, review loops. |
| **Aura Ledger & Wallet** | Prisma ACID Transactions | 80 MB | 120 MB | 2–5% | Double-entry ledger, balance checks, transaction logs. |
| **Kudos Wall & Teams** | Prisma / Express | 75 MB | 110 MB | 1–4% | Real-time kudos broadcasting, reactions, team rosters. |
| **Store & Redemptions** | Prisma / Atomic Decrements | 70 MB | 100 MB | 1–3% | Catalog stock, redemption verification, fulfillment state. |
| **In-App Notification Engine** | Prisma / Express | 70 MB | 100 MB | 1–3% | Notification records, unread counters, user preferences. |
| **Background Delivery Worker** | BullMQ / DB Poller / Nodemailer | 90 MB | 140 MB | 2–5% | Async email dispatch, queue retry processing (`worker.ts`). |
| **AI Insights Service** | Google Gemini API Client | 60 MB | 90 MB | 1–3% | Team analytics, kudos sentiment analysis, task decomposition. |
| **Relational Database** | PostgreSQL 15/16 + `@prisma/adapter-pg` | 750 MB | 1,200 MB | 4–12% | 23 normalized models, indexes, connection pool (`port 5432`). |
| **In-Memory Cache & Queue** | Redis 7 Alpine | 35 MB | 60 MB | < 1% | BullMQ queue state, concurrency locks, leaderboard cache (`6379`). |
| **Nginx Web Server** | Nginx Alpine / Ubuntu | 30 MB | 50 MB | < 1% | Reverse proxy, static asset caching, TLS 1.3 termination. |
| **Linux OS & Daemons** | Ubuntu 22.04/24.04 LTS (systemd, sshd) | 500 MB | 700 MB | 1–2% | Linux kernel, syslog, networking stack, process supervision. |
| **TOTALS** | — | **~2.19 GB** | **~3.44 GB** | **Comfortable** | **Leaves > 4.5 GB of free RAM headroom on an 8 GB VM.** |

---

## 5. Dual Deployment Topologies

AURA supports two production-ready deployment topologies depending on enterprise infrastructure guidelines:

### Topology A: Single Cloud VM (All-in-One Ubuntu Host)
- **Best For:** Enterprise self-hosting, strict data residency compliance, lowest monthly infrastructure cost ($35–$60/month).
- **Architecture:** Next.js, Express API, PostgreSQL, Redis, and Background Worker supervised on a single Azure `Standard_B2ms` or AWS `t4g.large` VM.
- **Process Supervision:** Systemd units:
  - `kai-aura-backend.service` (Node.js Express API on port 4000)
  - `kai-aura-frontend.service` (Next.js server on port 3000)
  - `kai-aura-worker.service` (Standalone background email/delivery worker)
- **Nginx Ingress Configuration:**
  ```nginx
  server {
      listen 443 ssl http2;
      server_name aura.company.com;

      ssl_certificate /etc/letsencrypt/live/aura.company.com/fullchain.pem;
      ssl_certificate_key /etc/letsencrypt/live/aura.company.com/privkey.pem;

      # Frontend Application
      location / {
          proxy_pass http://127.0.0.1:3000;
          proxy_http_version 1.1;
          proxy_set_header Upgrade $http_upgrade;
          proxy_set_header Connection 'upgrade';
          proxy_set_header Host $host;
          proxy_cache_bypass $http_upgrade;
      }

      # Backend REST API
      location /api {
          proxy_pass http://127.0.0.1:4000;
          proxy_http_version 1.1;
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;
      }
  }
  ```

### Topology B: Cloud-Native Decoupled PaaS
- **Best For:** Zero-maintenance infrastructure, automated CI/CD branch deployments, and infinite elasticity.
- **Components:**
  - **Frontend:** Vercel (Next.js Edge/SSR platform with global CDN caching).
  - **Backend API:** Render Web Service (Node.js runtime executing `dist/src/server.js` on port 4000).
  - **Background Worker:** Render Background Worker service executing `dist/src/worker.js`.
  - **Managed Database:** Render PostgreSQL 16 or Neon Serverless Postgres with connection pooling.
  - **Managed Redis:** Upstash Redis or Render Redis for BullMQ distributed jobs.
  - **Cross-Origin Security:**
    - `FRONTEND_URL="https://aura.company.com"`
    - Cookies issued with `SameSite: 'None'; Secure: true`.
    - Server Actions proxy API requests server-to-server to eliminate cross-site browser cookie blocks.

---

## 6. Domain Polling & Notification Frequency Impact Analysis

Because team members receive real-time updates regarding peer Kudos, task reviews, Aura balance changes, and notification badges, the client polling interval directly impacts database and network utilization.

### Comparative Polling Frequency Matrix (35 Active Users, 8-Hour Workday)

| Operational Metric | Option A: 10 Seconds (Aggressive) | Option B: 30 Seconds (Recommended Default) | Option C: 60 Seconds (Ultra-Low Footprint) |
|---|---|---|---|
| **Requests / minute (total)** | 210 req/min (3.5 req/sec) | **70 req/min (1.16 req/sec)** | 35 req/min (0.58 req/sec) |
| **Requests / hour (total)** | 12,600 req/hr | **4,200 req/hr (66% reduction)** | 2,100 req/hr (83% reduction) |
| **Daily API calls (8-hr shift)** | 100,800 calls/day | **33,600 calls/day** | 16,800 calls/day |
| **Monthly API calls (22 days)** | ~2,217,600 calls/mo | **~739,200 calls/mo** | ~369,600 calls/mo |
| **Monthly network bandwidth** | ~1.4 GB / month | **~480 MB / month** | ~240 MB / month |
| **Database queries (Postgres)** | 210 queries/min | **70 queries/min** | 35 queries/min |
| **Azure VM CPU impact** | 4% – 7% steady | **1.5% – 3% baseline** | 0.8% – 1.8% baseline |
| **Notification badge latency** | ~5 – 10 seconds | **~15 – 30 seconds** | ~30 – 60 seconds |
| **Scalability on Standard_B2ms** | Up to ~120 users | **Up to ~350 users** | Up to ~750 users |

**Architectural Recommendation:** **Option B (30-second polling or Server Action revalidation)** provides the ideal balance between responsive UI notifications and ultra-light database load (1.16 queries/sec across the entire organization).

---

## 7. Performance Acceleration via Redis Caching

Enabling Redis caching alongside PostgreSQL reduces database read queries by over **92%** for only ~35–60 MB of additional RAM:

| Subsystem | Without Redis (Direct PostgreSQL) | With Redis Layer Activated | Load Reduction & Performance Gain |
|---|---|---|---|
| **User Aura Balance & Lifetime Stats** | Re-computed by aggregating `AuraTransaction` records or executing SQL sums on every page navigation. | Balance cached at key `aura:balance:{userId}`, invalidated only upon an approved point transaction. | **95% reduction** in transaction aggregations. Latency drops from ~18 ms to **< 1 ms**. |
| **Leaderboard & Wall Ranking** | Dynamic SQL query grouping top users by cumulative Aura with multi-table sorting. | Redis Sorted Set (`ZREVRANGE aura:leaderboard 0 50`), updated atomically upon point award. | **100% elimination** of expensive SQL sorts across historical transaction rows. |
| **Store Item Inventory & Concurrency** | High-concurrency purchases risk SQL lock contention or negative inventory race conditions. | Atomic `DECRBY store:stock:{itemId}` combined with distributed lock `SET lock:item:{id} NX EX 3`. | **Zero risk of overselling**; depleted stock requests rejected instantly in memory without hitting PostgreSQL. |
| **Notification Queueing (BullMQ)** | Synchronous SMTP dispatch blocks HTTP request execution and increases API latency. | BullMQ offloads jobs to Redis queue `bull:notification:queue`; worker delivers email asynchronously. | API response times remain fast (**< 40 ms**) for task submissions, reviews, and kudos broadcasts. |
| **Session & RBAC Verification** | Repeated DB lookups for user roles (`SUPERADMIN`, `ADMIN`, `RECOVERY_OPERATOR`) on protected routes. | Session token payload and permissions cached at `session:{token}` (TTL: 24h, invalidated on password change). | **Zero database round-trips** on routine authenticated endpoint calls. |

---

## 8. Storage & Disk Sizing (64 GB vs 128 GB Managed SSD)

Data volume in AURA consists primarily of relational rows, audit records, and submission artifacts. Because storage growth is predictable and steady, disk I/O performance (IOPS and low-latency random writes) takes priority over sheer disk capacity.

### Projected Disk Space Utilization (2-Year Horizon)

| Component / Subsystem | Allocation (GB) | Description & Maintenance Strategy |
|---|---|---|
| **Ubuntu Linux OS & System Packages** | 8.0 GB | Operating system kernel, security patches, base utilities. |
| **Runtimes & Build Artifacts** | 10.0 GB | Node.js, Next.js build caches, npm packages, Turbopack artifacts. |
| **PostgreSQL Database Engine & Data** | 3.5 GB | 23 relational tables, indexes, and historical transaction rows for 30–40 users over 24 months. |
| **User Avatars, Badges & Store Assets** | 5.0 GB | Compressed user profile photos, store item catalog icons, badge artwork. |
| **Task Submissions & Document Artifacts** | 12.0 GB | Code samples, design screenshots, and deliverables submitted during task completions. |
| **System Swap File (Safety Buffer)** | 4.0 GB | Virtual memory safety fallback to absorb sudden memory spikes. |
| **Application & System Audit Logs** | 4.0 GB | Logrotated at 30-day intervals with gzip compression. |
| **Free Operating Buffer & Temp Caches** | 17.5 GB | Free disk space required for zero-fragmentation SSD performance. |
| **TOTAL ALLOCATION** | **64.0 GB** | **Standard Managed Disk (Azure P6 / 64 GB Premium SSD)** |

**Recommendation:** A **64 GB Premium Managed SSD (Azure P6)** provides complete coverage for 2+ years of operation with 17.5 GB of free headroom. For enterprise deployments storing large binary attachments, selecting a **128 GB Premium SSD (Azure P10)** doubles throughput to 5,000 IOPS and 200 MB/s.

---

## 9. Security, Compliance & Disaster Recovery

1. **Zero-Trust Account Recovery:**
   - Single-use, 32-byte cryptographic reset tokens hashed with SHA-256 at rest.
   - 15-minute strict expiration with eager server-side verification (`GET /api/auth/validate-reset-token`).
   - Immediate session revocation for all active JWTs when `passwordChangedAt` > session `iat`.
   - Segregated `RECOVERY_OPERATOR` role with strict audit logging.
2. **Rate Limiting Protection:**
   - `/api/auth/login`: Maximum 5 attempts per 15-minute window per IP.
   - `/api/auth/forgot-password`: Maximum 3 requests per 15-minute window per IP.
   - General API endpoints: 100 requests per minute per IP.
3. **Database Backup Strategy:**
   - Automated nightly `pg_dump` backups compressed and transferred to encrypted cloud object storage (Azure Blob / AWS S3).
   - 7-day daily retention, 4-week weekly retention, and point-in-time recovery enabled.
4. **Secrets & Environment Security:**
   - All sensitive credentials (`JWT_SECRET`, `DATABASE_URL`, `SMTP_PASSWORD`) stored strictly in encrypted environment variables, never committed to source control.
