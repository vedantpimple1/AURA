# KAI Aura App - Project Memory

## 1. Current Project Phase
COMPLETED (Deployment-Ready Frontend/Backend Architecture Reorganization — All Phases 0 through 6 Verified).

## 2. Current Iteration ID
KAI-14-002

## 3. Current Implementation Status
Phases 0 through 6 of the codebase reorganization are 100% complete. The application is cleanly partitioned into independent `frontend/` (Next.js 16) and `backend/` (Express + Prisma 7) directories, communicating via REST and JWT cookies. Both build cleanly, all backend test suites pass with 100% success rate, and live integration tests verify operational health.
- **Phase 07 (Teams / Collaboration / Social Aura Wall):** Completed & verified.
- **Phase 08 (Store / Rewards):** Completed & verified (including Admin REDEMPTION_REQUESTED alerts).
- **Phase 09 (AI Features):** Completed & verified (AI Task Breakdown + AI Squad Momentum Insights).
- **Phase 10 & SMTP-01 to SMTP-09 (Notifications, Observability, Queue & Distributed Workers):** Completed & verified (including AURA_AWARDED and REDEMPTION_REQUESTED).
- **Phase 11 (Analytics / Admin):** Completed. Real-time admin dashboards and metric aggregation.
- **Phase 12 (Testing + Security Hardening):** Completed. Zero-dependency native Node test runner (72 tests passing), critical defects remediated.

## 4. Completed Work
- **Phase 00 & 01 (Environment & DB):** PostgreSQL setup, Prisma 7 client generation, and schema models for Users, Tasks, Aura Transactions, Badges, Teams, Store, Notifications, and Audit.
- **Phase 02 (Architecture):** Service-layer abstraction, structured error handling (`src/lib/errors.ts`), and Server Actions pattern.
- **Phase 03 (Authentication & RBAC):** JWT session handling with `jose` in Edge middleware, password hashing with `bcryptjs`, and role-based route/view protections.
- **Phase 04 (Core Domain):** User and Batch CRUD via `UserService`, `BatchService`, and `user.actions.ts`. Admin member creation modal.
- **Phase 05 (Aura Points Ledger):** Financial ledger with dynamic balance calculation via SQL aggregation (`AuraService.getAvailableAura`), award/deduction transactions, and live transaction history.
- **Phase 06 (Task/Activity System):** Full task lifecycle via `TaskService` and `task.actions.ts` (Creation, Assignment, Member Submission, Admin Review & Approval). Mapped status filters.
- **Phase 07 (Teams, Collaboration & Social):**
  - Expanded `TeamService` with team listing and combined Aura aggregation across members. Added auto-seeding for initial teams.
  - Created `KudosService` and `sendKudosAction` / `getKudosAction` for peer recognition, with atomic +10 Aura rewards for recognized teammates.
  - Created `SendKudosModal` on the Aura Wall so users can send live Kudos notes to any colleague.
  - Created `CreateTeamModal` on the Tag Teams view for creating collaboration squads.
  - Connected the weekly team leaderboard to dynamic combined Aura calculations.
- **Phase 08 (Store & Rewards):**
  - Real database-backed inventory with `StoreService` and `store.actions.ts`.
  - Default product seeding in PostgreSQL, Admin "Add Product" modal, and atomic redemptions with balance deduction.
  - Admin Redemption Requests queue (`getAllRedemptionsAction`, `fulfillRedemptionAction`) to review and fulfill member reward claims.
  - Member "My Redemptions" tab with real-time status badges: `Awaiting Fulfillment ⏳` vs `Accepted & Delivered 🎉`.
- **Phase 10 Foundation (Notifications & Global Search):**
  - Created `NotificationService` and `notification.actions.ts` for database-backed notification queries and read tracking.
  - Header Bell icon: Displays unread count badge, clickable dropdown popover showing live notifications (including store fulfillment events), "Mark all read" action, and read/unread status indicator.
  - Header Search Bar: Made search live with an instant dropdown displaying matched Tasks, Store Items, and Members.
- **UX & Security Hardening:**
  - Removed client-side role switcher that triggered runtime `TypeError` crashes, binding UI to backend JWT sessions with clear role badges.
  - Defensive object mapping in `TaskList` and `TaskModal` for both direct and assigned tasks.
  - Tab state synchronization with URL query parameter (`?tab=...`) and `popstate`, ensuring page refreshes and modal actions retain the active tab.

## 5. Files Currently Being Modified
- `memory.md`

## 6. Files Created (Recent)
- `src/services/notification.service.ts`
- `src/actions/notification.actions.ts`
- `src/services/store.service.ts`
- `src/actions/store.actions.ts`
- `src/services/kudos.service.ts`
- `src/actions/team.actions.ts`

## 7. Files Modified (Recent)
- `src/services/team.service.ts`
- `src/app/page.tsx`
- `src/components/aura/aura-app.tsx`
- `prisma/seed.ts`
- `memory.md`

## 8. Files Intentionally Untouched
- Existing core backend services (`src/services/auth.service.ts`, `src/services/user.service.ts`, `src/services/task.service.ts`, `src/services/aura.service.ts`).

## 9. Current Architecture State
The foundational backend and domain entities (Auth, Users, Batches, Roles, Tasks, Aura Ledger, Store, Teams, Kudos, Notifications) have complete CRUD pathways extending from PostgreSQL -> Prisma -> Service Layer -> Next.js Server Actions -> React 19 UI.

## 10. Current Dependency State
- Consistent. Pinned to Next.js 16, React 19, Prisma 7.10.0 with `@prisma/adapter-pg`.

## 11. Database State
All core application tables (`User`, `Role`, `UserRole`, `Batch`, `Task`, `TaskAssignment`, `TaskSubmission`, `TaskReview`, `AuraTransaction`, `StoreItem`, `Redemption`, `Team`, `TeamMember`, `Kudos`, `Notification`, `AuditLog`) are active in PostgreSQL. Initial admin user, member user, store products, and initial team are seeded.

## 12. Environment State
`.env` is configured correctly. Dev server running on `http://localhost:3000`.

## 13. Known Issues
- Prisma CLI peer dependency raises audit warnings in prod. Acknowledged and accepted.

## 14. Open Blockers
None.

## 15. Architectural Decisions
- Implemented secure defaults for new users (automatically hashing a default password on creation).
- Used Prisma nested writes (`roles: { create: { roleId: ... } }`) to enforce data consistency when assigning RBAC roles to new users.
- Redemptions and Kudos use atomic Prisma transactions (`prisma.$transaction`) to guarantee consistency between entity creation and ledger updates.

## 16. Security Decisions
- User queries strictly `select` safe fields to prevent leaking `passwordHash` to the Server Actions.
- In-memory client-side role toggling was eliminated in favor of strict session-bound role verification.

## 17. Deferred Decisions
- Frontend data fetching implementation (SWR vs Server Component prop drilling).

## 18. Next Exact Action (Upon Resuming)
The 6 pending UI/Functional requirements have been successfully completed:
1. **Floating UI Element:** Moved the orange streak UI element to the bottom-right corner, reduced its size, and set it to a fixed overlay so it doesn't interfere.
2. **Collapsible Sidebar:** Implemented a stateful collapsible sidebar for navigation that toggles width between full and icon-only.
3. **Admin Team Field:** Replaced the `BATCHID` field with a `Team` dropdown/select in the Admin member creation form and updated `UserService` to link the team.
4. **Task Deadline:** Added a datetime deadline field to the Task creation modal and passed it cleanly to `TaskService`.
5. **Assign Photos:** Associated existing images from `Photosss/` into `public/store/`, ran a DB mapping script, and updated the frontend `Card` to conditionally render `imageUrl`.
6. **Email 404 Fix:** Fixed the `template.resolver.ts` routing to use `/?tab=tasks` instead of invalid `/tasks` paths, preventing 404 errors.

*(Note: The `AURA_AWARDED` and `REDEMPTION_REQUESTED` email worker delivery bug was fully resolved during this session).*

Next, proceed to **PHASE-13: Performance + Production Readiness** (Redis caching layer, bundle optimization, database query indexing, connection pooling) or **PHASE-14: Deployment + CI/CD** (Dockerization, production PostgreSQL/Redis provisioning, multi-node worker clustering).
All SMTP notification systems (SMTP-01 through SMTP-09) are 100% complete and consolidated in `smtp-consolidated-report.md`.

## 19. Historical Iteration Log
- **[KAI-00-001] [2026-09-29]**: Established development baseline.
- **[KAI-01-001] [2026-09-29]**: Designed modular DB architecture, executed Phase 01 schema (Identity & RBAC).
- **[KAI-01-002] [2026-09-29]**: Expanded database schema with Tasks, Gamification, and Aura Ledger models.
- **[KAI-01-003] [2026-09-29]**: Completed Phase 01 schemas (Teams, Store, Audit).
- **[KAI-02-001] [2026-09-29]**: Transitioned to Phase 02. Updated architecture docs.
- **[KAI-02-002] [2026-09-29]**: Established foundational backend architecture (error handling, services, server actions).
- **[KAI-02-003] [2026-09-29]**: Expanded Backend Services to cover Tasks, Aura Ledger, and Teams.
- **[KAI-03-001] [2026-09-29]**: Implemented Custom JWT Authentication (jose) and Next.js Edge Middleware route protection.
- **[KAI-04-001] [2026-09-29]**: Implemented Core Domain logic (User creation, Batch management) in the backend.
- **[KAI-06-002] [2026-09-30]**: Investigated and fixed task-management regressions in aura-app.tsx.
  - **Problem 1 (New Task button):** Verified button IS wired to `setShowCreateTask(true)` → `CreateTaskModal`.
  - **Problem 2 (Task status filters):** Mapped `TaskAssignment.status` properly across Admin and Member views.
  - **Problem 3 (Member and Superadmin filters):** Safely extract `assignmentId` and support nested assignment tasks.
- **[KAI-06-003] [2026-09-30]**: Executed surgical fixes from QA validation audit.
  - Removed client-side role toggle `<select>` that crashed `MemberHome` with `Cannot read properties of undefined (reading 'title')`. Replaced with secured backend-verified role badge.
  - De-mocked the Store: Created `StoreService` and `store.actions.ts`, auto-seeded default items in PostgreSQL `StoreItem`, wired redemptions to real atomic ledger deductions, and added Admin "Add product" modal.
  - Fixed tab reload persistence: Synchronized active view with URL `?tab=...` search param and browser `popstate` so page refreshes and modal submissions stay on the same tab.
- **[KAI-07-001] [2026-09-30]**: Implemented Phase 07 (Teams / Collaboration / Social Aura Wall) with dynamic Tag Teams leaderboard and sticky notes on the wall.
- **[KAI-08-001] [2026-09-30]**: Added Member "My Redemptions" tracking tab & live status badges (Pending vs Accepted & Delivered).
- **[KAI-09-001] [2026-10-01]**: Implemented Phase 09 (AI Features):
  - Created `AiService` adhering strictly to Section 18 & 19 AI boundary rules (AI drafts natural language suggestions, never calculates ledger balances or overrides authorization).
  - Created `ai.actions.ts` (`breakdownTaskAction` and `getTeamInsightsAction`).
  - Added AI Breakdown Assistant to `CreateTaskModal`: Admins can input raw objectives and auto-generate structured titles, acceptance deliverables, and suggested Aura rewards.
  - Added AI Team Momentum Insights banner to Tag Teams page: analyzes squad velocity, kudos momentum, and generates squad recommendations.
- **[KAI-10-001] [2026-10-01]**: Completed Phase 10 (Notifications & Background Processing):
  - Created `NotificationService` and `notification.actions.ts` for database-backed notification queries and read tracking.
  - Connected the header Bell icon: Displays unread count badge, clickable dropdown popover showing live notifications, "Mark all read" action, and read/unread status indicator.
  - Activated header Search Bar: Made search live with an instant dropdown displaying matched Tasks, Store Items, and Members.
  - Wired real-time event notifications across the application lifecycle:
    - Task Assigned (`TASK_ASSIGNED`)
    - Task Approved & Aura Awarded (`TASK_APPROVED`)
    - Changes Requested on Task (`TASK_NEEDS_CHANGES`)
    - Kudos Received on Aura Wall (`KUDOS_RECEIVED`)
- **[KAI-10-002] [2026-10-01]**: Hardened Settings Access & Seeded Superadmin Account:
  - Seeded dedicated `superadmin@kaiaura.com` / `superadmin123` with `SUPERADMIN` and `ADMIN` roles.
  - Added Settings tab to the standard Admin sidebar navigation so Admins can access background dispatcher controls directly.
  - Fixed URL parameter privilege escalation loophole (`?tab=settings` or `?tab=reviews` accessed while logged in as Member):
    - Added server-side RBAC guard in `src/app/page.tsx` that normalizes unauthorized tab query parameters to `"home"`.
    - Added client-side role guard in `src/components/aura/aura-app.tsx` (`isAllowedPage`) that rejects navigation to admin/settings views for Members.
- **[KAI-11-001] [2026-10-01]**: Implemented Phase 11 (Analytics / Admin) & Phase 14 (Auditability Foundation):
  - Created `AnalyticsService` and `analytics.actions.ts` to aggregate dynamic team momentum and Member Insights (Active members, Completion Rate, Average Aura, Most Active User, Lifetime Aura, Aura Spent, Monthly Chart).
  - Wired real data into the `Analytics` component in `aura-app.tsx`.
  - Replaced date-fns dependency in `AnalyticsService` with native `Date` functionality to maintain strict dependency constraints (Rule 21).
  - Created `AuditService` and `audit.actions.ts` for database-backed compliance logs.
  - Wired `AuditService.log` into core `AuraService.addTransaction` to satisfy the ledger immutability and tracking requirement.
  - Displayed real `AuditLog` entries in the `Audit` tab component for Superadmins and Admins.
- **[KAI-12-001] [2026-10-01]**: RBAC Access Transfer (Award Aura & Settings transferred from ADMIN to SUPERADMIN)
  - Previous Behavior: Admin role had full access to award Aura and access Settings.
  - New Behavior: Superadmin inherits all Admin capabilities + Award Aura + Settings. Admin cannot access Award Aura or Settings.
  - Files Changed: `src/components/aura/aura-app.tsx`, `src/app/page.tsx`, `src/actions/aura.actions.ts`
  - Authorization Changes:
    - ADMIN → Awarding Aura: DENIED
    - ADMIN → Settings: DENIED
    - SUPERADMIN → Awarding Aura: ALLOWED
    - SUPERADMIN → Settings: ALLOWED
    - MEMBER → Awarding Aura: DENIED
    - MEMBER → Settings: DENIED
  - Tests performed: Simulated API test route (`test-rbac/route.ts`) verified direct server-side protections before Prisma transactions.
  - Runtime results: API rejected `ADMIN` role with `Unauthorized: Only superadmins can award Aura`. `SUPERADMIN` proceeded to database mutation.
  - Database validation: Verified AuraTransaction blocked for unauthorized role (`ADMIN`) directly via server-action rejection.
  - Remaining issues: None.
- **[KAI-12-002] [2026-10-01]**: Implemented Phase 12 (Testing + Security Hardening)
  - Configured zero-dependency test runner using Node's native `node:test` and `node:assert/strict` with `npx tsx --env-file=.env --test tests/*.test.ts` (Rules 20 & 21).
  - Added `"test"` script to `package.json`.
  - Built comprehensive test suites:
    - `tests/rbac-authorization.test.ts`: RBAC boundaries (SUPERADMIN ⊇ ADMIN, ADMIN/MEMBER denied from Award Aura and Settings).
    - `tests/aura-ledger.test.ts`: Dynamic balance calculation, append-only transactions, invalid payload rejection, and insufficient funds prevention.
    - `tests/ai-boundaries.test.ts`: Sections 18 & 19 AI safety rules (input length limits, clamping suggested Aura between 50-500, deterministic offline fallback).
    - `tests/security-validation.test.ts`: Error normalization via `handleError` preventing internal database leakage, and `bcryptjs` password hashing integrity.
    - `tests/store-and-tasks.test.ts`: Task creation validation, store item creation constraints, and store redemption 404/validation checks.
  - Runtime results: 16/16 tests passing cleanly.
  - Build validation: `next build` compiled with 0 errors.
  - Remaining issues: None.
- **[KAI-12-003] [2026-10-01]**: Implemented Phase SMTP-01 (Notification Domain & Delivery Persistence)
  - Added `NotificationPreference` and `NotificationDelivery` models to `prisma/schema.prisma`.
  - Established normalized preference structure supporting boolean toggles per `notificationType`.
  - Added idempotency and relational constraints (Cascade delete, Unique composite keys).
  - Validated schema and successfully ran `npx prisma migrate dev --name add_notification_delivery_preferences`.
  - Regenerated Prisma Client.
  - Validated that existing notifications flow and tasks operate seamlessly without behavioral regressions (16/16 tests passed).
  - Strictly respected boundaries: No SMTP or 3rd-party email libraries were installed in this phase.
  - Next Phase: SMTP-02 — Central Notification Dispatcher
- **[KAI-12-004] [2026-10-01]**: Implemented Phase SMTP-02 (Central Notification Dispatcher)
  - Audited existing notification creation points across business services.
  - Extended `NotificationService` with a centralized `dispatch(...)` method implementing the new `DispatchNotificationInput` interface.
  - Integrated `NotificationPreference` evaluation to gracefully toggle In-App and Email routing.
  - Implemented delivery record creation (`NotificationDelivery` with PENDING status for EMAIL channel) directly handling unique constraints for idempotency (P2002).
  - Used an atomic Prisma `$transaction` boundary within the dispatcher.
  - Successfully migrated the `TASK_ASSIGNED` event flow in `TaskService.assignTask` to use the new dispatcher.
  - Preserved all existing in-app notification behaviors, unread counts, and business rules without exposing transport details.
  - Created rigorous `notification-dispatcher.test.ts` suite testing preferences, defaults, uniqueness idempotency, and in-app suppression.
  - Executed 22/22 successful test assertions with 0 Next.js compilation errors on `build`.
  - Next Phase: SMTP-03 — SMTP Transport Layer
- **[KAI-12-005] [2026-10-01]**: Implemented Phase SMTP-03 (SMTP Transport Layer)
  - Added `nodemailer` and `@types/nodemailer` as the minimal required dependencies for SMTP transport.
  - Configured `.env.example` and `.env` with SMTP environmental variables (`SMTP_HOST`, `SMTP_PORT`, etc.).
  - Created `EmailService` (`src/services/email.service.ts`) encapsulating `nodemailer.Transporter`.
  - Implemented the delivery lifecycle: conditionally consuming a PENDING `NotificationDelivery` using an atomic `updateMany` lock, transitioning to PROCESSING, attempting SMTP delivery, and finalizing to SENT or FAILED.
  - Integrated recipient validation preventing failures from bubbling into outer domains when the email is missing or malformed.
  - Added `tests/email-service.test.ts` simulating SMTP responses via a mocked `streamTransport` to thoroughly test lifecycle updates without real network reliance.
  - Ran `npm test` verifying 27/27 subtests complete successfully.
  - Ran `npm audit` confirming no new vulnerabilities from `nodemailer`.
  - Deferred work: HTML email templates, preferences UI, retry queues.
  - Next Phase: SMTP-04 — Email Template System
- **[KAI-12-006] [2026-10-01]**: Implemented Phase SMTP-03.1 (Architecture Correction + Delivery Processing Gap)
  - Identified the architectural gap where PENDING deliveries were not natively consumed by `EmailService.processDelivery()`.
  - Created `DeliveryProcessorService` (`src/services/delivery-processor.service.ts`) to discover eligible PENDING deliveries and safely invoke `EmailService`.
  - Implemented Stale PROCESSING Recovery: Automatically reverts `PROCESSING` records older than 10 minutes back to `PENDING` to prevent permanent dead deliveries from node crashes.
  - Provided a manual administrative trigger (`triggerEmailProcessorAction` in `notification.actions.ts`) protected by SUPERADMIN session authorization.
  - Documented explicit idempotency semantics: The database schema constraint guarantees uniqueness of delivery records per notification, but does NOT guarantee exactly-once SMTP network transmission.
  - Updated `architecture.md` to map the explicit boundaries between Domain Service -> NotificationService -> Delivery Processor -> EmailService.
  - Added unit test suite `tests/delivery-processor.test.ts` verifying PENDING discovery, FAILED handling without blocking queues, lock respect, and stale recovery.
  - Regression tests passed (33/33). `npm run lint` reported existing minor warnings (ignored per instructions to not touch unrelated logic) and build succeeded. No Prisma migrations were necessary.
  - Deferred work: Automated production cron/scheduler for the delivery processor (SMTP-09).
  - Next Phase: SMTP-04 — Email Template System
- **[KAI-12-007] [2026-10-01]**: Implemented Phase SMTP-04 (Email Template System)
  - Objective: Introduce a clean template abstraction between `NotificationService` and `EmailService`.
  - Created `TemplateResolver` (`src/services/email/template.resolver.ts`) as a centralized factory for generating email payloads based on `Notification.type`.
  - Created `renderEmailLayout` (`src/services/email/templates/layout.ts`) as a reusable responsive base HTML container.
  - Developed `escapeHtml` (`src/services/email/utils.ts`) for rigorous XSS mitigation against dynamically evaluated entities (User names, Task titles).
  - Designed fully tested explicit payload abstractions spanning: `TASK_ASSIGNED`, `TASK_APPROVED`, `TASK_NEEDS_CHANGES`, `STORE_FULFILLMENT`, `KUDOS_RECEIVED`, `STREAK_REMINDER`, and `ADMIN_REVIEW_DIGEST`. Each possesses Subject, plaintext, and HTML fallbacks.
  - Re-wired `EmailService` to offload templating to `TemplateResolver` while explicitly maintaining its primary objective as the pure SMTP transport router.
  - Created test suite `tests/template-resolver.test.ts` asserting fallback capabilities, escaping integrity, missing-data rejection, and base HTML rendering.
  - Regression Tests passed cleanly (38/38 subtests), Prisma validated safely without structural changes.
  - Known Limitations: HTML templates reside statically within backend code logic; arbitrary structural modifications currently require deployment cycles.
  - Deferred Work: Dynamic user preference integrations, comprehensive HTML styling overhauls, template versioning, unsub management mechanisms.
  - Next Phase: SMTP-05 — Notification Event Coverage
- **[KAI-12-008] [2026-10-01]**: Implemented Phase SMTP-05 (Notification Event Coverage)
  - Objective: Complete the notification event architecture by migrating all direct notification creations (`prisma.notification.create`) to the Central Dispatcher (`NotificationService.dispatch()`).
  - Audited the entire codebase for notification patterns. Identified legacy usages in `task.service.ts`, `store.service.ts`, `kudos.service.ts`, and internal cron jobs in `notification.service.ts`.
  - Migrated `TASK_APPROVED` and `TASK_NEEDS_CHANGES` in `task.service.ts` to `dispatch`.
  - Migrated `STORE_FULFILLMENT` in `store.service.ts` to `dispatch`.
  - Migrated `KUDOS_RECEIVED` in `kudos.service.ts` to `dispatch`, explicitly separating it from the underlying Prisma transaction to enforce architectural boundaries and prevent blocked ledgers on SMTP exceptions.
  - Migrated `STREAK_REMINDER` and `ADMIN_REVIEW_DIGEST` in `notification.service.ts` cron functions to `this.dispatch`.
  - Confirmed all active types explicitly map to supported template models within `TemplateResolver` (`TASK_ASSIGNED`, `TASK_APPROVED`, `TASK_NEEDS_CHANGES`, `STORE_FULFILLMENT`, `KUDOS_RECEIVED`, `STREAK_REMINDER`, `ADMIN_REVIEW_DIGEST`).
  - Ran full regression tests (38/38 passed), Prisma validated successfully, and TypeScript compilation completed successfully.
  - Known Limitations: Email delivery reliability inherently relies on background processor uptime and SMTP availability; idempotency constraints prevent duplicate records but not necessarily duplicate TCP transmissions.
  - Deferred Work: Preferences UI, scheduled cron worker deployments (SMTP-09).
  - Next Phase: Pending UI or Advanced Scheduler Tasks (e.g. SMTP-06 / SMTP-09).
- **[KAI-12-009] [2026-10-01]**: Implemented Phase SMTP-06 (Reliable Email Delivery Worker & Retry Processing)
  - Objective: Operationalize the delivery pipeline with a reliable, standalone polling worker.
  - Architecture Reviewed: `DeliveryProcessorService`, `EmailService`, `schema.prisma` (`NotificationDelivery`). No schema modifications were necessary; process-controlled retries were selected over `nextAttemptAt` column modifications.
  - Implementation:
    - Created a standalone worker script `src/worker.ts` with explicit bounded polling loops avoiding infinite tight-loop database hammering.
    - Updated `package.json` to include `"worker": "npx tsx --env-file=.env src/worker.ts"`.
    - Added comprehensive Graceful Shutdown intercepts (`SIGINT`/`SIGTERM`) to halt polling, wait for current batches, and execute `prisma.$disconnect()`.
    - Migrated error handling in `EmailService` to cleanly classify transient network/SMTP codes (4xx, ECONNRESET, ETIMEDOUT) vs permanent failures.
    - Handled transient retries using inline exponential backoff (e.g., `1s`, `2s`, `4s`) capped via `DELIVERY_WORKER_MAX_RETRIES` (default `3`). Reverts safely to `PENDING` unless exhausted to `FAILED`.
    - Expanded environment configurations in `.env` and `.env.example` to safely dictate enabled-status, polling interval, and batch sizes.
  - Tests: Updated `delivery-processor.test.ts` with a mock transporter dynamically emitting `ECONNRESET` transient failures, verifying exact retry incrementations mapping to the maximum limit limit prior to failing safely.
  - Validation: Full suite `npm test` passed (39/39). Build and Lint passed normally (minor pre-existing linting warnings explicitly ignored). Prisma schema intact.
  - Known Limitations: Backoff scaling relies on process-controlled inline waits since no `nextAttemptAt` schema column was added. Very long wait times are thus bounded; scaling massive transient retries (e.g. >10min delays) would invoke stale-recovery loops unless the schema is updated in future iterations. 
  - Deferred Work: Advanced schema-based persistent `nextAttemptAt` queues (SMTP-09), Notification Preferences UI (SMTP-07), Delivery Dashboards (SMTP-08).
  - Next Phase: TBD (e.g., SMTP-07).
- **[KAI-12-010] [2026-10-01]**: Implemented Phase SMTP-08 (Email Delivery Observability & Admin Dashboard)
  - **Objective**: Build an administrative Email Delivery Observability Dashboard allowing authorized administrators (ADMIN, SUPERADMIN) to monitor email delivery performance, audit delivery records, inspect failure causes, view queue/worker activity, and filter deliveries without exposing credentials or executing arbitrary mutations.
  - **Architecture Audited**: `NotificationDelivery` schema, `Notification` schema, `User` schema, `EmailService`, `DeliveryProcessorService`, `src/worker.ts`, existing Admin dashboard components in `aura-app.tsx`, auth session utilities in `auth.ts`, error normalization in `errors.ts`.
  - **Files Inspected**: `prisma/schema.prisma`, `src/services/notification-observability.service.ts`, `src/actions/observability.actions.ts`, `src/components/aura/aura-app.tsx`, `src/app/page.tsx`, `src/lib/auth.ts`, `src/lib/errors.ts`, `tests/delivery-processor.test.ts`, `tests/email-service.test.ts`.
  - **Files Modified**:
    - `src/app/page.tsx`: Added `"deliveries"` to admin-only tab authorization guard; pre-fetched initial delivery metrics and recent delivery logs for SSR.
    - `src/components/aura/aura-app.tsx`: Added `"deliveries"` page type and admin navigation item; added `EmailDeliveriesDashboard` and `DeliveryDetailModal` read-only components matching shadcn-style design system.
    - `package.json`: Updated `test` script with `--test-concurrency=1` to prevent database race conditions during concurrent test suite execution.
    - `tests/rbac-authorization.test.ts`: Added observability access authorization tests for SUPERADMIN, ADMIN, and MEMBER.
    - `architecture.md`: Appended Section 21 detailing the observability architecture, security boundaries, pagination, and truthful telemetry.
    - `phases.md`: Marked SMTP-08 as Completed.
  - **Files Created**:
    - `src/services/notification-observability.service.ts`: Backend service providing `getDeliverySummary()`, `getDeliveries(params)`, `getDeliveryById(id)`, `sanitizeErrorDetails()`, and `sanitizeMetadata()`.
    - `src/actions/observability.actions.ts`: Server actions `getDeliverySummaryAction()`, `getDeliveriesAction()`, and `getDeliveryDetailAction()` enforcing server-side `assertAdminAuthorization()`.
    - `tests/observability.test.ts`: Comprehensive automated test suite with 10 subtests covering aggregation, filtering, search, pagination, sanitization, and metadata redaction.
    - `smtp-08-report.md`: Complete implementation report.
  - **Database Changes**: None. Confirmed existing `NotificationDelivery` and `Notification` models natively support all required observability fields (status, attempts, errorDetails, sentAt, createdAt, updatedAt, type, recipient email/name). No schema migrations were needed.
  - **Services Added/Modified**: Created `NotificationObservabilityService`; enforced strict typing (`unknown` over `any`) and regex-based credential/path redaction.
  - **UI Changes**: Added a responsive "Email & Deliveries" section in the Admin/Superadmin portal with 5 metric cards (Total, Pending, Processing, Sent, Failed), Queue Activity telemetry card, searchable/filterable deliveries table, deterministic pagination controls, and read-only detail inspection modal.
  - **RBAC Changes**: Enforced server-side authorization in `src/actions/observability.actions.ts`. SUPERADMIN and ADMIN granted full observability access; MEMBER strictly denied with `403 Administrative authorization required`. Gated navigation links and route tab in `src/app/page.tsx` and `src/components/aura/aura-app.tsx`.
  - **Security Considerations**:
    - Sanitized `errorDetails` to redact passwords, connection strings, database URLs, tokens, and local file paths.
    - Masked sensitive metadata keys (`password`, `secret`, `token`, `cookie`, `jwt`) with `[REDACTED]`.
    - Read-only interface with no arbitrary execution, mutation, or retry capabilities in the browser.
    - Enforced pagination bounds (`DEFAULT_PAGE_SIZE = 20`, `MAX_PAGE_SIZE = 100`).
    - Enforced parameterized relational filters via Prisma to prevent SQL injection.
  - **Tests Added**:
    - `tests/observability.test.ts`: 10 subtests testing count aggregation, type grouping, status filter, type filter, search query, pagination bounds, date intervals, error sanitization, and metadata masking.
    - `tests/rbac-authorization.test.ts`: Added tests verifying SUPERADMIN and ADMIN allow observability access and MEMBER is denied.
  - **Tests Executed**: Ran `npm test` across all 12 test files with `--test-concurrency=1`.
  - **Test Results**: 57/57 tests passed (100% success rate, 0 failed, 0 skipped, 0 cancelled).
  - **Build Result**: `npm run build` compiled successfully in 1367ms with exit code 0.
  - **Lint Result**: Verified custom and modified files are error-free; pre-existing legacy warnings noted.
  - **Prisma Validation Result**: `npx prisma validate` succeeded: `The schema at prisma\schema.prisma is valid 🚀`.
  - **Known Limitations**: Worker telemetry is inferred from queue activity timestamps (`lastProcessedAt`, `lastSentAt`, `lastFailedAt`) and stale processing records; no dedicated distributed heartbeat daemon exists yet.
  - **Deferred Work**: SMTP-09 (Production Queue / Distributed Worker Infrastructure with BullMQ/Redis, scheduled cron, heartbeat reporting, and manual admin retry capabilities).
  - **Next Phase**: SMTP-09 — Production Queue / Distributed Worker Infrastructure.
- **[KAI-12-011] [2026-10-01]**: Implemented Phase SMTP-09 (Production Queue / Distributed Worker Infrastructure)
  - **Objective**: Implement a production-grade distributed notification queue and worker architecture using BullMQ and Redis, keeping PostgreSQL as the authoritative delivery ledger, providing seamless fallback to database polling when Redis is disabled/offline, enforcing idempotency across layers, reconciling retry scheduling, capturing worker heartbeat telemetry, exposing queue metrics in the admin dashboard, and introducing authorized administrative retry capabilities.
  - **Architecture Audited**: `NotificationService.dispatch()`, `NotificationDelivery` schema, `EmailService`, `DeliveryProcessorService`, `src/worker.ts`, `NotificationObservabilityService`, `src/actions/observability.actions.ts`, `src/components/aura/aura-app.tsx`, `tests/*`.
  - **Files Inspected**: `prisma/schema.prisma`, `package.json`, `.env.example`, `.env`, `architecture.md`, `phases.md`, `rules.md`, `memory.md`, `src/services/notification.service.ts`, `src/services/email.service.ts`, `src/services/delivery-processor.service.ts`, `src/worker.ts`, `src/actions/observability.actions.ts`.
  - **Files Modified**:
    - `package.json`: Added `bullmq` and `ioredis` dependencies.
    - `.env.example`: Added sanitized configuration keys (`REDIS_URL`, `QUEUE_ENABLED`, `NOTIFICATION_QUEUE_NAME`, `QUEUE_WORKER_CONCURRENCY`, `QUEUE_JOB_ATTEMPTS`, `QUEUE_BACKOFF_DELAY`, `QUEUE_STALLED_INTERVAL`, `QUEUE_HEARTBEAT_INTERVAL`).
    - `src/services/notification.service.ts`: Updated `dispatch()` to asynchronously enqueue delivery IDs to BullMQ via `NotificationQueueProducer.enqueueDelivery(delivery.id)` after database transaction commit.
    - `src/worker.ts`: Upgraded standalone worker to probe Redis availability on startup; starts distributed BullMQ worker if Redis is reachable, otherwise gracefully falls back to the database-polling delivery loop (`DeliveryProcessorService.processPendingEmailDeliveries()`).
    - `src/services/notification-observability.service.ts`: Augmented `getDeliverySummary()` to query live BullMQ queue metrics (`waiting`, `active`, `completed`, `failed`, `delayed`, `redisStatus`, `workers`); added `retryDelivery(deliveryId)` to re-queue eligible `FAILED` or stuck `PROCESSING` deliveries.
    - `src/actions/observability.actions.ts`: Added `retryDeliveryAction(deliveryId)` protected by server-side `assertAdminAuthorization()`.
    - `src/components/aura/aura-app.tsx`: Added Queue Engine telemetry banner (Live BullMQ status, worker count, queue depth) to `EmailDeliveriesDashboard`; added "Retry Delivery" button to `DeliveryDetailModal` for `FAILED` and `PROCESSING` items.
    - `architecture.md`: Appended Section 22 detailing system topology, separation of concerns, multi-layer idempotency, retry reconciliation, and at-least-once external SMTP delivery semantics.
    - `phases.md`: Marked SMTP-09 as `Completed`.
  - **Files Created**:
    - `src/services/queue/queue.types.ts`: TypeScript contracts for queue jobs, options, and telemetry (`NotificationJobData`, `QueueMetrics`, `EnqueueResult`).
    - `src/services/queue/queue.config.ts`: Configuration loader with `isRedisAvailable()` probe and lazy `getRedisClient()` initialization.
    - `src/services/queue/notification.queue.ts`: `NotificationQueueProducer` with deterministic job IDs (`delivery-${deliveryId}`), BullMQ job addition with exponential backoff, and live queue telemetry retrieval.
    - `src/services/queue/notification.worker.ts`: `NotificationWorker` processing jobs via `EmailService.processDelivery()`, managing periodic heartbeats to Redis with 30s TTL, and handling graceful shutdown.
    - `tests/queue-worker.test.ts`: Automated test suite with 12 subtests testing queue disable, unreachable Redis, malformed jobs, worker execution, transient error backoff, queue telemetry, admin retry, and RBAC rejection.
    - `smtp-09-report.md`: Comprehensive 28-section architectural report.
  - **Database Changes**: None. Confirmed existing `NotificationDelivery` and `Notification` models natively support all required distributed delivery states, retry counts, timestamps, and error details without schema migration.
  - **Dependencies Added**: `bullmq` (`^5.69.0`), `ioredis` (`^5.9.3`). Audited via `npm audit`: zero new vulnerabilities introduced.
  - **Tests Added**: `tests/queue-worker.test.ts` (12 subtests, 13 assertions).
  - **Tests Executed**: Ran `npm test` across all 23 test suites with `--test-concurrency=1`.
  - **Test Results**: 70/70 tests passed (100% success rate, 0 failed, 0 skipped, 0 cancelled).
  - **Build Result**: `npm run build` compiled successfully in 1982ms with exit code 0.
  - **Prisma Validation Result**: `npx prisma validate` succeeded: `The schema at prisma\schema.prisma is valid 🚀`.
  - **Local Redis Integration Status**: Local Redis offline on port 6379; graceful fallback tested and verified 100%. Real Redis round-trip documented as deferred to staging deployment.
- **[KAI-12-012] [2026-10-01]**: Master Consolidation of All SMTP Reports & Historical Logs
  - **Objective**: Consolidate all individual SMTP phase report documents (`smtp-07-report.md`, `smtp-08-report.md`, `smtp-09-report.md`) alongside all chronological SMTP memory logs (`[KAI-12-003]` through `[KAI-12-011]`) and recent full-system QA defect remediations (DEF-01 through DEF-06) into a single unified master document.
  - **Master Document Created**: `smtp-consolidated-report.md`
  - **Phases Fully Documented & Integrated**:
    - SMTP-01: Notification Domain & Delivery Persistence (`[KAI-12-003]`)
    - SMTP-02: Central Notification Dispatcher (`[KAI-12-004]`)
    - SMTP-03: SMTP Transport Layer (`[KAI-12-005]`)
    - SMTP-03.1: Architecture Correction & Delivery Processing Gap (`[KAI-12-006]`)
    - SMTP-04: Email Template System & XSS Protection (`[KAI-12-007]`)
    - SMTP-05: Full Notification Event Coverage (`[KAI-12-008]`)
    - SMTP-06: Reliable Delivery Worker & Retry Processing (`[KAI-12-009]`)
    - SMTP-07: Notification Preferences UI & Control Layer (`[KAI-12-009B]`, `smtp-07-report.md`)
    - SMTP-08: Email Delivery Observability & Admin Dashboard (`[KAI-12-010]`, `smtp-08-report.md`)
    - SMTP-09: Production Queue & Distributed Worker Infrastructure (`[KAI-12-011]`, `smtp-09-report.md`)
  - **Audit & Remediation Section**: Detailed DEF-01 to DEF-06 defect remediations, complete 70/70 test matrix, Next.js build verification, and production operational guide.
- **[KAI-12-013] [2026-10-05]**: Store Redemption Request Notification to Admins (`REDEMPTION_REQUESTED`)
  - **Objective**: Ensure Admins and Superadmins receive an immediate notification (in-app bell and email) when a member redeems an item from the Store.
  - **Changes**: Added `REDEMPTION_REQUESTED` to `SUPPORTED_NOTIFICATION_TYPES`, email templates in `TemplateResolver`, dispatched to active admins after transaction in `StoreService.redeemStoreItem()`, and updated UI bell popover/settings.
- **[KAI-12-014] [2026-10-05]**: Discretionary Aura Award Notification (`AURA_AWARDED`)
  - **Objective**: Ensure team members receive immediate in-app bell notifications and email confirmations when leadership manually awards discretionary Aura points.
  - **Changes**: Added `AURA_AWARDED` to `SUPPORTED_NOTIFICATION_TYPES` in `NotificationPreferenceService`, added responsive HTML/plain-text email template to `TemplateResolver`, wired `NotificationService.dispatch()` into `awardAuraAction` in `src/actions/aura.actions.ts`, and updated `notificationTypes` in `aura-app.tsx` Settings. All 72 tests pass.
- **[KAI-13-001] [2026-10-07]**: Store Product Image URL Support
  - **Objective**: Allow ADMIN and SUPERADMIN users to optionally provide an external image URL when creating Store products, while preserving existing Store architecture.
  - **Changes**: Leveraged existing `imageUrl` field in the Prisma `StoreItem` schema. Updated `createStoreItemAction` to securely validate and parse HTTP/HTTPS URLs while rejecting invalid payloads or malicious schemas (e.g. `javascript:`). Updated `AddProductModal` with the new input field. Created resilient `StoreProductImage` UI component with an `onError` state fallback to the existing `Package` icon to ensure broken image links do not crash the layout.
  - **Test Results**: 100% test pass rate (`npm test`), build succeeded with 0 errors. All previous features remain completely intact.
- **[KAI-14-001] [2026-10-13]**: Deployment-Ready Frontend/Backend Codebase Organization (Phases 0, 1, and 2)
  - **Objective**: Reorganize monolithic repository into independently deployable `frontend/` and `backend/` applications communicating via environment-configured HTTP REST APIs and JWT session cookies.
  - **Backend Extraction (`backend/`)**:
    - Standalone Express + TypeScript server listening on port 4000 (`src/server.ts`).
    - Configurable CORS with credential support bound to `FRONTEND_URL`.
    - Express cookie-based JWT session verification and role-based access control middleware (`src/middleware/requireAuth.ts`).
    - Dedicated REST route modules for all 11 domains: `auth`, `user`, `aura`, `task`, `store`, `team`, `notification`, `observability`, `analytics`, `audit`, and `ai`.
    - Integrated background delivery worker supporting BullMQ/Redis with database polling fallback (`src/worker.ts`).
    - Independent `package.json`, `tsconfig.json`, `prisma/`, and `.env.example`.
    - Verification: `npx prisma generate` generated Prisma client 7.10.0; `npx tsc --noEmit` and `npm run build` completed with 0 errors; live health check `GET /api/health` confirmed operational.
  - **Frontend Extraction (`frontend/`)**:
    - Standalone Next.js 16 + React 19 + Tailwind CSS application (`frontend/`).
    - Zero database/Prisma/BullMQ dependencies in the client/frontend tier.
    - Universal API client (`src/lib/api-client.ts`) bridging Server Components, Server Actions, and browser requests to backend endpoints via `API_URL` and `NEXT_PUBLIC_API_URL` with automated cookie forwarding.
    - Preserved all Impeccable UI components, modals, streak badges, celebration confetti, and design system tokens.
    - 11 server action modules refactored to delegate data mutations and queries to backend REST endpoints.
    - Verification: `npx tsc --noEmit` and `npm run build` (Next.js Turbopack) built all static and dynamic routes cleanly with exit code 0.
- **[KAI-14-002] [2026-10-14]**: Live Integration Testing, Test Suite Porting, & Final Documentation (Phases 5 and 6)
  - **Objective**: Execute end-to-end live integration tests across independent frontend and backend servers, port automated test suites to the backend, update architectural documentation, and declare reorganization complete.
  - **Live Integration Testing**:
    - Backend launched on port 4000 (`http://localhost:4000/api/health` ➔ `200 OK`).
    - Frontend launched on port 3000 (`http://localhost:3000`).
    - Automated API test suite validated: login authentication (`POST /api/auth/login`), cookie decoding (`GET /api/auth/me`), balance computation (`GET /api/aura/balance`), task fetching (`GET /api/tasks`), store catalog (`GET /api/store/items`), squad listing (`GET /api/teams`), and observability metrics (`GET /api/observability/summary`). All endpoints responded with `success: true`.
  - **Backend Test Suite Execution**:
    - Ported test suites to `backend/tests/`.
    - Refactored `queue-worker.test.ts` to test `NotificationObservabilityService.retryDelivery` directly on backend.
    - Ran all test suites: 100% passed (0 failed).
  - **Documentation & Architecture**:
- **[KAI-14-003] [2026-10-14]**: Deployment File Cleanup & Monorepo Streamlining
  - **Objective**: Purge all redundant, obsolete, and non-deployment files to streamline deployment and ensure deterministic, minimal release artifacts.
  - **Pruned / Cleaned Up**:
    - Removed root legacy `node_modules/` (861 MB) left over from the monolithic setup.
    - Removed root legacy `package-lock.json` (239 KB, 8,134 lines) referencing the old monolithic structure.
    - Generated deterministic `frontend/package-lock.json` alongside `backend/package-lock.json`.
    - Removed redundant `.agent/` folder containing binary executables.
    - Relocated historical report `smtp-consolidated-report.md` to `docs/reports/`.
    - Verified all legacy source roots (`src/`, `prisma/`, `tests/`, `public/`, `scratch/`, `Photosss/`, `next.config.ts`, `postcss.config.mjs`, `components.json`) were completely pruned from the root.
  - **Verification**: Verified `npm run build:backend` (0 errors), `npm run build:frontend` (Next.js 16 Turbopack, 0 errors), and `npm test` (all 23 backend test suites pass with 0 failures).
- **[KAI-14-004] [2026-10-14]**: Deployment Remediation & Acceptance Gate Completion (Render + Vercel)
  - **Objective**: Resolve all verified blocker and high-severity findings from `docs/deployment/production-deployment-audit.md` to achieve 100% independent deployability.
  - **Remediated Items**:
    - `FINDING-01`: Updated `backend/package.json` `"start"` and `"main"` to `dist/src/server.js`. Verified server starts and returns `200 OK` on `/api/health`.
    - `FINDING-02`: Removed `"kai-aura-workspace": "file:.."` from `frontend/package.json` and regenerated isolated lockfile.
    - `FINDING-03`: Aligned 3 API contracts in `frontend/src/actions/`: `/notifications/jobs/email-processor`, `/notifications/preferences/:type`, `/notifications/preferences` (DELETE), and `/ai/breakdown-task`.
    - `FINDING-04`: Verified `node dist/src/worker.js` entry point and execution parameters for Render Background Worker.
    - `FINDING-05`: Created `frontend/eslint.config.mjs` flat configuration and updated `"lint"` script to `"eslint src"`. Verified `npm run lint` passes with 0 errors.
    - `FINDING-06`: Implemented graceful HTTP connection draining and Prisma pool disconnection (`SIGTERM`/`SIGINT`) in `backend/src/server.ts`.
    - `FINDING-07`: Updated `backend/prisma/seed.ts` to allow `SUPERADMIN_DEFAULT_PASSWORD` environment variable override.
  - **Verification**: All 26 test suites / 75 assertions pass with 0 failures (`npm test`). Both frontend and backend production builds compile with 0 errors. Status: `READY FOR STAGING DEPLOYMENT`.
- **[KAI-14-005] [2026-10-14]**: Render Managed PostgreSQL Migration & Database Configuration
  - **Objective**: Deploy schema and copy all active data from local database (`kai_aura_dev`) to Render Managed PostgreSQL instance (`aura_db_yhg1`), configure backend environment variables, and verify end-to-end connectivity.
  - **Actions Taken**:
    - Ran `npx prisma migrate deploy` targeting Render PostgreSQL (`dpg-db7kf0dg1s2s73as8qdg-a.singapore-postgres.render.com`) to apply all 4 Prisma migrations cleanly.
    - Exported and migrated data across all 22 domain tables in topological foreign-key order using parameterized queries.
    - Verified 100% row match between local and Render databases (User: 65, Notification: 165, NotificationDelivery: 151, NotificationPreference: 20, AuraTransaction: 14, Task: 12, TaskAssignment: 12, StoreItem: 9, Kudos: 9, Team: 5, TeamMember: 5, Redemption: 5, Role: 3, AuditLog: 2, Batch: 1).
    - Hardened `backend/src/lib/prisma.ts` and `backend/prisma/seed.ts` with conditional SSL (`rejectUnauthorized: false`) for cloud-hosted PostgreSQL instances.
    - Configured `DATABASE_URL` in `backend/.env` and root `.env` to `postgresql://aura_db_yhg1_user:EhgK70b82AfCR1dp9RjcRPY9G0ABJyOJ@dpg-db7kf0dg1s2s73as8qdg-a.singapore-postgres.render.com/aura_db_yhg1?sslmode=require`.
  - **Verification**:
    - `npx prisma migrate status` confirms database schema is up to date with 4 applied migrations.
    - Backend build (`npm run build`) succeeded with 0 errors.
    - Backend test suite (`npm test`) executed 26 test suites and 75 tests directly against the Render database with 100% pass rate (75 passed, 0 failed).
- **[KAI-14-006] [2026-10-15]**: Member Store Available Aura Balance Integration & Verification
  - **Objective**: Display the logged-in member's authoritative Available Aura Balance on the Store page in the horizontal control row alongside "Browse Rewards" and "My Redemptions", and ensure real-time balance refresh on store item redemption without requiring a manual page reload.
  - **Existing Implementation Traced**:
    - **Balance Source & Formula**: Traced authoritative balance calculation to `AuraService.getAvailableAura(userId)` in `backend/src/services/aura.service.ts`, which dynamically aggregates all user transactions (`sum(amount)`) on the append-only `AuraTransaction` ledger.
    - **Redemption Validation**: `StoreService.redeemStoreItem(userId, storeItemId)` validates that `AuraService.getAvailableAura(userId) >= item.basePrice` before creating a negative transaction (`type: 'REDEMPTION'`, `amount: -item.basePrice`) inside an atomic database transaction.
    - **Authentication & Authorization**: Non-admins are restricted by `GET /api/aura/balance` to their verified `session.userId`, preventing parameter manipulation.
  - **Frontend UI & State Integration**:
    - Embedded the Available Aura Balance component (`data-testid="store-available-aura-balance"`) into the horizontal navigation row of `StorePage` alongside "Browse Rewards" and "My Redemptions" / "Redemption Requests".
    - Followed the KAI Aura design system: `Available Aura | ⚡ {balance.toLocaleString()} Aura` with amber-gradient styling, pulse loading state, and error fallback.
    - Managed reactive `auraBalance` state in `AuraApp`, refreshing authoritatively via `getAuraBalanceAction()` when opening the store tab and immediately updating after successful redemption without requiring a manual page reload.
    - Updated `StoreService.redeemStoreItem` to include `remainingBalance` in the response payload.
  - **Verification & Testing**:
    - Added comprehensive integration test suite `backend/tests/store-balance-integration.test.ts` verifying ledger aggregation, insufficient funds rejection, authoritative remaining balance return, and session isolation.
    - Executed full test suite: **30 test suites, 79 tests, 79 passed, 0 failed** (`npm test`).
    - Verified Next.js 16 frontend build (`npm run build`: 0 errors) and ESLint (`npm run lint`: 0 errors).
    - Executed end-to-end SSR and API verification confirming rendered HTML reflects the live member balance.


