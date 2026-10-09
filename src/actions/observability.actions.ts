'use server';

import { getSession } from '@/lib/auth';
import { AuthorizationError, handleError } from '@/lib/errors';
import {
  NotificationObservabilityService,
  DeliveryQueryParams,
} from '@/services/notification-observability.service';

/**
 * Validates that the current session belongs to an Admin or Superadmin.
 * Throws AuthorizationError if unauthorized.
 */
async function assertAdminAuthorization() {
  const session = await getSession();
  if (!session?.userId) {
    throw new AuthorizationError('Authentication required');
  }

  const userRoles = session.roles?.map((r) => r.toUpperCase()) || [];
  const isAuthorized = userRoles.includes('ADMIN') || userRoles.includes('SUPERADMIN');

  if (!isAuthorized) {
    throw new AuthorizationError('Administrative authorization required');
  }

  return session;
}

/**
 * Fetches high-level delivery metrics and queue activity.
 * Restricted to ADMIN and SUPERADMIN.
 */
export async function getDeliverySummaryAction() {
  try {
    await assertAdminAuthorization();
    const summary = await NotificationObservabilityService.getDeliverySummary();
    return { success: true, data: summary };
  } catch (error) {
    return { success: false, ...handleError(error) };
  }
}

/**
 * Fetches paginated, filtered delivery records.
 * Restricted to ADMIN and SUPERADMIN.
 */
export async function getDeliveriesAction(params: DeliveryQueryParams = {}) {
  try {
    await assertAdminAuthorization();
    const result = await NotificationObservabilityService.getDeliveries(params);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, ...handleError(error) };
  }
}

/**
 * Fetches detailed information for a single delivery.
 * Restricted to ADMIN and SUPERADMIN.
 */
export async function getDeliveryDetailAction(deliveryId: string) {
  try {
    await assertAdminAuthorization();
    const detail = await NotificationObservabilityService.getDeliveryById(deliveryId);
    if (!detail) {
      return { success: false, error: 'Delivery record not found', statusCode: 404 };
    }
    return { success: true, data: detail };
  } catch (error) {
    return { success: false, ...handleError(error) };
  }
}

/**
 * Administratively queues an eligible delivery for retry.
 * Restricted to ADMIN and SUPERADMIN.
 */
export async function retryDeliveryAction(deliveryId: string) {
  try {
    await assertAdminAuthorization();
    const result = await NotificationObservabilityService.retryDelivery(deliveryId);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, ...handleError(error) };
  }
}
