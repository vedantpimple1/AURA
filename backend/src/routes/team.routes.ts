import { Router, Request, Response } from 'express';
import { TeamService } from '../services/team.service';
import { KudosService } from '../services/kudos.service';
import { requireAuth } from '../middleware/requireAuth';
import { handleError } from '../lib/errors';

export const teamRouter = Router();

/**
 * GET /api/teams
 * Returns all teams. Requires auth.
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
 * Creates a new team. Requires auth.
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
 * POST /api/teams/:teamId/join
 * Current user joins a team.
 */
teamRouter.post('/:teamId/join', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const session = req.session!;
    const member = await TeamService.addMember(req.params.teamId as string, session.userId);
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
 * POST /api/teams/kudos
 * Sends kudos from the logged-in user to a receiver.
 */
teamRouter.post('/kudos', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const session = req.session!;
    const { receiverId, message } = req.body as { receiverId?: string; message?: string };

    if (!receiverId || !message) {
      res.status(400).json({ success: false, error: 'receiverId and message are required', code: 'VALIDATION_ERROR' });
      return;
    }

    const kudos = await KudosService.sendKudos({
      senderId: session.userId,
      receiverId,
      message,
    });

    res.status(201).json({ success: true, data: kudos });
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});
