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
