# Aura V1 — Product Requirements Document

## 1. Product overview

Aura is an internal, responsive web application for a team of approximately 25 people. It is a gamification platform where members earn Aura points through approved tasks and contributions, participate in team activities, view achievements, and redeem Aura in an internal store.

This document is the source of truth for Aura V1. Features outside the requirements in this document are out of scope for V1.

## 2. Product goals

- Provide a clear, engaging way to recognize completed work and team contributions.
- Make task completion and review auditable before Aura is awarded.
- Give team members transparent access to their Aura, progress, history, and available rewards.
- Give administrators the tools to operate the platform and understand team engagement.

## 3. Experience principles

- Modern, minimalistic, attractive, interactive, and professional while retaining a fun, gamified feel.
- Avoid the appearance of a traditional enterprise or HR application.
- Work beautifully on desktop and mobile through responsive web design.
- Use a sidebar for desktop navigation and bottom navigation for mobile navigation.
- Use subtle animations and visual feedback for achievements, Aura awards, badges, and redemptions.

## 4. Roles and permissions

### Superadmin

Superadmins have full system access. They can:

- Approve or reject new users.
- Manage users and roles.
- Create and manage tasks.
- Review tasks.
- Award Aura at their discretion.
- Manage store products and redemptions.
- Manage badges.
- Activate and manage Tag Teams.
- View team analytics.

### Admin

Admins can:

- Approve or reject new users.
- Create and manage tasks.
- Review tasks.
- Manage store products and redemptions.
- View team analytics.
- Be assigned as a task reviewer.

### Member

Members can:

- Participate in tasks.
- Submit completed tasks for review.
- View their own Aura and Aura transaction history.
- View badges.
- View the monthly leaderboard.
- View the Aura Wall.
- Give Kudos.
- Redeem products from the Aura Store.
- View their own profile.

### Task-specific member reviewer

A member may be assigned as the reviewer for specific task(s). This grants permission to review only the assigned task(s); it does not grant Admin permissions.

## 5. Authentication and user approval

- Users can sign up.
- Newly registered users receive a **Pending** status.
- Pending users cannot use the application until approved.
- An Admin or Superadmin can approve or reject a new user.
- A role is assigned to the user.

## 6. Tasks

### Task types

Aura supports two primary task types:

1. **General task** — no timeline or deadline; can be completed at any time.
2. **Time-bound task** — weekly or monthly.

### Task details

Each task can contain:

- Task name.
- Brief description.
- Detailed instructions.
- Category.
- Aura points.
- Timeline or deadline where applicable.
- Assigned members.
- Reviewer.
- Reference documents/files.
- Reference links.

Every task must have a reviewer. A reviewer can be a Superadmin, an Admin, or a specifically assigned Member reviewer.

### Task workflow

The standard workflow is:

```text
Not Started → In Progress → Submitted for Review → Completed
```

If changes are required:

```text
Submitted for Review → Needs Changes → In Progress → Submitted for Review
```

Members must explicitly select **Submit for Review** when their work is complete. The reviewer receives the submission in a Review Portal or Review tab and can:

- Approve / mark the task completed.
- Reject / send the task back.
- Add comments.

### Completion effects

Aura is awarded only after a successful review. On successful review:

1. The task becomes **Completed**.
2. Aura is awarded.
3. An Aura transaction is created.
4. Badge progress is updated.
5. The monthly leaderboard is updated.
6. An activity is posted to the Aura Wall.

## 7. Aura and transaction ledger

Aura must be maintained through a transaction ledger. A user’s Aura balance must never be modified directly without creating a transaction.

Track the following values:

- Lifetime Aura earned.
- Lifetime Aura spent.
- Available Aura.
- Current month’s Aura.

```text
Available Aura = Lifetime Aura earned − Lifetime Aura spent
```

Each Aura transaction must include:

- User.
- Points.
- Whether the points were earned or spent.
- Transaction type.
- Reason or description.
- Source or reference.
- Date and time.
- Created by, where applicable.

Additional rules:

- A Superadmin can award discretionary Aura.
- Corrections and reversals create a new transaction; historical transactions must not be silently changed.
- Aura earned from an approved task creates a transaction and updates related badge, leaderboard, and activity data.

## 8. Badges

- Badges are based on cumulative lifetime Aura.
- Badge thresholds must be configurable.
- The user interface must show the current badge, lifetime Aura, and progress toward the next badge.

## 9. Monthly leaderboard

- The main leaderboard is monthly.
- Each month begins with zero leaderboard Aura.
- Only Aura earned during the current month contributes to the current monthly leaderboard.
- Lifetime Aura does not reset.
- Previous months must remain available as historical leaderboard data.

## 10. Aura Store and redemptions

### Store catalog

All active products appear in a single store. Aura-based product tiers must not be created.

The store can include both physical products and configurable non-physical privilege/pass rewards, including WFH Pass, Early Leave Pass, and other pass rewards.

Admins and Superadmins can add and manage products. Each product supports:

- Product name.
- Description.
- Image.
- Aura price.
- Available stock.
- Active or inactive status.
- Redemption rule.

### Redemption rules

The supported redemption rules are:

- Once per user.
- Multiple times per user, with an optional per-user limit.

A member can redeem any product when they have enough available Aura and satisfy its redemption rules. The system must prevent:

- Redemption with insufficient Aura.
- Redemption beyond available product stock.
- Redemption beyond configured per-user limits.

The system must maintain redemption history.

### Redemption management and lifecycle

Admins and Superadmins must be able to view each redemption’s product, member, Aura cost, date/time, and redemption status. Physical-product redemptions follow this lifecycle:

```text
Requested → Approved → Received
```

**Received** means that the physical product has actually been handed to the member. Admins and Superadmins can update an approved physical-product redemption to Received. Members can view the status of their own redemptions.

### Pass rewards and approvals

Pass rewards are redeemed through the same store but require Admin or Superadmin approval:

```text
Member redeems pass → Aura deducted / redemption created → Pending Approval → Approved
```

An Admin or Superadmin can reject a pass request when appropriate.

### Progressive pass pricing

Each pass product supports a configurable base price and increment per successive redemption. A user’s next price is calculated from the number of their previous successfully approved/valid redemptions of that specific pass product.

- Counts are per user and per product; one pass product does not affect another.
- Rejected or cancelled requests do not increase the count.
- Only approved/valid redemptions affect the next price.
- The member’s current next price and previous redemption count must be displayed before redemption.

For example, a WFH Pass with a base price of 1,000 Aura and an increment of 500 Aura costs 1,000 Aura for the first approved redemption, 1,500 for the second, 2,000 for the third, and so on.

### Aura denomination

Aura values should generally be configured and displayed in attractive multiples of 1,000 (for example, 1,000, 2,000, 5,000, 10,000, and 25,000 Aura). Aura should feel like a points currency rather than a small financial balance.

## 11. Aura Wall and Kudos

Aura includes a team-wide activity wall. It should show meaningful activity, including:

- Task completed.
- Aura earned.
- Badge unlocked.
- Other achievements.

Members can give Kudos to other members. Kudos do not award Aura.

## 12. Tag Team

Tag Team is an optional weekly competition controlled by Admins and Superadmins. They can:

- Activate Tag Team.
- Select the active period or week.
- Select eligible members.
- Randomly generate pairs.
- Preview pairs.
- Regenerate pairs before activation.
- Activate the competition.
- View the Tag Team leaderboard.

Only Aura earned during the selected Tag Team period counts toward Tag Team scoring. The Aura earned by both members of a pair during that period is added together for the pair’s score.

Tag Team points do not create additional Aura and do not change a member’s normal Aura balance.

## 13. Admin analytics

Admins and Superadmins can track team engagement. Per member, show:

- Last login.
- Last task completed.
- Number of tasks completed.
- Current month Aura.
- Lifetime Aura.
- Aura spent.
- Available Aura.

Analytics must include useful filters and summaries.

## 14. Auditability

Important Aura and administrative actions must be auditable. Aura history must not be silently modified.

## 15. Notifications architecture

The architecture must allow notifications for:

- Task assigned.
- Task submitted for review.
- Task approved or rejected.
- Aura awarded.
- Badge unlocked.
- Store redemption.
- Tag Team activation.

## 16. V1 scope boundary

Do not implement unnecessary features outside the requirements in this document for V1.
