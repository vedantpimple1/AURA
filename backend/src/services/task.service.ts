import { prisma } from "../lib/prisma";
import { AuraService } from "./aura.service";
import { NotificationService } from "./notification.service";
import { AuthorizationError, NotFoundError, ValidationError } from "../lib/errors";

/**
 * TaskService
 * 
 * Manages the Task lifecycle (Creation, Assignment, Submission, Review).
 */
export class TaskService {
  
  // 1. Create a global task
  static async createTask(data: {
    title: string;
    description: string;
    baseAura: number;
    createdById: string;
    deadline?: Date;
  }) {
    if (!data.title || !data.createdById) {
      throw new ValidationError('Title and Creator ID are required');
    }

    return await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        baseAura: data.baseAura,
        createdById: data.createdById,
        deadline: data.deadline,
        status: "ACTIVE",
      },
    });
  }

  // 1b. Fetch single task with full relation details
  static async getTaskById(taskId: string) {
    if (!taskId) throw new ValidationError('Task ID is required');

    return await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            roles: { include: { role: true } },
          },
        },
        assignments: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            submissions: {
              include: {
                reviews: {
                  include: {
                    reviewer: { select: { id: true, name: true, email: true } },
                  },
                  orderBy: { reviewedAt: 'desc' },
                },
              },
              orderBy: { submittedAt: 'desc' },
            },
          },
        },
      },
    });
  }

  // 2. Fetch all tasks (optionally filtered by assignee)
  static async getTasks(userId?: string) {
    if (userId) {
      // Return assignments for a specific user
      return await prisma.taskAssignment.findMany({
        where: { userId },
        include: {
          task: {
            include: {
              createdBy: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  roles: { include: { role: true } },
                },
              },
            },
          },
          submissions: {
            orderBy: { submittedAt: 'desc' },
            take: 5,
            include: {
              reviews: {
                include: {
                  reviewer: { select: { id: true, name: true, email: true } },
                },
                orderBy: { reviewedAt: 'desc' },
              },
            },
          },
        },
        orderBy: { assignedAt: 'desc' },
      });
    }

    // Return all tasks for admins
    return await prisma.task.findMany({
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            roles: { include: { role: true } },
          },
        },
        assignments: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            submissions: {
              include: {
                reviews: {
                  include: {
                    reviewer: { select: { id: true, name: true, email: true } },
                  },
                  orderBy: { reviewedAt: 'desc' },
                },
              },
              orderBy: { submittedAt: 'desc' },
              take: 5,
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // 3. Assign task to a user
  static async assignTask(taskId: string, userId: string, assignedById: string) {
    if (!taskId || !userId || !assignedById) {
      throw new ValidationError('Task ID, User ID, and Assigner ID are required');
    }

    const assignment = await prisma.taskAssignment.create({
      data: {
        taskId,
        userId,
        assignedById,
      },
      include: {
        task: true,
      },
    });

    try {
      await NotificationService.dispatch({
        userId,
        type: 'TASK_ASSIGNED',
        title: 'New Task Assigned 🎯',
        message: `You were assigned to "${assignment.task.title}" (+${assignment.task.baseAura} Aura reward).`,
        metadata: { taskId, assignmentId: assignment.id },
      });
    } catch (e) {
      console.error('Non-blocking notification error:', e);
    }

    return assignment;
  }

  // 3b. Assign task to all active users
  static async assignTaskToAll(taskId: string, assignedById: string) {
    if (!taskId || !assignedById) {
      throw new ValidationError('Task ID and Assigner ID are required');
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundError('Task not found');
    }

    const users = await prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, email: true },
    });

    if (users.length === 0) {
      return [];
    }

    const assignments = await Promise.all(
      users.map(async (user) => {
        return await prisma.taskAssignment.create({
          data: {
            taskId,
            userId: user.id,
            assignedById,
          },
        });
      })
    );

    try {
      await Promise.all(
        users.map((user, idx) =>
          NotificationService.dispatch({
            userId: user.id,
            type: 'TASK_ASSIGNED',
            title: 'New Task Assigned 🎯',
            message: `You were assigned to "${task.title}" (+${task.baseAura} Aura reward).`,
            metadata: { taskId, assignmentId: assignments[idx]?.id },
          }).catch((e) => console.error(`Notification error for user ${user.id}:`, e))
        )
      );
    } catch (e) {
      console.error('Non-blocking notification error in assignTaskToAll:', e);
    }

    return assignments;
  }

  // 4. Submit task (Member)
  static async submitTask(assignmentId: string, submittedById: string, content?: string) {
    if (!assignmentId || !submittedById) {
      throw new ValidationError('Assignment ID and Submitter ID are required');
    }

    const existingAssignment = await prisma.taskAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        task: true,
        user: true,
      },
    });

    if (!existingAssignment) {
      throw new NotFoundError('Task assignment not found');
    }

    const isResubmission = existingAssignment.status === 'NEEDS_CHANGES';

    const submission = await prisma.$transaction(async (tx: any) => {
      // 1. Update assignment status
      await tx.taskAssignment.update({
        where: { id: assignmentId },
        data: { status: 'SUBMITTED' },
      });

      // Count prior submissions for version tracking
      const priorCount = await tx.taskSubmission.count({
        where: { assignmentId },
      });

      // 2. Create submission record
      return await tx.taskSubmission.create({
        data: {
          assignmentId,
          submittedById,
          content: content || '',
          version: priorCount + 1,
        },
      });
    });

    // Notify all active ADMIN and SUPERADMIN users that a review is pending
    try {
      const admins = await prisma.user.findMany({
        where: {
          status: 'ACTIVE',
          roles: {
            some: {
              role: {
                name: { in: ['ADMIN', 'SUPERADMIN', 'Admin', 'Superadmin'] },
              },
            },
          },
        },
        select: { id: true, name: true, email: true },
      });

      const submitterName = existingAssignment.user?.name || existingAssignment.user?.email || 'A member';
      const taskTitle = existingAssignment.task?.title || 'a task';
      const notifTitle = isResubmission ? 'Task Resubmitted for Review 🔄' : 'Task Review Pending 📋';
      const previewText = content && content.trim() ? ` Notes: "${content.trim().slice(0, 70)}${content.trim().length > 70 ? '...' : ''}"` : '';
      const notifMessage = `${submitterName} ${isResubmission ? 'resubmitted revised work' : 'submitted work'} for "${taskTitle}".${previewText} Review required.`;

      await Promise.all(
        admins.map((admin) =>
          NotificationService.dispatch({
            userId: admin.id,
            type: 'TASK_SUBMISSION_PENDING',
            title: notifTitle,
            message: notifMessage,
            metadata: {
              taskId: existingAssignment.taskId,
              assignmentId,
              submissionId: submission.id,
              submittedById,
              isResubmission,
            },
          }).catch((err) => console.error(`Failed to notify admin ${admin.id}:`, err))
        )
      );
    } catch (notifErr) {
      console.error('Non-blocking notification error in submitTask:', notifErr);
    }

    return submission;
  }

  // 5. Review and Approve task (Admin)
  static async reviewTask(submissionId: string, reviewerId: string, status: "APPROVED" | "NEEDS_CHANGES", feedback?: string) {
    const submission = await prisma.taskSubmission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: {
          include: {
            task: true,
            user: true,
          },
        },
      },
    });

    if (!submission) throw new NotFoundError("Submission not found");

    // 1. Create review record
    const review = await prisma.taskReview.create({
      data: {
        submissionId,
        reviewerId,
        status,
        feedback: feedback || '',
      },
    });

    if (status === "APPROVED") {
      // 2. Mark assignment as completed
      await prisma.taskAssignment.update({
        where: { id: submission.assignmentId },
        data: { status: "COMPLETED", completedAt: new Date() },
      });

      // 3. Award Aura points
      await AuraService.addTransaction({
        userId: submission.submittedById,
        type: "TASK_REWARD",
        amount: submission.assignment.task.baseAura,
        description: `Task completed: ${submission.assignment.task.title}`,
        sourceType: "TASK",
        sourceId: submission.assignment.taskId,
      });

      // 4. Notify member of task approval & Aura awarded
      try {
        await NotificationService.dispatch({
          userId: submission.submittedById,
          type: "TASK_APPROVED",
          title: "Task Approved! 🚀",
          message: `Your work on "${submission.assignment.task.title}" was approved! +${submission.assignment.task.baseAura} Aura added to your balance.`,
          metadata: { taskId: submission.assignment.taskId, submissionId },
        });
      } catch (e) {
        console.error("Non-blocking notification error:", e);
      }
    } else {
      // Revert assignment status to NEEDS_CHANGES
      await prisma.taskAssignment.update({
        where: { id: submission.assignmentId },
        data: { status: "NEEDS_CHANGES" },
      });

      // Notify member that changes are requested
      try {
        const feedbackSnippet = feedback?.trim() ? `Feedback: "${feedback.trim()}"` : 'Please check feedback and resubmit your work.';
        await NotificationService.dispatch({
          userId: submission.submittedById,
          type: "TASK_NEEDS_CHANGES",
          title: "Changes Requested 📝",
          message: `Changes requested on "${submission.assignment.task.title}". ${feedbackSnippet}`,
          metadata: { taskId: submission.assignment.taskId, submissionId, feedback },
        });
      } catch (e) {
        console.error("Non-blocking notification error:", e);
      }
    }

    return review;
  }

  // 6. Delete a task (Admin-only) — cascades to assignments via Prisma schema
  // Rule: Admin cannot delete tasks created by Superadmin. Superadmin can delete any task.
  static async deleteTask(taskId: string, callerRoles?: string[]) {
    if (!taskId) throw new ValidationError('Task ID is required');

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            roles: { include: { role: true } },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundError('Task not found');
    }

    if (callerRoles) {
      const isSuperAdmin = callerRoles.some((r) => r.toUpperCase() === 'SUPERADMIN');
      const creatorIsSuperAdmin = task.createdBy?.roles?.some(
        (r) => r.role.name.toUpperCase() === 'SUPERADMIN'
      );

      // Admin should not delete tasks created by Superadmin
      if (!isSuperAdmin && creatorIsSuperAdmin) {
        throw new AuthorizationError('Permission denied: Admins cannot delete tasks created by Superadmin.');
      }
    }

    // Delete in order: reviews -> submissions -> assignments -> task
    await prisma.$transaction(async (tx: any) => {
      // Delete all reviews for submissions in assignments of this task
      const assignments = await tx.taskAssignment.findMany({
        where: { taskId },
        include: { submissions: { include: { reviews: true } } },
      });

      for (const assignment of assignments) {
        for (const submission of assignment.submissions) {
          await tx.taskReview.deleteMany({ where: { submissionId: submission.id } });
        }
        await tx.taskSubmission.deleteMany({ where: { assignmentId: assignment.id } });
      }
      await tx.taskAssignment.deleteMany({ where: { taskId } });
      await tx.task.delete({ where: { id: taskId } });
    });
  }

  // 7. Update assignment status (Admin override)
  static async updateAssignmentStatus(assignmentId: string, status: string) {
    if (!assignmentId || !status) throw new ValidationError('Assignment ID and status are required');
    const validStatuses = ['ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'NEEDS_CHANGES'];
    if (!validStatuses.includes(status)) throw new ValidationError(`Invalid status: ${status}`);

    return await prisma.taskAssignment.update({
      where: { id: assignmentId },
      data: {
        status,
        ...(status === 'COMPLETED' ? { completedAt: new Date() } : { completedAt: null }),
      },
    });
  }
}
