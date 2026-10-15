import { Router, Request, Response } from 'express';
import { AiService } from '../services/ai.service';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/requireAuth';
import { handleError } from '../lib/errors';

export const aiRouter = Router();

/**
 * POST /api/ai/breakdown-task
 * AI-powered task breakdown from an objective.
 */
aiRouter.post('/breakdown-task', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { objective } = req.body as { objective?: string };

    if (!objective || objective.trim().length < 3) {
      res.status(400).json({ success: false, error: 'Please enter a description or objective (at least 3 characters)', code: 'VALIDATION_ERROR' });
      return;
    }

    const draft = await AiService.breakdownTask(objective);
    res.json({ success: true, data: draft });
  } catch (error) {
    console.error('Error generating AI task draft:', error);
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});

/**
 * GET /api/ai/team-insights
 * AI-generated team insights based on current data.
 */
aiRouter.get('/team-insights', requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const [totalTeams, topTeam, totalKudosCount, pendingTasksCount] = await Promise.all([
      prisma.team.count(),
      prisma.team.findFirst({
        include: {
          members: {
            include: {
              user: {
                include: {
                  auraTransactions: true,
                },
              },
            },
          },
        },
      }),
      prisma.kudos.count(),
      prisma.taskAssignment.count({
        where: { status: 'SUBMITTED' },
      }),
    ]);

    let topTeamAura = 0;
    if (topTeam?.members) {
      for (const m of topTeam.members) {
        topTeamAura += m.user.auraTransactions.reduce((acc, t) => acc + t.amount, 0);
      }
    }

    const insights = await AiService.generateTeamInsights({
      totalTeams,
      topTeamName: topTeam?.name || 'Top Squad',
      topTeamAura: Math.max(topTeamAura, 0),
      totalKudosCount,
      pendingTasksCount,
    });

    res.json({ success: true, data: insights });
  } catch (error) {
    console.error('Error generating AI team insights:', error);
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});
