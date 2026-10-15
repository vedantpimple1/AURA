'use server';

import { apiClient } from '@/lib/api-client';

export interface DeliveryQueryParams {
  page?: number;
  limit?: number;
  pageSize?: number;
  status?: string;
  channel?: string;
  notificationType?: string;
  type?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export async function getDeliverySummaryAction() {
  return await apiClient.get('/observability/summary');
}

export async function getDeliveriesAction(params: DeliveryQueryParams = {}) {
  const queryParams = {
    ...params,
    limit: params.limit || params.pageSize || 10,
    notificationType: params.notificationType || params.type,
  };
  return await apiClient.get('/observability/deliveries', queryParams as Record<string, any>);
}

export async function getDeliveryDetailAction(deliveryId: string) {
  return await apiClient.get(`/observability/deliveries/${deliveryId}`);
}

export async function retryDeliveryAction(deliveryId: string) {
  return await apiClient.post(`/observability/deliveries/${deliveryId}/retry`);
}
