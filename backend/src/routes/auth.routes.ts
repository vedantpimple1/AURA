import { Router, Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { encrypt } from '../lib/auth';
import { requireAuth } from '../middleware/requireAuth';
import { handleError } from '../lib/errors';

export const authRouter = Router();

/**
 * POST /api/auth/login
 * Authenticates a user and sets a JWT session cookie.
 */
authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required', code: 'VALIDATION_ERROR' });
      return;
    }

    const user = await AuthService.login(email, password);

    // Build JWT containing user identity
    const token = await encrypt({
      userId: user.id,
      email: user.email,
      roles: user.roles ?? [],
    });

    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('session', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 1000, // 24 hours in ms
    });

    res.json({ success: true, data: { id: user.id, email: user.email, name: user.name, roles: user.roles } });
  } catch (error) {
    const { statusCode, ...body } = handleError(error) as any;
    res.status(statusCode ?? 500).json({ success: false, ...body });
  }
});

/**
 * POST /api/auth/logout
 * Clears the session cookie.
 */
authRouter.post('/logout', requireAuth, (_req: Request, res: Response): void => {
  res.clearCookie('session', { path: '/' });
  res.json({ success: true });
});

/**
 * GET /api/auth/me
 * Returns the current session payload (lightweight, no DB call).
 */
authRouter.get('/me', requireAuth, (req: Request, res: Response): void => {
  res.json({ success: true, data: req.session });
});
