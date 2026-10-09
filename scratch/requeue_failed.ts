import { prisma } from '../src/lib/prisma';

async function main() {
  const updated = await prisma.notificationDelivery.updateMany({
    where: {
      status: 'FAILED'
    },
    data: {
      status: 'PENDING',
      attempts: 0
    }
  });

  console.log(`Re-queued ${updated.count} failed deliveries to PENDING.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
