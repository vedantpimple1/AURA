import { prisma } from "@/lib/prisma";
import { AuraService } from "./aura.service";
import { NotificationService } from "./notification.service";

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
      throw new Error('Title and Creator ID are required');
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

  // 2. Fetch all tasks (optionally filtered by assignee)
  static async getTasks(userId?: string) {
    if (userId) {
      // Return assignments for a specific user
      return await prisma.taskAssignment.findMany({
        where: { userId },
        include: {
          task: {
            include: { createdBy: { select: { name: true } } }
          },
          submissions: {
            orderBy: { submittedAt: 'desc' },
            take: 1,
            include: { reviews: true }
          }
        },
        orderBy: { assignedAt: 'desc' }
      });
    }

    // Return all tasks for admins
    return await prisma.task.findMany({
      include: {
        createdBy: { select: { name: true } },
        assignments: {
          include: {
            user: { select: { name: true, email: true, id: true } },
            submissions: {
              include: {
                reviews: true
              },
              orderBy: { submittedAt: 'desc' },
              take: 1
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 3. Assign task to a user
  static async assignTask(taskId: string, userId: string, assignedById: string) {
    if (!taskId || !userId || !assignedById) {
      throw new Error('Task ID, User ID, and Assigner ID are required');
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

  // 4. Submit task (Member)
  static async submitTask(assignmentId: string, submittedById: string, content?: string) {
    if (!assignmentId || !submittedById) {
      throw new Error('Assignment ID and Submitter ID are required');
    }

    return await prisma.$transaction(async (tx: any) => {
      // 1. Update assignment status
      await tx.taskAssignment.update({
        where: { id: assignmentId },
        data: { status: 'SUBMITTED' }
      });

      // 2. Create submission record
      return await tx.taskSubmission.create({
        data: {
          assignmentId,
          submittedById,
          content,
        }
      });
    });
  }

  // 5. Review and Approve task (Admin)
  static async reviewTask(submissionId: string, reviewerId: string, status: "APPROVED" | "NEEDS_CHANGES", feedback?: string) {
    const submission = await prisma.taskSubmission.findUnique({
      where: { id: submissionId },
      include: { assignment: { include: { task: true } } },
    });

    if (!submission) throw new Error("Submission not found");

    // 1. Create review
    const review = await prisma.taskReview.create({
      data: {
        submissionId,
        reviewerId,
        status,
        feedback,
      },
    });

    if (status === "APPROVED") {
      // 2. Mark assignment as completed
      await prisma.taskAssignment.update({
        where: { id: submission.assignmentId },
        data: { status: "COMPLETED", completedAt: new Date() },
      });

      // 3. Award Aura points! This bridges Phase 06 with Phase 05 logic.
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
      // Revert assignment status to in-progress (or NEEDS_CHANGES)
      await prisma.taskAssignment.update({
        where: { id: submission.assignmentId },
        data: { status: "NEEDS_CHANGES" },
      });

      // Notify member that changes are requested
      try {
        await NotificationService.dispatch({
          userId: submission.submittedById,
          type: "TASK_NEEDS_CHANGES",
          title: "Changes Requested 📝",
          message: `Feedback received on "${submission.assignment.task.title}": ${feedback || "Please review reviewer comments and resubmit."}`,
          metadata: { taskId: submission.assignment.taskId, submissionId },
        });
      } catch (e) {
        console.error("Non-blocking notification error:", e);
      }
    }

    return review;
  }

  // 6. Delete a task (Admin-only) — cascades to assignments via Prisma schema
  static async deleteTask(taskId: string) {
    if (!taskId) throw new Error('Task ID is required');

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
    if (!assignmentId || !status) throw new Error('Assignment ID and status are required');
    const validStatuses = ['ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'NEEDS_CHANGES'];
    if (!validStatuses.includes(status)) throw new Error(`Invalid status: ${status}`);

    return await prisma.taskAssignment.update({
      where: { id: assignmentId },
      data: {
        status,
        ...(status === 'COMPLETED' ? { completedAt: new Date() } : { completedAt: null }),
      },
    });
  }
}
