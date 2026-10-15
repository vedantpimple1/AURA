import { prisma } from '../lib/prisma';
import { NotificationQueueProducer } from './queue/notification.queue';

export interface DispatchNotificationInput {
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}


export class NotificationService {
  /**
   * Get notifications for a specific user, ordered latest first
   */
  static async getUserNotifications(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  /**
   * Mark a notification as read
   */
  static async markAsRead(id: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
  }

  /**
   * Mark all notifications for a user as read
   */
  static async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  /**
   * Create a notification
   */
  private static async createNotification(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    metadata?: any;
  }) {
    return prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        metadata: data.metadata,
      },
    });
  }

  /**
   * Central Dispatcher for Domain Events.
   * Resolves preferences and creates necessary delivery records.
   */
  static async dispatch(input: DispatchNotificationInput) {
    if (!input.userId || !input.type || !input.title || !input.message) {
      throw new Error('Missing required notification dispatch fields');
    }

    try {
      const dispatchResult = await prisma.$transaction(async (tx) => {
        // 1. Resolve Preferences
        const pref = await tx.notificationPreference.findUnique({
          where: {
            userId_notificationType: {
              userId: input.userId,
              notificationType: input.type,
            },
          },
        });

        const inAppEnabled = pref ? pref.inAppEnabled : true;
        const emailEnabled = pref ? pref.emailEnabled : true;

        if (!inAppEnabled && !emailEnabled) {
          // If both are disabled, we could drop the event entirely, but we still need an audit trail.
          // Architecture Decision: We create the notification but suppress it from the UI by pre-reading it.
        }

        // 2. Create the canonical Notification record
        // If inApp is disabled, we set readAt to now() so it's suppressed from the unread UI.
        const notification = await tx.notification.create({
          data: {
            userId: input.userId,
            type: input.type,
            title: input.title,
            message: input.message,
            metadata: input.metadata || {},
            readAt: inAppEnabled ? null : new Date(),
          },
        });

        // 3. Create Delivery Record if email is enabled
        let createdDeliveryId: string | null = null;
        if (emailEnabled) {
          try {
            const delivery = await tx.notificationDelivery.create({
              data: {
                notificationId: notification.id,
                channel: 'EMAIL',
                status: 'PENDING',
              },
            });
            createdDeliveryId = delivery.id;
          } catch (e: any) {
            // Handle unique constraint violation (P2002) for idempotency
            if (e.code === 'P2002') {
              console.warn(`Delivery record already exists for notification ${notification.id} on EMAIL`);
            } else {
              throw e;
            }
          }
        }

        return { notification, createdDeliveryId };
      });

      // 4. Asynchronously enqueue to distributed queue if created and queue is active
      if (dispatchResult.createdDeliveryId) {
        NotificationQueueProducer.enqueueDelivery(dispatchResult.createdDeliveryId).catch((err) => {
          console.warn('[NotificationService] Enqueue warning:', err.message);
        });
      }

      return dispatchResult.notification;
    } catch (error: any) {
      console.error(`Notification dispatch failed for type ${input.type}:`, error);
      throw error;
    }
  }

  /**
   * Background Job: Streak / Momentum Reminders
   * Identifies active users who haven't completed a task or given kudos in 3+ days
   * and sends a gentle momentum reminder.
   */
  static async processStreakRemindersJob(): Promise<{ processedCount: number }> {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const users = await prisma.user.findMany({
      where: {
        auraTransactions: {
          none: {
            createdAt: { gte: threeDaysAgo },
          },
        },
      },
      select: { id: true, name: true, email: true },
      take: 50,
    });

    let count = 0;
    for (const u of users) {
      // Check if user already got a streak reminder today
      const alreadyNotified = await prisma.notification.findFirst({
        where: {
          userId: u.id,
          type: 'STREAK_REMINDER',
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });

      if (!alreadyNotified) {
        await this.dispatch({
          userId: u.id,
          type: 'STREAK_REMINDER',
          title: 'Keep Your Streak Alive! ⚡',
          message: `Hi ${u.name || 'there'}! Check out open tasks to earn Aura and keep your team momentum thriving this week.`,
        });
        count++;
      }
    }

    return { processedCount: count };
  }

  /**
   * Background Job: Admin Pending Reviews Digest
   * Finds all admins and alerts them if there are tasks awaiting review.
   */
  static async processPendingReviewsDigestJob(): Promise<{ pendingCount: number; adminsNotified: number }> {
    const pendingCount = await prisma.taskAssignment.count({
      where: { status: 'SUBMITTED' },
    });

    if (pendingCount === 0) {
      return { pendingCount: 0, adminsNotified: 0 };
    }

    // Find all users with ADMIN or SUPERADMIN roles
    const admins = await prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: {
              name: { in: ['ADMIN', 'SUPERADMIN'] },
            },
          },
        },
      },
      select: { id: true },
    });

    let notified = 0;
    for (const admin of admins) {
      const recentDigest = await prisma.notification.findFirst({
        where: {
          userId: admin.id,
          type: 'ADMIN_REVIEW_DIGEST',
          createdAt: { gte: new Date(Date.now() - 6 * 60 * 60 * 1000) },
        },
      });

      if (!recentDigest) {
        await this.dispatch({
          userId: admin.id,
          type: 'ADMIN_REVIEW_DIGEST',
          title: 'Submissions Awaiting Review 📋',
          message: `There are ${pendingCount} member task submission(s) pending your review in the portal.`,
        });
        notified++;
      }
    }

    return { pendingCount, adminsNotified: notified };
  }
}
