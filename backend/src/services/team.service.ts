import { prisma } from '../lib/prisma';
import { ValidationError, NotFoundError } from '../lib/errors';

export class TeamService {
  /**
   * Fetches all teams with member details, individual member monthly Aura,
   * team monthly Aura, and team lifetime Aura scores.
   */
  static async getTeams() {
    const teams = await prisma.team.findMany({
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true }
            }
          },
          orderBy: { joinedAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // 1. Calculate current month earned Aura per user (amount > 0 within current calendar month)
    const monthlyUserAggs = await prisma.auraTransaction.groupBy({
      by: ['userId'],
      where: {
        amount: { gt: 0 },
        createdAt: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
    });

    const monthlyUserAuraMap: Record<string, number> = {};
    for (const agg of monthlyUserAggs) {
      monthlyUserAuraMap[agg.userId] = agg._sum.amount || 0;
    }

    // 2. Calculate lifetime earned Aura per user (amount > 0)
    const lifetimeUserAggs = await prisma.auraTransaction.groupBy({
      by: ['userId'],
      where: {
        amount: { gt: 0 },
      },
      _sum: { amount: true },
    });

    const lifetimeUserAuraMap: Record<string, number> = {};
    for (const agg of lifetimeUserAggs) {
      lifetimeUserAuraMap[agg.userId] = agg._sum.amount || 0;
    }

    // Attach individual member monthly Aura and aggregated team monthly/combined Aura
    return teams.map((team) => {
      const enrichedMembers = team.members.map((m) => {
        const monthlyAura = monthlyUserAuraMap[m.userId] || 0;
        const lifetimeAura = lifetimeUserAuraMap[m.userId] || 0;
        return {
          ...m,
          monthlyAura,
          lifetimeAura,
        };
      });

      const monthlyAura = enrichedMembers.reduce((acc, m) => acc + m.monthlyAura, 0);
      const combinedAura = enrichedMembers.reduce((acc, m) => acc + m.lifetimeAura, 0);

      return {
        ...team,
        members: enrichedMembers,
        monthlyAura,
        combinedAura,
        memberCount: enrichedMembers.length,
      };
    });
  }

  /**
   * Creates a team.
   * Logically starts with 0 members and 0 Aura points.
   * Creator is tracked in createdById without forcing them as a member.
   */
  static async createTeam(data: { name: string; createdById: string; description?: string }) {
    if (!data.name || !data.createdById) {
      throw new ValidationError('Team name and Creator ID are required');
    }

    const trimmedName = data.name.trim();
    if (!trimmedName) {
      throw new ValidationError('Team name cannot be empty');
    }

    return await prisma.team.create({
      data: {
        name: trimmedName,
        description: data.description?.trim() || null,
        createdById: data.createdById,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        members: true,
      }
    });
  }

  /**
   * Adds a user to a team.
   * Enforces single-team membership: a user cannot belong to more than one team.
   */
  static async addMember(teamId: string, userId: string, role: string = 'MEMBER') {
    if (!teamId || !userId) {
      throw new ValidationError('Team ID and User ID are required');
    }

    // 1. Verify target team exists
    const targetTeam = await prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, name: true }
    });
    if (!targetTeam) {
      throw new NotFoundError('Target team not found');
    }

    // 2. Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true }
    });
    if (!targetUser) {
      throw new NotFoundError('User not found');
    }

    // 3. Enforce single-team constraint: check if user is already assigned to any team
    const existingMembership = await prisma.teamMember.findFirst({
      where: { userId },
      include: {
        team: { select: { id: true, name: true } }
      }
    });

    if (existingMembership) {
      if (existingMembership.teamId === teamId) {
        return existingMembership; // already in this team
      }
      throw new ValidationError(
        `User "${targetUser.name || targetUser.email}" is already a member of team "${existingMembership.team.name}". A user cannot be assigned to more than one team.`
      );
    }

    return await prisma.teamMember.create({
      data: {
        teamId,
        userId,
        role: role.toUpperCase(),
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        team: { select: { id: true, name: true } },
      }
    });
  }

  /**
   * Removes a user from a team.
   */
  static async removeMember(teamId: string, userId: string) {
    if (!teamId || !userId) {
      throw new ValidationError('Team ID and User ID are required');
    }

    const existing = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId,
        }
      }
    });

    if (!existing) {
      throw new NotFoundError('Member is not part of this team');
    }

    return await prisma.teamMember.delete({
      where: {
        teamId_userId: {
          teamId,
          userId,
        }
      }
    });
  }

  /**
   * Updates a team's name or description.
   */
  static async updateTeam(teamId: string, data: { name?: string; description?: string }) {
    if (!teamId) {
      throw new ValidationError('Team ID is required');
    }

    const existing = await prisma.team.findUnique({ where: { id: teamId } });
    if (!existing) {
      throw new NotFoundError('Team not found');
    }

    return await prisma.team.update({
      where: { id: teamId },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description.trim() } : {}),
      }
    });
  }

  /**
   * Deletes a team.
   */
  static async deleteTeam(teamId: string) {
    if (!teamId) {
      throw new ValidationError('Team ID is required');
    }

    const existing = await prisma.team.findUnique({ where: { id: teamId } });
    if (!existing) {
      throw new NotFoundError('Team not found');
    }

    return await prisma.team.delete({
      where: { id: teamId }
    });
  }
}
