import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

/**
 * Sliding-window in-memory rate limiter factory.
 * Provides protection against brute-force, request flooding, and enumeration attacks.
 */
export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}) {
  const store = new Map<string, RateLimitRecord>();
  const { windowMs, max, message = 'Too many requests, please try again later.' } = options;

  // Periodic cleanup of expired records every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (now >= record.resetAt) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown-ip';

    const key = options.keyGenerator ? options.keyGenerator(req) : clientIp;
    const now = Date.now();
    const record = store.get(key);

    if (!record || now >= record.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (record.count >= max) {
      const retryAfterSec = Math.ceil((record.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      res.status(429).json({
        success: false,
        error: message,
        code: 'RATE_LIMIT_EXCEEDED',
      });
      return;
    }

    record.count += 1;
    next();
  };
}

/**
 * Rate limiter for public password reset requests:
 * Max 5 submissions per IP per 15 minutes.
 */
export const publicResetRequestLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many password reset requests from this network. Please try again later.',
});

/**
 * Rate limiter for password reset completions:
 * Max 5 completion attempts per IP per 15 minutes.
 */
export const resetPasswordSubmitLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many password reset attempts. Please request a new link or try again later.',
});
