'use server';

import { apiClient } from '@/lib/api-client';

export async function getAuraBalanceAction(userId?: string) {
  return await apiClient.get('/aura/balance', userId ? { userId } : undefined);
}

export async function getCumulativeAuraAction(userId?: string) {
  return await apiClient.get('/aura/balance', { type: 'cumulative', ...(userId ? { userId } : {}) });
}

export async function getAuraSummaryAction(userId?: string) {
  return await apiClient.get('/aura/balance', { type: 'summary', ...(userId ? { userId } : {}) });
}

export async function getAuraHistoryAction() {
  return await apiClient.get('/aura/history');
}

export async function awardAuraAction(formData: FormData) {
  const userId = formData.get('userId') as string;
  const amount = parseInt(formData.get('amount') as string, 10);
  const description = formData.get('description') as string;

  return await apiClient.post('/aura/award', { userId, amount, description });
}

export async function redeemAuraAction(formData: FormData) {
  const productName = formData.get('productName') as string;
  const amount = parseInt(formData.get('amount') as string, 10);

  return await apiClient.post('/aura/redeem', { productName, amount });
}

export async function getLeaderboardAction() {
  return await apiClient.get('/aura/leaderboard');
}
