import { prisma } from '../lib/prisma';
import { AuraService } from './aura.service';
import { ValidationError, ApplicationError } from '../lib/errors';
import { AuditService } from './audit.service';
import { NotificationService } from './notification.service';

export const DEFAULT_STORE_ITEMS = [
  {
    name: 'Laptop Stand',
    description: 'Ergonomic aluminum laptop stand for focused work posture.',
    basePrice: 5000,
    stock: 8,
    category: 'Hardware',
    maxPerUser: 1,
  },
  {
    name: 'Wireless Mouse',
    description: 'Precision ergonomic wireless mouse.',
    basePrice: 4000,
    stock: 12,
    category: 'Hardware',
    maxPerUser: 1,
  },
  {
    name: 'Coffee Mug',
    description: 'Double-walled ceramic KAI Aura branded team mug.',
    basePrice: 2000,
    stock: 24,
    category: 'Merch',
    maxPerUser: 3,
  },
  {
    name: 'Mobile Stand',
    description: 'Minimalist desktop stand for smartphone and tablet.',
    basePrice: 3000,
    stock: 16,
    category: 'Accessories',
    maxPerUser: 1,
  },
  {
    name: 'WFH Pass',
    description: 'Flexible work-from-home day pass.',
    basePrice: 1500,
    stock: 50,
    category: 'Perks',
    maxPerUser: 4,
  },
  {
    name: 'Early Leave Pass',
    description: 'Friday early leave pass (2 hours).',
    basePrice: 2000,
    stock: 30,
    category: 'Perks',
    maxPerUser: 2,
  },
];

export class StoreService {
  /**
   * Fetches all active store items. Seeds defaults if table is empty.
   */
  static async getStoreItems() {
    let items = await prisma.storeItem.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
    });

    if (items.length === 0) {
      // Auto-seed default store inventory
      for (const item of DEFAULT_STORE_ITEMS) {
        await prisma.storeItem.create({
          data: item,
        });
      }
      items = await prisma.storeItem.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'asc' },
      });
    }

    return items;
  }

  /**
   * Creates a new store item (Admin only).
   */
  static async createStoreItem(data: {
    name: string;
    description?: string;
    basePrice: number;
    stock: number;
    category?: string;
    maxPerUser?: number;
    imageUrl?: string;
  }) {
    if (!data.name || data.basePrice === undefined) {
      throw new ValidationError('Name and Base Price are required');
    }

    return await prisma.storeItem.create({
      data: {
        name: data.name,
        description: data.description,
        basePrice: data.basePrice,
        stock: data.stock || 0,
        category: data.category || 'General',
        maxPerUser: data.maxPerUser || 1,
        imageUrl: data.imageUrl,
        status: 'ACTIVE',
      },
    });
  }

  /**
   * Processes a redemption transaction:
   * 1. Checks item availability and stock.
   * 2. Checks user limits.
   * 3. Deducts Aura balance via AuraService.
   * 4. Updates stock and creates a Redemption audit record.
   */
  static async redeemStoreItem(userId: string, storeItemId: string) {
    if (!userId || !storeItemId) {
      throw new ValidationError('User ID and Store Item ID are required');
    }

    const item = await prisma.storeItem.findUnique({
      where: { id: storeItemId },
    });

    if (!item || item.status !== 'ACTIVE') {
      throw new ApplicationError('Store item is not available', 404, 'ITEM_NOT_FOUND');
    }

    if (item.stock <= 0) {
      throw new ApplicationError('Item is currently out of stock', 400, 'OUT_OF_STOCK');
    }

    // Check max per user
    if (item.maxPerUser) {
      const userRedemptions = await prisma.redemption.count({
        where: {
          userId,
          storeItemId,
          status: { in: ['PENDING', 'FULFILLED'] },
        },
      });

      if (userRedemptions >= item.maxPerUser) {
        throw new ApplicationError(
          `You have reached the maximum redemption limit (${item.maxPerUser}) for this item`,
          400,
          'MAX_REDEMPTION_EXCEEDED'
        );
      }
    }

    // Check available Aura
    const balance = await AuraService.getAvailableAura(userId);
    if (balance < item.basePrice) {
      throw new ApplicationError(
        `Insufficient Aura balance. Required: ${item.basePrice}, Available: ${balance}`,
        400,
        'INSUFFICIENT_FUNDS'
      );
    }

    // Atomic transaction: Deduct Aura, decrement stock, create redemption
    const result = await prisma.$transaction(async (tx) => {
      // 1. Decrement stock
      const updatedItem = await tx.storeItem.update({
        where: { id: storeItemId },
        data: { stock: { decrement: 1 } },
      });

      // 2. Append transaction to Aura ledger
      await tx.auraTransaction.create({
        data: {
          userId,
          type: 'REDEMPTION',
          amount: -item.basePrice,
          description: `Redeemed: ${item.name}`,
          sourceType: 'STORE',
          sourceId: item.id,
        },
      });

      // 3. Create redemption record
      const redemption = await tx.redemption.create({
        data: {
          userId,
          storeItemId,
          auraCost: item.basePrice,
          status: 'PENDING',
        },
      });

      return { redemption, updatedItem };
    });

    // Notify all active Administrators and Superadministrators
    try {
      const member = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      });

      const admins = await prisma.user.findMany({
        where: {
          status: 'ACTIVE',
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

      const memberName = member?.name || member?.email || 'A team member';
      for (const admin of admins) {
        await NotificationService.dispatch({
          userId: admin.id,
          type: 'REDEMPTION_REQUESTED',
          title: 'New Store Redemption Request 🎁',
          message: `${memberName} requested "${item.name}" (${item.basePrice} Aura).`,
          metadata: {
            redemptionId: result.redemption.id,
            storeItemId: item.id,
            memberId: userId,
            memberName,
            itemName: item.name,
            auraCost: item.basePrice,
          },
        });
      }
    } catch (e) {
      console.error('Failed to notify admins of store redemption request:', e);
    }

    const remainingBalance = await AuraService.getAvailableAura(userId);
    return { ...result, remainingBalance };
  }

  /**
   * Retrieves user redemption history.
   */
  static async getUserRedemptions(userId: string) {
    return await prisma.redemption.findMany({
      where: { userId },
      include: { storeItem: true },
      orderBy: { redeemedAt: 'desc' },
    });
  }

  /**
   * Retrieves all redemptions across all users (for Admin management).
   */
  static async getAllRedemptions() {
    return await prisma.redemption.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        storeItem: true,
      },
      orderBy: { redeemedAt: 'desc' },
    });
  }

  /**
   * Marks a redemption as fulfilled (Admin only).
   */
  static async fulfillRedemption(redemptionId: string) {
    if (!redemptionId) throw new ValidationError('Redemption ID is required');

    const updated = await prisma.redemption.update({
      where: { id: redemptionId },
      data: {
        status: 'FULFILLED',
        fulfilledAt: new Date(),
      },
      include: {
        user: { select: { name: true, email: true } },
        storeItem: true,
      },
    });

    // Create notification for member
    try {
      await NotificationService.dispatch({
        userId: updated.userId,
        type: 'STORE_FULFILLMENT',
        title: 'Reward Accepted! 🎁',
        message: `Your redemption request for "${updated.storeItem?.name}" has been accepted and fulfilled!`,
      });
    } catch (e) {
      // Non-blocking notification
      console.error('Failed to create fulfillment notification:', e);
    }

    return updated;
  }
}
