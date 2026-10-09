"use server";

import { TaskService } from "@/services/task.service";
import { getSession } from "@/lib/auth";
import { handleError } from "@/lib/errors";
import { revalidatePath } from "next/cache";

export async function getTasksAction() {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');
    
    // Admins see all tasks, members see only their assignments
    const isAdmin = session.roles?.includes('ADMIN') || session.roles?.includes('SUPERADMIN');
    const tasks = await TaskService.getTasks(isAdmin ? undefined : session.userId);
    
    return { success: true, data: tasks };
  } catch (error) {
    return { success: false, ...handleError(error) };
  }
}

export async function createTaskAction(formData: FormData) {
  try {
    const session = await getSession();
    if (!session || !session.roles?.includes('ADMIN')) {
      throw new Error('Unauthorized: Only admins can create tasks');
    }

    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const baseAura = parseInt(formData.get('baseAura') as string, 10);
    const assigneeId = formData.get('assigneeId') as string;
    const deadlineStr = formData.get('deadline') as string;
    const deadline = deadlineStr ? new Date(deadlineStr) : undefined;

    // 1. Create the Task
    const task = await TaskService.createTask({
      title,
      description,
      baseAura,
      createdById: session.userId,
      deadline,
    });

    // 2. Automatically assign it to the selected user (or leave open if we support that later)
    if (assigneeId) {
      await TaskService.assignTask(task.id, assigneeId, session.userId);
    }

    revalidatePath("/");
    return { success: true, data: task };
  } catch (error) {
    return { success: false, ...handleError(error) };
  }
}

export async function submitTaskAction(formData: FormData) {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    const assignmentId = formData.get('assignmentId') as string;
    const content = formData.get('content') as string;

    const submission = await TaskService.submitTask(assignmentId, session.userId, content);

    revalidatePath("/");
    return { success: true, data: submission };
  } catch (error) {
    return { success: false, ...handleError(error) };
  }
}

export async function reviewTaskAction(formData: FormData) {
  try {
    const session = await getSession();
    if (!session || !session.roles?.includes('ADMIN')) {
      throw new Error('Unauthorized: Only admins can review tasks');
    }

    const submissionId = formData.get('submissionId') as string;
    const status = formData.get('status') as "APPROVED" | "NEEDS_CHANGES";
    const feedback = formData.get('feedback') as string;

    const review = await TaskService.reviewTask(submissionId, session.userId, status, feedback);

    revalidatePath("/");
    return { success: true, data: review };
  } catch (error) {
    return { success: false, ...handleError(error) };
  }
}

export async function deleteTaskAction(formData: FormData) {
  try {
    const session = await getSession();
    if (!session || (!session.roles?.includes('ADMIN') && !session.roles?.includes('SUPERADMIN'))) {
      throw new Error('Unauthorized: Only admins can delete tasks');
    }
    const taskId = formData.get('taskId') as string;
    await TaskService.deleteTask(taskId);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { success: false, ...handleError(error) };
  }
}

export async function updateAssignmentStatusAction(formData: FormData) {
  try {
    const session = await getSession();
    if (!session || (!session.roles?.includes('ADMIN') && !session.roles?.includes('SUPERADMIN'))) {
      throw new Error('Unauthorized: Only admins can update assignment status');
    }
    const assignmentId = formData.get('assignmentId') as string;
    const status = formData.get('status') as string;
    await TaskService.updateAssignmentStatus(assignmentId, status);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { success: false, ...handleError(error) };
  }
}
