import { DeliveryProcessorService } from './services/delivery-processor.service';
import { prisma } from './lib/prisma';
import { QUEUE_CONFIG, isRedisAvailable } from './services/queue/queue.config';
import { NotificationWorker } from './services/queue/notification.worker';

let isShuttingDown = false;
let notificationWorker: NotificationWorker | null = null;

const INTERVAL_MS = parseInt(process.env.DELIVERY_WORKER_INTERVAL_MS || '10000', 10);
const BATCH_SIZE = parseInt(process.env.DELIVERY_WORKER_BATCH_SIZE || '20', 10);
const WORKER_ENABLED = process.env.DELIVERY_WORKER_ENABLED === 'true';

async function startWorker() {
  if (!WORKER_ENABLED) {
    console.log('Delivery worker is disabled (DELIVERY_WORKER_ENABLED is not true). Exiting.');
    process.exit(0);
  }

  // Handle graceful shutdown signals
  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));

  const redisReady = QUEUE_CONFIG.isQueueEnabled && (await isRedisAvailable());

  if (redisReady) {
    console.log(`[Worker] Starting in DISTRIBUTED QUEUE mode with BullMQ & Redis.`);
    notificationWorker = new NotificationWorker();
    await notificationWorker.start();

    // Also run an occasional sweep (every 60s) for stale processing recovery
    const sweepInterval = setInterval(async () => {
      if (isShuttingDown) return;
      try {
        await DeliveryProcessorService.processPendingEmailDeliveries(BATCH_SIZE);
      } catch (err: any) {
        console.warn('[Worker] Stale sweep warning:', err.message);
      }
    }, 60000);

    // Keep process alive
    while (!isShuttingDown) {
      await new Promise((res) => setTimeout(res, 2000));
    }
    clearInterval(sweepInterval);
  } else {
    console.log(
      `[Worker] Starting in DATABASE POLLING mode (Queue enabled: ${QUEUE_CONFIG.isQueueEnabled}, Redis reachable: false). Polling every ${INTERVAL_MS}ms with batch size ${BATCH_SIZE}.`
    );

    while (!isShuttingDown) {
      try {
        const results = await DeliveryProcessorService.processPendingEmailDeliveries(BATCH_SIZE);
        if (results.processed > 0 || results.skipped > 0) {
          console.log(
            `[Worker] Polled batch: processed=${results.processed}, succeeded=${results.succeeded}, failed=${results.failed}, skipped=${results.skipped}`
          );
        }
      } catch (e) {
        console.error('[Worker] Error during polling cycle:', e);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }

      if (!isShuttingDown) {
        await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
      }
    }
  }

  await cleanup();
}

async function handleShutdown(signal: string) {
  if (isShuttingDown) return;
  console.log(`\n[Worker] Received ${signal}. Gracefully shutting down...`);
  isShuttingDown = true;
  await cleanup();
  process.exit(0);
}

async function cleanup() {
  if (notificationWorker) {
    await notificationWorker.stop();
    notificationWorker = null;
  }
  await prisma.$disconnect();
  console.log('[Worker] Worker loop stopped. Exited cleanly.');
}

startWorker().catch((err) => {
  console.error('[Worker] Fatal error starting worker:', err);
  process.exit(1);
});
