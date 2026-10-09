import { prisma } from '@/lib/prisma';
import { ValidationError, ApplicationError } from '@/lib/errors';
import { AuditService } from '@/services/audit.service';

/**
 * AuraService
 * 
 * Enforces the core constraint: Aura is a financial-like append-only ledger.
 * We never store a hardcoded `currentAuraBalance` column. 
 * Instead, we dynamically aggregate it.
 */
export class AuraService {
  
  /**
   * Calculates a user's total available Aura points by summing transactions.
   */
  static async getAvailableAura(userId: string): Promise<number> {
    if (!userId) throw new ValidationError('User ID is required');

    const result = await prisma.auraTransaction.aggregate({
      where: { userId },
      _sum: { amount: true }
    });

    return result._sum.amount || 0;
  }

  /**
   * Appends a new transaction to the ledger.
   * If the transaction is negative (e.g. store redemption), verifies sufficient funds.
   */
  static async addTransaction(data: {
    userId: string;
    type: string;
    amount: number;
    sourceType?: string;
    sourceId?: string;
    description?: string;
  }) {
    if (!data.userId || !data.type || data.amount === undefined) {
      throw new ValidationError('Invalid transaction payload');
    }

    if (data.amount < 0) {
      // Validate sufficient balance for negative transactions
      const currentBalance = await this.getAvailableAura(data.userId);
      if (currentBalance + data.amount < 0) {
        throw new ApplicationError('Insufficient Aura balance', 400, 'INSUFFICIENT_FUNDS');
      }
    }

    const transaction = await prisma.auraTransaction.create({
      data: {
        userId: data.userId,
        type: data.type,
        amount: data.amount,
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        description: data.description,
      }
    });

    await AuditService.log({
      action: 'AURA_TRANSACTION_CREATED',
      entityType: 'AuraTransaction',
      entityId: transaction.id,
      metadata: {
        userId: data.userId,
        type: data.type,
        amount: data.amount,
        sourceType: data.sourceType,
      },
    });

    return transaction;
  }

  /**
   * Retrieves the transaction history.
   * If userId is provided, retrieves only their history.
   */
  static async getHistory(userId?: string) {
    return await prisma.auraTransaction.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true } } }
    });
  }
}
