# KAI Aura App - Setup & Requirements Guide

This document outlines the technical requirements and setup instructions for the KAI Aura App up to Phase 05.

## 1. Prerequisites (Requirements)
To run this project locally, ensure you have the following installed:
- **Node.js**: v20.x or higher
- **npm**: v10.x or higher (comes with Node)
- **PostgreSQL**: v14.x or higher (A running local or remote Postgres instance)
- **TypeScript**: v5.x

### Core Tech Stack:
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4, Lucide React (Icons), Radix UI
- **Database ORM:** Prisma 7 (with `@prisma/adapter-pg` driver adapter)
- **Database:** PostgreSQL
- **Authentication:** Custom JWT via `jose` and `bcryptjs`

---

## 2. Environment Variables

Create a `.env` file in the root directory and configure the following variables:

```env
# The connection string to your PostgreSQL database.
# Adjust the username, password, port (5432), and database name as needed.
DATABASE_URL="postgresql://postgres:password@localhost:5432/aura_db?schema=public"

# The secret key used to sign and verify JWT authentication cookies.
JWT_SECRET="your-super-secret-jwt-key"
```

---

## 3. Installation

1. **Install NPM Dependencies:**
   Open your terminal in the project root and run:
   ```bash
   npm install
   ```

2. **Initialize Prisma (Database Sync):**
   Push the Prisma schema to your PostgreSQL database to create the necessary tables.
   ```bash
   npx prisma db push
   ```

3. **Generate Prisma Client:**
   Generate the strongly-typed Prisma client for your application.
   ```bash
   npx prisma generate
   ```

4. **Seed the Database:**
   Run the seed script to populate the initial Roles, Batches, and the System Admin user.
   ```bash
   npm run seed
   ```
   *(Note: The seed script securely initializes the database using the Prisma Pg Driver Adapter configured in `prisma7.config.ts`).*

---

## 4. Running the Independent Services (Decoupled Architecture)

The codebase is organized into independently deployable `frontend/` and `backend/` applications:

### A. Running the Backend API Server
```bash
cd backend
npm run dev
```
- **API URL:** `http://localhost:4000`
- **Health Check:** `http://localhost:4000/api/health`
- **Background Delivery Worker (BullMQ / DB Polling):**
  ```bash
  npm run worker
  ```

### B. Running the Frontend Application
```bash
cd frontend
npm run dev
```
- **Web App URL:** `http://localhost:3000`
- Configured to route API requests to the backend via `API_URL` and `NEXT_PUBLIC_API_URL` environment variables.

### Logging In
After running the database seed, log in using the seed accounts:
- **Admin:** `admin@kaiaura.com` / `admin123`
- **Member:** `member@kaiaura.com` / `member123`

---

## 5. Current Features (All Phases Complete)
- **Decoupled Architecture:** Standalone Express backend (`backend/`) and Next.js frontend (`frontend/`).
- **Authentication:** Edge & Express cookie-protected routes using JWT with Jose.
- **RBAC:** Member, Admin, and Superadmin roles with scoped permissions.
- **Aura Ledger & Social:** Real-time point transactions, weekly leaderboard, squads, and peer kudos.
- **Tasks & Reviews:** Admin task creation, assignment, member submission, and review approvals.
- **Store & Redemptions:** Rewards catalog with image support, atomic checkouts, and admin fulfillment queue.
- **Notifications & Observability:** Real-time in-app bell, email dispatch, BullMQ queue, retry engine, and delivery observability dashboard.
- **AI Integration:** Automated task breakdown and squad momentum insights.
