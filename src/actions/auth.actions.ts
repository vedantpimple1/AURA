'use server'

import { AuthService } from '@/services/auth.service';
import { handleError } from '@/lib/errors';
import { clearSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  try {
    const user = await AuthService.login(email, password);
    return { success: true, data: user };
  } catch (error) {
    return { success: false, ...handleError(error) };
  }
}

export async function logoutAction() {
  await clearSession();
  redirect('/login');
}
