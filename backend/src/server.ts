import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { authRouter } from './routes/auth.routes';
import { userRouter } from './routes/user.routes';
import { auraRouter } from './routes/aura.routes';
import { taskRouter } from './routes/task.routes';
import { storeRouter } from './routes/store.routes';
import { teamRouter } from './routes/team.routes';
import { notificationRouter } from './routes/notification.routes';
import { observabilityRouter } from './routes/observability.routes';
import { analyticsRouter } from './routes/analytics.routes';
import { auditRouter } from './routes/audit.routes';
import { aiRouter } from './routes/ai.routes';
import { ApplicationError } from './lib/errors';

const app = express();
const PORT = parseInt(process.env.PORT ?? '4000', 10);

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigin = process.env.FRONTEND_URL ?? 'http://localhost:3000';
app.use(
  cors({
    origin: allowedOrigin,
    credentials: true, // Required for cookie-based auth
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── Core Middleware ──────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/aura', auraRouter);
app.use('/api/tasks', taskRouter);
app.use('/api/store', storeRouter);
app.use('/api/teams', teamRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/observability', observabilityRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/audit', auditRouter);
app.use('/api/ai', aiRouter);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Route not found', code: 'NOT_FOUND' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof ApplicationError) {
    res.status(error.statusCode).json({
      success: false,
      error: error.message,
      code: error.code,
      ...(error.details ? { details: error.details } : {}),
    });
    return;
  }

  console.error('[Unhandled Server Error]:', error);
  res.status(500).json({
    success: false,
    error: 'An unexpected internal error occurred.',
    code: 'INTERNAL_ERROR',
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`[Server] KAI Aura API running on http://localhost:${PORT}`);
  console.log(`[Server] CORS: allowing origin ${allowedOrigin}`);
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
const handleShutdown = async (signal: string) => {
  console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);
  server.close(async () => {
    console.log('[Server] HTTP connections drained.');
    try {
      const { prisma } = await import('./lib/prisma');
      await prisma.$disconnect();
      console.log('[Server] Database pool disconnected cleanly.');
    } catch (err) {
      console.error('[Server] Error disconnecting database pool:', err);
    }
    process.exit(0);
  });

  // Force close after 10s timeout
  setTimeout(() => {
    console.error('[Server] Could not close connections in time, forcefully shutting down.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

export default app;
