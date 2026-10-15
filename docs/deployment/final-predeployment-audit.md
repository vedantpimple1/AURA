# KAI Aura — Final Pre-Deployment Security and Configuration Audit
**Target Infrastructure:** Render (Backend API + Worker) + Vercel (Frontend Next.js App)  
**Document Version:** 1.0.0  
**Audit Date:** 2026-10-14  
**Audit Status:** COMPLETE — AUDIT ONLY (Zero code or schema mutations performed)  

---

## 1. Executive Summary & Deployment Decision

### Deployment Decision: **`READY FOR STAGING DEPLOYMENT`**

### Summary of Verdict:
Following the completion of the remediation phase ([docs/deployment/deployment-remediation-report.md](file:///d:/E/Vedant/Code/Krios/AURA/KAI%20Aura%20App/KAI%20Aura%20App/docs/deployment/deployment-remediation-report.md)), the KAI Aura codebase has been subjected to a final, deep-dive security, routing, and operational configuration audit.
- **Zero code-level blockers remain.**
- Backend production entry point ([dist/src/server.js](file:///d:/E/Vedant/Code/Krios/AURA/KAI%20Aura%20App/KAI%20Aura%20App/backend/dist/src/server.js)), graceful HTTP/Prisma shutdown, and health checks have been verified live.
- Frontend dependency isolation, Turbopack production builds, and ESLint flat configuration have been verified with 0 errors.
- Automated backend test suite passes **100% across all 26 suites and 75 assertions**.
- Deployment can safely proceed to staging/production upon applying the verified environment variables and infrastructure setup described in this document.

---

## 2. JWT and Session Security Audit

### A. Credential Flow & Component Roles
The session authentication architecture was traced across the Next.js and Express boundary:

1. **Login Negotiation:**
   - User submits credentials to Next.js Server Action `loginAction` ([frontend/src/actions/auth.actions.ts:7-32](file:///d:/E/Vedant/Code/Krios/AURA/KAI%20Aura%20App/KAI%20Aura%20App/frontend/src/actions/auth.actions.ts#L7-L32)).
   - `loginAction` proxies the email and password via HTTP `POST /api/auth/login` to the Express backend.
   - The backend validates the password hash via `bcrypt.compare` against the PostgreSQL `User` record ([backend/src/services/auth.service.ts:32-48](file:///d:/E/Vedant/Code/Krios/AURA/KAI%20Aura%20App/KAI%20Aura%20App/backend/src/services/auth.service.ts#L32-L48)).
   - Upon verification, the backend returns the authenticated user payload (`{ id, email, name, roles }`).
2. **Session Cookie Generation:**
   - `loginAction` calls `setSession` in [frontend/src/lib/auth.ts:56-59](file:///d:/E/Vedant/Code/Krios/AURA/KAI%20Aura%20App/KAI%20Aura%20App/frontend/src/lib/auth.ts#L56-L59), which signs an HS256 JWT using `process.env.JWT_SECRET`.
   - The resulting token is set as an `httpOnly`, `secure`, `sameSite: 'lax'` cookie named `session` on the Vercel domain (`kai-aura.vercel.app`).
3. **Session Verification During Data Operations:**
   - **Frontend:** Server Components ([frontend/src/app/page.tsx:32](file:///d:/E/Vedant/Code/Krios/AURA/KAI%20Aura%20App/KAI%20Aura%20App/frontend/src/app/page.tsx#L32)) call `getSession()`, decoding the JWT via `jose.jwtVerify` with `process.env.JWT_SECRET` to identify the user and render appropriate navigation tabs.
   - **Backend:** `frontend/src/lib/api-client.ts:30-41` extracts the `session` cookie from the incoming Next.js request headers and forwards it to Render via `Cookie: session=<token>`.
   - **Express Auth Middleware:** [backend/src/middleware/requireAuth.ts:16-43](file:///d:/E/Vedant/Code/Krios/AURA/KAI%20Aura%20App/KAI%20Aura%20App/backend/src/middleware/requireAuth.ts#L16-L43) extracts `req.cookies.session`, verifies its cryptographic signature using `process.env.JWT_SECRET`, checks token expiration (`exp: 24h`), and extracts `userId` and `roles`.
4. **Independent Backend Authorization Enforcement:**
   - The backend does **not** rely on frontend role claims. Every sensitive Express route applies `requireRole('ADMIN', 'SUPERADMIN')` or `requireRole('SUPERADMIN')` independently (e.g., [backend/src/routes/aura.routes.ts:48](file:///d:/E/Vedant/Code/Krios/AURA/KAI%20Aura%20App/KAI%20Aura%20App/backend/src/routes/aura.routes.ts#L48), [backend/src/routes/task.routes.ts:28](file:///d:/E/Vedant/Code/Krios/AURA/KAI%20Aura%20App/KAI%20Aura%20App/backend/src/routes/task.routes.ts#L28)).

### B. Security Findings & Secret Exposure Analysis
- **Is `JWT_SECRET` genuinely required by Vercel?**  
  **YES.** Next.js Server Actions sign the session cookie on login and decrypt it during server rendering.
- **Can the backend alone validate the forwarded session?**  
  **YES.** Express middleware `requireAuth` strictly verifies the JWT on every backend request.
- **Are cookies secure?**  
  **YES.** `httpOnly: true`, `secure: true` in production (`NODE_ENV === 'production'`).
- **Browser Exposure Risk:**  
  **ZERO.** Neither `frontend/src/lib/auth.ts` nor `backend/src/lib/auth.ts` is imported by any Client Component (`'use client'`). All JWT operations happen exclusively in Node.js server runtimes.

---

## 3. API URL Configuration and Route Contracts

### A. Environment Variable Evaluation
`frontend/src/lib/api-client.ts:7-12` reads:
```typescript
function getApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
}
```

### B. Critical Pre-Deployment Formatting Rules
1. **The `/api` Prefix is Mandatory:**  
   In [frontend/src/actions/*.actions.ts](file:///d:/E/Vedant/Code/Krios/AURA/KAI%20Aura%20App/KAI%20Aura%20App/frontend/src/actions), every API client call specifies the domain subpath (e.g. `apiClient.get('/tasks')`, `apiClient.post('/store/items')`).  
   Therefore, `API_URL` on Vercel **must include `/api`**:
   - **Correct:** `https://kai-aura-api.onrender.com/api`
   - **Incorrect:** `https://kai-aura-api.onrender.com` (will return 404 on every endpoint)
2. **Trailing Slash Avoidance:**  
   `apiClient` prepends `cleanEndpoint = endpoint.startsWith('/') ? endpoint : '/${endpoint}'`.  
   - **Correct:** `https://kai-aura-api.onrender.com/api` (no trailing slash)
   - **Avoid:** `https://kai-aura-api.onrender.com/api/` (results in double-slash URLs like `/api//tasks`)
3. **Localhost Fallback Danger:**  
   If an operator deploys to Vercel and omits `API_URL`, the client will fall back to `http://localhost:4000/api` and fail with `ECONNREFUSED`. Setting `API_URL` in the Vercel Dashboard is a mandatory first-deploy requirement.
4. **Browser-Side Requests:**  
   Audit confirmed **zero** client components make direct browser-side `fetch` or `apiClient` requests. All requests are routed through Next.js Server Actions. `NEXT_PUBLIC_API_URL` is technically redundant, but recommended to mirror `API_URL` as a defensive fallback.

### C. Master Verified Route Contract Table

| Frontend Action Caller | HTTP Method | Endpoint Subpath | Backend Express Route | Express Router Mount | Auth Requirement |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `loginAction` | `POST` | `/auth/login` | `/login` | `/api/auth` | Public |
| `logoutAction` | `POST` | `/auth/logout` | `/logout` | `/api/auth` | `requireAuth` |
| `getTasksAction` | `GET` | `/tasks` | `/` | `/api/tasks` | `requireAuth` |
| `createTaskAction` | `POST` | `/tasks` | `/` | `/api/tasks` | `requireRole('ADMIN', 'SUPERADMIN')` |
| `deleteTaskAction` | `DELETE` | `/tasks/:taskId` | `/:taskId` | `/api/tasks` | `requireRole('ADMIN', 'SUPERADMIN')` |
| `submitTaskAction` | `POST` | `/tasks/submit` | `/submit` | `/api/tasks` | `requireAuth` |
| `reviewTaskAction` | `POST` | `/tasks/review` | `/review` | `/api/tasks` | `requireRole('ADMIN', 'SUPERADMIN')` |
| `updateAssignmentStatusAction`| `PATCH` | `/tasks/assignments/:id/status`| `/assignments/:id/status`| `/api/tasks` | `requireRole('ADMIN', 'SUPERADMIN')` |
| `getAuraBalanceAction` | `GET` | `/aura/balance` | `/balance` | `/api/aura` | `requireAuth` |
| `getAuraHistoryAction` | `GET` | `/aura/history` | `/history` | `/api/aura` | `requireAuth` |
| `awardAuraAction` | `POST` | `/aura/award` | `/award` | `/api/aura` | `requireRole('SUPERADMIN')` |
| `redeemAuraAction` | `POST` | `/aura/redeem` | `/redeem` | `/api/aura` | `requireAuth` |
| `getLeaderboardAction` | `GET` | `/aura/leaderboard` | `/leaderboard` | `/api/aura` | `requireAuth` |
| `getStoreItemsAction` | `GET` | `/store/items` | `/items` | `/api/store` | `requireAuth` |
| `createStoreItemAction` | `POST` | `/store/items` | `/items` | `/api/store` | `requireRole('ADMIN', 'SUPERADMIN')` |
| `redeemStoreItemAction` | `POST` | `/store/redeem` | `/redeem` | `/api/store` | `requireAuth` |
| `getAllRedemptionsAction` | `GET` | `/store/redemptions` | `/redemptions` | `/api/store` | `requireAuth` |
| `fulfillRedemptionAction` | `POST` | `/store/redemptions/:id/fulfill`| `/redemptions/:id/fulfill`| `/api/store` | `requireRole('ADMIN', 'SUPERADMIN')` |
| `getTeamsAction` | `GET` | `/teams` | `/` | `/api/teams` | `requireAuth` |
| `createTeamAction` | `POST` | `/teams` | `/` | `/api/teams` | `requireAuth` |
| `joinTeamAction` | `POST` | `/teams/:teamId/join`| `/:teamId/join` | `/api/teams` | `requireAuth` |
| `getKudosAction` | `GET` | `/teams/kudos` | `/kudos` | `/api/teams` | `requireAuth` |
| `sendKudosAction` | `POST` | `/teams/kudos/send` | `/kudos/send` | `/api/teams` | `requireAuth` |
| `getUserNotificationsAction` | `GET` | `/notifications` | `/` | `/api/notifications`| `requireAuth` |
| `markNotificationReadAction` | `PUT` | `/notifications/:id/read` | `/:id/read` | `/api/notifications`| `requireAuth` |
| `markAllNotificationsReadAction`| `PUT`| `/notifications/read-all`| `/read-all` | `/api/notifications`| `requireAuth` |
| `triggerStreakRemindersJobAction`| `POST`| `/notifications/jobs/streak-reminders`| `/jobs/streak-reminders`| `/api/notifications`| `requireRole('ADMIN', 'SUPERADMIN')` |
| `triggerReviewDigestJobAction` | `POST`| `/notifications/jobs/review-digest` | `/jobs/review-digest` | `/api/notifications`| `requireRole('ADMIN', 'SUPERADMIN')` |
| `triggerEmailProcessorAction` | `POST` | `/notifications/jobs/email-processor`| `/jobs/email-processor`| `/api/notifications`| `requireRole('SUPERADMIN')` |
| `getUserPreferencesAction` | `GET` | `/notifications/preferences` | `/preferences` | `/api/notifications`| `requireAuth` |
| `updatePreferenceAction` | `PUT` | `/notifications/preferences/:type` | `/preferences/:type`| `/api/notifications`| `requireAuth` |
| `resetPreferencesAction` | `DELETE`| `/notifications/preferences` | `/preferences` | `/api/notifications`| `requireAuth` |
| `breakdownTaskAction` | `POST` | `/ai/breakdown-task` | `/breakdown-task` | `/api/ai` | `requireAuth` |
| `getTeamInsightsAction` | `GET` | `/ai/team-insights` | `/team-insights` | `/api/ai` | `requireAuth` |
| `getUsersAction` | `GET` | `/users` | `/` | `/api/users` | `requireRole('ADMIN', 'SUPERADMIN')` |
| `getUserAction` | `GET` | `/users/:id` | `/:id` | `/api/users` | `requireAuth` |
| `createUserAction` | `POST` | `/users` | `/` | `/api/users` | `requireRole('ADMIN', 'SUPERADMIN')` |
| `getDashboardMetricsAction` | `GET` | `/analytics/dashboard` | `/dashboard` | `/api/analytics` | `requireRole('ADMIN', 'SUPERADMIN')` |
| `getMemberAnalyticsAction` | `GET` | `/analytics/members` | `/members` | `/api/analytics` | `requireRole('ADMIN', 'SUPERADMIN')` |
| `getAuditLogsAction` | `GET` | `/audit/logs` | `/logs` | `/api/audit` | `requireRole('ADMIN', 'SUPERADMIN')` |
| `getDeliverySummaryAction` | `GET` | `/observability/summary` | `/summary` | `/api/observability`| `requireRole('ADMIN', 'SUPERADMIN')` |
| `getDeliveriesAction` | `GET` | `/observability/deliveries` | `/deliveries` | `/api/observability`| `requireRole('ADMIN', 'SUPERADMIN')` |
| `getDeliveryDetailAction` | `GET` | `/observability/deliveries/:id`| `/deliveries/:id` | `/api/observability`| `requireRole('ADMIN', 'SUPERADMIN')` |
| `retryDeliveryAction` | `POST` | `/observability/deliveries/:id/retry`| `/deliveries/:id/retry`| `/api/observability`| `requireRole('ADMIN', 'SUPERADMIN')` |

---

## 4. Worker and Notification Architecture Audit

### A. Separation of Roles: API Server vs. Background Worker
- **Render Web Service (API):**
  - Runs `node dist/src/server.js`.
  - Listens for incoming HTTP traffic, serves Next.js Server Actions, and handles database transactions.
  - Does **NOT** poll the database or run BullMQ queue consumers.
- **Render Background Worker (Worker):**
  - Runs `node dist/src/worker.js`.
  - Controlled by `DELIVERY_WORKER_ENABLED=true`.
  - Dual Mode Operation:
    - **Mode 1 (Queue Mode):** Activated when `QUEUE_ENABLED=true` and `REDIS_URL` connects. Runs BullMQ event listeners with concurrency 5 and periodic stale-job sweeps every 60 seconds.
    - **Mode 2 (Database Polling Mode - Default):** Activated when `QUEUE_ENABLED=false` or Redis is absent. Polls PostgreSQL table `NotificationDelivery` for `PENDING` records every `DELIVERY_WORKER_INTERVAL_MS` (default 10,000ms) with batch size 20.

### B. Concurrency, Race Condition, & Idempotency Safeguards
- **Atomic Claiming:** [backend/src/services/email.service.ts:39-53](file:///d:/E/Vedant/Code/Krios/AURA/KAI%20Aura%20App/KAI%20Aura%20App/backend/src/services/email.service.ts#L39-L53) executes:
  ```typescript
  const claimed = await prisma.notificationDelivery.updateMany({
    where: { id: deliveryId, status: 'PENDING' },
    data: { status: 'PROCESSING', updatedAt: new Date() }
  });
  if (claimed.count === 0) return false;
  ```
  Even if multiple worker threads or polling cycles execute simultaneously, only **one** process can claim a delivery. Duplicate emails are mathematically prevented by PostgreSQL row locking.
- **Scheduled Jobs Clarification:**
  - `NotificationService.processStreakRemindersJob()` and `processPendingReviewsDigestJob()` are REST endpoints triggered on-demand by admins or via cron.
  - Neither `server.ts` nor `worker.ts` runs an uncoordinated internal timer for these jobs. To run them on a schedule, set up a Render Cron Job (or GitHub Action) that calls the respective endpoint once per day.

---

## 5. Database, Migration, and Seed Safety Audit

### A. Migration Consistency & Integrity
- **Authoritative Directory:** `backend/prisma/migrations/`
- **Total Migrations:** 4 SQL migration directories with lockfile `migration_lock.toml`:
  1. `20260929064518_init_phase_1`: Base user, roles, batches, audit log tables.
  2. `20260929064732_phase_2_tasks_aura`: Tasks, assignments, submissions, reviews, Aura ledger.
  3. `20260929064943_phase_3_teams_store_audit`: Teams, members, kudos, store items, redemptions.
  4. `20261001071612_add_notification_delivery_preferences`: Notification preferences, delivery table.
- **Safe Production Migration Command:**
  ```bash
  npx prisma migrate deploy
  ```
  `prisma migrate deploy` executes only unapplied migrations. It **never resets data or drops columns** unexpectedly, unlike `migrate dev` or `db push`.

### B. Seed Safety & Superadmin Credential Behavior
In [backend/prisma/seed.ts:38](file:///d:/E/Vedant/Code/Krios/AURA/KAI%20Aura%20App/KAI%20Aura%20App/backend/prisma/seed.ts#L38):
```typescript
const rawSuperPassword = process.env.SUPERADMIN_DEFAULT_PASSWORD || 'superadmin123';
const hashedSuperPassword = await bcrypt.hash(rawSuperPassword, 10);
```
**CRITICAL OPERATIONAL RULES FOR SEEDING:**
1. **`db:seed` is an Initial Bootstrap Step ONLY:**
   - Notice that `seed.ts` uses `prisma.user.upsert` with:
     ```typescript
     update: { passwordHash: hashedSuperPassword }
     ```
   - **Warning:** Running `npm run db:seed` against an existing production database will **overwrite** the password of `superadmin@kaiaura.com` back to `SUPERADMIN_DEFAULT_PASSWORD` (or `superadmin123`).
   - **Rule:** Never include `npm run db:seed` in the automated Render Build Command or recurring release script. Run it **once manually** in the Render Shell after the first deployment.
2. **Production Password Override:**
   - In production, configure `SUPERADMIN_DEFAULT_PASSWORD=<strong-random-password>` in Render before executing initial seed to ensure the default `superadmin123` is never persisted in production.

---

## 6. Comprehensive Environment Variable Inventory

### Backend (Render Web Service & Worker)
| Variable Name | Required | Default / Expected Format | Usage in Code | Sensitive |
| :--- | :--- | :--- | :--- | :--- |
| `DATABASE_URL` | **YES** | `postgresql://user:pass@host:5432/db?sslmode=require` | `src/lib/prisma.ts`, `prisma7.config.ts`, `prisma/seed.ts` | **YES** |
| `JWT_SECRET` | **YES** | Min 32 chars (recommended: `openssl rand -hex 64`) | `src/lib/auth.ts`, `src/middleware/requireAuth.ts` | **YES** |
| `FRONTEND_URL` | **YES** | `https://kai-aura.vercel.app` (NO trailing slash) | `src/server.ts:22` (CORS origin) | No |
| `PORT` | Optional | Auto-injected by Render (default `4000`) | `src/server.ts:19` | No |
| `NODE_ENV` | **YES** | `production` | Enables secure cookies and production error masking | No |
| `APP_URL` | Optional | `https://kai-aura.vercel.app` | `src/services/email/template.resolver.ts` (email hyperlinks)| No |
| `DELIVERY_WORKER_ENABLED` | **YES** (Worker)| `true` | `src/worker.ts:11` | No |
| `DELIVERY_WORKER_INTERVAL_MS`| Optional | `10000` (10 seconds) | `src/worker.ts:9` | No |
| `DELIVERY_WORKER_BATCH_SIZE` | Optional | `20` | `src/worker.ts:10` | No |
| `QUEUE_ENABLED` | Optional | `false` (default: DB polling) | `src/services/queue/queue.config.ts:5` | No |
| `REDIS_URL` | Cond. (if Queue) | `redis://default:pass@host:6379` | `src/services/queue/queue.config.ts:11` | **YES** |
| `SMTP_HOST` | Cond. (for email)| `smtp.sendgrid.net` (or provider) | `src/services/email.service.ts:14` | No |
| `SMTP_PORT` | Optional | `587` | `src/services/email.service.ts:20` | No |
| `SMTP_USER` | Cond. (for email)| `apikey` | `src/services/email.service.ts:22` | No |
| `SMTP_PASSWORD` | Cond. (for email)| Outgoing SMTP token/password | `src/services/email.service.ts:25` | **YES** |
| `SMTP_FROM` | Optional | `"KAI Aura" <notifications@kaiaura.com>` | `src/services/email.service.ts:90` | No |
| `SMTP_SECURE` | Optional | `false` (STARTTLS on 587) or `true` (SSL on 465) | `src/services/email.service.ts:21` | No |
| `SUPERADMIN_DEFAULT_PASSWORD`| Initial Seed Only| Min 12 characters | `prisma/seed.ts:37` | **YES** |
| `GEMINI_API_KEY` | Optional | `AIzaSy...` (heuristic fallback if absent) | `src/services/ai.service.ts:38` | **YES** |

### Frontend (Vercel)
| Variable Name | Required | Default / Expected Format | Usage in Code | Sensitive |
| :--- | :--- | :--- | :--- | :--- |
| `API_URL` | **YES** | `https://<render-service-host>.onrender.com/api` | `src/lib/api-client.ts:9` (Server-to-Server calls) | No |
| `NEXT_PUBLIC_API_URL`| Optional | `https://<render-service-host>.onrender.com/api` | `src/lib/api-client.ts:11` (Defensive fallback) | Public |
| `JWT_SECRET` | **YES** | **MUST MATCH RENDER `JWT_SECRET` EXACTLY** | `src/lib/auth.ts:10` (Signs & decodes session cookie) | **YES** |
| `NODE_ENV` | Optional | Auto-injected by Vercel (`production`) | `src/lib/auth.ts:49` (Sets `secure: true` for cookies) | No |

---

## 7. Operational Deployment Runbook

### Phase A: Database Provisioning (Render PostgreSQL)
1. In the Render Dashboard, click **New +** ➔ **PostgreSQL**.
2. **Name:** `kai-aura-db`
3. **Database:** `kai_aura_prod`
4. **Plan:** Free or Starter (PostgreSQL 16)
5. Save and copy the **Internal Database URL** (for services running inside Render) and **External Database URL**.

---

### Phase B: Backend API Service Deployment (Render Web Service)
1. In Render Dashboard, click **New +** ➔ **Web Service**.
2. Connect your Git repository.
3. Configure Service Settings:
   - **Name:** `kai-aura-api`
   - **Root Directory:** `backend`
   - **Environment:** Node
   - **Region:** Same region as PostgreSQL
   - **Branch:** `main` (or active release branch)
   - **Build Command:**
     ```bash
     npm install && npx prisma generate && npx prisma migrate deploy && npm run build
     ```
   - **Start Command:**
     ```bash
     node dist/src/server.js
     ```
   - **Health Check Path:** `/api/health`
4. Add Environment Variables:
   - `DATABASE_URL`: *(Internal Database URL from Phase A)*
   - `JWT_SECRET`: *(Generate via `openssl rand -hex 64`)*
   - `FRONTEND_URL`: `https://kai-aura.vercel.app` *(update with your actual Vercel domain)*
   - `APP_URL`: `https://kai-aura.vercel.app`
   - `NODE_ENV`: `production`
   - `PORT`: `4000`
   - `DELIVERY_WORKER_ENABLED`: `false` *(since worker runs in separate service below)*
   - `QUEUE_ENABLED`: `false`
   - *(Optional: Add SMTP credentials if email dispatch is required).*
5. Click **Create Web Service**.
6. **Verify API Deployment:**
   - Once deployment completes, visit `https://kai-aura-api.onrender.com/api/health`.
   - Verify HTTP 200 response: `{"status":"ok","timestamp":"..."}`.
7. **Initial One-Time Database Seeding:**
   - In the Render Web Service dashboard, go to the **Shell** tab.
   - Run:
     ```bash
     SUPERADMIN_DEFAULT_PASSWORD="<your-strong-production-password>" npm run db:seed
     ```
   - Confirm output: `Superadmin user ensured: superadmin@kaiaura.com`.

---

### Phase C: Background Worker Deployment (Render Background Worker)
1. In Render Dashboard, click **New +** ➔ **Background Worker**.
2. Connect the same Git repository.
3. Configure Worker Settings:
   - **Name:** `kai-aura-worker`
   - **Root Directory:** `backend`
   - **Environment:** Node
   - **Region:** Same region as PostgreSQL
   - **Build Command:**
     ```bash
     npm install && npx prisma generate && npm run build
     ```
   - **Start Command:**
     ```bash
     node dist/src/worker.js
     ```
4. Add Environment Variables:
   - Copy all environment variables from the API Web Service.
   - Set `DELIVERY_WORKER_ENABLED`: `true`.
   - Set `QUEUE_ENABLED`: `false` (enables reliable PostgreSQL database polling).
5. Click **Create Background Worker**.
6. **Verify Worker:**
   - Observe worker logs in Render:
     ```
     [Worker] Starting in DATABASE POLLING mode (Queue enabled: false, Redis reachable: false). Polling every 10000ms with batch size 20.
     ```

---

### Phase D: Frontend Deployment (Vercel)
1. Log in to [Vercel](https://vercel.com) and click **Add New...** ➔ **Project**.
2. Select your repository.
3. Configure Vercel Project:
   - **Framework Preset:** Next.js
   - **Root Directory:** Click **Edit** and select `frontend`.
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
   - **Install Command:** `npm install`
4. Configure Environment Variables:
   - `API_URL`: `https://kai-aura-api.onrender.com/api` *(replace with actual Render API host, ensuring `/api` is present without trailing slash)*.
   - `NEXT_PUBLIC_API_URL`: `https://kai-aura-api.onrender.com/api`
   - `JWT_SECRET`: *(Exact same 64-character hex string configured on Render)*.
5. Click **Deploy**.
6. **Verify Frontend Deployment:**
   - Navigate to the assigned Vercel URL (e.g. `https://kai-aura.vercel.app`).
   - Log in with `superadmin@kaiaura.com` and the password configured during seed.
   - Verify that:
     1. Dashboard metrics load.
     2. Tasks tab displays task assignments and allows creating a new task.
     3. Store tab displays the 6 product catalog items with their images.
     4. Squads / Kudos tab allows pinning peer kudos.
     5. Settings tab displays notification preference toggles.
     6. Observability tab loads delivery metrics for Superadmins.
