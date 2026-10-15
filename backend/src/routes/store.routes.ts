import { Router, Request, Response } from 'express';
import { StoreService } from '../services/store.service';
import { requireAuth, requireRole } from '../middleware/requireAuth';
import { handleError } from '../lib/errors';

export const storeRouter = Router();

/**
 * GET /api/store/items
 * Returns all store items. Requires auth.
 */
storeRouter.get('/items', requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const items = await StoreService.getStoreItems();
    res.json({ success: true, data: items });
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});

/**
 * POST /api/store/items
 * Creates a new store item. Requires ADMIN or SUPERADMIN.
 */
storeRouter.post('/items', requireRole('ADMIN', 'SUPERADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, basePrice, stock, category, maxPerUser, imageUrl } = req.body as {
      name?: string;
      description?: string;
      basePrice?: number;
      stock?: number;
      category?: string;
      maxPerUser?: number;
      imageUrl?: string;
    };

    if (!name || basePrice === undefined) {
      res.status(400).json({ success: false, error: 'name and basePrice are required', code: 'VALIDATION_ERROR' });
      return;
    }

    // Validate imageUrl if provided
    let validatedImageUrl: string | undefined;
    if (imageUrl && imageUrl.trim() !== '') {
      try {
        const urlObj = new URL(imageUrl.trim());
        if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
          throw new Error('Invalid URL protocol');
        }
        validatedImageUrl = urlObj.toString();
      } catch {
        res.status(400).json({ success: false, error: 'Invalid Image URL format. Must be a valid HTTP/HTTPS URL.', code: 'VALIDATION_ERROR' });
        return;
      }
    }

    const item = await StoreService.createStoreItem({
      name,
      description: description ?? '',
      basePrice: Number(basePrice),
      stock: Number(stock ?? 10),
      category: category ?? 'General',
      maxPerUser: Number(maxPerUser ?? 1),
      imageUrl: validatedImageUrl,
    });

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});

/**
 * POST /api/store/redeem
 * Member redeems a store item.
 */
storeRouter.post('/redeem', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const session = req.session!;
    const { storeItemId } = req.body as { storeItemId?: string };

    if (!storeItemId) {
      res.status(400).json({ success: false, error: 'storeItemId is required', code: 'VALIDATION_ERROR' });
      return;
    }

    const result = await StoreService.redeemStoreItem(session.userId, storeItemId);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});

/**
 * GET /api/store/redemptions
 * Returns all redemptions (admin) or the logged-in user's redemptions (member).
 */
storeRouter.get('/redemptions', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const session = req.session!;
    const isAdmin = session.roles?.some(r => ['ADMIN', 'SUPERADMIN'].includes(r.toUpperCase()));

    if (isAdmin) {
      const redemptions = await StoreService.getAllRedemptions();
      res.json({ success: true, data: redemptions });
    } else {
      const redemptions = await StoreService.getUserRedemptions(session.userId);
      res.json({ success: true, data: redemptions });
    }
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});

/**
 * POST /api/store/redemptions/:redemptionId/fulfill
 * Admin marks a redemption as fulfilled.
 */
storeRouter.post('/redemptions/:redemptionId/fulfill', requireRole('ADMIN', 'SUPERADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const fulfilled = await StoreService.fulfillRedemption(req.params.redemptionId as string);
    res.json({ success: true, data: fulfilled });
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});
