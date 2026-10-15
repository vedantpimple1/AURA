'use server';

import { apiClient } from '@/lib/api-client';

export async function getAuditLogsAction() {
  const res = await apiClient.get('/audit/logs');
  if (!res.success) {
    throw new Error(res.error || 'Failed to fetch audit logs');
  }
  return res.data;
}
