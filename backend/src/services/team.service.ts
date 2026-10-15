import { prisma } from '../lib/prisma';
import { ValidationError } from '../lib/errors';

export class TeamService {
  /**
   * Fetches all teams with member details and aggregated team Aura scores.
   * Auto-seeds baseline competition teams if none exist.
   */
  static async getTeams() {
    let teams = await prisma.team.findMany({
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (teams.length === 0) {
      // Find an admin or first user to be creator
      const creator = await prisma.user.findFirst();
      if (creator) {
        const defaultTeams = [
          { name: 'Momentum Makers', description: 'Driving customer-facing momentum and rapid prototypes.' },
          { name: 'Focus Force', description: 'Deep work and technical architecture sprints.' },
          { name: 'Idea Igniters', description: 'Product experimentation and user insights team.' },
          { name: 'Spark Squad', description: 'Quality assurance, release stability, and craft.' },
        ];

        for (const dt of defaultTeams) {
          await this.createTeam({
            name: dt.name,
            description: dt.description,
            createdById: creator.id,
          });
        }

        teams = await prisma.team.findMany({
          include: {
            createdBy: { select: { id: true, name: true, email: true } },
            members: {
              include: {
                user: {
                  select: { id: true, name: true, email: true }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        });
      }
    }

    // Aggregate Aura transactions by user to compute each team's combined Aura
    const userAuraAggs = await prisma.auraTransaction.groupBy({
      by: ['userId'],
      _sum: { amount: true }
    });

    const userAuraMap: Record<string, number> = {};
    for (const agg of userAuraAggs) {
      userAuraMap[agg.userId] = agg._sum.amount || 0;
    }

    // Attach combinedAura to each team
    return teams.map((team) => {
      const combinedAura = team.members.reduce((acc, m) => {
        return acc + (userAuraMap[m.userId] || 0);
      }, 0);

      return {
        ...team,
        combinedAura,
        memberCount: team.members.length,
      };
    });
  }

  /**
   * Creates a team and automatically adds the creator as OWNER.
   */
  static async createTeam(data: { name: string; createdById: string; description?: string }) {
    if (!data.name || !data.createdById) {
      throw new ValidationError('Team name and Creator ID are required');
    }

    return await prisma.$transaction(async (tx) => {
      const team = await tx.team.create({
        data: {
          name: data.name,
          description: data.description,
          createdById: data.createdById,
        }
      });

      await tx.teamMember.create({
        data: {
          teamId: team.id,
          userId: data.createdById,
          role: 'OWNER'
        }
      });

      return team;
    });
  }

  /**
   * Adds a user to a team.
   */
  static async addMember(teamId: string, userId: string, role: string = 'MEMBER') {
    if (!teamId || !userId) {
      throw new ValidationError('Team ID and User ID are required');
    }

    // Check if membership already exists
    const existing = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId,
        }
      }
    });

    if (existing) {
      return existing;
    }

    return await prisma.teamMember.create({
      data: {
        teamId,
        userId,
        role,
      }
    });
  }
}
