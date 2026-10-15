# KAI Aura — Production Deployment Readiness Audit
**Target Infrastructure:** Render (Backend API & Worker) + Vercel (Frontend Next.js App)  
**Document Version:** 1.0.0  
**Audit Date:** 2026-10-14  
**Audit Status:** COMPLETE — AUDIT ONLY (Zero code or schema mutations performed)  

---

## A. Executive Summary

A comprehensive, evidence-based architectural, DevOps, and deployment audit of the **KAI Aura** repository was conducted following its recent decoupling into an independent monorepo structure.

### 1. Actual Discovered Architecture
The repository is structured as a decoupled monorepo comprising:
- **`frontend/`**: Standalone Next.js 16.3.5 (Turbopack), React 19.2.8, Tailwind CSS v4, Lucide icons. Communicates exclusively via server-to-server Next.js Server Actions and a universal HTTP client (`src/lib/api-client.ts`) forwarding JWT session cookies.
- **`backend/`**: Standalone Express 4.21.2 REST API with 11 route modules, Prisma 7.10.0 ORM utilizing `@prisma/adapter-pg` driver adapters over PostgreSQL, and a dual-mode background delivery worker (`src/worker.ts`) supporting BullMQ/Redis or fallback PostgreSQL polling.
- **`package.json` (Root)**: Lightweight workspace coordinator providing project-level lifecycle scripts (`dev:frontend`, `dev:backend`, `build:frontend`, `build:backend`, `test`). Direct dependencies are zero.

### 2. Current Deployment Readiness
- **Frontend (Vercel):** **BLOCKED — MINOR CONFIGURATION & DEPENDENCY REPAIR REQUIRED.**
  - A local directory dependency `"kai-aura-workspace": "file:.."` exists in `frontend/package.json` (line 16), which will cause `npm install` on Vercel to fail when `frontend` is set as the project root.
  - Three API endpoint contract mismatches exist between frontend Server Actions and backend routes (`/notifications/jobs/process-emails`, `/notifications/preferences`, and `/ai/task-breakdown`).
  - `eslint.config.mjs` is missing in `frontend/`, causing `next lint` to fail with exit code 1.
- **Backend (Render):** **BLOCKED — CODE / CONFIGURATION CHANGE REQUIRED.**
  - Production start command in `backend/package.json` (`"start": "node dist/server.js"`) points to a non-existent file. TypeScript compiles `src/server.ts` to `dist/src/server.js` because `rootDir: "./"` encompasses `prisma/` and `src/`. Running `npm start` currently crashes with `MODULE_NOT_FOUND` (exit code 1).
  - The API server (`src/server.ts`) does not execute the background delivery worker (`src/worker.ts`). Render requires deploying a separate **Render Background Worker** service (or embedding the worker loop in the API process).
  - The Express server lacks `SIGTERM`/`SIGINT` graceful shutdown handling and connection draining.

### 3. Highest-Risk Assumptions
1. **Third-Party Cookies vs. Server Actions:** While backend auth sets `sameSite: 'none'` in production, frontend data operations are mediated by Next.js Server Actions which forward the cookie server-to-server. If any client-side component calls `apiClient` directly from the browser across origins (`vercel.app` ➔ `onrender.com`), modern browsers will block the cross-site session cookie unless custom domains on a shared apex are used.
2. **Shared JWT Secrets:** Both frontend and backend independently verify or sign JWT session tokens using `process.env.JWT_SECRET`. If `JWT_SECRET` differs between Vercel and Render, authentication will completely fail across the boundary.

---

## B. Verified Repository Structure

```
d:/E/Vedant/Code/Krios/AURA/KAI Aura App/KAI Aura App/
├── backend/                                # Standalone Express 4 + Prisma 7 Service
│   ├── prisma/
│   │   ├── migrations/                     # 4 SQL migrations (PostgreSQL)
│   │   │   ├── 20260929064518_init_phase_1/
│   │   │   ├── 20260929064732_phase_2_tasks_aura/
│   │   │   ├── 20260929064943_phase_3_teams_store_audit/
│   │   │   ├── 20261001071612_add_notification_delivery_preferences/
│   │   │   └── migration_lock.toml         # provider = "postgresql"
│   │   ├── schema.prisma                   # Authoritative database models
│   │   └── seed.ts                         # System role & superadmin seed script
│   ├── prisma7.config.ts                   # Prisma 7 CLI configuration (defines URL & seed)
│   ├── src/
│   │   ├── lib/                            # auth.ts, errors.ts, prisma.ts
│   │   ├── middleware/                     # requireAuth.ts (JWT verify + RBAC guards)
│   │   ├── routes/                         # 11 REST route modules
│   │   ├── services/                       # 14 business domain services & templates
│   │   ├── server.ts                       # Express HTTP entry point (port 4000)
│   │   └── worker.ts                       # Standalone background notification worker
│   ├── tests/                              # 12 test suites (72 passing assertions)
│   ├── .env.example                        # Backend environment template
│   ├── .gitignore                          # Ignores node_modules, dist, .env, tsbuildinfo
│   ├── package.json                        # Backend scripts & runtime dependencies
│   ├── package-lock.json                   # Backend deterministic dependency lockfile
│   └── tsconfig.json                       # CommonJS target, outDir: ./dist
│
├── frontend/                               # Standalone Next.js 16 (Turbopack) UI
│   ├── public/                             # Store product PNGs, SVG icons, brand assets
│   ├── src/
│   │   ├── actions/                        # 11 Server Action modules delegating to REST
│   │   ├── app/                            # App Router (layout.tsx, page.tsx, login/page.tsx)
│   │   ├── components/                     # Impeccable UI, modals, widgets, design tokens
│   │   └── lib/                            # api-client.ts, auth.ts, errors.ts, utils.ts
│   ├── .env.example                        # Frontend environment template
│   ├── .gitignore                          # Ignores node_modules, .next, dist, .env*.local
│   ├── next.config.ts                      # Turbopack Next.js configuration
│   ├── package.json                        # Frontend scripts & dependencies
│   ├── package-lock.json                   # Frontend deterministic dependency lockfile
│   └── tsconfig.json                       # Next.js TypeScript config with @/* alias
│
├── docs/                                   # Documentation, specifications & audit logs
│   ├── deployment/                         # Architecture plans, env matrix, checklists
│   ├── reports/                            # smtp-consolidated-report.md
│   └── requirements-audit/                 # Traceability matrix, UAT master cases
│
├── package.json                            # Workspace coordinator (scripts only, 0 dependencies)
├── .env.example                            # Root workspace environment template
├── .gitignore                              # Root Git ignore rules
├── architecture.md                         # Monorepo architecture & decoupled specs
├── SETUP.md                                # Local & production setup instructions
├── memory.md                               # Chronological project record (through KAI-14-003)
├── PRODUCT.md                              # Product requirements specification
├── README.md                               # Project readme
└── rules.md                                # Coding standards and rules
```

*Note on Missing Requested Documentation:*
- `database-design.md`: Requested in Phase 0 audit prompt; **does not exist** in the repository. The authoritative schema is documented in `backend/prisma/schema.prisma` and `architecture.md` (Section 2).

---

## C. Frontend Deployment Assessment (Vercel)

| Aspect | Current Setting / Evidence | Status | Impact & Recommendation |
| :--- | :--- | :--- | :--- |
| **Vercel Project Root** | Must be set to `frontend` | Required | Set **Root Directory** in Vercel Project Settings to `frontend`. |
| **Package Manager & Install** | `npm install` | **BLOCKER** | Line 16 of `frontend/package.json` contains `"kai-aura-workspace": "file:.."`. When Vercel clones and builds with root set to `frontend`, resolving `file:..` will fail or throw errors. **Action:** Remove `"kai-aura-workspace": "file:.."` from `frontend/package.json`. |
| **Build Command** | `npm run build` (`next build`) | VERIFIED | Successfully compiles 5/5 static & dynamic routes with Next.js 16.3.5 (Turbopack) and TypeScript 5 in ~4.5 seconds. |
| **Output Type** | Standalone Node.js server / Vercel Serverless | VERIFIED | Dynamic server rendering with Server Actions. **Do NOT configure `output: 'export'`** as it would break server-side cookies, sessions, and Server Actions. |
| **Lint Script** | `npm run lint` (`next lint`) | **MEDIUM** | Running `npm run lint` inside `frontend/` fails with: `Invalid project directory provided: frontend\lint` because no `eslint.config.mjs` exists in `frontend/`. If Vercel has "Ignore Build Errors" unchecked for ESLint, the build will fail. **Action:** Supply `eslint.config.mjs` in `frontend/` or set Vercel build command to `next build`. |
| **API Client Configuration** | `frontend/src/lib/api-client.ts` | VERIFIED | Reads `process.env.API_URL` on the server and `process.env.NEXT_PUBLIC_API_URL` on the client. Default fallback: `http://localhost:4000/api`. |
| **Server vs. Client Secrets** | `JWT_SECRET` in `frontend/src/lib/auth.ts` | VERIFIED | Not prefixed with `NEXT_PUBLIC_`. Kept strictly server-side within Next.js Server Components and Server Actions. |
| **Static Assets** | `frontend/public/` | VERIFIED | All 6 store product images (`coffee_mug.png`, `laptop_stand.png`, `mechanical_keyboard.png`, `MOBILE_STAND.png`, `wireless_mouse.png`, `wrist_rest.png`) reside in `frontend/public/store/`. |

---

## D. Backend Deployment Assessment (Render)

| Aspect | Current Setting / Evidence | Status | Impact & Recommendation |
| :--- | :--- | :--- | :--- |
| **Render Root Directory** | Must be set to `backend` | Required | Configure Render Web Service Root Directory as `backend`. |
| **Install & Build Command** | `npm install && npx prisma generate && npm run build` | VERIFIED | `tsc` completes with 0 errors. Note: `npx prisma generate` must precede `npm run build` so that `@prisma/client` types are populated. |
| **Production Start Command** | `backend/package.json` line 7: `"start": "node dist/server.js"` | **BLOCKER** | Running `node dist/server.js` fails with `Cannot find module 'dist/server.js'`. Because `rootDir: "./"` includes `src/` and `prisma/`, `tsc` outputs to `dist/src/server.js`. **Action:** Change `"start"` in `backend/package.json` to `"node dist/src/server.js"`. |
| **Port & Host Binding** | `backend/src/server.ts` line 19 | VERIFIED | `PORT = parseInt(process.env.PORT ?? '4000', 10)`. Correctly reads `process.env.PORT` provided dynamically by Render. Binds via `app.listen(PORT)` (defaults to `0.0.0.0` on Linux). |
| **Health Check Path** | `backend/src/server.ts` lines 38–40 | VERIFIED | `GET /api/health` returns `{ status: 'ok', timestamp: '...' }` with HTTP 200 without requiring database queries or authentication. Set Render **Health Check Path** to `/api/health`. |
| **CORS Configuration** | `backend/src/server.ts` line 22 | VERIFIED | `const allowedOrigin = process.env.FRONTEND_URL ?? 'http://localhost:3000';`. Accepts credentials. Note: Ensure `FRONTEND_URL` on Render has **no trailing slash** (e.g. `https://kai-aura.vercel.app`). |
| **Graceful Shutdown** | `backend/src/server.ts` | **MEDIUM** | No `process.on('SIGTERM')` handler exists in `server.ts`. Deployments on Render send `SIGTERM` before killing containers, potentially dropping in-flight requests. **Action:** Add clean HTTP server close and `prisma.$disconnect()`. |
| **Worker Architecture** | `backend/src/worker.ts` | **HIGH** | `server.ts` does **not** run the delivery worker. If background email deliveries or streak checks are needed continuously, a separate **Render Background Worker** service must be deployed running `node dist/src/worker.js`, or background tasks must be triggered on demand via REST jobs. |

---

## E. Environment Variable and Secret Matrix

| Variable Name | Owner | Purpose | Required / Optional | Local Format Example | Production Host | Referenced In | Exposure Risk |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Backend | PostgreSQL connection string | **Required** | `postgresql://user:pass@localhost:5432/kai_aura?schema=public` | Render | `backend/src/lib/prisma.ts`, `backend/prisma7.config.ts`, `backend/prisma/seed.ts` | **Sensitive** (Server-only) |
| `JWT_SECRET` | Backend & Frontend | HS256 secret for session token signing and verification | **Required** (Must match on both) | `openssl rand -hex 64` (min 32 chars) | Render & Vercel | `backend/src/lib/auth.ts`, `frontend/src/lib/auth.ts` | **Sensitive** (Server-only) |
| `FRONTEND_URL` | Backend | Allowed CORS origin for credentials | **Required** | `http://localhost:3000` | Render | `backend/src/server.ts` (line 22) | Low (Server-only) |
| `PORT` | Backend | HTTP port to bind Express server | Optional (Render injects) | `4000` | Render | `backend/src/server.ts` (line 19) | Low |
| `API_URL` | Frontend | Server-to-server backend API base URL | **Required** | `http://localhost:4000/api` | Vercel | `frontend/src/lib/api-client.ts` (line 9) | Low (Server-only) |
| `NEXT_PUBLIC_API_URL`| Frontend | Browser-facing fallback API URL | Optional / Recommended | `http://localhost:4000/api` | Vercel | `frontend/src/lib/api-client.ts` (line 11) | **Public** |
| `APP_URL` | Backend | Base URL embedded in email notification hyperlinks | Optional | `http://localhost:3000` | Render | `backend/src/services/email/template.resolver.ts` | Low (Server-only) |
| `NEXT_PUBLIC_APP_URL`| Backend | Fallback URL for email template links | Optional | `http://localhost:3000` | Render | `backend/src/services/email/template.resolver.ts` | Low |
| `DELIVERY_WORKER_ENABLED` | Backend / Worker | Activates worker processing loop | Conditionally Required | `true` | Render Worker | `backend/src/worker.ts` (line 11) | Low |
| `DELIVERY_WORKER_INTERVAL_MS` | Backend / Worker | Polling interval for DB fallback worker | Optional (default: `10000`) | `10000` | Render Worker | `backend/src/worker.ts` (line 9) | Low |
| `DELIVERY_WORKER_BATCH_SIZE` | Backend / Worker | Max email batch size per poll cycle | Optional (default: `20`) | `20` | Render Worker | `backend/src/worker.ts` (line 10) | Low |
| `DELIVERY_WORKER_MAX_RETRIES` | Backend / Worker | Retry limit before marking delivery FAILED | Optional (default: `3`) | `3` | Render Worker | `backend/src/services/email.service.ts` | Low |
| `QUEUE_ENABLED` | Backend / Worker | Enables Redis + BullMQ queueing | Optional (default: `false`) | `false` or `true` | Render Worker | `backend/src/services/queue/queue.config.ts` | Low |
| `REDIS_URL` | Backend / Worker | Redis server connection string | Conditionally Required (if `QUEUE_ENABLED=true`) | `redis://localhost:6379` | Render Worker | `backend/src/services/queue/queue.config.ts` | **Sensitive** (Server-only) |
| `NOTIFICATION_QUEUE_NAME` | Backend / Worker | BullMQ queue identifier | Optional (default: `aura-email-deliveries`)| `aura-email-deliveries` | Render Worker | `backend/src/services/queue/queue.config.ts` | Low |
| `QUEUE_WORKER_CONCURRENCY` | Backend / Worker | BullMQ concurrent jobs | Optional (default: `5`) | `5` | Render Worker | `backend/src/services/queue/queue.config.ts` | Low |
| `QUEUE_JOB_ATTEMPTS` | Backend / Worker | BullMQ retry attempts | Optional (default: `3`) | `3` | Render Worker | `backend/src/services/queue/queue.config.ts` | Low |
| `QUEUE_BACKOFF_DELAY` | Backend / Worker | Exponential backoff base (ms) | Optional (default: `2000`) | `2000` | Render Worker | `backend/src/services/queue/queue.config.ts` | Low |
| `SMTP_HOST` | Backend / Worker | Outgoing SMTP server hostname | Conditionally Required (for email)| `smtp.sendgrid.net` | Render | `backend/src/services/email.service.ts` | Low |
| `SMTP_PORT` | Backend / Worker | Outgoing SMTP server port | Optional (default: `587`) | `587` | Render | `backend/src/services/email.service.ts` | Low |
| `SMTP_USER` | Backend / Worker | SMTP authentication username | Conditionally Required | `apikey` | Render | `backend/src/services/email.service.ts` | Low |
| `SMTP_PASSWORD` | Backend / Worker | SMTP authentication password/token | Conditionally Required | `SG.xxxxxxxx` | Render | `backend/src/services/email.service.ts` | **Sensitive** |
| `SMTP_FROM` | Backend / Worker | Sender header (`From`) | Optional (default: no-reply) | `"KAI Aura" <no-reply@kaiaura.com>` | Render | `backend/src/services/email.service.ts` | Low |
| `SMTP_SECURE` | Backend / Worker | SSL vs TLS transport toggle | Optional (default: `false`) | `false` | Render | `backend/src/services/email.service.ts` | Low |
| `GEMINI_API_KEY` | Backend | Google Gemini API key for AI task breakdown | Optional (heuristic fallback exists)| `AIzaSy...` | Render | `backend/src/services/ai.service.ts` | **Sensitive** |
| `OPENAI_API_KEY` | Backend | OpenAI API key fallback for AI task breakdown | Optional (heuristic fallback exists)| `sk-...` | Render | `backend/src/services/ai.service.ts` | **Sensitive** |

---

## F. Database and Infrastructure Requirements

### 1. PostgreSQL & Prisma Architecture
- **Engine:** PostgreSQL 14+ (compatible with Render Managed PostgreSQL or Neon / Supabase).
- **Prisma Version:** `7.10.0` with `@prisma/client: 7.10.0` and `@prisma/adapter-pg: ^7.10.0`.
- **Runtime Connection:** Implemented via a connection pool in `backend/src/lib/prisma.ts` using `pg.Pool` and `new PrismaPg(pool)`.
- **Authoritative Files:**
  - Schema: `backend/prisma/schema.prisma`
  - Config: `backend/prisma7.config.ts` (defines `datasource.url` from `DATABASE_URL` and migration seed script)
  - Migrations: `backend/prisma/migrations/` (4 migration folders with `migration_lock.toml`)
- **Safe Production Migration Command:**
  ```bash
  npx prisma migrate deploy
  ```
  *(To be executed in the Render Build Command or Release Command).*

### 2. Redis & Background Processing
- **Queue Engine:** BullMQ `6.3.11` backed by `ioredis: ^6.0.0`.
- **Redis Dependency:** **OPTIONAL**. If `QUEUE_ENABLED` is `false` or Redis is unreachable, the system automatically and safely switches to **Database Polling mode** via `DeliveryProcessorService.processPendingEmailDeliveries()`.
- **Email Delivery Safety:** In-app notifications are stored synchronously in PostgreSQL (`Notification` and `NotificationDelivery` tables). Email deliveries are non-blocking. If SMTP credentials are absent or fail, deliveries are recorded as `FAILED` with sanitized error messages and can be retried via the Observability dashboard.

---

## G. Frontend/Backend Integration Assessment

### 1. Request Transport & Session Flow
```mermaid
sequenceDiagram
    autonumber
    actor User as Browser (User)
    participant Vercel as Vercel (Next.js Frontend)
    participant Render as Render (Express API)
    participant DB as PostgreSQL Database

    User->>Vercel: POST /login (email, password)
    Vercel->>Render: POST /api/auth/login
    Render->>DB: Verify credentials & role
    DB-->>Render: User record
    Render-->>Vercel: 200 OK + { user, roles }
    Vercel->>User: Set-Cookie: session=<JWT> (Lax, HttpOnly, 1st Party)
    
    Note over User, Vercel: Authenticated User Actions
    User->>Vercel: Invoke Server Action (e.g. createTaskAction)
    Vercel->>Vercel: Extract session token from cookieStore
    Vercel->>Render: HTTP POST /api/tasks (Cookie: session=<JWT>)
    Render->>Render: requireAuth middleware verifies JWT
    Render->>DB: Insert Task
    DB-->>Render: Saved Task
    Render-->>Vercel: 201 Created + Task payload
    Vercel-->>User: Revalidate cache & update UI
```

### 2. Third-Party Cookie Isolation Advantage
Because 100% of frontend mutations and data queries execute through Next.js Server Actions on Vercel:
- The `session` cookie is set as a **first-party cookie** on the Vercel domain (`kai-aura.vercel.app`).
- The Vercel server extracts the cookie value and transmits it across the server-to-server boundary to Render via standard HTTP headers (`Cookie: session=<token>`).
- **Browser third-party cookie restrictions (Safari ITP, Chrome Privacy Sandbox) have ZERO negative impact on this architecture.**

### 3. Route Contract Mismatches Found
The audit detected 3 route mismatches between frontend Server Actions and backend Express routes:

1. **Email Delivery Processor Trigger:**
   - **Frontend:** [frontend/src/actions/notification.actions.ts:51](file:///d:/E/Vedant/Code/Krios/AURA/KAI%20Aura%20App/KAI%20Aura%20App/frontend/src/actions/notification.actions.ts#L51) calls `POST /notifications/jobs/process-emails`.
   - **Backend:** [backend/src/routes/notification.routes.ts:135](file:///d:/E/Vedant/Code/Krios/AURA/KAI%20Aura%20App/KAI%20Aura%20App/backend/src/routes/notification.routes.ts#L135) listens on `POST /jobs/email-processor`.
   - **Result:** Returns `404 Not Found`.

2. **Notification Preference Updates & Reset:**
   - **Frontend Update:** [frontend/src/actions/notification.actions.ts:62](file:///d:/E/Vedant/Code/Krios/AURA/KAI%20Aura%20App/KAI%20Aura%20App/frontend/src/actions/notification.actions.ts#L62) calls `PUT /notifications/preferences` with body `{ type, emailEnabled, inAppEnabled }`.
   - **Backend Update:** [backend/src/routes/notification.routes.ts:74](file:///d:/E/Vedant/Code/Krios/AURA/KAI%20Aura%20App/KAI%20Aura%20App/backend/src/routes/notification.routes.ts#L74) expects parameter in path: `PUT /preferences/:type`.
   - **Frontend Reset:** [frontend/src/actions/notification.actions.ts:70](file:///d:/E/Vedant/Code/Krios/AURA/KAI%20Aura%20App/KAI%20Aura%20App/frontend/src/actions/notification.actions.ts#L70) calls `POST /notifications/preferences/reset`.
   - **Backend Reset:** [backend/src/routes/notification.routes.ts:92](file:///d:/E/Vedant/Code/Krios/AURA/KAI%20Aura%20App/KAI%20Aura%20App/backend/src/routes/notification.routes.ts#L92) listens on `DELETE /preferences`.
   - **Result:** Updating or resetting preferences returns `404 Not Found`.

3. **AI Task Breakdown Objective:**
   - **Frontend:** [frontend/src/actions/ai.actions.ts:9](file:///d:/E/Vedant/Code/Krios/AURA/KAI%20Aura%20App/KAI%20Aura%20App/frontend/src/actions/ai.actions.ts#L9) calls `POST /ai/task-breakdown`.
   - **Backend:** [backend/src/routes/ai.routes.ts:13](file:///d:/E/Vedant/Code/Krios/AURA/KAI%20Aura%20App/KAI%20Aura%20App/backend/src/routes/ai.routes.ts#L13) listens on `POST /breakdown-task`.
   - **Result:** Returns `404 Not Found`.

---

## H. Build and Test Evidence

| Verification Target | Working Directory | Command Executed | Result | Duration / Details |
| :--- | :--- | :--- | :--- | :--- |
| **Prisma Schema Validation** | `backend/` | `npx prisma validate` | **PASS (Exit 0)** | Loaded `prisma7.config.ts`. Schema at `prisma/schema.prisma` is valid. |
| **Backend TypeScript Build** | `backend/` | `npm run build` (`tsc`) | **PASS (Exit 0)** | Compiled all source files to `dist/src/` with 0 type errors. |
| **Backend Production Start** | `backend/` | `node dist/server.js` | **FAIL (Exit 1)** | `MODULE_NOT_FOUND`: Target file is `dist/src/server.js`. |
| **Frontend Production Build** | `frontend/` | `npm run build` (`next build`) | **PASS (Exit 0)** | Compiled 5 dynamic/static routes in 4.5s with Next.js Turbopack. |
| **Frontend Lint** | `frontend/` | `npm run lint` (`next lint`) | **FAIL (Exit 1)** | Missing ESLint configuration file in `frontend/`. |
| **Backend Automated Tests** | `backend/` | `npm test` (`tsx --test`) | **PASS (Exit 0)** | **23 test suites, 72 assertions passed, 0 failures.** (101 seconds). |

---

## I. Findings and Risks

### Findings Summary Matrix
| ID | Severity | Category | Description |
| :--- | :--- | :--- | :--- |
| `FINDING-01` | **BLOCKER** | Backend / Render | Backend `start` script points to non-existent `dist/server.js` instead of `dist/src/server.js`. |
| `FINDING-02` | **BLOCKER** | Frontend / Vercel | `frontend/package.json` contains invalid local path dependency `"kai-aura-workspace": "file:.."`. |
| `FINDING-03` | **HIGH** | Integration | Three API route contract mismatches between Frontend Server Actions and Backend routes. |
| `FINDING-04` | **HIGH** | Backend / Worker | Backend API server does not execute background worker; email delivery worker requires a separate process. |
| `FINDING-05` | **MEDIUM** | Frontend / DevOps | Missing `eslint.config.mjs` in `frontend/` causes `next lint` to fail during build. |
| `FINDING-06` | **MEDIUM** | Backend / Reliability | Express HTTP server lacks `SIGTERM`/`SIGINT` graceful connection termination. |
| `FINDING-07` | **LOW** | Security | Database seed script defaults to hardcoded password (`superadmin123`) for superadmin account. |
| `FINDING-08` | **LOW** | Backend / API | Express API routes currently lack rate-limiting middleware (e.g. `express-rate-limit`). |
| `FINDING-09` | **INFO** | Architecture | Third-party cookie restrictions bypassed cleanly via Next.js Server Actions cookie proxying. |

---

### Detailed Findings

#### FINDING-01 [BLOCKER] — Backend `start` command points to incorrect file path
- **Evidence:** [backend/package.json:7](file:///d:/E/Vedant/Code/Krios/AURA/KAI%20Aura%20App/KAI%20Aura%20App/backend/package.json#L7) & [backend/package.json:45](file:///d:/E/Vedant/Code/Krios/AURA/KAI%20Aura%20App/KAI%20Aura%20App/backend/package.json#L45):
  ```json
  "start": "node dist/server.js",
  "main": "dist/server.js"
  ```
- **Why It Matters:** In `backend/tsconfig.json`, `rootDir` is `"./"` and `include` is `["src/**/*", "prisma/**/*"]`. When `tsc` compiles, it preserves the directory hierarchy, placing the entry point at `dist/src/server.js`. Running `node dist/server.js` throws `Error: Cannot find module 'dist/server.js'` and crashes immediately on Render.
- **Recommended Action:** Change `"start"` in `backend/package.json` to `"node dist/src/server.js"`.
- **Requires Code Change:** Yes (Configuration in `package.json`).
- **Verification:** Run `node dist/src/server.js --help` or test start in `backend/`.

#### FINDING-02 [BLOCKER] — Invalid parent workspace reference in `frontend/package.json`
- **Evidence:** [frontend/package.json:16](file:///d:/E/Vedant/Code/Krios/AURA/KAI%20Aura%20App/KAI%20Aura%20App/frontend/package.json#L16):
  ```json
  "kai-aura-workspace": "file:.."
  ```
- **Why It Matters:** Vercel isolates the build directory to the designated Root Directory (`frontend`). `npm install` attempting to resolve `file:..` will fail because the parent directory is not packaged or recognized as a module.
- **Recommended Action:** Remove line 16 (`"kai-aura-workspace": "file:.."`) from `frontend/package.json` and regenerate `frontend/package-lock.json`.
- **Requires Code Change:** Yes.
- **Verification:** Run `npm --prefix frontend install --dry-run`.

#### FINDING-03 [HIGH] — API endpoint contract mismatches in 3 Server Actions
- **Evidence:**
  1. `frontend/src/actions/notification.actions.ts:51` (`/notifications/jobs/process-emails`) vs `backend/src/routes/notification.routes.ts:135` (`/jobs/email-processor`).
  2. `frontend/src/actions/notification.actions.ts:62,70` (`PUT /notifications/preferences`, `POST /notifications/preferences/reset`) vs `backend/src/routes/notification.routes.ts:74,92` (`PUT /preferences/:type`, `DELETE /preferences`).
  3. `frontend/src/actions/ai.actions.ts:9` (`/ai/task-breakdown`) vs `backend/src/routes/ai.routes.ts:13` (`/breakdown-task`).
- **Why It Matters:** End users will encounter `404 Not Found` errors when attempting to use AI task generation, manually trigger email processing, or customize/reset notification preferences.
- **Recommended Action:** Update either the frontend Server Action endpoints or the backend route paths so they align.
- **Requires Code Change:** Yes.
- **Verification:** Test each endpoint via `curl` or automated integration tests.

#### FINDING-04 [HIGH] — Background Delivery Worker requires a distinct execution process
- **Evidence:** [backend/src/server.ts](file:///d:/E/Vedant/Code/Krios/AURA/KAI%20Aura%20App/KAI%20Aura%20App/backend/src/server.ts) does not invoke `startWorker()` from `src/worker.ts`.
- **Why It Matters:** If only a single Render Web Service is deployed, background email processing, periodic streak reminders, and retry processing will not run automatically.
- **Recommended Action:**
  - *Option A (Recommended for Production):* Deploy a **Render Background Worker** service with start command `node dist/src/worker.js`.
  - *Option B (Recommended for Cost Efficiency / Hobby Tier):* Add a lightweight background interval inside `server.ts` that triggers `DeliveryProcessorService.processPendingEmailDeliveries()` every 30 seconds when `DELIVERY_WORKER_ENABLED=true`.
- **Requires Code Change:** Deployment configuration (Option A) or minor code adjustment (Option B).
- **Verification:** Confirm worker logs report polled deliveries.

#### FINDING-05 [MEDIUM] — Missing ESLint configuration in `frontend/`
- **Evidence:** [frontend/package.json:9](file:///d:/E/Vedant/Code/Krios/AURA/KAI%20Aura%20App/KAI%20Aura%20App/frontend/package.json#L9) invokes `next lint`, but no `eslint.config.mjs` or `.eslintrc.json` exists in `frontend/`.
- **Why It Matters:** If Vercel has default linting enabled during deployment, `npm run build` or `npm run lint` will fail the deployment pipeline.
- **Recommended Action:** Add a standard Next.js ESLint flat configuration (`eslint.config.mjs`) to `frontend/`.
- **Requires Code Change:** Yes.
- **Verification:** Run `npm --prefix frontend run lint` and confirm exit code 0.

#### FINDING-06 [MEDIUM] — Missing Graceful Shutdown handling in Express API server
- **Evidence:** [backend/src/server.ts:81](file:///d:/E/Vedant/Code/Krios/AURA/KAI%20Aura%20App/KAI%20Aura%20App/backend/src/server.ts#L81) calls `app.listen(PORT)` without attaching listeners for `SIGTERM` or `SIGINT`.
- **Why It Matters:** Render terminates instances during rolling deploys with `SIGTERM`. Without handlers, active database queries or in-flight HTTP transactions are forcefully aborted.
- **Recommended Action:** Capture the `http.Server` instance returned by `app.listen()` and gracefully drain connections and disconnect Prisma upon receiving `SIGTERM`.
- **Requires Code Change:** Yes.
- **Verification:** Send `SIGTERM` to running server process and observe clean shutdown logs.

---

## J. Exact Deployment Configuration Guide

### 1. Vercel Configuration (Frontend)

In the Vercel Dashboard (**Create New Project** / **Project Settings**):

| Setting | Value |
| :--- | :--- |
| **Framework Preset** | Next.js |
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `.next` (default) |
| **Install Command** | `npm install` |

#### Vercel Environment Variables
| Key | Value | Description |
| :--- | :--- | :--- |
| `API_URL` | `https://kai-aura-api.onrender.com/api` | Render backend API endpoint (Server-to-Server) |
| `NEXT_PUBLIC_API_URL` | `https://kai-aura-api.onrender.com/api` | Fallback browser API endpoint |
| `JWT_SECRET` | *(64-character random hex string)* | **MUST MATCH RENDER `JWT_SECRET`** |

---

### 2. Render Configuration (Backend Web Service)

In the Render Dashboard (**New Web Service**):

| Setting | Value |
| :--- | :--- |
| **Environment** | Node |
| **Root Directory** | `backend` |
| **Build Command** | `npm install && npx prisma generate && npx prisma migrate deploy && npm run build` |
| **Start Command** | `node dist/src/server.js` |
| **Health Check Path** | `/api/health` |
| **Auto-Deploy** | Yes (on push to `main`) |

#### Render Web Service Environment Variables
| Key | Value | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://...` | Render Managed PostgreSQL connection string |
| `JWT_SECRET` | *(64-character random hex string)* | **MUST MATCH VERCEL `JWT_SECRET`** |
| `FRONTEND_URL` | `https://kai-aura.vercel.app` | Vercel production domain (NO trailing slash) |
| `APP_URL` | `https://kai-aura.vercel.app` | URL for email links |
| `NODE_ENV` | `production` | Enables secure cookies and production mode |
| `SMTP_HOST` | `smtp.sendgrid.net` (or provider) | Outgoing email server |
| `SMTP_PORT` | `587` | STARTTLS port |
| `SMTP_USER` | *(username/apikey)* | SMTP user |
| `SMTP_PASSWORD` | *(secure password)* | SMTP password |
| `SMTP_FROM` | `"KAI Aura" <notifications@kaiaura.com>` | Sender address |
| `SMTP_SECURE` | `false` | `false` for 587, `true` for 465 |
| `QUEUE_ENABLED` | `false` (or `true` if Redis added) | Enables DB polling (default) or Redis queue |
| `DELIVERY_WORKER_ENABLED` | `true` | Allows email delivery processing |

---

### 3. Render Background Worker (Optional / Production Queue Mode)

If deploying the separate Background Worker on Render (**New Background Worker**):

| Setting | Value |
| :--- | :--- |
| **Root Directory** | `backend` |
| **Build Command** | `npm install && npx prisma generate && npm run build` |
| **Start Command** | `node dist/src/worker.js` |
| **Environment Variables** | Same as Backend Web Service + `REDIS_URL` if Redis is used |

---

## K. Deployment Decision

### Decision: **`BLOCKED — CODE CHANGES REQUIRED`**

### Justification:
1. **Render Start Command (Blocker):** Backend `package.json` specifies `"start": "node dist/server.js"`, but `tsc` builds to `dist/src/server.js`. Render will fail on its first boot with `MODULE_NOT_FOUND`.
2. **Vercel Install Failure (Blocker):** `frontend/package.json` contains `"kai-aura-workspace": "file:.."`, which will break npm dependency resolution in an isolated Vercel deployment.
3. **Broken Feature Endpoints (High):** Route mismatches on notifications and AI will cause visible runtime 404 errors in production.

*Estimated Time to Resolve Blockers:* Less than 30 minutes of targeted, low-risk configuration fixes.

---

## L. Recommended Next Steps (Prioritized Action Sequence)

These actions should be executed by the deployment engineer in the following exact order:

1. **Fix Backend Start Script (`backend/package.json`):**
   Update `"start": "node dist/server.js"` to `"node dist/src/server.js"`.
2. **Remove Invalid Workspace Dependency (`frontend/package.json`):**
   Remove line 16 (`"kai-aura-workspace": "file:.."`) and re-run `npm --prefix frontend install --package-lock-only`.
3. **Align API Route Contracts:**
   - In `frontend/src/actions/notification.actions.ts`: Change `/notifications/jobs/process-emails` to `/notifications/jobs/email-processor`.
   - In `frontend/src/actions/notification.actions.ts`: Update `updatePreferenceAction` to use `/notifications/preferences/${type}` and `resetPreferencesAction` to send `DELETE /notifications/preferences`.
   - In `frontend/src/actions/ai.actions.ts`: Change `/ai/task-breakdown` to `/ai/breakdown-task`.
4. **Supply Frontend ESLint Configuration (`frontend/eslint.config.mjs`):**
   Add a standard Next.js flat ESLint configuration to enable clean `npm run lint`.
5. **Verify Locally with Clean Simulation:**
   Run `npm run build:backend`, `npm start` (in `backend/`), `npm run build:frontend`, and `npm run lint`.
6. **Deploy Database and Backend to Render:**
   - Provision Render PostgreSQL.
   - Deploy Render Web Service with the exact configuration from Section J.
   - Verify `GET /api/health` returns `200 OK`.
7. **Deploy Frontend to Vercel:**
   - Link repository and set Root Directory to `frontend`.
   - Configure `API_URL` and matching `JWT_SECRET`.
   - Verify login, session generation, and Server Action execution.
