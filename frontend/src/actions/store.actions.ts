'use server';

import { apiClient } from '@/lib/api-client';
import { revalidatePath } from 'next/cache';

export async function getStoreItemsAction() {
  return await apiClient.get('/store/items');
}

export async function createStoreItemAction(formData: FormData) {
  const name = formData.get('name') as string;
  const description = (formData.get('description') as string) || '';
  const basePrice = parseInt(formData.get('basePrice') as string, 10);
  const stock = parseInt((formData.get('stock') as string) || '10', 10);
  const category = (formData.get('category') as string) || 'General';
  const maxPerUser = parseInt((formData.get('maxPerUser') as string) || '1', 10);
  const imageUrlRaw = formData.get('imageUrl') as string;
  const imageUrl = imageUrlRaw && imageUrlRaw.trim() !== '' ? imageUrlRaw.trim() : undefined;

  const res = await apiClient.post('/store/items', {
    name,
    description,
    basePrice,
    stock,
    category,
    maxPerUser,
    imageUrl,
  });

  if (res.success) {
    revalidatePath('/');
  }
  return res;
}

export async function redeemStoreItemAction(formData: FormData) {
  const storeItemId = formData.get('storeItemId') as string;

  const res = await apiClient.post('/store/redeem', { storeItemId });
  if (res.success) {
    revalidatePath('/');
  }
  return res;
}

export async function getAllRedemptionsAction() {
  return await apiClient.get('/store/redemptions');
}

export async function fulfillRedemptionAction(formData: FormData) {
  const redemptionId = formData.get('redemptionId') as string;

  const res = await apiClient.post(`/store/redemptions/${redemptionId}/fulfill`);
  if (res.success) {
    revalidatePath('/');
  }
  return res;
}

export async function getUserRedemptionsAction() {
  return await apiClient.get('/store/redemptions');
}
