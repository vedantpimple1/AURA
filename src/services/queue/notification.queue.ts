import { Queue } from 'bullmq';
import { prisma } from '@/lib/prisma';
import {
  QUEUE_CONFIG,
  getRedisClient,
  getRedisOptions,
  isRedisAvailable,
} from './queue.config';
import {
  QueueMetrics,
  EnqueueResult,
} from './queue.types';

export class NotificationQueueProducer {
  private static queueInstance: any = null;

  private static getQueue(): any {
    if (!this.queueInstance) {
      this.queueInstance = new Queue(QUEUE_CONFIG.queueName, {
        connection: {
          host: new URL(QUEUE_CONFIG.redisUrl).hostname || '127.0.0.1',
          port: parseInt(new URL(QUEUE_CONFIG.redisUrl).port || '6379', 10),
          password: new URL(QUEUE_CONFIG.redisUrl).password || undefined,
          ...getRedisOptions(),
        } as any,
      });
    }
    return this.queueInstance;
  }

  /**
   * Enqueues a notification delivery record for distributed asynchronous processing.
   * Uses deterministic job ID to prevent duplicate jobs for the same delivery record.
   * If Redis is disabled or unreachable, fails gracefully and logs a diagnostic warning.
   */
  static async enqueueDelivery(
    deliveryId: string,
    channel = 'EMAIL'
  ): Promise<EnqueueResult> {
    if (!deliveryId) {
      return { enqueued: false, reason: 'MISSING_DELIVERY_ID' };
    }

    if (!QUEUE_CONFIG.isQueueEnabled) {
      return { enqueued: false, reason: 'QUEUE_DISABLED' };
    }

    const available = await isRedisAvailable();
    if (!available) {
      console.warn(
        `[NotificationQueueProducer] Redis unavailable. Delivery ${deliveryId} remains in database for polling recovery.`
      );
      return { enqueued: false, reason: 'REDIS_UNAVAILABLE' };
    }

    try {
      // Validate delivery exists and is eligible
      const delivery = await prisma.notificationDelivery.findUnique({
        where: { id: deliveryId },
        select: { id: true, status: true },
      });

      if (!delivery) {
        return { enqueued: false, reason: 'DELIVERY_NOT_FOUND' };
      }

      if (delivery.status === 'SENT') {
        return { enqueued: false, reason: 'ALREADY_SENT' };
      }

      const queue = this.getQueue();
      const jobId = `delivery-${deliveryId}`;

      const job = await queue.add(
        'send-email',
        {
          deliveryId,
          channel,
          enqueuedAt: Date.now(),
        },
        {
          jobId,
          attempts: QUEUE_CONFIG.jobAttempts,
          backoff: {
            type: 'exponential',
            delay: QUEUE_CONFIG.backoffDelay,
          },
          removeOnComplete: { count: 200 },
          removeOnFail: { count: 500 },
        }
      );

      return {
        enqueued: true,
        jobId: job.id,
      };
    } catch (error: any) {
      console.error(
        `[NotificationQueueProducer] Failed to enqueue delivery ${deliveryId}:`,
        error.message
      );
      return {
        enqueued: false,
        reason: error.message || 'ENQUEUE_FAILED',
      };
    }
  }

  /**
   * Retrieves live metrics from BullMQ and registered worker heartbeats.
   */
  static async getQueueMetrics(): Promise<QueueMetrics> {
    if (!QUEUE_CONFIG.isQueueEnabled) {
      return {
        enabled: false,
        redisStatus: 'DISABLED',
        counts: null,
        workers: [],
      };
    }

    const available = await isRedisAvailable();
    if (!available) {
      return {
        enabled: true,
        redisStatus: 'DISCONNECTED',
        counts: null,
        workers: [],
      };
    }

    try {
      const queue = this.getQueue();
      const counts = await queue.getJobCounts(
        'waiting',
        'active',
        'completed',
        'failed',
        'delayed'
      );

      const redis = getRedisClient();
      const heartbeatKeys = await redis.keys('aura:worker:heartbeat:*');
      const workers: QueueMetrics['workers'] = [];

      for (const key of heartbeatKeys) {
        const raw = await redis.get(key);
        if (raw) {
          try {
            const data = JSON.parse(raw);
            const lastHeartbeat = new Date(data.lastHeartbeatAt);
            const isStale = Date.now() - lastHeartbeat.getTime() > 30000;

            workers.push({
              id: data.workerId,
              lastHeartbeat,
              status: isStale ? 'STALE' : 'ALIVE',
              startedAt: new Date(data.startedAt),
              activeJobs: data.activeJobs || 0,
            });
          } catch {
            // Ignore malformed heartbeat payload
          }
        }
      }

      return {
        enabled: true,
        redisStatus: 'CONNECTED',
        counts: {
          waiting: counts.waiting || 0,
          active: counts.active || 0,
          completed: counts.completed || 0,
          failed: counts.failed || 0,
          delayed: counts.delayed || 0,
        },
        workers,
      };
    } catch (_error: unknown) {
      return {
        enabled: true,
        redisStatus: 'DISCONNECTED',
        counts: null,
        workers: [],
      };
    }
  }

  /**
   * Safely closes the queue connection.
   */
  static async close(): Promise<void> {
    if (this.queueInstance) {
      await this.queueInstance.close();
      this.queueInstance = null;
    }
  }
}
