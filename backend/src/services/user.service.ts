import { prisma } from '../lib/prisma';
import { NotFoundError, ValidationError } from '../lib/errors';
import { hashPassword } from '../lib/auth';

/**
 * UserService
 * 
 * Responsible for all business logic related to Users.
 */
export class UserService {
  
  static async getUserById(userId: string) {
    if (!userId) throw new ValidationError('User ID is required');

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        avatarUrl: true,
        status: true,
        createdAt: true,
      }
    });

    if (!user) throw new NotFoundError('User not found');
    return user;
  }

  static async getUsers() {
    return await prisma.user.findMany({
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        status: true,
        batch: { select: { name: true, year: true } },
        roles: { include: { role: true } },
        teamMembers: { include: { team: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async createUser(data: { email: string, name: string, employeeId: string, roleName: string, teamId?: string }) {
    if (!data.email || !data.name || !data.employeeId || !data.roleName) {
      throw new ValidationError('Missing required user fields');
    }

    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) throw new ValidationError('Email already in use');

    const role = await prisma.role.findUnique({ where: { name: data.roleName } });
    if (!role) throw new ValidationError(`Role ${data.roleName} does not exist`);

    const defaultPasswordHash = await hashPassword('changeme123');

    return await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        employeeId: data.employeeId,
        passwordHash: defaultPasswordHash,
        roles: {
          create: { roleId: role.id }
        },
        ...(data.teamId && {
          teamMembers: {
            create: { teamId: data.teamId, role: 'MEMBER' }
          }
        })
      },
      select: { id: true, email: true, name: true, status: true }
    });
  }
}
