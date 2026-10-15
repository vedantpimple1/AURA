import { prisma } from '../lib/prisma';

export const SUPPORTED_NOTIFICATION_TYPES = [
  'TASK_ASSIGNED',
  'TASK_APPROVED',
  'TASK_NEEDS_CHANGES',
  'AURA_AWARDED',
  'STORE_FULFILLMENT',
  'REDEMPTION_REQUESTED',
  'KUDOS_RECEIVED',
  'STREAK_REMINDER',
  'ADMIN_REVIEW_DIGEST',
] as const;

export type SupportedNotificationType = typeof SUPPORTED_NOTIFICATION_TYPES[number];

export class NotificationPreferenceService {
  /**
   * Get all preferences for a user, filling in defaults for missing rows.
   */
  static async getUserPreferences(userId: string) {
    const rows = await prisma.notificationPreference.findMany({
      where: { userId },
    });

    const preferencesMap = new Map(rows.map(r => [r.notificationType, r]));

    // Return a complete set including defaults
    return SUPPORTED_NOTIFICATION_TYPES.map(type => {
      const row = preferencesMap.get(type);
      return {
        notificationType: type,
        emailEnabled: row ? row.emailEnabled : true,
        inAppEnabled: row ? row.inAppEnabled : true,
      };
    });
  }

  /**
   * Get a specific preference (defaulting to enabled).
   */
  static async getPreference(userId: string, notificationType: SupportedNotificationType) {
    if (!SUPPORTED_NOTIFICATION_TYPES.includes(notificationType)) {
      throw new Error(`Unsupported notification type: ${notificationType}`);
    }

    const pref = await prisma.notificationPreference.findUnique({
      where: { userId_notificationType: { userId, notificationType } },
    });

    return {
      notificationType,
      emailEnabled: pref ? pref.emailEnabled : true,
      inAppEnabled: pref ? pref.inAppEnabled : true,
    };
  }

  /**
   * Update a specific preference.
   */
  static async updatePreference(userId: string, notificationType: SupportedNotificationType, data: { emailEnabled?: boolean; inAppEnabled?: boolean }) {
    if (!SUPPORTED_NOTIFICATION_TYPES.includes(notificationType)) {
      throw new Error(`Unsupported notification type: ${notificationType}`);
    }

    // Upsert to handle partial updates cleanly
    return prisma.notificationPreference.upsert({
      where: { userId_notificationType: { userId, notificationType } },
      create: {
        userId,
        notificationType,
        emailEnabled: data.emailEnabled ?? true,
        inAppEnabled: data.inAppEnabled ?? true,
      },
      update: {
        emailEnabled: data.emailEnabled,
        inAppEnabled: data.inAppEnabled,
      },
    });
  }

  /**
   * Reset all preferences to default (by deleting the rows).
   */
  static async resetPreferences(userId: string) {
    await prisma.notificationPreference.deleteMany({
      where: { userId },
    });
  }
}
