# Master UAT Test Cases

## MEMBER

### 1. Home
- **UAT-MEM-001**: Verify Member Dashboard Loading
  - AC ID: AC-MEM-001
  - Preconditions: Logged in as MEMBER.
  - Test Data: None.
  - Steps: 1. Navigate to Home. 2. Verify Aura balance matches expected. 3. Verify badge progress renders.
  - Expected Result: Dashboard loads without errors and displays correct Aura totals.
  - Actual Result: Not Executed
  - Execution Status: Not Run

### 2. Tasks
- **UAT-MEM-002**: Submit Assigned Task
  - AC ID: AC-MEM-002, AC-MEM-003
  - Preconditions: Logged in as MEMBER with an ASSIGNED task.
  - Test Data: Task content input.
  - Steps: 1. Go to Tasks. 2. Open task. 3. Enter submission content. 4. Click Submit.
  - Expected Result: Task transitions to SUBMITTED state.
  - Actual Result: Not Executed
  - Execution Status: Not Run

### 3. Leaderboard
- **UAT-MEM-003**: View Top Rank
  - AC ID: AC-MEM-004
  - Preconditions: System contains members with varying Aura points.
  - Steps: 1. Go to Leaderboard. 2. Validate top 3 members are ordered by Aura descending.
  - Expected Result: Correct descending order.
  - Actual Result: Not Executed
  - Execution Status: Not Run

### 4. Aura Wall
- **UAT-MEM-004**: Send Kudos
  - AC ID: AC-MEM-005
  - Preconditions: MEMBER logged in.
  - Steps: 1. Click Send Kudos. 2. Select teammate. 3. Enter message. 4. Submit.
  - Expected Result: Wall displays message, and +10 Aura is applied.
  - Actual Result: Not Executed
  - Execution Status: Not Run

### 5. Store
- **UAT-MEM-005**: Redeem Store Item
  - AC ID: AC-MEM-006
  - Preconditions: MEMBER has 100+ Aura. Active store item costs 50 Aura.
  - Steps: 1. Navigate to Store. 2. Click Redeem on item. 3. Check "My Redemptions".
  - Expected Result: Aura deducted by 50, item listed as PENDING fulfillment.
  - Actual Result: Not Executed
  - Execution Status: Not Run

### 6. Aura History
- **UAT-MEM-006**: View Ledger
  - AC ID: AC-MEM-007
  - Preconditions: MEMBER has executed UAT-MEM-004 and UAT-MEM-005.
  - Steps: 1. Go to Aura History.
  - Expected Result: Records for Kudos and Redemption are present with correct amounts.
  - Actual Result: Not Executed
  - Execution Status: Not Run

### 7. Profile
- **UAT-MEM-007**: View Profile Metrics
  - AC ID: AC-MEM-008
  - Preconditions: MEMBER logged in.
  - Steps: 1. Navigate to Profile.
  - Expected Result: Lifetime and available Aura correctly reflect transactions.
  - Actual Result: Not Executed
  - Execution Status: Not Run

### 8. Settings
- **UAT-MEM-008**: Update Notification Preferences
  - AC ID: AC-MEM-009
  - Preconditions: MEMBER logged in.
  - Steps: 1. Go to Settings. 2. Toggle Email for Task Assigned off. 3. Refresh.
  - Expected Result: Toggle remains off persistently.
  - Actual Result: Not Executed
  - Execution Status: Not Run

---

## ADMIN

### 1. Dashboard
- **UAT-ADM-001**: Verify Admin Metrics
  - AC ID: AC-ADM-001
  - Preconditions: ADMIN logged in.
  - Steps: 1. Navigate to Dashboard.
  - Expected Result: Metric cards render correctly and calculate team totals.
  - Actual Result: Not Executed
  - Execution Status: Not Run

### 2. Tasks
- **UAT-ADM-002**: AI Task Breakdown
  - AC ID: AC-ADM-002
  - Preconditions: ADMIN logged in.
  - Steps: 1. Click Create Task. 2. Enter "Setup database" in AI assistant. 3. Generate.
  - Expected Result: Title, description, and base Aura auto-populate.
  - Actual Result: Not Executed
  - Execution Status: Not Run

### 3. Reviews
- **UAT-ADM-003**: Approve Task
  - AC ID: AC-ADM-003
  - Preconditions: Task in SUBMITTED state.
  - Steps: 1. Go to Reviews. 2. Click Approve.
  - Expected Result: Task disappears from queue, member awarded Aura.
  - Actual Result: Not Executed
  - Execution Status: Not Run

### 4. Members
- **UAT-ADM-004**: Add Member
  - AC ID: AC-ADM-004
  - Preconditions: ADMIN logged in.
  - Steps: 1. Go to Members. 2. Click Invite. 3. Enter details and assign role. 4. Submit.
  - Expected Result: Member appears in table list.
  - Actual Result: Not Executed
  - Execution Status: Not Run

### 7. Store
- **UAT-ADM-005**: Add Image Product
  - AC ID: AC-ADM-007
  - Preconditions: ADMIN logged in.
  - Steps: 1. Go to Store. 2. Click Add Product. 3. Enter valid image URL. 4. Submit.
  - Expected Result: Product renders in Catalog with the specified image.
  - Actual Result: Not Executed
  - Execution Status: Not Run

### 8. Tag Teams
- **UAT-ADM-006**: View AI Insights
  - AC ID: AC-ADM-009
  - Preconditions: Tag Teams exist.
  - Steps: 1. Go to Tag Teams.
  - Expected Result: AI insights banner renders with current team mood.
  - Actual Result: Not Executed
  - Execution Status: Not Run

### 11. Deliveries
- **UAT-ADM-007**: Retry Failed Delivery
  - AC ID: AC-ADM-012
  - Preconditions: A FAILED email delivery exists.
  - Steps: 1. Go to Deliveries. 2. Filter by Failed. 3. Open Detail. 4. Click Retry.
  - Expected Result: State reverts to PENDING.
  - Actual Result: Not Executed
  - Execution Status: Not Run

---

## SUPERADMIN

### 1. Dashboard
- **UAT-SAD-001**: Manual Aura Award
  - AC ID: AC-SAD-001
  - Preconditions: SUPERADMIN logged in.
  - Steps: 1. Click Award Aura. 2. Select Member. 3. Enter 500 Aura. 4. Submit.
  - Expected Result: 500 Aura credited to Member ledger, notification dispatched.
  - Actual Result: Not Executed
  - Execution Status: Not Run

### 12. Settings
- **UAT-SAD-002**: Trigger Background Workers
  - AC ID: AC-SAD-012
  - Preconditions: SUPERADMIN logged in.
  - Steps: 1. Go to Settings. 2. Click Trigger on Email Worker.
  - Expected Result: Worker executes and returns success toast.
  - Actual Result: Not Executed
  - Execution Status: Not Run
