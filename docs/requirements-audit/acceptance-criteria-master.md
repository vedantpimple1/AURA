# Master Acceptance Criteria

## MEMBER

### 1. Home
- **AC-MEM-001**: Given a logged-in member, when viewing the Home dashboard, then they should see their current Aura balance, badge progress, and a list of recently assigned tasks. Priority: Must Have. Status: IMPLEMENTED - VERIFIED. Evidence: `aura-app.tsx` `MemberHome`.

### 2. Tasks
- **AC-MEM-002**: Given a member with assigned tasks, when navigating to the Tasks section, then they should see all their tasks with statuses (Not Started, In Progress, Submitted, Completed). Priority: Must Have. Status: IMPLEMENTED - VERIFIED. Evidence: `aura-app.tsx` `Tasks`.
- **AC-MEM-003**: Given an active task, when a member submits a task with content, then the task status should update to SUBMITTED and appear in the review queue. Priority: Must Have. Status: IMPLEMENTED - VERIFIED. Evidence: `task.actions.ts`.

### 3. Leaderboard
- **AC-MEM-004**: Given active members, when viewing the Leaderboard, then members should be ranked descending by Aura points. Priority: Should Have. Status: IMPLEMENTED - VERIFIED. Evidence: `aura-app.tsx` `Leaderboard`.

### 4. Aura Wall
- **AC-MEM-005**: Given an active member, when they send Kudos to another member, then the recipient should receive +10 Aura and the message should be pinned to the Aura Wall. Priority: Must Have. Status: IMPLEMENTED - VERIFIED. Evidence: `team.actions.ts` `sendKudosAction`.

### 5. Store
- **AC-MEM-006**: Given a member with sufficient Aura, when they redeem an active store product, then their Aura balance is deducted, and a PENDING redemption is created. Priority: Must Have. Status: IMPLEMENTED - VERIFIED. Evidence: `store.actions.ts` `redeemStoreItemAction`.

### 6. Aura History
- **AC-MEM-007**: Given a member with transactions, when viewing Aura History, then they should see an accurate ledger of all Aura earned and spent. Priority: Must Have. Status: IMPLEMENTED - VERIFIED. Evidence: `aura-app.tsx` `History`.

### 7. Profile
- **AC-MEM-008**: Given an active member, when viewing Profile, then they should see their lifetime Aura and current available balance. Priority: Should Have. Status: IMPLEMENTED - VERIFIED. Evidence: `aura-app.tsx` `Profile`.

### 8. Settings
- **AC-MEM-009**: Given a logged-in member, when they toggle In-App or Email notifications, then their preference is saved and applied to future notifications. Priority: Must Have. Status: IMPLEMENTED - VERIFIED. Evidence: `notification.actions.ts`.

---

## ADMIN

### 1. Dashboard
- **AC-ADM-001**: Given an Admin, when viewing the Dashboard, then they see team-wide metrics (Aura issued, completed tasks, redemptions). Priority: Must Have. Status: IMPLEMENTED - VERIFIED. Evidence: `aura-app.tsx` `AdminHome`.

### 2. Tasks
- **AC-ADM-002**: Given an Admin, when creating a task, then they can use the AI assistant to generate titles and deliverables. Priority: Should Have. Status: IMPLEMENTED - VERIFIED. Evidence: `ai.actions.ts`.

### 3. Reviews
- **AC-ADM-003**: Given a submitted task, when an Admin approves it, then the member is awarded the base Aura and the task is COMPLETED. Priority: Must Have. Status: IMPLEMENTED - VERIFIED. Evidence: `task.actions.ts` `reviewTaskAction`.

### 4. Members
- **AC-ADM-004**: Given an Admin, when viewing Members, then they can invite a new member and assign them to a Tag Team. Priority: Must Have. Status: IMPLEMENTED - VERIFIED. Evidence: `user.actions.ts`.

### 5. Leaderboard
- **AC-ADM-005**: Same as AC-MEM-004. Priority: Should Have. Status: IMPLEMENTED - VERIFIED.

### 6. Aura Wall
- **AC-ADM-006**: Same as AC-MEM-005. Priority: Must Have. Status: IMPLEMENTED - VERIFIED.

### 7. Store
- **AC-ADM-007**: Given an Admin, when adding a product, then they can optionally provide an external image URL. Priority: Must Have. Status: IMPLEMENTED - VERIFIED. Evidence: `store.actions.ts`.
- **AC-ADM-008**: Given a PENDING redemption request, when an Admin fulfills it, then the status updates to FULFILLED. Priority: Must Have. Status: IMPLEMENTED - VERIFIED. Evidence: `store.actions.ts`.

### 8. Tag Teams
- **AC-ADM-009**: Given an Admin, when navigating to Tag Teams, then they can create a team and view AI Momentum Insights. Priority: Should Have. Status: IMPLEMENTED - VERIFIED. Evidence: `aura-app.tsx` `TagTeams`.

### 9. Analytics
- **AC-ADM-010**: Given an Admin, when viewing Analytics, then they see active members, completion rates, and individual member metrics. Priority: Must Have. Status: IMPLEMENTED - VERIFIED. Evidence: `analytics.actions.ts`.

### 10. Audit Log
- **AC-ADM-011**: Given an Admin, when viewing the Audit Log, then they see a chronological history of administrative actions. Priority: Must Have. Status: IMPLEMENTED - VERIFIED. Evidence: `audit.actions.ts`.

### 11. Deliveries
- **AC-ADM-012**: Given an Admin, when viewing Deliveries, they can see real-time email delivery queue metrics and retry failed deliveries. Priority: Must Have. Status: IMPLEMENTED - VERIFIED. Evidence: `observability.actions.ts`.

### 12. Settings
- **AC-ADM-013**: Given an Admin, when accessing Settings, they can configure their own notification preferences. Priority: Must Have. Status: IMPLEMENTED - VERIFIED. Evidence: `aura-app.tsx` `SettingsPage`.

---

## SUPERADMIN

### 1. Dashboard
- **AC-SAD-001**: Given a Superadmin, when clicking 'Award Aura', then they can manually grant a discretionary Aura amount to any user. Priority: Must Have. Status: IMPLEMENTED - VERIFIED. Evidence: `aura.actions.ts`.

### 2-11
- **AC-SAD-002 to AC-SAD-011**: Same as Admin criteria.

### 12. Settings
- **AC-SAD-012**: Given a Superadmin, when accessing Settings, they can manually trigger the Streak Reminder, Review Digest, and Email Worker background jobs. Priority: Must Have. Status: IMPLEMENTED - VERIFIED. Evidence: `notification.actions.ts`.
