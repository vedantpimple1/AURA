# KAI Aura — Admin-Assisted One-Time Password Reset
## Technical Feature Implementation Plan

**Feature ID**: KAI-SEC-001  
**Target Milestone**: Security-First Admin-Assisted Recovery  
**Target Workspaces**: `backend/` (Express API) & `frontend/` (Next.js 16 App Router)  
**Author**: Senior Full-Stack & Backend Security Engineer  
**Status**: DRAFT / READY FOR REVIEW  

---

## 1. Scope and Non-Goals

### 1.1 In Scope
- **Member-Facing Recovery Request**: A public-facing form on the frontend where members input their identifier (email or employee ID) to request password recovery.
- **Generic Security Confirmation**: The public response must communicate:
  > *"Your password reset request has been submitted. An authorized administrator will verify your identity and share a secure password reset link with you."*
  Zero account enumeration or state leakage.
- **Dedicated Recovery Permission (`PASSWORD_RESET_REQUEST_MANAGE`)**: Explicit permission decoupled from default `ADMIN` and `SUPERADMIN` roles. Only users explicitly assigned this permission can access the recovery queue, verify identities, or generate one-time links.
- **Urgent Notification Dispatch**: In-app notification dispatched exclusively to operators with the dedicated recovery permission via `NotificationService.dispatch()`.
- **Identity Verification Step**: An explicit operator verification step before any reset link can be issued.
- **Cryptographically Secure One-Time Token**: 256-bit CSPRNG token (`crypto.randomBytes(32).toString('hex')`), stored only as a cryptographic hash (SHA-256) with a short 15-minute TTL.
- **Restricted Operator Handoff View**: Raw link generated on demand, exposed **once** directly in the authorized operator's handoff modal with an explicit copy button.
- **Password Reset Completion**: Form accepting the one-time token and new password, verifying complexity, atomically updating the password hash, marking the token consumed, and invalidating prior sessions.
- **Session Revocation Strategy**: Introduction of `passwordChangedAt` on the `User` model, checked against JWT `iat` in `requireAuth` middleware to immediately invalidate existing sessions upon password reset.
- **Audit Logging**: Comprehensive, privacy-preserving audit logs via `AuditService.log()` with zero secrets/hashes recorded.
- **Rate Limiting**: Sliding-window rate limiting on public submission, operator verification, link issuance, and reset completion.

### 1.2 Non-Goals
- **No SMTP / External Transport Delivery**: Production SMTP is not configured. The system will **never** pretend an email was sent or attempt delivery over nonexistent channels.
- **No Self-Service Email Link Delivery**: The architecture is strictly *Admin-Assisted*.
- **No Permanent Raw Link Storage**: Raw tokens will never be persisted to the database, browser storage (`localStorage`/`sessionStorage`), logs, or general notifications.
- **No Unrelated Codebase Refactoring**: All existing store, gamification, ledger, task, and team architectures remain intact.

---

## 2. Existing Architecture and Integration Points

```
┌─────────────────────────────────────────────────────────────┐
│                       Frontend Tier                         │
│                    (Next.js 16 App Router)                  │
│                                                             │
│  /login ──> /forgot-password ──> /reset-password?token=...  │
│                                                             │
│       Admin Console: Recovery Queue & Link Handoff Modal    │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP /api (Cookies forwarded)
┌──────────────────────────────▼──────────────────────────────┐
│                       Backend Tier                          │
│                   (Express + Prisma 7)                      │
│                                                             │
│  Routes: /api/auth/* & /api/admin/password-reset-requests/* │
│  Middleware: requireAuth, requirePermission, rateLimiter    │
│  Services: PasswordResetService, NotificationService,       │
│            AuditService, AuthService                        │
└──────────────────────────────┬──────────────────────────────┘
                               │ @prisma/adapter-pg
┌──────────────────────────────▼──────────────────────────────┐
│                  Database Tier (PostgreSQL)                 │
│                                                             │
│  Models: User (passwordChangedAt), PasswordResetRequest,     │
│          Role, Permission, RolePermission, UserRole,        │
│          Notification, AuditLog                             │
└─────────────────────────────────────────────────────────────┘
```

- **Frontend Auth**: Server Actions in `frontend/src/actions/auth.actions.ts` delegate to `apiClient` (`frontend/src/lib/api-client.ts`), which proxies requests to the backend server with `credentials: 'include'`.
- **Backend Auth**: `backend/src/lib/auth.ts` uses `jose` HS256 for 24h JWT sessions and `bcryptjs` (cost factor 10) for password hashing.
- **Backend Middleware**: `backend/src/middleware/requireAuth.ts` decodes `req.cookies.session`. It will be enhanced to check `passwordChangedAt` and `requirePermission`.
- **Notification Engine**: `backend/src/services/notification.service.ts` dispatches in-app notifications and records delivery attempts.
- **Audit Logging**: `backend/src/services/audit.service.ts` records immutable records to `AuditLog`.

---

## 3. Security and Permission Model

### 3.1 Separate Recovery Permission (`PASSWORD_RESET_REQUEST_MANAGE`)
- The Prisma schema already defines `Role`, `Permission`, `RolePermission`, and `UserRole`.
- A dedicated permission `PASSWORD_RESET_REQUEST_MANAGE` will be created in the database.
- Neither `ADMIN` nor `SUPERADMIN` roles implicitly receive this permission by default unless explicitly granted.
- The `requirePermission('PASSWORD_RESET_REQUEST_MANAGE')` middleware will resolve permissions via the database/cached user roles to enforce access control.
- **Self-Approval Prevention**: An operator cannot verify or issue a reset link for their own account (`req.session.userId === request.userId` triggers 403 Forbidden).

### 3.2 State Machine
The recovery lifecycle follows a strict deterministic finite-state machine:

```
[MEMBER REQUEST]
       │
       ▼
   PENDING  ──────────────>  CANCELLED (Operator cancels)
       │
       ▼ (Operator verifies identity)
   VERIFIED ──────────────>  CANCELLED (Operator cancels)
       │
       ▼ (Operator issues link)
  LINK_ISSUED ────────────>  EXPIRED (15 min TTL elapsed)
       │                   ▲
       │                   │
       ▼ (Member resets)   │ (Invalidated by re-issuance)
   COMPLETED          SUPERSEDED
```

Allowed Transitions:
1. `PENDING` ➔ `VERIFIED` (via explicit operator verification)
2. `PENDING` ➔ `CANCELLED` (by operator)
3. `VERIFIED` ➔ `LINK_ISSUED` (generates token hash, sets 15-minute expiry)
4. `VERIFIED` ➔ `CANCELLED` (by operator)
5. `LINK_ISSUED` ➔ `COMPLETED` (atomically upon successful password reset)
6. `LINK_ISSUED` ➔ `EXPIRED` (if `now() > tokenExpiresAt`)
7. `LINK_ISSUED` ➔ `CANCELLED` (by operator)
8. Previous `LINK_ISSUED` ➔ `CANCELLED` / invalidated when a new link is issued for the same request/user.

---

## 4. Database Schema Changes

### 4.1 Prisma Schema Extension
Add model `PasswordResetRequest` and update `User` model in `backend/prisma/schema.prisma`:

```prisma
model User {
  // Existing fields ...
  passwordHash      String?
  passwordChangedAt DateTime?  // Used for instant JWT session invalidation
  status            String     @default("ACTIVE")
  
  // Relations
  passwordResetRequests PasswordResetRequest[] @relation("TargetUserResetRequests")
  verifiedResetRequests PasswordResetRequest[] @relation("VerifiedByOperator")
  issuedResetRequests   PasswordResetRequest[] @relation("IssuedByOperator")
  // Existing relations ...
}

enum ResetRequestStatus {
  PENDING
  VERIFIED
  LINK_ISSUED
  COMPLETED
  EXPIRED
  CANCELLED
}

model PasswordResetRequest {
  id              String             @id @default(cuid())
  userId          String
  user            User               @relation("TargetUserResetRequests", fields: [userId], references: [id], onDelete: Cascade)
  status          ResetRequestStatus @default(PENDING)
  
  // Verification details
  verifiedAt      DateTime?
  verifiedById    String?
  verifiedBy      User?              @relation("VerifiedByOperator", fields: [verifiedById], references: [id], onDelete: SetNull)
  verificationNotes String?
  
  // Token details (ONLY cryptographic hash stored; raw token NEVER stored)
  tokenHash       String?            @unique
  tokenExpiresAt  DateTime?
  issuedAt        DateTime?
  issuedById      String?
  issuedBy        User?              @relation("IssuedByOperator", fields: [issuedById], references: [id], onDelete: SetNull)
  
  // Completion & Cancellation
  completedAt     DateTime?
  cancelledAt     DateTime?
  cancelledById   String?
  cancellationReason String?
  
  // Request metadata & throttling
  requestIp       String?
  userAgent       String?
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt

  @@index([userId, status])
  @@index([status, createdAt])
}
```

---

## 5. Backend Implementation

### 5.1 Endpoints Specification

| Method | Endpoint | Authorization | Description |
|---|---|---|---|
| `POST` | `/api/auth/password-reset-requests` | Public (Rate-limited) | Member submits recovery request. Returns generic confirmation message. |
| `GET` | `/api/admin/password-reset-requests` | `PASSWORD_RESET_REQUEST_MANAGE` | Queue of recovery requests (paginated, no tokens). |
| `POST` | `/api/admin/password-reset-requests/:id/verify` | `PASSWORD_RESET_REQUEST_MANAGE` | Verifies identity. Cannot self-verify. |
| `POST` | `/api/admin/password-reset-requests/:id/issue-link` | `PASSWORD_RESET_REQUEST_MANAGE` | Generates 256-bit token, stores SHA-256 hash, returns raw link once. |
| `POST` | `/api/admin/password-reset-requests/:id/cancel` | `PASSWORD_RESET_REQUEST_MANAGE` | Cancels request with reason. |
| `POST` | `/api/auth/reset-password` | Public (Rate-limited) | Validates raw token hash, atomically updates password, consumes token. |

### 5.2 Cryptographic Token Generation and Hashing
```typescript
import crypto from 'node:crypto';

// 1. Generate 256 bits of CSPRNG entropy
const rawToken = crypto.randomBytes(32).toString('hex');

// 2. Hash raw token using SHA-256 for persistent database storage
const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

// 3. Expiry: 15 minutes from now
const tokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
```

### 5.3 Session Invalidation Strategy
- In `backend/src/middleware/requireAuth.ts`:
  1. Decrypt JWT payload `iat` (issued-at timestamp in seconds).
  2. Query user `passwordChangedAt`.
  3. If `passwordChangedAt && (user.passwordChangedAt.getTime() / 1000) > payload.iat`:
     Reject session with `AuthenticationError('Session expired due to password change. Please log in again.')` (HTTP 401).
- In `POST /api/auth/reset-password`:
  Atomically update `passwordHash` and `passwordChangedAt: new Date()` within the Prisma transaction.

### 5.4 Urgent In-App Notification Dispatch
- When a new recovery request is submitted:
  1. Find all users possessing permission `PASSWORD_RESET_REQUEST_MANAGE`.
  2. For each authorized operator, invoke `NotificationService.dispatch({ userId: operator.id, type: 'PASSWORD_RESET_REQUESTED', title: 'Urgent: Password reset request', message: "A member has requested password recovery. Verify the member's identity before issuing a one-time reset link.", metadata: { requestId: request.id, employeeId: targetUser.employeeId } })`.
  3. Deduplicate: If an active `PENDING` request already exists for the user within 2 hours, do not flood operator inboxes with duplicate notifications.

---

## 6. Frontend UI/UX Implementation

### 6.1 Forgot Password Page (`frontend/src/app/forgot-password/page.tsx`)
- Accessible via "Forgot password?" link on `/login`.
- Accepts email or employee ID.
- Accessible form, loading spinner, and disabled duplicate submission.
- On submit, renders:
  > *"Your password reset request has been submitted. An authorized administrator will verify your identity and share a secure password reset link with you."*

### 6.2 Reset Password Page (`frontend/src/app/reset-password/page.tsx`)
- Reads `token` query param. Cleanses browser URL history via `window.history.replaceState` without consuming the token.
- Shows New Password and Confirm Password inputs with strength feedback.
- Handles Invalid, Expired, and Already-Consumed token errors gracefully.
- On success, confirms reset and provides button redirecting to `/login`.

### 6.3 Admin Recovery Queue & Link Handoff Modal
- Tab/View accessible in Admin portal only for users with `PASSWORD_RESET_REQUEST_MANAGE`.
- Table columns: Request ID, Member Name/Email/EmployeeId, Status Badge, Request Date, Actions.
- Actions:
  - **Verify Identity** (opens verification confirmation dialog)
  - **Issue Link** (active only when status is `VERIFIED`)
  - **Cancel Request** (with reason prompt)
- **Restricted Link Handoff Modal**:
  - Appears immediately upon successful link issuance.
  - Displays generated URL with deliberate **Copy Reset Link** button.
  - Explains: *"This one-time link is valid for 15 minutes. Share it directly with the verified member via an approved internal channel. It will not be shown again."*
  - Closing the modal wipes the raw link from component state.

---

## 7. Rate Limiting and Security Safeguards

1. **Public Request Throttling**:
   - Max 3 requests per IP per 15 minutes.
   - Max 2 requests per identifier per 30 minutes.
2. **Reset Completion Throttling**:
   - Max 5 failed attempts per IP per 15 minutes.
3. **Operator Endpoint Throttling**:
   - Max 30 actions per minute per operator.
4. **Audit Trail**:
   - Every state transition logged to `AuditLog` without tokens, hashes, or passwords.

---

## 8. Test Plan

Comprehensive backend test suite `backend/tests/password-reset.test.ts` covering:
1. Public recovery request submission with generic message.
2. Indistinguishable responses for non-existent vs existing users.
3. Throttling of repeated submissions.
4. Access denied to ordinary ADMIN without recovery permission.
5. Access denied to SUPERADMIN without recovery permission.
6. Access granted to operator with `PASSWORD_RESET_REQUEST_MANAGE`.
7. Self-verification prevention.
8. Link issuance rejection prior to verification.
9. CSPRNG token entropy and SHA-256 hash persistence.
10. Absence of raw tokens in list queries, logs, notifications, and audits.
11. Expiration after 15 minutes.
12. Single-use consumption and concurrency safety.
13. Prior token invalidation on re-issuance.
14. Atomic password update and successful login with new password.
15. Invalidation of old password.
16. Invalidation of pre-existing JWT sessions via `passwordChangedAt`.
17. In-app notification delivery exclusively to authorized operators.

---

## 9. Rollback and Migration Strategy

- **Migration**: Clean additive schema migration (`add_admin_assisted_password_reset`).
- **Zero Breaking Changes**: Existing columns, roles, and models are completely preserved.
- **Rollback**: If reverted, dropping the `PasswordResetRequest` table and `passwordChangedAt` column does not affect existing user accounts or system operation.
