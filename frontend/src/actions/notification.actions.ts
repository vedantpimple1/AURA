'use server';

import { apiClient } from '@/lib/api-client';
import { revalidatePath } from 'next/cache';

export type SupportedNotificationType =
  | 'TASK_ASSIGNED'
  | 'SUBMISSION_REVIEWED'
  | 'KUDOS_RECEIVED'
  | 'AURA_AWARDED'
  | 'REDEMPTION_FULFILLED'
  | 'STREAK_REMINDER';

export async function getUserNotificationsAction() {
  return await apiClient.get('/notifications');
}

export async function markNotificationAsReadAction(id: string) {
  const res = await apiClient.put(`/notifications/${id}/read`);
  if (res.success) {
    revalidatePath('/');
  }
  return res;
}

export async function markAllNotificationsAsReadAction() {
  const res = await apiClient.put('/notifications/read-all');
  if (res.success) {
    revalidatePath('/');
  }
  return res;
}

export async function triggerStreakRemindersAction() {
  const res = await apiClient.post('/notifications/jobs/streak-reminders');
  if (res.success) {
    revalidatePath('/');
  }
  return res;
}

export async function triggerReviewDigestAction() {
  const res = await apiClient.post('/notifications/jobs/review-digest');
  if (res.success) {
    revalidatePath('/');
  }
  return res;
}

export async function triggerEmailProcessorAction() {
  return await apiClient.post('/notifications/jobs/email-processor');
}

export async function getUserPreferencesAction() {
  return await apiClient.get('/notifications/preferences');
}

export async function updatePreferenceAction(
  type: SupportedNotificationType,
  data: { emailEnabled?: boolean; inAppEnabled?: boolean }
) {
  const res = await apiClient.put(`/notifications/preferences/${type}`, data);
  if (res.success) {
    revalidatePath('/');
  }
  return res;
}

export async function resetPreferencesAction() {
  const res = await apiClient.delete('/notifications/preferences');
  if (res.success) {
    revalidatePath('/');
  }
  return res;
}
