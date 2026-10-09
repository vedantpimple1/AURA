# Requirements Traceability Matrix

| Component / File | Rationale | Role | AC Reference | UAT Reference |
| :--- | :--- | :--- | :--- | :--- |
| `aura-app.tsx` `MemberHome` | Validates Member dashboard UI | Member | AC-MEM-001 | UAT-MEM-001 |
| `aura-app.tsx` `AdminHome` | Validates Admin dashboard UI | Admin/Superadmin | AC-ADM-001 | UAT-ADM-001 |
| `task.actions.ts` | Validates task submission/review | All | AC-MEM-003, AC-ADM-003 | UAT-MEM-002, UAT-ADM-003 |
| `store.actions.ts` | Validates store CRUD and redemptions | All | AC-MEM-006, AC-ADM-007, AC-ADM-008 | UAT-MEM-005, UAT-ADM-005 |
| `team.actions.ts` `sendKudosAction` | Validates Kudos mechanic | All | AC-MEM-005, AC-ADM-006 | UAT-MEM-004 |
| `notification.actions.ts` | Validates notification preferences | All | AC-MEM-009, AC-ADM-013 | UAT-MEM-008 |
| `observability.actions.ts` | Validates delivery metrics | Admin/Superadmin | AC-ADM-012 | UAT-ADM-007 |
| `aura.actions.ts` `awardAuraAction` | Validates manual Aura award | Superadmin | AC-SAD-001 | UAT-SAD-001 |
| `ai.actions.ts` | Validates AI task breakdown | Admin/Superadmin | AC-ADM-002 | UAT-ADM-002 |
