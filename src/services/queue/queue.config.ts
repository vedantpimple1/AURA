import Redis, { RedisOptions } from 'ioredis';

export const QUEUE_CONFIG = {
  get isQueueEnabled(): boolean {
    return process.env.QUEUE_ENABLED === 'true';
  },
  get queueName(): string {
    return process.env.NOTIFICATION_QUEUE_NAME || 'aura-email-deliveries';
  },
  get redisUrl(): string {
    return process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  },
  get workerConcurrency(): number {
    return parseInt(process.env.QUEUE_WORKER_CONCURRENCY || '5', 10);
  },
  get jobAttempts(): number {
    return parseInt(process.env.QUEUE_JOB_ATTEMPTS || '3', 10);
  },
  get backoffDelay(): number {
    return parseInt(process.env.QUEUE_BACKOFF_DELAY || '2000', 10);
  },
  get stalledInterval(): number {
    return parseInt(process.env.QUEUE_STALLED_INTERVAL || '30000', 10);
  },
  get heartbeatInterval(): number {
    return parseInt(process.env.QUEUE_HEARTBEAT_INTERVAL || '10000', 10);
  },
};

export function getRedisOptions(): RedisOptions {
  return {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    connectTimeout: 3000,
    retryStrategy(times) {
      if (times > 3) {
        return null; // Stop retrying quickly in offline dev/test environments
      }
      return Math.min(times * 500, 2000);
    },
    lazyConnect: true,
  };
}

let redisClientInstance: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClientInstance) {
    redisClientInstance = new Redis(QUEUE_CONFIG.redisUrl, getRedisOptions());
    redisClientInstance.on('error', (err) => {
      // Suppress noisy unhandled error events in offline environments
      if (process.env.NODE_ENV !== 'test') {
        console.warn('[Redis] Connection warning:', err.message);
      }
    });
  }
  return redisClientInstance;
}

/**
 * Probes whether Redis is currently reachable with a short timeout.
 * Guaranteed never to throw or hang.
 */
export async function isRedisAvailable(): Promise<boolean> {
  const client = getRedisClient();
  try {
    if (client.status !== 'ready' && client.status !== 'connecting') {
      await Promise.race([
        client.connect(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Redis connect timeout')), 1500)),
      ]);
    }
    const pong = await Promise.race([
      client.ping(),
      new Promise<string>((_, reject) => setTimeout(() => reject(new Error('Redis ping timeout')), 1500)),
    ]);
    return pong === 'PONG';
  } catch {
    return false;
  }
}
