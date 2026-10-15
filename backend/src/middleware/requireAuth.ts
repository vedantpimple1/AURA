import { Request, Response, NextFunction } from 'express';
import { decrypt, SessionPayload } from '../lib/auth';
import { AuthenticationError, AuthorizationError } from '../lib/errors';

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
 * verifies it, and attaches the decoded payload to req.session.
 * Returns 401 if the token is missing or invalid.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.session as string | undefined;
    if (!token) {
      throw new AuthenticationError('No session token provided');
    }
    const payload = await decrypt(token);
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
