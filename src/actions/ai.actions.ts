'use server';

import { getSession } from '@/lib/auth';
import { AiService } from '@/services/ai.service';
import { prisma } from '@/lib/prisma';

export async function breakdownTaskAction(objective: string) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!objective || objective.trim().length < 3) {
      return { success: false, error: 'Please enter a description or objective (at least 3 characters)' };
    }

    const draft = await AiService.breakdownTask(objective);
    return { success: true, data: draft };
  } catch (error: any) {
    console.error('Error generating AI task draft:', error);
    return { success: false, error: error.message || 'Failed to generate task draft' };
  }
}

export async function getTeamInsightsAction() {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: 'Unauthorized' };
    }

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

    return { success: true, data: insights };
  } catch (error: any) {
    console.error('Error generating AI team insights:', error);
    return { success: false, error: error.message || 'Failed to generate insights' };
  }
}
