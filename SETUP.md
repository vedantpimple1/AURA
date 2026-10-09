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

## 4. Running the Application

Start the Next.js development server:
```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

### Logging In
After running the seed script, you can log into the application using the default System Admin account:
- **Email:** `admin@kaiaura.com`
- **Password:** `admin123`

---

## 5. Current Features (Up to Phase 05)
- **Authentication:** Edge middleware-protected routes using JWT cookies.
- **RBAC (Role-Based Access Control):** Differentiated views for `Member`, `Admin`, and `Superadmin`.
- **User Management:** Admins can dynamically add new users to the database directly from the "Members" UI.
- **Aura Ledger:** A strict, append-only financial ledger tracking Aura points.
- **Points Awarding:** Admins can manually award Aura to users via the "Award Aura" modal.
- **Store Redemptions:** Users can spend Aura in the Store, resulting in negative ledger transactions.
- **Transaction History:** A fully dynamic receipt ledger tracking all points earned and spent.
