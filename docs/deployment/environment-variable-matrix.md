# KAI Aura — Environment Variable Matrix
**Version:** 1.0  
**Phase:** 0 (Planning / Discovery)

All environment variables across the current monolith and their assignment to the target frontend/backend split.

---

## Legend

| Symbol | Meaning |
|---|---|
| ✅ Required | Must be present for the package to function |
| ⚠️ Optional | Enhances functionality but not required for baseline |
| ❌ Must NOT be present | Would be a security violation or is simply unused |
| 🔒 Secret | Must never be committed or exposed to browser |
| 🌐 Public | Safe to expose to browser (NEXT_PUBLIC_ prefix) |

---

## Variable Matrix

| Variable | Current .env | Frontend | Backend | Notes |
|---|---|---|---|---|
| `DATABASE_URL` | ✅ 🔒 | ❌ NEVER | ✅ 🔒 Required | PostgreSQL connection string. Server-only. Frontend must never see this. |
| `JWT_SECRET` | ✅ 🔒 | ✅ 🔒 Required | ✅ 🔒 Required | Must be **identical** in both packages. Frontend uses `jose` to verify/decrypt. Backend uses it to sign + verify. Never NEXT_PUBLIC_. |
| `NEXT_PUBLIC_API_URL` | ❌ (does not exist yet) | ✅ 🌐 Required | ❌ | New variable. Points to backend base URL (e.g. `https://api.kaiaura.com` or `http://localhost:4000`). Used by `api-client.ts` fetch wrapper. |
| `FRONTEND_URL` | ❌ (does not exist yet) | ❌ | ✅ 🔒 Required | New variable. Backend uses for CORS `Access-Control-Allow-Origin`. E.g. `https://kaiaura.com` or `http://localhost:3000`. |
| `NEXT_PUBLIC_APP_URL` | ✅ 🌐 | ✅ 🌐 Optional | ❌ | Frontend app URL. Used for display/link purposes in browser. |
| `APP_URL` | ✅ 🔒 | ❌ | ✅ 🔒 Required | Server-side base URL. Used by email service to construct notification links (e.g. password reset links). |
| `SMTP_HOST` | ✅ 🔒 | ❌ NEVER | ✅ 🔒 Required | Email server host. Backend/worker only. |
| `SMTP_PORT` | ✅ 🔒 | ❌ NEVER | ✅ 🔒 Required | Email server port (465 for SSL, 587 for STARTTLS). |
| `SMTP_USER` | ✅ 🔒 | ❌ NEVER | ✅ 🔒 Required | SMTP authentication username. |
| `SMTP_PASSWORD` | ✅ 🔒 | ❌ NEVER | ✅ 🔒 Required | SMTP authentication password / app password. |
| `SMTP_FROM` | ✅ 🔒 | ❌ NEVER | ✅ 🔒 Required | Sender display name + address (e.g. `"KAI Aura" <notifications@kaiaura.com>`). |
| `SMTP_SECURE` | ✅ 🔒 | ❌ NEVER | ✅ 🔒 Required | "true" for SSL/TLS (port 465), "false" for STARTTLS (port 587). |
| `DELIVERY_WORKER_ENABLED` | ✅ | ❌ | ✅ Required | Enables/disables the standalone delivery worker process. |
| `DELIVERY_WORKER_INTERVAL_MS` | ✅ | ❌ | ✅ Required | Polling interval in milliseconds (default: 10000). |
| `DELIVERY_WORKER_BATCH_SIZE` | ✅ | ❌ | ✅ Required | Number of deliveries to process per batch (default: 20). |
| `DELIVERY_WORKER_MAX_RETRIES` | ✅ | ❌ | ✅ Required | Maximum retry attempts for transient delivery failures (default: 3). |
| `REDIS_URL` | ⚠️ (in .env.example only) | ❌ | ✅ Required | Redis connection URL for BullMQ queue. Worker falls back to DB polling if Redis unavailable. |
| `QUEUE_ENABLED` | ⚠️ (in .env.example only) | ❌ | ✅ Required | "true" enables BullMQ distributed mode; "false" uses DB polling only. |
| `NOTIFICATION_QUEUE_NAME` | ⚠️ (in .env.example only) | ❌ | ⚠️ Optional | BullMQ queue name (default: "aura-email-deliveries"). |
| `QUEUE_WORKER_CONCURRENCY` | ⚠️ (in .env.example only) | ❌ | ⚠️ Optional | Number of concurrent worker jobs (default: 5). |
| `QUEUE_JOB_ATTEMPTS` | ⚠️ (in .env.example only) | ❌ | ⚠️ Optional | BullMQ job retry attempts (default: 3). |
| `QUEUE_BACKOFF_DELAY` | ⚠️ (in .env.example only) | ❌ | ⚠️ Optional | Base exponential backoff delay in ms (default: 2000). |
| `QUEUE_STALLED_INTERVAL` | ⚠️ (in .env.example only) | ❌ | ⚠️ Optional | Stalled job check interval in ms (default: 30000). |
| `QUEUE_HEARTBEAT_INTERVAL` | ⚠️ (in .env.example only) | ❌ | ⚠️ Optional | Worker heartbeat emission interval in ms (default: 10000). |
| `NODE_ENV` | Implicit | ✅ | ✅ | Set by deployment platform. "development" or "production". |
| `PORT` | ❌ (not currently set) | ❌ | ✅ Required | HTTP server listen port for backend (e.g. 4000). Next.js uses its own port (3000). |

---

## Target .env.local.example (Frontend)

```env
# ============================================================
# KAI Aura — Frontend Environment Variables
# ============================================================

# Backend API base URL (no trailing slash)
# Local: http://localhost:4000
# Production: https://api.kaiaura.com
NEXT_PUBLIC_API_URL="http://localhost:4000"

# JWT secret — must be IDENTICAL to backend JWT_SECRET
# Generate with: openssl rand -hex 64
JWT_SECRET="generate_with_openssl_rand_hex_64"

# Frontend app URL (used for display/links in browser)
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Target .env.example (Backend)

```env
# ============================================================
# KAI Aura — Backend Environment Variables
# ============================================================

# Database
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/kai_aura_dev?schema=public"

# JWT secret — must be IDENTICAL to frontend JWT_SECRET
# Generate with: openssl rand -hex 64
JWT_SECRET="generate_with_openssl_rand_hex_64"

# CORS — frontend origin
FRONTEND_URL="http://localhost:3000"

# Server
PORT="4000"

# App URL (for email notification links)
APP_URL="http://localhost:3000"

# SMTP Configuration
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="notifications@kaiaura.com"
SMTP_PASSWORD="secure_generated_app_password"
SMTP_FROM="\"KAI Aura\" <notifications@kaiaura.com>"
SMTP_SECURE="false"

# Delivery Worker Configuration
DELIVERY_WORKER_ENABLED="true"
DELIVERY_WORKER_INTERVAL_MS="10000"
DELIVERY_WORKER_BATCH_SIZE="20"
DELIVERY_WORKER_MAX_RETRIES="3"

# Redis / Queue Configuration (SMTP-09)
REDIS_URL="redis://127.0.0.1:6379"
QUEUE_ENABLED="false"
NOTIFICATION_QUEUE_NAME="aura-email-deliveries"
QUEUE_WORKER_CONCURRENCY="5"
QUEUE_JOB_ATTEMPTS="3"
QUEUE_BACKOFF_DELAY="2000"
QUEUE_STALLED_INTERVAL="30000"
QUEUE_HEARTBEAT_INTERVAL="10000"
```

---

## Critical Security Notes

1. **`JWT_SECRET` must be identical** across frontend and backend. They are logically one secret, deployed to two places.
2. **`DATABASE_URL` is strictly backend-only**. Any accidental `NEXT_PUBLIC_DATABASE_URL` would be a critical security violation.
3. **`SMTP_PASSWORD` is strictly backend-only**. Never reference in frontend code.
4. **`NEXT_PUBLIC_API_URL` is the only new public variable**. It exposes only the backend's public hostname — no secrets.
