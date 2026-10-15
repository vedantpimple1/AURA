import { Router, Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { requireRole } from '../middleware/requireAuth';
import { handleError } from '../lib/errors';

export const analyticsRouter = Router();

const adminGuard = requireRole('ADMIN', 'SUPERADMIN');

/**
 * GET /api/analytics/dashboard
 * Returns dashboard metrics. Requires ADMIN or SUPERADMIN.
 */
analyticsRouter.get('/dashboard', adminGuard, async (_req: Request, res: Response): Promise<void> => {
  try {
    const metrics = await AnalyticsService.getDashboardMetrics();
    res.json({ success: true, data: metrics });
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});

/**
 * GET /api/analytics/members
 * Returns per-member analytics. Requires ADMIN or SUPERADMIN.
 */
analyticsRouter.get('/members', adminGuard, async (_req: Request, res: Response): Promise<void> => {
  try {
    const analytics = await AnalyticsService.getMemberAnalytics();
    res.json({ success: true, data: analytics });
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});
