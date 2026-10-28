import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const requiresSsl = connectionString?.includes('render.com') || connectionString?.includes('sslmode=require');
const pool = new Pool({
  connectionString,
  ...(requiresSsl ? { ssl: { rejectUnauthorized: false } } : {}),
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding Database...');

  // Create Roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN' },
  });

  const superAdminRole = await prisma.role.upsert({
    where: { name: 'SUPERADMIN' },
    update: {},
    create: { name: 'SUPERADMIN' },
  });

  const userRole = await prisma.role.upsert({
    where: { name: 'USER' },
    update: {},
    create: { name: 'USER' },
  });

  const recoveryRole = await prisma.role.upsert({
    where: { name: 'RECOVERY_OPERATOR' },
    update: {},
    create: { name: 'RECOVERY_OPERATOR' },
  });

  const resetPermission = await prisma.permission.upsert({
    where: { name: 'PASSWORD_RESET_REQUEST_MANAGE' },
    update: {},
    create: { name: 'PASSWORD_RESET_REQUEST_MANAGE' },
  });

  await prisma.rolePermission.upsert({
    where: {
      roleId_permissionId: {
        roleId: recoveryRole.id,
        permissionId: resetPermission.id,
      },
    },
    update: {},
    create: {
      roleId: recoveryRole.id,
      permissionId: resetPermission.id,
    },
  });

  console.log(`Roles ensured: ${adminRole.name}, ${superAdminRole.name}, ${userRole.name}, ${recoveryRole.name}`);
  console.log(`Permissions ensured: ${resetPermission.name}`);

  // Create Superadmin User
  const superAdminEmail = 'superadmin@kaiaura.com';
  const rawSuperPassword = process.env.SUPERADMIN_DEFAULT_PASSWORD || 'superadmin123';
  const hashedSuperPassword = await bcrypt.hash(rawSuperPassword, 10);

  const superadmin = await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {},
    create: {
      email: superAdminEmail,
      employeeId: 'EMP000',
      name: 'Chief Superadmin',
      passwordHash: hashedSuperPassword,
      status: 'ACTIVE',
      roles: {
        create: [
          { roleId: superAdminRole.id },
          { roleId: adminRole.id },
        ],
      },
    },
  });

  console.log(`Superadmin user ensured: ${superadmin.email}`);

  // Create Admin User
  const adminEmail = 'admin@kaiaura.com';
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      employeeId: 'EMP001',
      name: 'System Admin',
      passwordHash: hashedPassword,
      status: 'ACTIVE',
      roles: {
        create: {
          roleId: adminRole.id,
        }
      }
    },
  });

  console.log(`Admin user ensured: ${admin.email}`);

  // Create Default Member User
  const memberEmail = 'member@kaiaura.com';
  const hashedMemberPassword = await bcrypt.hash('changeme123', 10);

  const member = await prisma.user.upsert({
    where: { email: memberEmail },
    update: {},
    create: {
      email: memberEmail,
      employeeId: 'EMP002',
      name: 'Aarav Sharma',
      passwordHash: hashedMemberPassword,
      status: 'ACTIVE',
      roles: {
        create: {
          roleId: userRole.id,
        }
      }
    },
  });

  console.log(`Member user ensured: ${member.email}`);

  // Create Designated Recovery Operator User
  // Assign RECOVERY_OPERATOR role to Admin user
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: admin.id,
        roleId: recoveryRole.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      roleId: recoveryRole.id,
    },
  });

  console.log(`Recovery operator role ensured on: ${admin.email}`);
  const batch = await prisma.batch.upsert({
    where: { id: 'test-batch-1' },
    update: {},
    create: {
      id: 'test-batch-1',
      name: 'Batch 1 2026',
      year: 2026,
      startDate: new Date(),
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      status: 'ACTIVE'
    }
  });

  console.log(`Batch ensured: ${batch.name}`);

  // Seed default Store Items if none exist
  const storeCount = await prisma.storeItem.count();
  if (storeCount === 0) {
    const defaultItems = [
      { name: 'Laptop Stand', description: 'Ergonomic aluminum laptop stand for focused work posture.', basePrice: 5000, stock: 8, category: 'Hardware', maxPerUser: 1 },
      { name: 'Wireless Mouse', description: 'Precision ergonomic wireless mouse.', basePrice: 4000, stock: 12, category: 'Hardware', maxPerUser: 1 },
      { name: 'Coffee Mug', description: 'Double-walled ceramic KAI Aura branded team mug.', basePrice: 2000, stock: 24, category: 'Merch', maxPerUser: 3 },
      { name: 'Mobile Stand', description: 'Minimalist desktop stand for smartphone and tablet.', basePrice: 3000, stock: 16, category: 'Accessories', maxPerUser: 1 },
      { name: 'WFH Pass', description: 'Flexible work-from-home day pass.', basePrice: 1500, stock: 50, category: 'Perks', maxPerUser: 4 },
      { name: 'Early Leave Pass', description: 'Friday early leave pass (2 hours).', basePrice: 2000, stock: 30, category: 'Perks', maxPerUser: 2 },
    ];
    for (const item of defaultItems) {
      await prisma.storeItem.create({ data: item });
    }
    console.log(`Seeded ${defaultItems.length} default store items.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
