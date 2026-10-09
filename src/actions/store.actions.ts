'use server';

import { StoreService } from '@/services/store.service';
import { handleError } from '@/lib/errors';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function getStoreItemsAction() {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    const items = await StoreService.getStoreItems();
    return { success: true, data: items };
  } catch (error) {
    return { success: false, ...handleError(error) };
  }
}

export async function createStoreItemAction(formData: FormData) {
  try {
    const session = await getSession();
    const isAdmin = session?.roles?.includes('ADMIN') || session?.roles?.includes('SUPERADMIN');
    if (!session || !isAdmin) {
      throw new Error('Unauthorized: Only admins can add products');
    }

    const name = formData.get('name') as string;
    const description = (formData.get('description') as string) || '';
    const basePrice = parseInt(formData.get('basePrice') as string, 10);
    const stock = parseInt((formData.get('stock') as string) || '10', 10);
    const category = (formData.get('category') as string) || 'General';
    const maxPerUser = parseInt((formData.get('maxPerUser') as string) || '1', 10);
    
    const imageUrlRaw = formData.get('imageUrl') as string;
    let imageUrl: string | undefined = undefined;

    if (imageUrlRaw && imageUrlRaw.trim() !== '') {
      try {
        const urlObj = new URL(imageUrlRaw.trim());
        if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
          throw new Error('Invalid URL protocol');
        }
        imageUrl = urlObj.toString();
      } catch (e) {
        throw new Error('Invalid Image URL format. Must be a valid HTTP/HTTPS URL.');
      }
    }

    const item = await StoreService.createStoreItem({
      name,
      description,
      basePrice,
      stock,
      category,
      maxPerUser,
      imageUrl,
    });

    revalidatePath('/');
    return { success: true, data: item };
  } catch (error) {
    return { success: false, ...handleError(error) };
  }
}

export async function redeemStoreItemAction(formData: FormData) {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    const storeItemId = formData.get('storeItemId') as string;
    const result = await StoreService.redeemStoreItem(session.userId, storeItemId);

    revalidatePath('/');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, ...handleError(error) };
  }
}

export async function getAllRedemptionsAction() {
  try {
    const session = await getSession();
    const isAdmin = session?.roles?.includes('ADMIN') || session?.roles?.includes('SUPERADMIN');
    if (!session || !isAdmin) {
      throw new Error('Unauthorized: Only admins can view redemption queue');
    }

    const redemptions = await StoreService.getAllRedemptions();
    return { success: true, data: redemptions };
  } catch (error) {
    return { success: false, ...handleError(error) };
  }
}

export async function fulfillRedemptionAction(formData: FormData) {
  try {
    const session = await getSession();
    const isAdmin = session?.roles?.includes('ADMIN') || session?.roles?.includes('SUPERADMIN');
    if (!session || !isAdmin) {
      throw new Error('Unauthorized: Only admins can fulfill redemptions');
    }

    const redemptionId = formData.get('redemptionId') as string;
    const fulfilled = await StoreService.fulfillRedemption(redemptionId);

    revalidatePath('/');
    return { success: true, data: fulfilled };
  } catch (error) {
    return { success: false, ...handleError(error) };
  }
}

export async function getUserRedemptionsAction() {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    const redemptions = await StoreService.getUserRedemptions(session.userId);
    return { success: true, data: redemptions };
  } catch (error) {
    return { success: false, ...handleError(error) };
  }
}


