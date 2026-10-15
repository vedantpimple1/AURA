import { Router, Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { NotificationPreferenceService, SupportedNotificationType } from '../services/notification-preference.service';
import { DeliveryProcessorService } from '../services/delivery-processor.service';
import { requireAuth, requireRole } from '../middleware/requireAuth';
import { handleError } from '../lib/errors';

export const notificationRouter = Router();

/**
 * GET /api/notifications
 * Returns notifications for the logged-in user.
 */
notificationRouter.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const session = req.session!;
    const notifications = await NotificationService.getUserNotifications(session.userId);
    res.json({ success: true, data: notifications });
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});

/**
 * PUT /api/notifications/:id/read
 * Marks a single notification as read.
 */
notificationRouter.put('/:id/read', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const session = req.session!;
    await NotificationService.markAsRead(req.params.id as string, session.userId);
    res.json({ success: true });
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});

/**
 * PUT /api/notifications/read-all
 * Marks all notifications as read for the logged-in user.
 */
notificationRouter.put('/read-all', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const session = req.session!;
    await NotificationService.markAllAsRead(session.userId);
    res.json({ success: true });
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});

/**
 * GET /api/notifications/preferences
 * Returns notification preferences for the logged-in user.
 */
notificationRouter.get('/preferences', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const session = req.session!;
    const preferences = await NotificationPreferenceService.getUserPreferences(session.userId);
    res.json({ success: true, data: preferences });
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});

/**
 * PUT /api/notifications/preferences/:type
 * Updates a notification preference for the logged-in user.
 */
notificationRouter.put('/preferences/:type', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const session = req.session!;
    const type = req.params.type as SupportedNotificationType;
    const { emailEnabled, inAppEnabled } = req.body as { emailEnabled?: boolean; inAppEnabled?: boolean };

    const updated = await NotificationPreferenceService.updatePreference(session.userId, type, { emailEnabled, inAppEnabled });
    res.json({ success: true, data: updated });
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});

/**
 * DELETE /api/notifications/preferences
 * Resets all notification preferences to defaults.
 */
notificationRouter.delete('/preferences', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const session = req.session!;
    await NotificationPreferenceService.resetPreferences(session.userId);
    res.json({ success: true });
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});

/**
 * POST /api/notifications/jobs/streak-reminders
 * Admin trigger: run streak reminders job.
 */
notificationRouter.post('/jobs/streak-reminders', requireRole('ADMIN', 'SUPERADMIN'), async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await NotificationService.processStreakRemindersJob();
    res.json({ success: true, data: result });
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});

/**
 * POST /api/notifications/jobs/review-digest
 * Admin trigger: run pending reviews digest job.
 */
notificationRouter.post('/jobs/review-digest', requireRole('ADMIN', 'SUPERADMIN'), async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await NotificationService.processPendingReviewsDigestJob();
    res.json({ success: true, data: result });
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});

/**
 * POST /api/notifications/jobs/email-processor
 * SUPERADMIN trigger: manually run email delivery processor.
 */
notificationRouter.post('/jobs/email-processor', requireRole('SUPERADMIN'), async (_req: Request, res: Response): Promise<void> => {
  try {
    const results = await DeliveryProcessorService.processPendingEmailDeliveries();
    res.json({ success: true, data: results });
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});
