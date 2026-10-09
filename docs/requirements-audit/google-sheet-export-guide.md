# Google Sheet Export & Formatting Guide

## Objective
The purpose of this guide is to instruct Business Analysts or QA Leads on how to accurately transfer the Markdown documentation generated during the KAI Aura Audit into a formatted Google Sheet for UAT sign-off.

## 1. Document Structure Preparation
1. Create a new Google Sheet named **KAI Aura - UAT Role Sign-Off**.
2. Create exactly three tabs at the bottom:
   - **Member**
   - **Admin**
   - **Superadmin**

## 2. Column Structure
For each of the three tabs, setup the following header columns (row 1). Freeze the top row so it remains visible while scrolling.

- **A:** Sidebar Section (e.g., Home, Tasks, Store)
- **B:** Feature / Capability
- **C:** Acceptance Criteria ID (e.g., AC-MEM-001)
- **D:** Acceptance Criteria Description
- **E:** UAT Test Case ID (e.g., UAT-MEM-001)
- **F:** UAT Test Steps
- **G:** Expected Result
- **H:** Actual Result (Leave blank)
- **I:** Execution Status (Drop-down: Pass, Fail, Not Run)
- **J:** Developer Notes / Traceability (e.g., `aura-app.tsx`)

## 3. Data Transfer
- Open `acceptance-criteria-master.md`.
- Open `uat-test-cases-master.md`.
- Open `requirements-traceability-matrix.md`.
- Copy each item from the Markdown files into the corresponding row in the appropriate Role tab. Ensure that ACs and UATs map 1:1 on the same row.

## 4. Suggested Formatting
- **Headers:** Bold text, gray background color, frozen row.
- **Text Wrapping:** Set columns D (AC Description), F (Test Steps), and G (Expected Result) to Wrap Text to ensure large paragraphs are readable.
- **Data Validation (Column I):** Highlight Column I starting from row 2. Go to `Data > Data validation`. Create a dropdown list with three items: `Pass` (Green), `Fail` (Red), `Not Run` (Gray).

## 5. Maintenance
This sheet will now serve as the single source of truth during User Acceptance Testing. Any bugs discovered should be tracked against the specific UAT Test Case ID in Jira/Linear and referenced back to the `Actual Result` column.
