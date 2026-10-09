import { prisma } from '../src/lib/prisma';

async function main() {
  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      deliveries: true
    }
  });

  console.log("Recent notifications:");
  for (const n of notifications) {
    console.log(`- [${n.type}] ${n.title} (ReadAt: ${n.readAt})`);
    for (const d of n.deliveries) {
      console.log(`  -> Delivery: ${d.status} (Channel: ${d.channel}) [Err: ${d.errorDetails}]`);
    }
  }

  const transactions = await prisma.auraTransaction.findMany({
    where: { type: 'AWARD' },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log("\nRecent Awards:");
  for (const t of transactions) {
    console.log(`- ${t.amount} to User ${t.userId} at ${t.createdAt}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
