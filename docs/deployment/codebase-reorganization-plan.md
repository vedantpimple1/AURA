# KAI Aura — Codebase Reorganization Plan
**Version:** 1.0  
**Phase:** 0 (Planning / Discovery)  
**Status:** DRAFT — Awaiting approval before any files are moved.

---

## 1. Executive Summary

KAI Aura is currently a single Next.js App Router monorepo that co-locates:
- All **frontend** React pages and components
- All **backend** business logic (Server Actions, Services, Prisma)
- The standalone **email delivery worker** process (`src/worker.ts`)

The goal of this reorganization is to split the repository into two independently deployable application packages:

| Package | Directory | Runtime | Primary Deployment Target |
|---|---|---|---|
| Frontend | `frontend/` | Next.js (App Router) | Vercel / Netlify / any Node.js host |
| Backend | `backend/` | Express / Fastify API + Prisma | Railway / Render / VPS / any Node.js host |
| Worker | `backend/` (sub-process) | Node.js (tsx) | Same host as backend, separate process |

---

## 2. Current Architecture — State of Record

```
KAI Aura App/
├── src/
│   ├── actions/           <- Next.js Server Actions (11 files) — BACKEND logic
│   ├── app/               <- Next.js App Router pages (frontend routes)
│   │   ├── api/           <- Only 1 route: /api/test-rbac (test only)
│   │   ├── login/         <- Login page
│   │   └── page.tsx       <- Root dashboard page
│   ├── components/        <- React UI components (frontend)
│   │   ├── aura/          <- aura-app.tsx (~4400 lines, monolith client component)
│   │   └── ui/            <- shadcn-style primitives
│   ├── lib/               <- Shared utilities
│   │   ├── auth.ts        <- JWT helpers (used in middleware + server actions)
│   │   ├── errors.ts      <- Custom error classes
│   │   ├── prisma.ts      <- Prisma client singleton (uses pg Pool adapter)
│   │   └── utils.ts       <- cn() utility
│   ├── middleware.ts      <- Edge middleware (JWT session check)
│   ├── services/          <- Business logic services (16 files) — BACKEND logic
│   │   ├── queue/         <- BullMQ + Redis queue infrastructure (4 files)
│   │   └── email/         <- Email template infrastructure
│   └── worker.ts          <- Standalone email delivery worker process
├── prisma/
│   ├── schema.prisma      <- Prisma schema (PostgreSQL)
│   ├── seed.ts            <- Database seed
│   └── migrations/        <- Migration history
├── .env                   <- Environment variables (never committed)
├── .env.example           <- Documented env template
├── package.json           <- Single package with all deps
├── next.config.ts
└── tsconfig.json
```

---

## 3. Target Architecture

```
KAI Aura App/
├── frontend/                  <- Next.js frontend-only package
│   ├── src/
│   │   ├── app/               <- All Next.js App Router pages and layouts
│   │   ├── components/        <- React UI components
│   │   ├── lib/
│   │   │   ├── auth.ts        <- JWT decrypt only (edge-safe, no Prisma)
│   │   │   ├── errors.ts      <- Error classes (shared subset)
│   │   │   ├── api-client.ts  <- fetch() wrapper replacing server actions
│   │   │   └── utils.ts       <- cn() utility
│   │   └── middleware.ts      <- Edge middleware (JWT session check)
│   ├── .env.local             <- NEXT_PUBLIC_API_URL, JWT_SECRET, APP_URL
│   ├── .env.local.example
│   ├── next.config.ts
│   ├── package.json           <- Frontend-only deps (next, react, tailwind, etc.)
│   └── tsconfig.json
│
├── backend/                   <- Express API + Prisma + Worker package
│   ├── src/
│   │   ├── routes/            <- HTTP routes (one per domain, replacing server actions)
│   │   │   ├── auth.routes.ts
│   │   │   ├── aura.routes.ts
│   │   │   ├── store.routes.ts
│   │   │   ├── task.routes.ts
│   │   │   ├── team.routes.ts
│   │   │   ├── user.routes.ts
│   │   │   ├── notification.routes.ts
│   │   │   ├── observability.routes.ts
│   │   │   ├── analytics.routes.ts
│   │   │   ├── audit.routes.ts
│   │   │   └── ai.routes.ts
│   │   ├── services/          <- Moved as-is from src/services/
│   │   ├── lib/
│   │   │   ├── auth.ts        <- JWT sign + verify (server-only, full)
│   │   │   ├── errors.ts      <- Error classes (full)
│   │   │   └── prisma.ts      <- Prisma singleton (unchanged logic)
│   │   ├── middleware/
│   │   │   └── requireAuth.ts <- JWT verification for HTTP routes
│   │   ├── worker.ts          <- Delivery worker
│   │   └── server.ts          <- Express app entry point
│   ├── prisma/                <- Moved from root prisma/
│   │   ├── schema.prisma
│   │   ├── seed.ts
│   │   └── migrations/
│   ├── .env
│   ├── .env.example
│   ├── package.json           <- Backend deps (express, prisma, bullmq, nodemailer, pg, jose)
│   └── tsconfig.json
│
├── docs/deployment/           <- This planning directory
├── .agents/                   <- Agent skill definitions
└── README.md                  <- Top-level readme
```

---

## 4. Server Actions → REST API Conversion Map

| Server Action File | Domain | Endpoints |
|---|---|---|
| `auth.actions.ts` | Auth | POST /api/auth/login, POST /api/auth/logout |
| `user.actions.ts` | User | GET /api/users/me, PUT /api/users/me |
| `aura.actions.ts` | Aura | GET /api/aura, POST /api/aura/award, GET /api/aura/leaderboard |
| `task.actions.ts` | Tasks | GET/POST /api/tasks, PUT/DELETE /api/tasks/:id |
| `store.actions.ts` | Store | GET /api/store, POST /api/store/redeem, GET/PATCH /api/store/redemptions |
| `team.actions.ts` | Teams | GET/POST /api/teams, PUT/DELETE /api/teams/:id |
| `notification.actions.ts` | Notifications | GET /api/notifications, PUT /api/notifications/:id/read |
| `observability.actions.ts` | Observability | GET /api/observability/summary, GET /api/observability/deliveries |
| `analytics.actions.ts` | Analytics | GET /api/analytics |
| `audit.actions.ts` | Audit | GET /api/audit |
| `ai.actions.ts` | AI | POST /api/ai/suggest |

---

## 5. Authentication Strategy Post-Split

- **Login** (`POST /api/auth/login`) → backend validates credentials → returns JWT in `Set-Cookie` (HttpOnly, SameSite=Lax or None+Secure for cross-origin).
- **Frontend middleware** (`middleware.ts`) → decrypts JWT cookie using `jose` (edge-safe, no Prisma). Requires `JWT_SECRET` only.
- **Backend API routes** → verify JWT using same `JWT_SECRET` before calling services.
- **CORS** → backend sets `Access-Control-Allow-Origin: FRONTEND_URL` and `Access-Control-Allow-Credentials: true`.

---

## 6. Phased Migration Steps

> **No files are moved until this plan receives explicit user approval.**

| Phase | Description | Files Affected |
|---|---|---|
| Phase 0 | Planning & Discovery (CURRENT) | Docs only |
| Phase 1 | Backend scaffolding | Create backend/, move services/, lib/, prisma/, worker.ts, scaffold routes/ |
| Phase 2 | Frontend extraction | Create frontend/, move app/, components/, middleware.ts, frontend lib/ |
| Phase 3 | API wiring | Replace server action imports in aura-app.tsx with fetch() via api-client.ts |
| Phase 4 | Environment configuration | Create frontend/.env.local.example, backend/.env.example |
| Phase 5 | Verification | TypeCheck both packages, smoke test auth + data flow |

---

## 7. Key Risks

| Risk | Mitigation |
|---|---|
| CORS + cookie cross-origin issues | Set SameSite=None; Secure; configure CORS properly |
| JWT secret mismatch | Document in both .env.example; same value required |
| aura-app.tsx monolith import changes | Search-and-replace server action calls with api-client.ts wrapper |
| Prisma client generation path | Update prisma7.config.ts paths in backend/package.json |
| Test file import paths | Update all test imports after move |

---

## 8. Non-Negotiables

- No business logic changes — services move as-is.
- No schema changes — prisma/schema.prisma unchanged.
- No UI redesign — components move as-is, only imports update.
- Prisma pinned at 7.10.0.

---

## 9. Approval Gate

**Explicit user approval required before Phase 1 begins.**
