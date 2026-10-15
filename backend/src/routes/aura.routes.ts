import { Router, Request, Response } from 'express';
import { AuraService } from '../services/aura.service';
import { NotificationService } from '../services/notification.service';
import { requireAuth, requireRole } from '../middleware/requireAuth';
import { handleError } from '../lib/errors';

export const auraRouter = Router();

/**
 * GET /api/aura/balance
 * Returns the Aura balance for the logged-in user (or a given userId for admins).
 */
auraRouter.get('/balance', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const session = req.session!;
    const requestedUserId = req.query.userId as string | undefined;
    const isAdmin = session.roles?.some(r => ['ADMIN', 'SUPERADMIN'].includes(r.toUpperCase()));
    const targetUserId = (isAdmin && requestedUserId) ? requestedUserId : session.userId;

    const balance = await AuraService.getAvailableAura(targetUserId);
    res.json({ success: true, data: balance });
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});

/**
 * GET /api/aura/history
 * Admins see all history; members see their own.
 */
auraRouter.get('/history', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const session = req.session!;
    const isAdmin = session.roles?.some(r => ['ADMIN', 'SUPERADMIN'].includes(r.toUpperCase()));
    const history = await AuraService.getHistory(isAdmin ? undefined : session.userId);
    res.json({ success: true, data: history });
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});

/**
 * POST /api/aura/award
 * Awards Aura to a user. Requires SUPERADMIN.
 */
auraRouter.post('/award', requireRole('SUPERADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const session = req.session!;
    const { userId, amount, description } = req.body as {
      userId?: string;
      amount?: number;
      description?: string;
    };

    if (!userId || !amount || !description) {
      res.status(400).json({ success: false, error: 'userId, amount, and description are required', code: 'VALIDATION_ERROR' });
      return;
    }

    const transaction = await AuraService.addTransaction({
      userId,
      type: 'AWARD',
      amount: Number(amount),
      description,
      sourceType: 'MANUAL',
    });

    // Non-blocking notification
    try {
      await NotificationService.dispatch({
        userId,
        type: 'AURA_AWARDED',
        title: 'Aura Points Awarded! ⚡',
        message: `You received ${amount} Aura points: "${description}"`,
        metadata: {
          amount,
          description,
          transactionId: transaction.id,
          awardedById: session.userId,
        },
      });
    } catch (notifError) {
      console.error('Non-blocking notification error on aura award:', notifError);
    }

    res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});

/**
 * POST /api/aura/redeem
 * Records an Aura redemption (deduction) for the logged-in user.
 */
auraRouter.post('/redeem', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const session = req.session!;
    const { productName, amount } = req.body as { productName?: string; amount?: number };

    if (!productName || !amount) {
      res.status(400).json({ success: false, error: 'productName and amount are required', code: 'VALIDATION_ERROR' });
      return;
    }

    const transaction = await AuraService.addTransaction({
      userId: session.userId,
      type: 'REDEMPTION',
      amount: -Number(amount),
      description: `Redeemed: ${productName}`,
      sourceType: 'STORE',
    });

    res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});

/**
 * GET /api/aura/leaderboard
 * Returns the leaderboard data. Requires auth.
 */
auraRouter.get('/leaderboard', requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const history = await AuraService.getHistory(undefined);
    res.json({ success: true, data: history });
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});
