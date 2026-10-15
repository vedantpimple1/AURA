'use server';

import { apiClient } from '@/lib/api-client';

export async function getDashboardMetricsAction() {
  const res = await apiClient.get('/analytics/dashboard');
  if (!res.success) {
    throw new Error(res.error || 'Failed to fetch dashboard metrics');
  }
  return res.data;
}

export async function getMemberAnalyticsAction() {
  const res = await apiClient.get('/analytics/members');
  if (!res.success) {
    throw new Error(res.error || 'Failed to fetch member analytics');
  }
  return res.data;
}
