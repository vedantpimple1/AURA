import { Router, Request, Response } from 'express';
import { AuditService } from '../services/audit.service';
import { requireRole } from '../middleware/requireAuth';
import { handleError } from '../lib/errors';

export const auditRouter = Router();

/**
 * GET /api/audit/logs
 * Returns audit logs. Requires ADMIN or SUPERADMIN.
 */
auditRouter.get('/logs', requireRole('ADMIN', 'SUPERADMIN'), async (_req: Request, res: Response): Promise<void> => {
  try {
    const logs = await AuditService.getLogs(100);
    res.json({ success: true, data: logs });
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});
