import { Router, Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { requireAuth, requireRole } from '../middleware/requireAuth';
import { handleError } from '../lib/errors';

export const userRouter = Router();

/**
 * GET /api/users
 * Returns all users. Requires ADMIN or SUPERADMIN.
 */
userRouter.get('/', requireRole('ADMIN', 'SUPERADMIN'), async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await UserService.getUsers();
    res.json({ success: true, data: users });
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});

/**
 * GET /api/users/:id
 * Returns a user by ID. Requires auth.
 */
userRouter.get('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await UserService.getUserById(req.params.id as string);
    res.json({ success: true, data: user });
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});

/**
 * POST /api/users
 * Creates a new user. Requires ADMIN or SUPERADMIN.
 */
userRouter.post('/', requireRole('ADMIN', 'SUPERADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, name, employeeId, roleName, teamId } = req.body as {
      email?: string;
      name?: string;
      employeeId?: string;
      roleName?: string;
      teamId?: string;
    };

    if (!email || !name || !employeeId || !roleName) {
      res.status(400).json({ success: false, error: 'email, name, employeeId, and roleName are required', code: 'VALIDATION_ERROR' });
      return;
    }

    const user = await UserService.createUser({ email, name, employeeId, roleName, teamId });
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});

/**
 * DELETE /api/users/:id
 * Deletes a user with cascading cleanup. Requires ADMIN or SUPERADMIN.
 */
userRouter.delete('/:id', requireRole('ADMIN', 'SUPERADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const session = req.session!;
    const result = await UserService.deleteUser(
      req.params.id as string,
      session.roles || [],
      session.userId
    );
    res.json({ success: true, ...result });
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});
