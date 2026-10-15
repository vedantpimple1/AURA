# KAI Aura — Migration Inventory
**Version:** 1.0  
**Phase:** 0 (Planning / Discovery)

Complete file-by-file inventory of every source file, classified by migration destination and action required.

---

## Legend

| Action | Meaning |
|---|---|
| MOVE | File moves to new path with no code changes (only import path aliases update) |
| MOVE + ADAPT | File moves and requires code changes (e.g., replace `@/` alias, update imports) |
| SPLIT | File is split into two versions (frontend-safe vs. server-only) |
| NEW | New file created during migration (no source equivalent) |
| COPY | File is copied to both packages |
| DELETE | File is removed (superseded or test-only) |
| KEEP | File stays at root level |

---

## 1. Server Actions → Backend Routes

All server action files move to `backend/src/routes/` and are converted from Next.js `"use server"` functions to Express route handlers.

| Source | Destination | Action | Notes |
|---|---|---|---|
| `src/actions/auth.actions.ts` | `backend/src/routes/auth.routes.ts` | MOVE + ADAPT | Remove `"use server"`, wrap in Express router, set JWT cookie via `res.cookie()` |
| `src/actions/user.actions.ts` | `backend/src/routes/user.routes.ts` | MOVE + ADAPT | Remove `"use server"`, add `requireAuth` middleware |
| `src/actions/aura.actions.ts` | `backend/src/routes/aura.routes.ts` | MOVE + ADAPT | Remove `"use server"`, add `requireAuth` middleware |
| `src/actions/task.actions.ts` | `backend/src/routes/task.routes.ts` | MOVE + ADAPT | Remove `"use server"`, add `requireAuth` middleware |
| `src/actions/store.actions.ts` | `backend/src/routes/store.routes.ts` | MOVE + ADAPT | Remove `"use server"`, add `requireAuth` middleware |
| `src/actions/team.actions.ts` | `backend/src/routes/team.routes.ts` | MOVE + ADAPT | Remove `"use server"`, add `requireAuth` middleware |
| `src/actions/notification.actions.ts` | `backend/src/routes/notification.routes.ts` | MOVE + ADAPT | Remove `"use server"`, add `requireAuth` middleware |
| `src/actions/observability.actions.ts` | `backend/src/routes/observability.routes.ts` | MOVE + ADAPT | Remove `"use server"`, ADMIN/SUPERADMIN RBAC enforced in middleware |
| `src/actions/analytics.actions.ts` | `backend/src/routes/analytics.routes.ts` | MOVE + ADAPT | Remove `"use server"`, add `requireAuth` middleware |
| `src/actions/audit.actions.ts` | `backend/src/routes/audit.routes.ts` | MOVE + ADAPT | Remove `"use server"`, add `requireAuth` middleware |
| `src/actions/ai.actions.ts` | `backend/src/routes/ai.routes.ts` | MOVE + ADAPT | Remove `"use server"`, add `requireAuth` middleware |

---

## 2. Services → Backend (Move As-Is)

All service files move to `backend/src/services/`. No logic changes — only the `@/` import alias is updated to relative paths or the new alias.

| Source | Destination | Action | Notes |
|---|---|---|---|
| `src/services/ai.service.ts` | `backend/src/services/ai.service.ts` | MOVE | Update `@/lib/` imports |
| `src/services/analytics.service.ts` | `backend/src/services/analytics.service.ts` | MOVE | Update `@/lib/` imports |
| `src/services/audit.service.ts` | `backend/src/services/audit.service.ts` | MOVE | Update `@/lib/` imports |
| `src/services/aura.service.ts` | `backend/src/services/aura.service.ts` | MOVE | Update `@/lib/` imports |
| `src/services/auth.service.ts` | `backend/src/services/auth.service.ts` | MOVE | Update `@/lib/` imports |
| `src/services/batch.service.ts` | `backend/src/services/batch.service.ts` | MOVE | Update `@/lib/` imports |
| `src/services/delivery-processor.service.ts` | `backend/src/services/delivery-processor.service.ts` | MOVE | Update `@/lib/` imports |
| `src/services/email.service.ts` | `backend/src/services/email.service.ts` | MOVE | Update `@/lib/` imports |
| `src/services/kudos.service.ts` | `backend/src/services/kudos.service.ts` | MOVE | Update `@/lib/` imports |
| `src/services/notification-observability.service.ts` | `backend/src/services/notification-observability.service.ts` | MOVE | Update `@/lib/` imports |
| `src/services/notification-preference.service.ts` | `backend/src/services/notification-preference.service.ts` | MOVE | Update `@/lib/` imports |
| `src/services/notification.service.ts` | `backend/src/services/notification.service.ts` | MOVE | Update `@/lib/` imports |
| `src/services/store.service.ts` | `backend/src/services/store.service.ts` | MOVE | Update `@/lib/` imports |
| `src/services/task.service.ts` | `backend/src/services/task.service.ts` | MOVE | Update `@/lib/` imports |
| `src/services/team.service.ts` | `backend/src/services/team.service.ts` | MOVE | Update `@/lib/` imports |
| `src/services/user.service.ts` | `backend/src/services/user.service.ts` | MOVE | Update `@/lib/` imports |
| `src/services/queue/notification.queue.ts` | `backend/src/services/queue/notification.queue.ts` | MOVE | Update `@/lib/` imports |
| `src/services/queue/notification.worker.ts` | `backend/src/services/queue/notification.worker.ts` | MOVE | Update `@/lib/` imports |
| `src/services/queue/queue.config.ts` | `backend/src/services/queue/queue.config.ts` | MOVE | Update `@/lib/` imports |
| `src/services/queue/queue.types.ts` | `backend/src/services/queue/queue.types.ts` | MOVE | No changes needed |
| `src/services/email/` (subdirectory) | `backend/src/services/email/` | MOVE | Update `@/lib/` imports |

---

## 3. Shared Library → Split

`src/lib/` contains both edge-safe utilities (frontend) and server-only code (backend).

| Source | Frontend Destination | Backend Destination | Action | Notes |
|---|---|---|---|---|
| `src/lib/auth.ts` | `frontend/src/lib/auth.ts` | `backend/src/lib/auth.ts` | SPLIT | Frontend: `decrypt()` only (jose, edge-safe). Backend: `encrypt()` + `decrypt()` + `getSession()` (full). |
| `src/lib/errors.ts` | `frontend/src/lib/errors.ts` | `backend/src/lib/errors.ts` | COPY | Error classes are pure TypeScript, safe in both. |
| `src/lib/prisma.ts` | ❌ (NOT frontend) | `backend/src/lib/prisma.ts` | MOVE | Prisma client is strictly backend-only. |
| `src/lib/utils.ts` | `frontend/src/lib/utils.ts` | ❌ (not needed) | MOVE | `cn()` utility is frontend-only. |

---

## 4. App Router Pages → Frontend

| Source | Destination | Action | Notes |
|---|---|---|---|
| `src/app/layout.tsx` | `frontend/src/app/layout.tsx` | MOVE | No changes needed |
| `src/app/globals.css` | `frontend/src/app/globals.css` | MOVE | No changes needed |
| `src/app/page.tsx` | `frontend/src/app/page.tsx` | MOVE + ADAPT | Remove server action imports; all data fetching now via API calls |
| `src/app/login/page.tsx` | `frontend/src/app/login/page.tsx` | MOVE + ADAPT | Replace `auth.actions.ts` import with fetch to `POST /api/auth/login` |
| `src/app/favicon.ico` | `frontend/src/app/favicon.ico` | MOVE | No changes needed |
| `src/app/api/test-rbac/` | DELETE | DELETE | Test-only route, not needed in production split |

---

## 5. Components → Frontend

| Source | Destination | Action | Notes |
|---|---|---|---|
| `src/components/aura/aura-app.tsx` | `frontend/src/components/aura/aura-app.tsx` | MOVE + ADAPT | **Critical**: Replace all `import { ... } from "@/actions/..."` with calls to `api-client.ts` fetch wrapper. No logic changes. |
| `src/components/ui/` (all shadcn components) | `frontend/src/components/ui/` | MOVE | No changes needed |

---

## 6. Middleware → Frontend

| Source | Destination | Action | Notes |
|---|---|---|---|
| `src/middleware.ts` | `frontend/src/middleware.ts` | MOVE | Uses `jose` and `@/lib/auth` decrypt only — already edge-safe |

---

## 7. Prisma → Backend

| Source | Destination | Action | Notes |
|---|---|---|---|
| `prisma/schema.prisma` | `backend/prisma/schema.prisma` | MOVE | No changes |
| `prisma/seed.ts` | `backend/prisma/seed.ts` | MOVE + ADAPT | Update `@/lib/prisma` import path |
| `prisma/migrations/` | `backend/prisma/migrations/` | MOVE | No changes |
| `prisma7.config.ts` | `backend/prisma7.config.ts` | MOVE + ADAPT | Update output path if needed |

---

## 8. Worker → Backend

| Source | Destination | Action | Notes |
|---|---|---|---|
| `src/worker.ts` | `backend/src/worker.ts` | MOVE + ADAPT | Update `@/services/` and `@/lib/` import paths |

---

## 9. Config Files

| Source | Frontend | Backend | Action | Notes |
|---|---|---|---|---|
| `package.json` | `frontend/package.json` | `backend/package.json` | SPLIT | Frontend: next, react, tailwind, jose, lucide deps. Backend: express, prisma, bullmq, nodemailer, pg, jose, bcryptjs deps. |
| `tsconfig.json` | `frontend/tsconfig.json` | `backend/tsconfig.json` | SPLIT | Frontend keeps `@/` alias pointing to `frontend/src`. Backend keeps `@/` alias pointing to `backend/src`. |
| `next.config.ts` | `frontend/next.config.ts` | ❌ | MOVE | Next.js config stays with frontend |
| `postcss.config.mjs` | `frontend/postcss.config.mjs` | ❌ | MOVE | Tailwind/PostCSS is frontend only |
| `components.json` | `frontend/components.json` | ❌ | MOVE | shadcn component registry config |
| `eslint.config.mjs` | `frontend/eslint.config.mjs` | `backend/eslint.config.mjs` | COPY | Each package gets its own lint config |
| `.gitignore` | `frontend/.gitignore` | `backend/.gitignore` | COPY | Each package gets its own .gitignore |

---

## 10. New Files to Create

| File | Package | Purpose |
|---|---|---|
| `frontend/src/lib/api-client.ts` | Frontend | Typed fetch() wrapper. Reads `NEXT_PUBLIC_API_URL`. Handles auth cookies, error parsing. Replaces all server action calls. |
| `backend/src/server.ts` | Backend | Express app entry point. Registers all routes, CORS middleware, JSON parsing, error handler. |
| `backend/src/middleware/requireAuth.ts` | Backend | JWT verification middleware. Reads `JWT_SECRET`, verifies cookie, attaches session to `req`. |
| `frontend/.env.local.example` | Frontend | Documents frontend-only env variables |
| `backend/.env.example` | Backend | Documents backend env variables (superset of current .env.example) |
| `README.md` (updated) | Root | Explains mono-repo structure, how to run frontend + backend + worker |

---

## 11. Documentation

| File | Action | Notes |
|---|---|---|
| `architecture.md` | UPDATE | Reflect new frontend/backend split architecture |
| `memory.md` | UPDATE | Record migration completion and new structure |
| `phases.md` | UPDATE | Mark PHASE-14 as started/complete |
| `rules.md` | UPDATE | Add new rule: frontend must never import from backend/ directly |
| `docs/deployment/` | CREATE | This planning directory (4 files created in Phase 0) |

---

## Summary Counts

| Category | File Count | Action |
|---|---|---|
| Server Actions → Routes | 11 | MOVE + ADAPT |
| Services | 20 | MOVE |
| Library (lib/) | 4 | SPLIT / MOVE / COPY |
| App Router Pages | 5 | MOVE / MOVE+ADAPT |
| Components | ~20+ | MOVE / MOVE+ADAPT |
| Config files | 8 | SPLIT / MOVE / COPY |
| New files | 5 | NEW |
| Total estimated | ~73 | — |
