import { Router, Request, Response } from 'express';
import { PasswordResetService } from '../services/password-reset.service';
import { requirePermission } from '../middleware/requireAuth';
import { publicResetRequestLimiter, resetPasswordSubmitLimiter } from '../middleware/rateLimiter';
import { handleError } from '../lib/errors';

export const passwordResetRouter = Router();

/**
 * POST /api/auth/password-reset-requests
 * Public-facing recovery request submission with rate limiting.
 * Always returns a generic confirmation message.
 */
passwordResetRouter.post(
  '/auth/password-reset-requests',
  publicResetRequestLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { identifier } = req.body as { identifier?: string };
      const clientIp =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await PasswordResetService.requestReset(
        identifier || '',
        clientIp,
        userAgent
      );

      res.json(result);
    } catch (error) {
      const { statusCode, ...body } = handleError(error) as any;
      res.status(statusCode ?? 500).json({ success: false, ...body });
    }
  }
);

/**
 * GET /api/auth/validate-reset-token
 * Public-facing token validation before presenting the reset password form.
 */
passwordResetRouter.get(
  '/auth/validate-reset-token',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { token } = req.query as { token?: string };
      const result = await PasswordResetService.validateToken(token || '');
      res.json({ success: true, data: result });
    } catch (error) {
      const { statusCode, ...body } = handleError(error) as any;
      res.status(statusCode ?? 500).json({ success: false, ...body });
    }
  }
);

/**
 * POST /api/auth/reset-password
 * Public-facing password reset execution with rate limiting.
 */
passwordResetRouter.post(
  '/auth/reset-password',
  resetPasswordSubmitLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { token, password } = req.body as { token?: string; password?: string };
      if (!token || !password) {
        res.status(400).json({
          success: false,
          error: 'Token and new password are required',
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      const result = await PasswordResetService.resetPassword(token, password);
      res.json(result);
    } catch (error) {
      const { statusCode, ...body } = handleError(error) as any;
      res.status(statusCode ?? 500).json({ success: false, ...body });
    }
  }
);

/**
 * GET /api/admin/password-reset-requests
 * Recovery queue list. Requires PASSWORD_RESET_REQUEST_MANAGE permission.
 */
passwordResetRouter.get(
  '/admin/password-reset-requests',
  requirePermission('PASSWORD_RESET_REQUEST_MANAGE'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { page, pageSize, status, search } = req.query as {
        page?: string;
        pageSize?: string;
        status?: string;
        search?: string;
      };

      const result = await PasswordResetService.getQueue({
        page: page ? parseInt(page, 10) : undefined,
        pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
        status,
        search,
      });

      res.json({ success: true, data: result });
    } catch (error) {
      const { statusCode, ...body } = handleError(error) as any;
      res.status(statusCode ?? 500).json({ success: false, ...body });
    }
  }
);

/**
 * POST /api/admin/password-reset-requests/:id/verify
 * Operator verifies member identity. Self-verification denied.
 */
passwordResetRouter.post(
  '/admin/password-reset-requests/:id/verify',
  requirePermission('PASSWORD_RESET_REQUEST_MANAGE'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const operatorId = req.session?.userId;
      if (!operatorId) {
        res.status(401).json({ success: false, error: 'Unauthorized', code: 'UNAUTHENTICATED' });
        return;
      }

      const { notes } = req.body as { notes?: string };
      const requestId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const updated = await PasswordResetService.verifyRequest(requestId, operatorId, notes);

      res.json({ success: true, data: updated });
    } catch (error) {
      const { statusCode, ...body } = handleError(error) as any;
      res.status(statusCode ?? 500).json({ success: false, ...body });
    }
  }
);

/**
 * POST /api/admin/password-reset-requests/:id/issue-link
 * Issues single-use 15-minute reset link. Returns raw link ONCE to operator.
 */
passwordResetRouter.post(
  '/admin/password-reset-requests/:id/issue-link',
  requirePermission('PASSWORD_RESET_REQUEST_MANAGE'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const operatorId = req.session?.userId;
      if (!operatorId) {
        res.status(401).json({ success: false, error: 'Unauthorized', code: 'UNAUTHENTICATED' });
        return;
      }

      const requestId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await PasswordResetService.issueResetLink(requestId, operatorId);
      res.json({ success: true, data: result });
    } catch (error) {
      const { statusCode, ...body } = handleError(error) as any;
      res.status(statusCode ?? 500).json({ success: false, ...body });
    }
  }
);

/**
 * POST /api/admin/password-reset-requests/:id/cancel
 * Cancels a recovery request.
 */
passwordResetRouter.post(
  '/admin/password-reset-requests/:id/cancel',
  requirePermission('PASSWORD_RESET_REQUEST_MANAGE'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const operatorId = req.session?.userId;
      if (!operatorId) {
        res.status(401).json({ success: false, error: 'Unauthorized', code: 'UNAUTHENTICATED' });
        return;
      }

      const { reason } = req.body as { reason?: string };
      const requestId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const updated = await PasswordResetService.cancelRequest(requestId, operatorId, reason);

      res.json({ success: true, data: updated });
    } catch (error) {
      const { statusCode, ...body } = handleError(error) as any;
      res.status(statusCode ?? 500).json({ success: false, ...body });
    }
  }
);
