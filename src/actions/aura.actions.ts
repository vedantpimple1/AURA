'use server'

import { AuraService } from '@/services/aura.service';
import { NotificationService } from '@/services/notification.service';
import { handleError } from '@/lib/errors';
import { getSession } from '@/lib/auth';

export async function getAuraBalanceAction(userId?: string) {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    // Default to the logged-in user if no specific ID is requested
    const targetUserId = userId || session.userId;
    const balance = await AuraService.getAvailableAura(targetUserId);
    
    return { success: true, data: balance };
  } catch (error) {
    return { success: false, ...handleError(error) };
  }
}

export async function getAuraHistoryAction() {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');
    
    // Admins see all history in this mock logic, members see their own
    const isAdmin = session.roles?.includes('ADMIN') || session.roles?.includes('SUPERADMIN');
    const history = await AuraService.getHistory(isAdmin ? undefined : session.userId);
    
    return { success: true, data: history };
  } catch (error) {
    return { success: false, ...handleError(error) };
  }
}

export async function awardAuraAction(formData: FormData) {
  try {
    const session = await getSession();
    if (!session || !session.roles?.includes('SUPERADMIN')) {
      throw new Error('Unauthorized: Only superadmins can award Aura');
    }

    const data = {
      userId: formData.get('userId') as string,
      type: 'AWARD',
      amount: parseInt(formData.get('amount') as string, 10),
      description: formData.get('description') as string,
      sourceType: 'MANUAL',
    };

    const transaction = await AuraService.addTransaction(data);

    // Non-blocking notification dispatch to the recipient member
    try {
      await NotificationService.dispatch({
        userId: data.userId,
        type: 'AURA_AWARDED',
        title: 'Aura Points Awarded! ⚡',
        message: `You received ${data.amount} Aura points: "${data.description}"`,
        metadata: {
          amount: data.amount,
          description: data.description,
          transactionId: transaction.id,
          awardedById: session.userId,
        },
      });
    } catch (notifError) {
      console.error('Non-blocking notification error on awardAuraAction:', notifError);
    }

    return { success: true, data: transaction };
  } catch (error) {
    return { success: false, ...handleError(error) };
  }
}

export async function redeemAuraAction(formData: FormData) {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    const productName = formData.get('productName') as string;
    const amount = parseInt(formData.get('amount') as string, 10);

    const data = {
      userId: session.userId,
      type: 'REDEMPTION',
      amount: -amount, // Negative for spending
      description: `Redeemed: ${productName}`,
      sourceType: 'STORE',
    };

    const transaction = await AuraService.addTransaction(data);
    return { success: true, data: transaction };
  } catch (error) {
    return { success: false, ...handleError(error) };
  }
}
