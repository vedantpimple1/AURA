'use server';

import { apiClient } from '@/lib/api-client';
import { revalidatePath } from 'next/cache';

export async function getTeamsAction() {
  return await apiClient.get('/teams');
}

export async function createTeamAction(formData: FormData) {
  const name = formData.get('name') as string;
  const description = (formData.get('description') as string) || '';

  const res = await apiClient.post('/teams', { name, description });
  if (res.success) {
    revalidatePath('/');
  }
  return res;
}

export async function joinTeamAction(formData: FormData) {
  const teamId = formData.get('teamId') as string;

  const res = await apiClient.post(`/teams/${teamId}/join`);
  if (res.success) {
    revalidatePath('/');
  }
  return res;
}

export async function getKudosAction() {
  return await apiClient.get('/teams/kudos', { limit: 20 });
}

export async function sendKudosAction(formData: FormData) {
  const receiverId = formData.get('receiverId') as string;
  const message = formData.get('message') as string;

  const res = await apiClient.post('/teams/kudos/send', { receiverId, message });
  if (res.success) {
    revalidatePath('/');
  }
  return res;
}
