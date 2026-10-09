import { Worker, Job } from 'bullmq';
import { prisma } from '@/lib/prisma';
import { EmailService } from '../email.service';
import {
  QUEUE_CONFIG,
  getRedisClient,
  getRedisOptions,
} from './queue.config';
import { NotificationJobData } from './queue.types';

export class NotificationWorker {
  private workerInstance: any = null;
  private heartbeatIntervalTimer: NodeJS.Timeout | null = null;
  private isStopping = false;

  readonly workerId: string;
  readonly startedAt: Date;
  activeJobs = 0;
  completedJobs = 0;
  failedJobs = 0;

  constructor(customWorkerId?: string) {
    this.workerId =
      customWorkerId ||
      `worker-${process.pid}-${Math.random().toString(36).substring(2, 8)}`;
    this.startedAt = new Date();
  }

  /**
   * Starts the BullMQ worker and begins emitting periodic heartbeats to Redis.
   */
  async start(): Promise<void> {
    console.log(
      `[NotificationWorker] Initializing worker ${this.workerId} on queue "${QUEUE_CONFIG.queueName}" (Concurrency: ${QUEUE_CONFIG.workerConcurrency})`
    );

    const connectionOptions = {
      host: new URL(QUEUE_CONFIG.redisUrl).hostname || '127.0.0.1',
      port: parseInt(new URL(QUEUE_CONFIG.redisUrl).port || '6379', 10),
      password: new URL(QUEUE_CONFIG.redisUrl).password || undefined,
      ...getRedisOptions(),
    };

    this.workerInstance = new Worker(
      QUEUE_CONFIG.queueName,
      async (job: Job<NotificationJobData>) => {
        return this.processJob(job);
      },
      {
        connection: connectionOptions as any,
        concurrency: QUEUE_CONFIG.workerConcurrency,
        lockDuration: QUEUE_CONFIG.stalledInterval,
      } as any
    );

    this.workerInstance.on('completed', (job: any) => {
      this.completedJobs++;
      console.log(`[NotificationWorker] Job ${job?.id} completed for delivery ${job?.data?.deliveryId}`);
    });

    this.workerInstance.on('failed', (job: any, err: any) => {
      this.failedJobs++;
      console.warn(`[NotificationWorker] Job ${job?.id} failed: ${err?.message}`);
    });

    this.workerInstance.on('error', (err: any) => {
      console.error(`[NotificationWorker] Worker error:`, err?.message);
    });

    // Start Heartbeat
    this.startHeartbeat();
  }

  /**
   * Processes an individual BullMQ delivery job.
   */
  async processJob(job: Job<NotificationJobData>): Promise<void> {
    if (this.isStopping) {
      throw new Error('Worker is shutting down, rejecting new job');
    }

    const { deliveryId } = job.data || {};
    if (!deliveryId || typeof deliveryId !== 'string') {
      console.warn('[NotificationWorker] Received malformed job without deliveryId, rejecting safely.');
      return;
    }

    this.activeJobs++;
    try {
      // 1. Process via EmailService (handles atomic claiming & SMTP transmission)
      await EmailService.processDelivery(deliveryId);

      // 2. Inspect resulting database state
      const updated = await prisma.notificationDelivery.findUnique({
        where: { id: deliveryId },
        select: { status: true, attempts: true, errorDetails: true },
      });

      if (!updated) {
        return;
      }

      if (updated.status === 'SENT') {
        // Success: External delivery confirmed
        return;
      }

      if (updated.status === 'PENDING') {
        // Transient error occurred, EmailService reverted to PENDING for retry.
        // Throw an error to trigger BullMQ exponential backoff scheduling.
        throw new Error(
          `Transient delivery failure (attempt ${updated.attempts}): ${updated.errorDetails || 'Retryable error'}`
        );
      }

      if (updated.status === 'FAILED') {
        // Permanent failure reached: do not re-throw, job is terminal.
        return;
      }
    } finally {
      this.activeJobs = Math.max(0, this.activeJobs - 1);
    }
  }

  /**
   * Emits a heartbeat record into Redis with a 30-second TTL.
   */
  private startHeartbeat(): void {
    const emit = async () => {
      if (this.isStopping) return;
      try {
        const redis = getRedisClient();
        const key = `aura:worker:heartbeat:${this.workerId}`;
        const payload = JSON.stringify({
          workerId: this.workerId,
          startedAt: this.startedAt.toISOString(),
          lastHeartbeatAt: new Date().toISOString(),
          activeJobs: this.activeJobs,
          completedJobs: this.completedJobs,
          failedJobs: this.failedJobs,
        });

        // 30 seconds TTL
        await redis.set(key, payload, 'EX', 30);
      } catch {
        // Suppress heartbeat errors if Redis is flapping
      }
    };

    // Emit immediately, then on configured interval
    emit().catch(() => {});
    this.heartbeatIntervalTimer = setInterval(emit, QUEUE_CONFIG.heartbeatInterval);
  }

  /**
   * Graceful shutdown of the worker, stopping heartbeats and waiting for in-flight jobs.
   */
  async stop(): Promise<void> {
    console.log(`[NotificationWorker] Stopping worker ${this.workerId}...`);
    this.isStopping = true;

    if (this.heartbeatIntervalTimer) {
      clearInterval(this.heartbeatIntervalTimer);
      this.heartbeatIntervalTimer = null;
    }

    try {
      const redis = getRedisClient();
      await redis.del(`aura:worker:heartbeat:${this.workerId}`);
    } catch {
      // Ignore cleanup error
    }

    if (this.workerInstance) {
      await this.workerInstance.close();
      this.workerInstance = null;
    }

    console.log(`[NotificationWorker] Worker ${this.workerId} stopped cleanly.`);
  }
}
