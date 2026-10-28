import { Request, Response, NextFunction } from 'express';
import { decrypt, SessionPayload } from '../lib/auth';
import { AuthenticationError, AuthorizationError } from '../lib/errors';
import { prisma } from '../lib/prisma';

// Augment Express Request to carry the decoded session
declare global {
  namespace Express {
    interface Request {
      session?: SessionPayload;
    }
  }
}

/**
 * Middleware that reads the JWT from the `session` cookie,
 * verifies it, verifies user account status and session validity against passwordChangedAt,
 * and attaches the decoded payload to req.session.
 * Returns 401 if the token is missing, invalid, expired, or invalidated.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.session as string | undefined;
    if (!token) {
      throw new AuthenticationError('No session token provided');
    }
    const payload = await decrypt(token);

    // Validate account status and session freshness against passwordChangedAt
    if (payload.userId) {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { status: true, passwordChangedAt: true },
      });

      if (!user) {
        throw new AuthenticationError('Account not found');
      }

      if (user.status !== 'ACTIVE') {
        throw new AuthenticationError('Account is inactive');
      }

      // If user changed password after this JWT was issued, reject session immediately
      if (user.passwordChangedAt && payload.iat) {
        const passwordChangedEpoch = Math.floor(user.passwordChangedAt.getTime() / 1000);
        if (payload.iat < passwordChangedEpoch) {
          throw new AuthenticationError('Session invalidated due to password reset. Please log in again.');
        }
      }
    }

    req.session = payload;
    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      res.status(401).json({ success: false, error: error.message, code: error.code });
    } else {
      res.status(401).json({ success: false, error: 'Unauthorized', code: 'UNAUTHENTICATED' });
    }
  }
}

/**
 * Middleware factory that additionally enforces role membership.
 * Usage: requireRole('ADMIN', 'SUPERADMIN')
 */
export function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await requireAuth(req, res, async () => {
      const userRoles = req.session?.roles?.map((r) => r.toUpperCase()) ?? [];
      const hasRole = roles.some((r) => userRoles.includes(r.toUpperCase()));
      if (!hasRole) {
        const err = new AuthorizationError('Administrative authorization required');
        res.status(403).json({ success: false, error: err.message, code: err.code });
        return;
      }
      next();
    });
  };
}

/**
 * Middleware factory that enforces explicit permission capability.
 * Decoupled from default ADMIN / SUPERADMIN roles.
 * Usage: requirePermission('PASSWORD_RESET_REQUEST_MANAGE')
 */
export function requirePermission(permissionName: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await requireAuth(req, res, async () => {
      const userId = req.session?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized', code: 'UNAUTHENTICATED' });
        return;
      }

      const userRoles = req.session?.roles?.map((r) => r.toUpperCase()) ?? [];
      let authorized = false;

      // Allow if explicit role grant exists in token or via database lookup
      if (userRoles.includes('RECOVERY_OPERATOR') && permissionName === 'PASSWORD_RESET_REQUEST_MANAGE') {
        authorized = true;
      } else {
        const hasPermission = await prisma.rolePermission.findFirst({
          where: {
            permission: { name: permissionName },
            role: {
              users: {
                some: { userId },
              },
            },
          },
        });
        if (hasPermission) {
          authorized = true;
        }
      }

      if (!authorized) {
        const err = new AuthorizationError(`Explicit permission '${permissionName}' required`);
        res.status(403).json({ success: false, error: err.message, code: err.code });
        return;
      }

      next();
    });
  };
}
