'use server';

import { apiClient } from '@/lib/api-client';
import { setSession, clearSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  try {
    const res = await apiClient.post<{ id: string; email: string; name: string; roles: string[] }>(
      '/auth/login',
      { email, password }
    );

    if (!res.success || !res.data) {
      return { success: false, error: res.error || 'Authentication failed' };
    }

    // Set HTTP-only Next.js session cookie
    await setSession({
      userId: res.data.id,
      email: res.data.email,
      roles: res.data.roles,
    });

    return { success: true, data: res.data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Authentication failed' };
  }
}

export async function logoutAction() {
  try {
    await apiClient.post('/auth/logout');
  } catch {
    // Ignore network error on logout
  }
  await clearSession();
  redirect('/login');
}

/**
 * Public request for password reset.
 * Always returns a generic confirmation message.
 */
export async function requestPasswordResetAction(formData: FormData) {
  const identifier = formData.get('identifier') as string;
  return await apiClient.post<{ message: string }>('/auth/password-reset-requests', { identifier });
}

/**
 * Validate reset token on page load.
 */
export async function validateResetTokenAction(token: string) {
  return await apiClient.get<{
    valid: boolean;
    reason?: 'MISSING_TOKEN' | 'INVALID' | 'ALREADY_USED' | 'EXPIRED' | 'INACTIVE';
    message?: string;
    expiresAt?: string;
    maskedEmail?: string;
  }>('/auth/validate-reset-token', { token });
}

/**
 * Public password reset submission.
 */
export async function resetPasswordAction(token: string, password: string) {
  return await apiClient.post<{ message: string }>('/auth/reset-password', { token, password });
}

/**
 * Admin: get recovery requests queue (requires PASSWORD_RESET_REQUEST_MANAGE).
 */
export async function getRecoveryRequestsAction(params?: {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
}) {
  return await apiClient.get('/admin/password-reset-requests', params);
}

/**
 * Admin: verify member identity.
 */
export async function verifyRecoveryRequestAction(requestId: string, notes?: string) {
  return await apiClient.post(`/admin/password-reset-requests/${requestId}/verify`, { notes });
}

/**
 * Admin: issue one-time reset link.
 */
export async function issueResetLinkAction(requestId: string) {
  return await apiClient.post<{
    requestId: string;
    resetUrl: string;
    expiresAt: string;
    targetUser: { id: string; name: string; email: string; employeeId: string };
  }>(`/admin/password-reset-requests/${requestId}/issue-link`);
}

/**
 * Admin: cancel recovery request.
 */
export async function cancelRecoveryRequestAction(requestId: string, reason?: string) {
  return await apiClient.post(`/admin/password-reset-requests/${requestId}/cancel`, { reason });
}

