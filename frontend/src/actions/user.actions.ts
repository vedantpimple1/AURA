'use server';

import { apiClient } from '@/lib/api-client';
import { revalidatePath } from 'next/cache';

export async function getUserAction(userId: string) {
  return await apiClient.get(`/users/${userId}`);
}

export async function getUsersAction() {
  return await apiClient.get('/users');
}

export async function createUserAction(formData: FormData) {
  const data = {
    email: formData.get('email') as string,
    name: formData.get('name') as string,
    employeeId: formData.get('employeeId') as string,
    roleName: formData.get('roleName') as string,
    teamId: (formData.get('teamId') as string) || undefined,
  };
  const res = await apiClient.post('/users', data);
  if (res.success) {
    revalidatePath('/');
  }
  return res;
}

export async function deleteUserAction(userId: string) {
  const res = await apiClient.delete(`/users/${userId}`);
  if (res.success) {
    revalidatePath('/');
  }
  return res;
}
