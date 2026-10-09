'use server';

import { getSession } from '@/lib/auth';
import { NotificationService } from '@/services/notification.service';
import { DeliveryProcessorService } from '@/services/delivery-processor.service';
import { NotificationPreferenceService, SupportedNotificationType } from '@/services/notification-preference.service';
import { revalidatePath } from 'next/cache';

export async function getUserNotificationsAction() {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const notifications = await NotificationService.getUserNotifications(session.userId);
    return { success: true, data: notifications };
  } catch (error: any) {
    console.error('Failed to get notifications:', error);
    return { success: false, error: error.message || 'Failed to fetch notifications' };
  }
}

export async function markNotificationAsReadAction(id: string) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: 'Unauthorized' };
    }

    await NotificationService.markAsRead(id, session.userId);
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to mark notification as read:', error);
    return { success: false, error: error.message || 'Failed to update notification' };
  }
}

export async function markAllNotificationsAsReadAction() {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: 'Unauthorized' };
    }

    await NotificationService.markAllAsRead(session.userId);
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to mark all notifications as read:', error);
    return { success: false, error: error.message || 'Failed to update notifications' };
  }
}

export async function triggerStreakRemindersAction() {
  try {
    const session = await getSession();
    const isAdmin = session?.roles?.includes('ADMIN') || session?.roles?.includes('SUPERADMIN');
    if (!session?.userId || !isAdmin) {
      return { success: false, error: 'Unauthorized: Requires ADMIN or SUPERADMIN' };
    }

    const result = await NotificationService.processStreakRemindersJob();
    revalidatePath('/');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Failed to run streak reminder job:', error);
    return { success: false, error: error.message || 'Failed to trigger job' };
  }
}

export async function triggerReviewDigestAction() {
  try {
    const session = await getSession();
    const isAdmin = session?.roles?.includes('ADMIN') || session?.roles?.includes('SUPERADMIN');
    if (!session?.userId || !isAdmin) {
      return { success: false, error: 'Unauthorized: Requires ADMIN or SUPERADMIN' };
    }

    const result = await NotificationService.processPendingReviewsDigestJob();
    revalidatePath('/');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Failed to run review digest job:', error);
    return { success: false, error: error.message || 'Failed to trigger job' };
  }
}

/**
 * DEVELOPMENT/ADMIN TRIGGER ONLY.
 * In a production architecture (SMTP-09), this will be replaced/supplemented by a cron or queue worker.
 */
export async function triggerEmailProcessorAction() {
  try {
    const session = await getSession();
    // Only SUPERADMIN (or authorized system process) can trigger the processor manually
    if (!session?.userId || !session.roles?.includes('SUPERADMIN')) {
      return { success: false, error: 'Unauthorized: Requires SUPERADMIN' };
    }

    const results = await DeliveryProcessorService.processPendingEmailDeliveries();
    return { success: true, data: results };
  } catch (error: any) {
    console.error('Failed to trigger email processor:', error);
    return { success: false, error: error.message || 'Failed to process emails' };
  }
}

export async function getUserPreferencesAction() {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const preferences = await NotificationPreferenceService.getUserPreferences(session.userId);
    return { success: true, data: preferences };
  } catch (error: any) {
    console.error('Failed to fetch preferences:', error);
    return { success: false, error: 'Failed to fetch preferences' };
  }
}

export async function updatePreferenceAction(
  type: SupportedNotificationType, 
  data: { emailEnabled?: boolean; inAppEnabled?: boolean }
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const updated = await NotificationPreferenceService.updatePreference(session.userId, type, data);
    revalidatePath('/');
    return { success: true, data: updated };
  } catch (error: any) {
    console.error(`Failed to update preference for ${type}:`, error);
    return { success: false, error: 'Failed to update preference' };
  }
}

export async function resetPreferencesAction() {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: 'Unauthorized' };
    }

    await NotificationPreferenceService.resetPreferences(session.userId);
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to reset preferences:', error);
    return { success: false, error: 'Failed to reset preferences' };
  }
}

