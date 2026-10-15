# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are internal corporate team members and organizational administrators:
- **Members**: Complete assigned tasks, submit proof of work, exchange peer kudos, build streaks, track rank on monthly/lifetime leaderboards, and redeem earned Aura in the rewards store.
- **Admins & Superadmins**: Create and assign work, review submissions, moderate the store catalog, track inventory and redemptions, and view team analytics.

## Product Purpose

KAI Aura is an employee gamification, productivity, and social recognition platform. It transforms day-to-day organizational execution into transparent, rewarding milestones while offering a company merchandise and perks redemption store.

## Positioning

Unlike basic point-reward apps with single mutable balances, KAI Aura runs on an immutable financial-grade append-only ledger. Point redemption in the store deducts only from spendable wallet balance while preserving lifetime achievement and monthly leaderboard ranks, ensuring employees never suffer status penalties for enjoying their earned rewards.

## Operating Context

- Web-first responsive application accessible across desktop monitors and mobile devices.
- High-trust corporate environment featuring real-time email & in-app notification dispatchers, worker queues, and audit logs.
- Daily rituals: checking task assignments, reviewing pending queues, recognizing peers on the social Kudos wall, and monitoring monthly competitive leaderboards.

## Capabilities and Constraints

- **Role-Based Access Control (RBAC)**: Strict segregation among `MEMBER`, `ADMIN`, and `SUPERADMIN` roles.
- **Aura Ledger**: Append-only ledger (`AuraTransaction`). Spendable balance is calculated dynamically via `SUM(amount)`.
- **Store Redemptions**: Atomic ACID transactions checking item stock, user per-item quotas (`maxPerUser`), and spendable balance before generating pending fulfillment requests.
- **Task Workflow**: Full lifecycle: Assignment → Submission → Review & Approval → Automated Aura reward and notification dispatch.
- **Social Recognition**: Peer-to-peer Kudos with capped point transfers and celebratory notifications.

## Brand Commitments

- **Tone & Identity**: Energetic, polished, modern, and motivating without feeling childish or gimmicky.
- **Visual Baseline**: Deep dark modes, warm amber/orange aura accents, clean card layouts, crisp typography, and responsive micro-interactions.

## Evidence on Hand

- Production Next.js 16 + React 19 app with Tailwind CSS and Radix UI components.
- Postgres database with Prisma ORM containing users, roles, ledger transactions, store catalog, and audit logs.
- Role-wise functionality audit and acceptance criteria specifications documented in `docs/requirements-audit/`.

## Product Principles

1. **Effort is Never Erased**: Redeeming perks must never lower a member's leaderboard standing or lifetime prestige.
2. **Clarity Over Clutter**: Dashboard surfaces should communicate current priorities (tasks due, pending approvals, wallet balance) at a glance.
3. **Integrity & Auditability**: Every point awarded, deducted, or adjusted must trace back to an authorized actor and verifiable source.
4. **Delight in Routine**: Micro-interactions, celebratory feedback, and tactile states should make daily administrative tasks enjoyable.
