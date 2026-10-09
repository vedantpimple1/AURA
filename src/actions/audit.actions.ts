'use server';

import { AuditService } from '@/services/audit.service';
import { getSession } from '@/lib/auth';
import { AuthorizationError } from '@/lib/errors';

export async function getAuditLogsAction() {
  const session = await getSession();
  if (!session || (!session.roles?.includes('ADMIN') && !session.roles?.includes('SUPERADMIN'))) {
    throw new AuthorizationError('Unauthorized access to audit logs');
  }

  return await AuditService.getLogs(100);
}
