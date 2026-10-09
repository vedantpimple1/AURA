'use server';

import { AnalyticsService } from '@/services/analytics.service';
import { getSession } from '@/lib/auth';
import { AuthorizationError } from '@/lib/errors';

export async function getDashboardMetricsAction() {
  const session = await getSession();
  if (!session || (!session.roles?.includes('ADMIN') && !session.roles?.includes('SUPERADMIN'))) {
    throw new AuthorizationError('Unauthorized access to analytics');
  }

  return await AnalyticsService.getDashboardMetrics();
}

export async function getMemberAnalyticsAction() {
  const session = await getSession();
  if (!session || (!session.roles?.includes('ADMIN') && !session.roles?.includes('SUPERADMIN'))) {
    throw new AuthorizationError('Unauthorized access to analytics');
  }

  return await AnalyticsService.getMemberAnalytics();
}
