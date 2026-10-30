import { prisma } from '../lib/prisma';
import { AuthorizationError, NotFoundError, ValidationError } from '../lib/errors';
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

    const normalizedEmail = data.email.trim().toLowerCase();
    const normalizedEmployeeId = data.employeeId.trim();

    // 1. Check for duplicate Email
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) throw new ValidationError('Email already in use');

    // 2. Check for duplicate Employee ID
    const existingEmployee = await prisma.user.findUnique({ where: { employeeId: normalizedEmployeeId } });
    if (existingEmployee) throw new ValidationError('An employee with this Employee ID already exists');

    const role = await prisma.role.findUnique({ where: { name: data.roleName } });
    if (!role) throw new ValidationError(`Role ${data.roleName} does not exist`);

    const defaultPasswordHash = await hashPassword('changeme123');

    return await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: data.name.trim(),
        employeeId: normalizedEmployeeId,
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

  static async deleteUser(targetUserId: string, callerRoles: string[] = [], callerUserId?: string) {
    if (!targetUserId) throw new ValidationError('User ID is required');

    if (callerUserId && targetUserId === callerUserId) {
      throw new AuthorizationError('You cannot delete your own account');
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { roles: { include: { role: true } } },
    });

    if (!targetUser) throw new NotFoundError('User not found');

    const targetIsSuperAdmin = targetUser.roles.some((r) => r.role.name.toUpperCase() === 'SUPERADMIN');
    const targetIsAdmin = targetUser.roles.some((r) => r.role.name.toUpperCase() === 'ADMIN');
    const callerIsSuperAdmin = callerRoles.some((r) => r.toUpperCase() === 'SUPERADMIN');

    // Rule: Admins cannot delete Superadmins or other Admins
    if (!callerIsSuperAdmin && (targetIsSuperAdmin || targetIsAdmin)) {
      throw new AuthorizationError('Admins cannot delete other Admins or Superadmins');
    }

    // Cascade delete in transaction to clean up ALL foreign key relations
    await prisma.$transaction(async (tx: any) => {
      // 1. Clean up password reset requests where user is the target
      await tx.passwordResetRequest.deleteMany({
        where: { userId: targetUserId },
      });
      // Nullify operator references (schema uses onDelete: SetNull for these)
      await tx.passwordResetRequest.updateMany({
        where: { verifiedById: targetUserId },
        data: { verifiedById: null },
      });
      await tx.passwordResetRequest.updateMany({
        where: { issuedById: targetUserId },
        data: { issuedById: null },
      });
      await tx.passwordResetRequest.updateMany({
        where: { cancelledById: targetUserId },
        data: { cancelledById: null },
      });

      // 2. Notification deliveries (child of Notification) then notifications & preferences
      const userNotifications = await tx.notification.findMany({
        where: { userId: targetUserId },
        select: { id: true },
      });
      if (userNotifications.length > 0) {
        await tx.notificationDelivery.deleteMany({
          where: { notificationId: { in: userNotifications.map((n: any) => n.id) } },
        });
      }
      await tx.notification.deleteMany({ where: { userId: targetUserId } });
      await tx.notificationPreference.deleteMany({ where: { userId: targetUserId } });

      // 3. User badges, transactions, redemptions, kudos
      await tx.userBadge.deleteMany({ where: { userId: targetUserId } });
      await tx.auraTransaction.deleteMany({ where: { userId: targetUserId } });
      await tx.redemption.deleteMany({ where: { userId: targetUserId } });
      await tx.kudos.deleteMany({
        where: {
          OR: [{ senderId: targetUserId }, { receiverId: targetUserId }],
        },
      });

      // 4. Task submissions, reviews, and assignments
      //    — clean up reviews BY this user
      await tx.taskReview.deleteMany({ where: { reviewerId: targetUserId } });
      //    — clean up submissions BY this user (and their reviews first)
      const submissions = await tx.taskSubmission.findMany({ where: { submittedById: targetUserId }, select: { id: true } });
      if (submissions.length > 0) {
        await tx.taskReview.deleteMany({ where: { submissionId: { in: submissions.map((s: any) => s.id) } } });
      }
      await tx.taskSubmission.deleteMany({ where: { submittedById: targetUserId } });
      //    — clean up assignments TO this user (and their submissions/reviews first)
      const assignments = await tx.taskAssignment.findMany({ where: { userId: targetUserId }, select: { id: true } });
      if (assignments.length > 0) {
        const assignmentIds = assignments.map((a: any) => a.id);
        const assignmentSubmissions = await tx.taskSubmission.findMany({
          where: { assignmentId: { in: assignmentIds } },
          select: { id: true },
        });
        if (assignmentSubmissions.length > 0) {
          await tx.taskReview.deleteMany({ where: { submissionId: { in: assignmentSubmissions.map((s: any) => s.id) } } });
          await tx.taskSubmission.deleteMany({ where: { assignmentId: { in: assignmentIds } } });
        }
      }
      await tx.taskAssignment.deleteMany({ where: { userId: targetUserId } });
      //    — clean up assignments MADE BY this user (and their child submissions/reviews)
      const assignedByMe = await tx.taskAssignment.findMany({ where: { assignedById: targetUserId }, select: { id: true } });
      if (assignedByMe.length > 0) {
        const abmIds = assignedByMe.map((a: any) => a.id);
        const abmSubmissions = await tx.taskSubmission.findMany({
          where: { assignmentId: { in: abmIds } },
          select: { id: true },
        });
        if (abmSubmissions.length > 0) {
          await tx.taskReview.deleteMany({ where: { submissionId: { in: abmSubmissions.map((s: any) => s.id) } } });
          await tx.taskSubmission.deleteMany({ where: { assignmentId: { in: abmIds } } });
        }
        await tx.taskAssignment.deleteMany({ where: { assignedById: targetUserId } });
      }

      // 5. Tasks CREATED BY this user (and all their children)
      const createdTasks = await tx.task.findMany({ where: { createdById: targetUserId }, select: { id: true } });
      if (createdTasks.length > 0) {
        const taskIds = createdTasks.map((t: any) => t.id);
        // Find all assignments under those tasks
        const taskAssignments = await tx.taskAssignment.findMany({
          where: { taskId: { in: taskIds } },
          select: { id: true },
        });
        if (taskAssignments.length > 0) {
          const taIds = taskAssignments.map((a: any) => a.id);
          const taSubs = await tx.taskSubmission.findMany({
            where: { assignmentId: { in: taIds } },
            select: { id: true },
          });
          if (taSubs.length > 0) {
            await tx.taskReview.deleteMany({ where: { submissionId: { in: taSubs.map((s: any) => s.id) } } });
            await tx.taskSubmission.deleteMany({ where: { assignmentId: { in: taIds } } });
          }
          await tx.taskAssignment.deleteMany({ where: { taskId: { in: taskIds } } });
        }
        await tx.task.deleteMany({ where: { createdById: targetUserId } });
      }

      // 6. Remove member from all Teams
      await tx.teamMember.deleteMany({ where: { userId: targetUserId } });

      // 7. Teams CREATED BY this user — reassign or delete
      //    Delete members first, then the team
      const createdTeams = await tx.team.findMany({ where: { createdById: targetUserId }, select: { id: true } });
      if (createdTeams.length > 0) {
        const teamIds = createdTeams.map((t: any) => t.id);
        await tx.teamMember.deleteMany({ where: { teamId: { in: teamIds } } });
        await tx.team.deleteMany({ where: { createdById: targetUserId } });
      }

      // 8. Audit logs — nullify the actor reference
      await tx.auditLog.updateMany({
        where: { actorId: targetUserId },
        data: { actorId: null },
      });

      // 9. User Roles
      await tx.userRole.deleteMany({ where: { userId: targetUserId } });

      // 10. Delete User
      await tx.user.delete({ where: { id: targetUserId } });
    });

    return { success: true };
  }
}
