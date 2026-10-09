// DB inspection script for KAI Aura audit
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function audit() {
  const client = await pool.connect();
  try {
    // 1. List all tables
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' ORDER BY table_name
    `);
    console.log('\n=== TABLES IN DATABASE ===');
    tables.rows.forEach(r => console.log(' -', r.table_name));

    // 2. Row counts
    console.log('\n=== ROW COUNTS ===');
    const tableNames = tables.rows.map(r => r.table_name);
    for (const t of tableNames) {
      const count = await client.query(`SELECT COUNT(*) FROM "${t}"`);
      console.log(` ${t}: ${count.rows[0].count} rows`);
    }

    // 3. Users and their roles
    console.log('\n=== USERS AND ROLES ===');
    const users = await client.query(`
      SELECT u.id, u.email, u.name, u.status, u."employeeId",
             array_agg(r.name) as roles
      FROM "User" u
      LEFT JOIN "UserRole" ur ON ur."userId" = u.id
      LEFT JOIN "Role" r ON r.id = ur."roleId"
      GROUP BY u.id, u.email, u.name, u.status, u."employeeId"
      ORDER BY u."createdAt"
    `);
    users.rows.forEach(u => console.log(` User: ${u.email} | roles: ${u.roles} | status: ${u.status}`));

    // 4. Roles in DB
    console.log('\n=== ROLES IN DB ===');
    const roles = await client.query('SELECT id, name FROM "Role"');
    roles.rows.forEach(r => console.log(` ${r.name} (${r.id})`));

    // 5. AuraTransactions
    console.log('\n=== AURA TRANSACTIONS (last 10) ===');
    const txns = await client.query(`
      SELECT at.id, at.type, at.amount, at.description, at."createdAt", u.email
      FROM "AuraTransaction" at
      JOIN "User" u ON u.id = at."userId"
      ORDER BY at."createdAt" DESC LIMIT 10
    `);
    txns.rows.forEach(t => console.log(` [${t.type}] ${t.amount} | ${t.email} | ${t.description} | ${t.createdAt}`));

    // 6. Aura balance per user (ledger calculation)
    console.log('\n=== AURA BALANCES (SUM from ledger) ===');
    const balances = await client.query(`
      SELECT u.email, u.name, SUM(at.amount)::int as balance
      FROM "User" u
      LEFT JOIN "AuraTransaction" at ON at."userId" = u.id
      GROUP BY u.id, u.email, u.name
    `);
    balances.rows.forEach(b => console.log(` ${b.email}: ${b.balance ?? 0} Aura`));

    // 7. Tasks
    console.log('\n=== TASKS ===');
    const tasks = await client.query(`
      SELECT t.id, t.title, t.status, t."baseAura", u.email as creator
      FROM "Task" t
      JOIN "User" u ON u.id = t."createdById"
      ORDER BY t."createdAt" DESC
    `);
    tasks.rows.forEach(t => console.log(` [${t.status}] ${t.title} | ${t.baseAura} Aura | by ${t.creator}`));

    // 8. Task Assignments
    console.log('\n=== TASK ASSIGNMENTS ===');
    const assignments = await client.query(`
      SELECT ta.id, ta.status, t.title, u.email as assignee
      FROM "TaskAssignment" ta
      JOIN "Task" t ON t.id = ta."taskId"
      JOIN "User" u ON u.id = ta."userId"
      ORDER BY ta."assignedAt" DESC
    `);
    assignments.rows.forEach(a => console.log(` [${a.status}] Task: "${a.title}" -> ${a.assignee}`));

    // 9. Task Submissions
    console.log('\n=== TASK SUBMISSIONS ===');
    const subs = await client.query(`
      SELECT ts.id, ts."submittedAt", u.email as submitter, ta.status as assignment_status
      FROM "TaskSubmission" ts
      JOIN "TaskAssignment" ta ON ta.id = ts."assignmentId"
      JOIN "User" u ON u.id = ts."submittedById"
      ORDER BY ts."submittedAt" DESC
    `);
    subs.rows.forEach(s => console.log(` Submission by ${s.submitter} | assignment_status: ${s.assignment_status}`));

    // 10. Redemptions
    console.log('\n=== REDEMPTIONS ===');
    const redemptions = await client.query(`
      SELECT r.id, r."auraCost", r.status, r."redeemedAt", u.email, si.name as item
      FROM "Redemption" r
      JOIN "User" u ON u.id = r."userId"
      JOIN "StoreItem" si ON si.id = r."storeItemId"
      ORDER BY r."redeemedAt" DESC
    `);
    if (redemptions.rows.length === 0) console.log(' No redemptions recorded');
    redemptions.rows.forEach(r => console.log(` [${r.status}] ${r.item} | ${r.auraCost} Aura | ${r.email}`));

    // 11. Store Items
    console.log('\n=== STORE ITEMS ===');
    const items = await client.query('SELECT id, name, "basePrice", stock, status FROM "StoreItem"');
    if (items.rows.length === 0) console.log(' No store items in DB');
    items.rows.forEach(i => console.log(` ${i.name} | ${i.basePrice} Aura | stock: ${i.stock} | ${i.status}`));

    // 12. Batches
    console.log('\n=== BATCHES ===');
    const batches = await client.query('SELECT id, name, year, status FROM "Batch"');
    batches.rows.forEach(b => console.log(` ${b.name} | ${b.year} | ${b.status}`));

    console.log('\n=== AUDIT COMPLETE ===');
  } finally {
    client.release();
    await pool.end();
  }
}

audit().catch(console.error);
