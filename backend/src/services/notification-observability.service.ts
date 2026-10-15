import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { NotificationQueueProducer } from './queue/notification.queue';
import { QueueMetrics } from './queue/queue.types';
import { ValidationError } from '../lib/errors';

export interface DeliverySummary {
  total: number;
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  totalAttempts: number;
  byType: Record<string, number>;
  activity: {
    lastActivityAt: Date | null;
    staleProcessingCount: number;
    workerTelemetryNote: string;
  };
  queue: QueueMetrics;
}

export interface DeliveryQueryParams {
  status?: string;
  type?: string;
  channel?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedDeliveries {
  deliveries: Array<{
    id: string;
    channel: string;
    status: string;
    attempts: number;
    errorDetails: string | null;
    sentAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    notificationId: string;
    notification: {
      id: string;
      type: string;
      title: string;
      message: string;
      createdAt: Date;
      metadata: unknown;
      user: {
        id: string;
        name: string | null;
        email: string;
      };
    };
  }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const STALE_PROCESSING_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

export class NotificationObservabilityService {
  /**
   * Aggregates delivery metrics across all statuses and types.
   * Performs server-side aggregation for high performance.
   */
  static async getDeliverySummary(): Promise<DeliverySummary> {
    const staleThreshold = new Date(Date.now() - STALE_PROCESSING_THRESHOLD_MS);

    // Parallel counts and aggregations
    const [
      total,
      pending,
      processing,
      sent,
      failed,
      attemptsAgg,
      staleCount,
      lastDelivery,
      allDeliveriesForTypes,
      queueMetrics,
    ] = await Promise.all([
      prisma.notificationDelivery.count(),
      prisma.notificationDelivery.count({ where: { status: 'PENDING' } }),
      prisma.notificationDelivery.count({ where: { status: 'PROCESSING' } }),
      prisma.notificationDelivery.count({ where: { status: 'SENT' } }),
      prisma.notificationDelivery.count({ where: { status: 'FAILED' } }),
      prisma.notificationDelivery.aggregate({
        _sum: { attempts: true },
      }),
      prisma.notificationDelivery.count({
        where: {
          status: 'PROCESSING',
          updatedAt: { lt: staleThreshold },
        },
      }),
      prisma.notificationDelivery.findFirst({
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true, sentAt: true },
      }),
      // Query notifications to group counts by notification type
      prisma.notification.findMany({
        where: {
          deliveries: { some: {} },
        },
        select: {
          type: true,
        },
      }),
      NotificationQueueProducer.getQueueMetrics(),
    ]);

    // Aggregate by notification type
    const byType: Record<string, number> = {};
    for (const item of allDeliveriesForTypes) {
      byType[item.type] = (byType[item.type] || 0) + 1;
    }

    const workerTelemetryNote =
      queueMetrics.redisStatus === 'CONNECTED'
        ? `Live BullMQ queue connected. ${queueMetrics.workers.length} active worker(s) reporting heartbeat.`
        : `Worker health inferred from delivery queue timestamps (Redis queue is currently ${queueMetrics.redisStatus.toLowerCase()}).`;

    return {
      total,
      pending,
      processing,
      sent,
      failed,
      totalAttempts: attemptsAgg._sum.attempts || 0,
      byType,
      activity: {
        lastActivityAt: lastDelivery?.sentAt || lastDelivery?.updatedAt || null,
        staleProcessingCount: staleCount,
        workerTelemetryNote,
      },
      queue: queueMetrics,
    };
  }

  /**
   * Fetches paginated, filtered deliveries with relation joins.
   * Strictly enforces pagination limits and sanitizes errors/metadata.
   */
  static async getDeliveries(params: DeliveryQueryParams): Promise<PaginatedDeliveries> {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(params.pageSize) || DEFAULT_PAGE_SIZE));
    const skip = (page - 1) * pageSize;

    const where: Prisma.NotificationDeliveryWhereInput = {};

    // Filter by status if provided and not 'ALL'
    if (params.status && params.status !== 'ALL') {
      const validStatuses = ['PENDING', 'PROCESSING', 'SENT', 'FAILED'];
      if (validStatuses.includes(params.status.toUpperCase())) {
        where.status = params.status.toUpperCase();
      }
    }

    // Filter by channel if provided and not 'ALL'
    if (params.channel && params.channel !== 'ALL') {
      where.channel = params.channel.toUpperCase();
    }

    // Filter by notification type
    if (params.type && params.type !== 'ALL') {
      where.notification = {
        is: {
          type: params.type,
        },
      };
    }

    // Date range filtering
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) {
        const start = new Date(params.startDate);
        if (!isNaN(start.getTime())) {
          where.createdAt.gte = start;
        }
      }
      if (params.endDate) {
        const end = new Date(params.endDate);
        if (!isNaN(end.getTime())) {
          // Set to end of day if only date is provided
          end.setHours(23, 59, 59, 999);
          where.createdAt.lte = end;
        }
      }
    }

    // Search filter across recipient email and notification title
    if (params.search && params.search.trim().length > 0) {
      const query = params.search.trim();
      where.OR = [
        {
          notification: {
            is: {
              user: {
                email: { contains: query, mode: 'insensitive' },
              },
            },
          },
        },
        {
          notification: {
            is: {
              user: {
                name: { contains: query, mode: 'insensitive' },
              },
            },
          },
        },
        {
          notification: {
            is: {
              title: { contains: query, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    const [total, rawDeliveries] = await Promise.all([
      prisma.notificationDelivery.count({ where }),
      prisma.notificationDelivery.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          notification: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const deliveries = rawDeliveries.map((delivery) => ({
      id: delivery.id,
      channel: delivery.channel,
      status: delivery.status,
      attempts: delivery.attempts,
      errorDetails: this.sanitizeErrorDetails(delivery.errorDetails),
      sentAt: delivery.sentAt,
      createdAt: delivery.createdAt,
      updatedAt: delivery.updatedAt,
      notificationId: delivery.notificationId,
      notification: {
        id: delivery.notification.id,
        type: delivery.notification.type,
        title: delivery.notification.title,
        message: delivery.notification.message,
        createdAt: delivery.notification.createdAt,
        metadata: this.sanitizeMetadata(delivery.notification.metadata),
        user: delivery.notification.user,
      },
    }));

    return {
      deliveries,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  /**
   * Retrieves single delivery details by ID with sanitization.
   */
  static async getDeliveryById(id: string) {
    if (!id || typeof id !== 'string') return null;

    const delivery = await prisma.notificationDelivery.findUnique({
      where: { id },
      include: {
        notification: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!delivery) return null;

    return {
      id: delivery.id,
      channel: delivery.channel,
      status: delivery.status,
      attempts: delivery.attempts,
      errorDetails: this.sanitizeErrorDetails(delivery.errorDetails),
      sentAt: delivery.sentAt,
      createdAt: delivery.createdAt,
      updatedAt: delivery.updatedAt,
      notificationId: delivery.notificationId,
      notification: {
        id: delivery.notification.id,
        type: delivery.notification.type,
        title: delivery.notification.title,
        message: delivery.notification.message,
        createdAt: delivery.notification.createdAt,
        metadata: this.sanitizeMetadata(delivery.notification.metadata),
        user: delivery.notification.user,
      },
    };
  }

  /**
   * Sanitizes errorDetails strings to prevent leaking database URLs,
   * SMTP credentials, internal stack paths, or raw environment secrets.
   */
  static sanitizeErrorDetails(rawError: string | null): string | null {
    if (!rawError) return null;

    let sanitized = rawError;

    // 1. Mask connection URIs (e.g., postgresql://..., http://..., smtp://...)
    sanitized = sanitized.replace(/([a-zA-Z0-9+.-]+:\/\/[^@\s]+@)[^\s]+/g, '[REDACTED_CONNECTION_URI]');

    // 2. Mask password assignments (e.g. password=..., pass=...)
    sanitized = sanitized.replace(/(password|pass|secret|token|key)\s*[:=]\s*['"]?[^'"\s,]+/gi, '$1=[REDACTED]');

    // 3. Mask absolute file paths (Windows & POSIX)
    sanitized = sanitized.replace(/[a-zA-Z]:\\[^\s:;,]+/g, '[LOCAL_PATH]');
    sanitized = sanitized.replace(/\/(?:[a-zA-Z0-9_-]+\/)+[a-zA-Z0-9_.-]+/g, '[LOCAL_PATH]');

    // 4. Truncate to reasonable length to avoid denial of service via payload size
    if (sanitized.length > 500) {
      sanitized = sanitized.substring(0, 500) + '...';
    }

    return sanitized.trim();
  }

  /**
   * Sanitizes metadata objects to remove any sensitive user keys.
   */
  static sanitizeMetadata(metadata: unknown): unknown {
    if (!metadata || typeof metadata !== 'object') return metadata;

    if (Array.isArray(metadata)) {
      return metadata.map((item) => this.sanitizeMetadata(item));
    }

    const sensitiveKeys = ['password', 'hash', 'secret', 'token', 'authorization', 'cookie', 'jwt'];
    const cleaned: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(metadata as Record<string, unknown>)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
        cleaned[key] = '[REDACTED]';
      } else if (value && typeof value === 'object') {
        cleaned[key] = this.sanitizeMetadata(value);
      } else {
        cleaned[key] = value;
      }
    }

    return cleaned;
  }

  /**
   * Administratively retries an eligible notification delivery.
   * Can retry FAILED deliveries or stale PROCESSING deliveries.
   */
  static async retryDelivery(deliveryId: string) {
    if (!deliveryId) {
      throw new ValidationError('Delivery ID is required');
    }

    const delivery = await prisma.notificationDelivery.findUnique({
      where: { id: deliveryId },
      include: {
        notification: {
          select: { title: true, type: true },
        },
      },
    });

    if (!delivery) {
      throw new ValidationError('Delivery record not found');
    }

    if (delivery.status === 'SENT') {
      throw new ValidationError('Cannot retry a delivery that has already succeeded');
    }

    // Reset status to PENDING and clear errorDetails
    const updated = await prisma.notificationDelivery.update({
      where: { id: deliveryId },
      data: {
        status: 'PENDING',
        errorDetails: null,
        attempts: 0,
        updatedAt: new Date(),
      },
    });

    // Enqueue to distributed queue if active
    await NotificationQueueProducer.enqueueDelivery(deliveryId, delivery.channel);

    return {
      id: updated.id,
      status: updated.status,
      message: 'Delivery successfully queued for retry',
    };
  }
}
