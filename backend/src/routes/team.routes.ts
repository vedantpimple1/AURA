import { Router, Request, Response } from 'express';
import { TeamService } from '../services/team.service';
import { KudosService } from '../services/kudos.service';
import { requireAuth, requireRole } from '../middleware/requireAuth';
import { handleError } from '../lib/errors';

export const teamRouter = Router();

/**
 * GET /api/teams
 * Returns all teams with monthly and lifetime Aura calculations. Requires auth.
 */
teamRouter.get('/', requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const teams = await TeamService.getTeams();
    res.json({ success: true, data: teams });
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});

/**
 * POST /api/teams
 * Creates a new team. Starts with 0 members and 0 Aura. Requires auth.
 */
teamRouter.post('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const session = req.session!;
    const { name, description } = req.body as { name?: string; description?: string };

    if (!name) {
      res.status(400).json({ success: false, error: 'name is required', code: 'VALIDATION_ERROR' });
      return;
    }

    const team = await TeamService.createTeam({
      name,
      description: description ?? '',
      createdById: session.userId,
    });

    res.status(201).json({ success: true, data: team });
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});

/**
 * PUT /api/teams/:teamId
 * Updates team metadata (name, description). Requires Admin or Superadmin.
 */
teamRouter.put('/:teamId', requireRole('ADMIN', 'SUPERADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const teamId = req.params.teamId as string;
    const { name, description } = req.body as { name?: string; description?: string };

    const updated = await TeamService.updateTeam(teamId, { name, description });
    res.json({ success: true, data: updated });
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});

/**
 * DELETE /api/teams/:teamId
 * Deletes a team. Requires Admin or Superadmin.
 */
teamRouter.delete('/:teamId', requireRole('ADMIN', 'SUPERADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const teamId = req.params.teamId as string;
    const deleted = await TeamService.deleteTeam(teamId);
    res.json({ success: true, data: deleted });
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});

/**
 * POST /api/teams/:teamId/members
 * Admin includes a member in a team. Enforces single-team membership.
 * Requires Admin or Superadmin.
 */
teamRouter.post('/:teamId/members', requireRole('ADMIN', 'SUPERADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const teamId = req.params.teamId as string;
    const { userId, role } = req.body as { userId?: string; role?: string };

    if (!userId) {
      res.status(400).json({ success: false, error: 'userId is required', code: 'VALIDATION_ERROR' });
      return;
    }

    const member = await TeamService.addMember(teamId, userId, role || 'MEMBER');
    res.status(201).json({ success: true, data: member });
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});

/**
 * DELETE /api/teams/:teamId/members/:userId
 * Admin removes a member from a team.
 * Requires Admin or Superadmin.
 */
teamRouter.delete('/:teamId/members/:userId', requireRole('ADMIN', 'SUPERADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const teamId = req.params.teamId as string;
    const userId = req.params.userId as string;
    const deleted = await TeamService.removeMember(teamId, userId);
    res.json({ success: true, data: deleted });
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});

/**
 * POST /api/teams/:teamId/join
 * Member self-join. Enforces single-team membership.
 */
teamRouter.post('/:teamId/join', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const session = req.session!;
    const teamId = req.params.teamId as string;
    const member = await TeamService.addMember(teamId, session.userId);
    res.status(201).json({ success: true, data: member });
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});

/**
 * GET /api/teams/kudos
 * Returns recent kudos. Requires auth.
 */
teamRouter.get('/kudos', requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const kudos = await KudosService.getRecentKudos(20);
    res.json({ success: true, data: kudos });
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});

/**
 * Handler for sending Kudos
 */
const handleSendKudos = async (req: Request, res: Response): Promise<void> => {
  try {
    const session = req.session!;
    const { receiverId, message, amount } = req.body as { receiverId?: string; message?: string; amount?: number };

    if (!receiverId || !message) {
      res.status(400).json({ success: false, error: 'receiverId and message are required', code: 'VALIDATION_ERROR' });
      return;
    }

    const kudos = await KudosService.sendKudos({
      senderId: session.userId,
      receiverId,
      message,
      amount: typeof amount === 'number' && amount > 0 ? amount : 10,
    });

    res.status(201).json({ success: true, data: kudos });
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
};

teamRouter.post('/kudos', requireAuth, handleSendKudos);
teamRouter.post('/kudos/send', requireAuth, handleSendKudos);
