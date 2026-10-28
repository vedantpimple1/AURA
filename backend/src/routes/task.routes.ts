import { Router, Request, Response } from 'express';
import { TaskService } from '../services/task.service';
import { requireAuth, requireRole } from '../middleware/requireAuth';
import { handleError } from '../lib/errors';

export const taskRouter = Router();

/**
 * GET /api/tasks
 * Admins see all tasks; members see only their assignments.
 */
taskRouter.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const session = req.session!;
    const isAdmin = session.roles?.some(r => ['ADMIN', 'SUPERADMIN'].includes(r.toUpperCase()));
    const tasks = await TaskService.getTasks(isAdmin ? undefined : session.userId);
    res.json({ success: true, data: tasks });
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});

/**
 * POST /api/tasks
 * Creates a new task and optionally assigns it. Requires ADMIN or SUPERADMIN.
 * Supports assignToAll flag to assign the task to all users.
 */
taskRouter.post('/', requireRole('ADMIN', 'SUPERADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const session = req.session!;
    const { title, description, baseAura, assigneeId, assignToAll, deadline } = req.body as {
      title?: string;
      description?: string;
      baseAura?: number;
      assigneeId?: string;
      assignToAll?: boolean;
      deadline?: string;
    };

    if (!title || baseAura === undefined) {
      res.status(400).json({ success: false, error: 'title and baseAura are required', code: 'VALIDATION_ERROR' });
      return;
    }

    const task = await TaskService.createTask({
      title,
      description: description || '',
      baseAura: Number(baseAura),
      createdById: session.userId,
      deadline: deadline ? new Date(deadline) : undefined,
    });

    if (assignToAll) {
      await TaskService.assignTaskToAll(task.id, session.userId);
    } else if (assigneeId) {
      await TaskService.assignTask(task.id, assigneeId, session.userId);
    }

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});

/**
 * DELETE /api/tasks/:taskId
 * Deletes a task. Requires ADMIN or SUPERADMIN.
 * Enforces rule: Admin cannot delete tasks created by Superadmin.
 */
taskRouter.delete('/:taskId', requireRole('ADMIN', 'SUPERADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const session = req.session!;
    await TaskService.deleteTask(req.params.taskId as string, session.roles);
    res.json({ success: true });
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});

/**
 * POST /api/tasks/submit
 * Member submits work for an assigned task.
 */
taskRouter.post('/submit', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const session = req.session!;
    const { assignmentId, content } = req.body as { assignmentId?: string; content?: string };

    if (!assignmentId || !content) {
      res.status(400).json({ success: false, error: 'assignmentId and content are required', code: 'VALIDATION_ERROR' });
      return;
    }

    const submission = await TaskService.submitTask(assignmentId, session.userId, content);
    res.status(201).json({ success: true, data: submission });
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});

/**
 * POST /api/tasks/review
 * Admin reviews a task submission.
 */
taskRouter.post('/review', requireRole('ADMIN', 'SUPERADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const session = req.session!;
    const { submissionId, status, feedback } = req.body as {
      submissionId?: string;
      status?: 'APPROVED' | 'NEEDS_CHANGES';
      feedback?: string;
    };

    if (!submissionId || !status) {
      res.status(400).json({ success: false, error: 'submissionId and status are required', code: 'VALIDATION_ERROR' });
      return;
    }

    const review = await TaskService.reviewTask(submissionId, session.userId, status, feedback ?? '');
    res.json({ success: true, data: review });
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});

/**
 * PATCH /api/tasks/assignments/:assignmentId/status
 * Admin updates a task assignment status.
 */
taskRouter.patch('/assignments/:assignmentId/status', requireRole('ADMIN', 'SUPERADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.body as { status?: string };
    if (!status) {
      res.status(400).json({ success: false, error: 'status is required', code: 'VALIDATION_ERROR' });
      return;
    }

    await TaskService.updateAssignmentStatus(req.params.assignmentId as string, status);
    res.json({ success: true });
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});
