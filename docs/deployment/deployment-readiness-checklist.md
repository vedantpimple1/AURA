# KAI Aura — Deployment Readiness Checklist
**Version:** 1.0  
**Phase:** 0 (Planning / Discovery)

This checklist tracks what must be true before each package can be independently deployed. Items are pre-populated based on the Phase 0 discovery. They will be checked off as migration phases complete.

---

## Legend

| Status | Meaning |
|---|---|
| ✅ Done | Completed and verified |
| 🔲 Pending | Not yet started |
| 🚧 In Progress | Work has begun |
| ❌ Blocked | Cannot proceed; has a dependency |

---

## Part A — Backend (`backend/`) Readiness

### A1. Repository Structure
- 🔲 `backend/` directory created at project root
- 🔲 `backend/package.json` created with correct dependencies (express/fastify, prisma@7.10.0, bullmq, nodemailer, pg, jose, bcryptjs, tsx)
- 🔲 `backend/tsconfig.json` created with `@/` alias pointing to `backend/src/`
- 🔲 `backend/.env.example` created with all required variables documented

### A2. Prisma
- 🔲 `prisma/` moved to `backend/prisma/`
- 🔲 `backend/prisma/schema.prisma` is byte-identical to original (no schema changes)
- 🔲 `prisma7.config.ts` updated / moved to `backend/`
- 🔲 `npx prisma generate` runs successfully inside `backend/`
- 🔲 `npx prisma migrate deploy` runs successfully with `backend/.env` DATABASE_URL
- 🔲 Prisma client import path (`@/lib/prisma`) resolves correctly inside `backend/src/`

### A3. Services
- 🔲 All 20 service files moved to `backend/src/services/`
- 🔲 All `@/lib/` import paths updated in service files
- 🔲 `tsc --noEmit` passes inside `backend/` for all service files

### A4. API Routes
- 🔲 All 11 route files created in `backend/src/routes/`
- 🔲 Each route correctly calls its corresponding service (no Prisma direct calls in routes)
- 🔲 `requireAuth` middleware applied to all protected routes
- 🔲 RBAC checks preserved (ADMIN/SUPERADMIN enforcement in observability, analytics, audit routes)
- 🔲 All routes return structured JSON (consistent with current server action return shapes)

### A5. Authentication (Backend)
- 🔲 `backend/src/lib/auth.ts` includes `encrypt()`, `decrypt()`, `getSession()`, `createSession()`, `deleteSession()`
- 🔲 `POST /api/auth/login` sets JWT in HttpOnly cookie
- 🔲 `POST /api/auth/logout` clears the cookie
- 🔲 Cookie attributes: `HttpOnly: true`, `SameSite: Lax` (dev) or `SameSite: None; Secure` (cross-origin prod)
- 🔲 `JWT_SECRET` read from `backend/.env` (never hardcoded)

### A6. CORS
- 🔲 CORS middleware configured on backend Express app
- 🔲 `FRONTEND_URL` environment variable used as the allowed origin
- 🔲 `credentials: true` configured in CORS (required for cookie sharing)
- 🔲 Preflight `OPTIONS` requests handled correctly

### A7. Worker
- 🔲 `src/worker.ts` moved to `backend/src/worker.ts`
- 🔲 All imports updated (`@/services/`, `@/lib/`)
- 🔲 `npm run worker` script added to `backend/package.json`
- 🔲 Worker starts successfully with `DELIVERY_WORKER_ENABLED=true`
- 🔲 Worker graceful shutdown (SIGINT/SIGTERM) tested

### A8. Backend Server
- 🔲 `backend/src/server.ts` created and starts without errors
- 🔲 All route modules registered
- 🔲 Global error handler registered
- 🔲 Server listens on `PORT` from environment (default 4000)
- 🔲 Health check endpoint `GET /api/health` returns 200 OK

### A9. TypeScript
- 🔲 `tsc --noEmit` passes with zero errors inside `backend/`
- 🔲 No `any` types introduced during migration
- 🔲 Strict mode enabled in `backend/tsconfig.json`

---

## Part B — Frontend (`frontend/`) Readiness

### B1. Repository Structure
- 🔲 `frontend/` directory created at project root
- 🔲 `frontend/package.json` created with correct dependencies (next, react, tailwind, jose, lucide-react, etc.)
- 🔲 `frontend/tsconfig.json` created with `@/` alias pointing to `frontend/src/`
- 🔲 `frontend/.env.local.example` created with `NEXT_PUBLIC_API_URL`, `JWT_SECRET`, `NEXT_PUBLIC_APP_URL`

### B2. App Router Pages
- 🔲 `src/app/` moved to `frontend/src/app/`
- 🔲 `layout.tsx` and `globals.css` work correctly
- 🔲 Login page (`/login`) uses fetch to `POST $NEXT_PUBLIC_API_URL/api/auth/login`
- 🔲 Root dashboard page (`/`) loads without server action imports

### B3. Components
- 🔲 `src/components/` moved to `frontend/src/components/`
- 🔲 `aura-app.tsx` has zero imports from `@/actions/`
- 🔲 `aura-app.tsx` uses `api-client.ts` for all data fetching and mutations
- 🔲 All shadcn `ui/` components resolve correctly

### B4. API Client
- 🔲 `frontend/src/lib/api-client.ts` created
- 🔲 Reads `NEXT_PUBLIC_API_URL` as base URL
- 🔲 Includes `credentials: 'include'` on all requests (for cookie passing)
- 🔲 Handles JSON parsing, error extraction, and typed responses
- 🔲 All former server action call sites in `aura-app.tsx` use `api-client.ts`

### B5. Authentication (Frontend)
- 🔲 `frontend/src/lib/auth.ts` contains only `decrypt()` (edge-safe, jose-only, no Prisma)
- 🔲 `frontend/src/middleware.ts` verifies JWT cookie and redirects unauthenticated users
- 🔲 `JWT_SECRET` read from `frontend/.env.local` (not `NEXT_PUBLIC_`)

### B6. TypeScript
- 🔲 `tsc --noEmit` passes with zero errors inside `frontend/`
- 🔲 No `any` types introduced during migration
- 🔲 Strict mode enabled in `frontend/tsconfig.json`

### B7. Build
- 🔲 `npm run build` completes inside `frontend/` without errors
- 🔲 No server-only imports present in client component tree

---

## Part C — Integration Readiness

### C1. Authentication Flow
- 🔲 User logs in via frontend → `POST /api/auth/login` on backend → JWT cookie set
- 🔲 Frontend middleware reads and verifies JWT cookie → allows access to `/`
- 🔲 Protected API calls from frontend include cookie automatically (`credentials: include`)
- 🔲 Backend verifies JWT on each protected route
- 🔲 Logout clears cookie on backend → frontend redirects to `/login`

### C2. Data Flow
- 🔲 Dashboard loads user data via `GET /api/users/me`
- 🔲 Aura leaderboard loads via `GET /api/aura/leaderboard`
- 🔲 Task creation works via `POST /api/tasks`
- 🔲 Store redemption works via `POST /api/store/redeem`
- 🔲 Notifications load and mark-as-read via notification routes

### C3. Email Delivery
- 🔲 Backend sends notification emails correctly (SMTP config in backend `.env`)
- 🔲 Worker runs independently as `npm run worker` in `backend/`
- 🔲 Email notification links use `APP_URL` from backend env

### C4. RBAC
- 🔲 MEMBER cannot access ADMIN-only endpoints (403 response)
- 🔲 ADMIN can access analytics, audit, observability
- 🔲 SUPERADMIN can access everything ADMIN can plus aura award

---

## Part D — Deployment Configuration

### D1. Backend Deployment
- 🔲 Backend can start with `node dist/server.js` or `tsx src/server.ts`
- 🔲 All environment variables documented in `backend/.env.example`
- 🔲 Prisma migrations run as part of deploy (`prisma migrate deploy`)
- 🔲 Worker can be started as a separate process or service

### D2. Frontend Deployment
- 🔲 Frontend builds with `npm run build` inside `frontend/`
- 🔲 `NEXT_PUBLIC_API_URL` points to deployed backend URL
- 🔲 `JWT_SECRET` matches the backend `JWT_SECRET`
- 🔲 Cookie policy verified for cross-origin in production (SameSite=None; Secure)

### D3. Documentation
- 🔲 `architecture.md` updated to reflect new split architecture
- 🔲 `memory.md` updated with migration completion log
- 🔲 Top-level `README.md` explains how to run frontend, backend, and worker
- 🔲 `phases.md` updated: PHASE-14 marked started/complete

---

## Summary

| Section | Total Items | Done | Pending |
|---|---|---|---|
| A — Backend | 33 | 0 | 33 |
| B — Frontend | 20 | 0 | 20 |
| C — Integration | 14 | 0 | 14 |
| D — Deployment | 12 | 0 | 12 |
| **Total** | **79** | **0** | **79** |

> Phase 0 Complete. Awaiting user approval to begin Phase 1 (Backend Scaffolding).
