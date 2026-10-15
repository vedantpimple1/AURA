'use server';

import { apiClient } from '@/lib/api-client';

export async function breakdownTaskAction(objective: string) {
  if (!objective || objective.trim().length < 3) {
    return { success: false, error: 'Please enter a description or objective (at least 3 characters)' };
  }
  return await apiClient.post('/ai/breakdown-task', { objective });
}

export async function getTeamInsightsAction() {
  return await apiClient.get('/ai/team-insights');
}
