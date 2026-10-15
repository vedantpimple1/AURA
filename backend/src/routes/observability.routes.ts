import { Router, Request, Response } from 'express';
import { NotificationObservabilityService, DeliveryQueryParams } from '../services/notification-observability.service';
import { requireRole } from '../middleware/requireAuth';
import { handleError } from '../lib/errors';

export const observabilityRouter = Router();

// All observability routes require ADMIN or SUPERADMIN
const adminGuard = requireRole('ADMIN', 'SUPERADMIN');

/**
 * GET /api/observability/summary
 * Returns high-level delivery metrics and queue activity.
 */
observabilityRouter.get('/summary', adminGuard, async (_req: Request, res: Response): Promise<void> => {
  try {
    const summary = await NotificationObservabilityService.getDeliverySummary();
    res.json({ success: true, data: summary });
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});

/**
 * GET /api/observability/deliveries
 * Returns paginated, filtered delivery records.
 * Query params: status, type, startDate, endDate, search, page, pageSize
 */
observabilityRouter.get('/deliveries', adminGuard, async (req: Request, res: Response): Promise<void> => {
  try {
    const params: DeliveryQueryParams = {
      status: req.query.status as string | undefined,
      type: req.query.type as string | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      search: req.query.search as string | undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    };
    const result = await NotificationObservabilityService.getDeliveries(params);
    res.json({ success: true, data: result });
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});

/**
 * GET /api/observability/deliveries/:id
 * Returns detailed information for a single delivery.
 */
observabilityRouter.get('/deliveries/:id', adminGuard, async (req: Request, res: Response): Promise<void> => {
  try {
    const detail = await NotificationObservabilityService.getDeliveryById(req.params.id as string);
    if (!detail) {
      res.status(404).json({ success: false, error: 'Delivery record not found', code: 'NOT_FOUND' });
      return;
    }
    res.json({ success: true, data: detail });
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});

/**
 * POST /api/observability/deliveries/:id/retry
 * Queues an eligible delivery for retry.
 */
observabilityRouter.post('/deliveries/:id/retry', adminGuard, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await NotificationObservabilityService.retryDelivery(req.params.id as string);
    res.json({ success: true, data: result });
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});
