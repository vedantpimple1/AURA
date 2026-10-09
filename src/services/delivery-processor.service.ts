import { prisma } from '@/lib/prisma';
import { EmailService } from './email.service';

export interface DeliveryProcessorResult {
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
}

export class DeliveryProcessorService {
  /**
   * Discovers and processes pending email deliveries.
   * Also recovers stale PROCESSING deliveries older than 10 minutes.
   */
  static async processPendingEmailDeliveries(batchSize = 20): Promise<DeliveryProcessorResult> {
    const results: DeliveryProcessorResult = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
    };

    const STALE_THRESHOLD_MINUTES = 10;
    const staleThreshold = new Date(Date.now() - STALE_THRESHOLD_MINUTES * 60 * 1000);

    try {
      // 1. Find eligible deliveries: either PENDING, or PROCESSING but stale.
      const eligibleDeliveries = await prisma.notificationDelivery.findMany({
        where: {
          channel: 'EMAIL',
          OR: [
            { status: 'PENDING' },
            {
              status: 'PROCESSING',
              updatedAt: {
                lt: staleThreshold,
              },
            },
          ],
        },
        orderBy: { createdAt: 'asc' },
        take: batchSize,
      });

      for (const delivery of eligibleDeliveries) {
        // 2. Safely recover stale PROCESSING back to PENDING before claiming.
        if (delivery.status === 'PROCESSING') {
          const reverted = await prisma.notificationDelivery.updateMany({
            where: { id: delivery.id, status: 'PROCESSING' },
            data: { status: 'PENDING', updatedAt: new Date() },
          });
          
          if (reverted.count === 0) {
            results.skipped++;
            continue; // Another process touched it, skip.
          }
        }

        // 3. Delegate to EmailService which handles atomic PENDING -> PROCESSING
        //    and executes the actual SMTP transmission.
        try {
          const success = await EmailService.processDelivery(delivery.id);
          results.processed++;
          if (success) {
            results.succeeded++;
          } else {
            results.failed++;
          }
        } catch (e) {
          // If the service threw an unhandled exception outside its own catch block
          console.error(`Unhandled error processing delivery ${delivery.id}:`, e);
          results.failed++;
        }
      }

      return results;
    } catch (e) {
      console.error('Failed to process pending email deliveries:', e);
      throw e;
    }
  }
}
