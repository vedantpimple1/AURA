'use server';

import { apiClient } from '@/lib/api-client';
import { revalidatePath } from 'next/cache';

export async function getTasksAction() {
  return await apiClient.get('/tasks');
}

export async function createTaskAction(formData: FormData) {
  const title = formData.get('title') as string;
  const description = (formData.get('description') as string) || '';
  const baseAura = parseInt(formData.get('baseAura') as string, 10);
  const assigneeId = (formData.get('assigneeId') as string) || undefined;
  const deadline = (formData.get('deadline') as string) || undefined;

  const res = await apiClient.post('/tasks', {
    title,
    description,
    baseAura,
    assigneeId,
    deadline,
  });

  if (res.success) {
    revalidatePath('/');
  }
  return res;
}

export async function submitTaskAction(formData: FormData) {
  const assignmentId = formData.get('assignmentId') as string;
  const content = formData.get('content') as string;

  const res = await apiClient.post('/tasks/submit', { assignmentId, content });
  if (res.success) {
    revalidatePath('/');
  }
  return res;
}

export async function reviewTaskAction(formData: FormData) {
  const submissionId = formData.get('submissionId') as string;
  const status = formData.get('status') as string;
  const feedback = formData.get('feedback') as string;

  const res = await apiClient.post('/tasks/review', { submissionId, status, feedback });
  if (res.success) {
    revalidatePath('/');
  }
  return res;
}

export async function deleteTaskAction(formData: FormData) {
  const taskId = formData.get('taskId') as string;

  const res = await apiClient.delete(`/tasks/${taskId}`);
  if (res.success) {
    revalidatePath('/');
  }
  return res;
}

export async function updateAssignmentStatusAction(formData: FormData) {
  const assignmentId = formData.get('assignmentId') as string;
  const status = formData.get('status') as string;

  const res = await apiClient.patch(`/tasks/assignments/${assignmentId}/status`, { status });
  if (res.success) {
    revalidatePath('/');
  }
  return res;
}
