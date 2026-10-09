import { prisma } from '@/lib/prisma';
import { ValidationError } from '@/lib/errors';

export class AuditService {
  /**
   * Logs an administrative or critical action.
   */
  static async log(data: {
    action: string;
    entityType: string;
    entityId: string;
    actorId?: string;
    metadata?: any;
  }) {
    if (!data.action || !data.entityType || !data.entityId) {
      throw new ValidationError('Invalid audit log payload');
    }

    return await prisma.auditLog.create({
      data: {
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        actorId: data.actorId,
        metadata: data.metadata || {},
      }
    });
  }

  /**
   * Fetches the latest audit logs.
   */
  static async getLogs(limit: number = 50) {
    return await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { actor: { select: { name: true, email: true } } }
    });
  }
}
