import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { NotificationService } from './notification.service';
import { AuditService } from './audit.service';
import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
} from '../lib/errors';

export class PasswordResetService {
  /**
   * Public-facing recovery request submission.
   * Resolves the account without disclosing existence or status.
   * Returns a generic message in all cases.
   */
  static async requestReset(identifier: string, ip?: string, userAgent?: string) {
    const genericMessage =
      'Your password reset request has been submitted. An authorized administrator will verify your identity and share a secure password reset link with you.';

    if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
      return { success: true, message: genericMessage, data: { message: genericMessage } };
    }

    const cleanIdentifier = identifier.trim();
    const normalizedEmail = cleanIdentifier.toLowerCase();

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedEmail },
          { employeeId: cleanIdentifier },
        ],
      },
    });

    // Only process if user exists and is active
    if (user && user.status === 'ACTIVE') {
      // Check if an actionable request already exists in the last 2 hours to prevent queue flooding
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const existingRequest = await prisma.passwordResetRequest.findFirst({
        where: {
          userId: user.id,
          status: { in: ['PENDING', 'VERIFIED'] },
          createdAt: { gte: twoHoursAgo },
        },
      });

      if (!existingRequest) {
        // Create recovery request
        const request = await prisma.passwordResetRequest.create({
          data: {
            userId: user.id,
            status: 'PENDING',
            requestIp: ip,
            userAgent,
          },
        });

        // Dispatch urgent in-app notification to all users with PASSWORD_RESET_REQUEST_MANAGE
        try {
          const operators = await prisma.user.findMany({
            where: {
              status: 'ACTIVE',
              roles: {
                some: {
                  role: {
                    OR: [
                      { name: 'RECOVERY_OPERATOR' },
                      {
                        permissions: {
                          some: { permission: { name: 'PASSWORD_RESET_REQUEST_MANAGE' } },
                        },
                      },
                    ],
                  },
                },
              },
            },
            select: { id: true },
          });

          for (const op of operators) {
            await NotificationService.dispatch({
              userId: op.id,
              type: 'PASSWORD_RESET_REQUESTED',
              title: 'Urgent: Password reset request',
              message:
                "A member has requested password recovery. Verify the member's identity before issuing a one-time reset link.",
              metadata: {
                requestId: request.id,
                employeeId: user.employeeId,
              },
            }).catch((err) => {
              console.warn(`[PasswordReset] Failed to notify operator ${op.id}:`, err?.message);
            });
          }
        } catch (notifErr: any) {
          console.warn('[PasswordReset] Operator notification dispatch error:', notifErr?.message);
        }

        // Record audit event (without sensitive data)
        await AuditService.log({
          action: 'PASSWORD_RESET_REQUESTED',
          entityType: 'PASSWORD_RESET_REQUEST',
          entityId: request.id,
          actorId: user.id,
          metadata: { requestIp: ip },
        }).catch((err) => console.warn('[PasswordReset] Audit error:', err?.message));
      }
    }

    return {
      success: true,
      message: genericMessage,
      data: { message: genericMessage },
    };
  }

  /**
   * Retrieves the recovery queue for authorized operators.
   * Never exposes tokens, token hashes, or reset URLs.
   */
  static async getQueue(params: {
    page?: number;
    pageSize?: number;
    status?: string;
    search?: string;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (params.status && params.status !== 'ALL') {
      where.status = params.status;
    }

    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      where.user = {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { employeeId: { contains: q, mode: 'insensitive' } },
        ],
      };
    }

    const [total, requests] = await Promise.all([
      prisma.passwordResetRequest.count({ where }),
      prisma.passwordResetRequest.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          createdAt: true,
          verifiedAt: true,
          issuedAt: true,
          completedAt: true,
          cancelledAt: true,
          cancellationReason: true,
          verificationNotes: true,
          tokenExpiresAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              employeeId: true,
            },
          },
          verifiedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          issuedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
    ]);

    return {
      requests,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Verifies member identity before link issuance.
   * Self-verification is strictly prohibited.
   */
  static async verifyRequest(requestId: string, operatorId: string, notes?: string) {
    const request = await prisma.passwordResetRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundError('Password reset request not found');
    }

    if (request.userId === operatorId) {
      throw new AuthorizationError('Self-verification is not permitted.');
    }

    if (request.status !== 'PENDING') {
      throw new ValidationError(`Only PENDING requests can be verified. Current status: ${request.status}`);
    }

    const updated = await prisma.passwordResetRequest.update({
      where: { id: requestId },
      data: {
        status: 'VERIFIED',
        verifiedAt: new Date(),
        verifiedById: operatorId,
        verificationNotes: notes?.trim() || 'Identity verified by authorized operator',
      },
      select: {
        id: true,
        status: true,
        verifiedAt: true,
        verifiedById: true,
        verificationNotes: true,
      },
    });

    await AuditService.log({
      action: 'PASSWORD_RESET_VERIFIED',
      entityType: 'PASSWORD_RESET_REQUEST',
      entityId: requestId,
      actorId: operatorId,
      metadata: { targetUserId: request.userId },
    }).catch((err) => console.warn('[PasswordReset] Audit error:', err?.message));

    return updated;
  }

  /**
   * Issues a one-time cryptographically secure password reset link.
   * Requires status === 'VERIFIED'.
   * Generates 256 bits of entropy, persists only its SHA-256 hash, and sets 15-minute TTL.
   * Returns the raw reset link ONCE to the operator.
   */
  static async issueResetLink(requestId: string, operatorId: string) {
    const request = await prisma.passwordResetRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });

    if (!request) {
      throw new NotFoundError('Password reset request not found');
    }

    if (request.userId === operatorId) {
      throw new AuthorizationError('Self-issuance is not permitted.');
    }

    if (request.status !== 'VERIFIED') {
      if (request.status === 'PENDING') {
        throw new ValidationError('Member identity must be verified before issuing a reset link.');
      }
      throw new ValidationError(`Cannot issue link for request with status: ${request.status}`);
    }

    // Generate 256 bits of CSPRNG entropy
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const tokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes TTL

    // Invalidate any existing unconsumed tokens for this user
    await prisma.passwordResetRequest.updateMany({
      where: {
        userId: request.userId,
        id: { not: requestId },
        status: 'LINK_ISSUED',
      },
      data: {
        status: 'CANCELLED',
        cancellationReason: 'SUPERSEDED_BY_NEW_LINK',
        cancelledAt: new Date(),
      },
    });

    // Update current request
    await prisma.passwordResetRequest.update({
      where: { id: requestId },
      data: {
        status: 'LINK_ISSUED',
        tokenHash,
        tokenExpiresAt,
        issuedAt: new Date(),
        issuedById: operatorId,
      },
    });

    // Construct frontend URL using validated application origin
    const frontendOrigin = process.env.FRONTEND_URL || 'http://localhost:3000';
    const cleanOrigin = frontendOrigin.replace(/\/$/, '');
    const resetUrl = `${cleanOrigin}/reset-password?token=${rawToken}`;

    // Audit log link issuance without storing raw token or URL
    await AuditService.log({
      action: 'PASSWORD_RESET_LINK_ISSUED',
      entityType: 'PASSWORD_RESET_REQUEST',
      entityId: requestId,
      actorId: operatorId,
      metadata: {
        targetUserId: request.userId,
        expiresAt: tokenExpiresAt.toISOString(),
      },
    }).catch((err) => console.warn('[PasswordReset] Audit error:', err?.message));

    return {
      requestId,
      resetUrl,
      expiresAt: tokenExpiresAt,
      targetUser: {
        id: request.user.id,
        name: request.user.name,
        email: request.user.email,
        employeeId: request.user.employeeId,
      },
    };
  }

  /**
   * Cancels a recovery request.
   */
  static async cancelRequest(requestId: string, operatorId: string, reason?: string) {
    const request = await prisma.passwordResetRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundError('Password reset request not found');
    }

    if (request.status === 'COMPLETED') {
      throw new ValidationError('Cannot cancel an already completed password reset.');
    }

    const updated = await prisma.passwordResetRequest.update({
      where: { id: requestId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledById: operatorId,
        cancellationReason: reason?.trim() || 'Cancelled by operator',
      },
    });

    await AuditService.log({
      action: 'PASSWORD_RESET_CANCELLED',
      entityType: 'PASSWORD_RESET_REQUEST',
      entityId: requestId,
      actorId: operatorId,
      metadata: { reason },
    }).catch((err) => console.warn('[PasswordReset] Audit error:', err?.message));

    return updated;
  }

  /**
   * Validates a password reset token without consuming it.
   * Checks status and expiration (15-minute TTL).
   */
  static async validateToken(token: string) {
    if (!token || typeof token !== 'string' || !token.trim()) {
      return {
        valid: false,
        reason: 'MISSING_TOKEN',
        message: 'No reset token was provided. Please request a new link.',
      };
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const request = await prisma.passwordResetRequest.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: { email: true, name: true, status: true },
        },
      },
    });

    if (!request) {
      return {
        valid: false,
        reason: 'INVALID',
        message: 'This password reset link is invalid or has expired.',
      };
    }

    if (request.status === 'COMPLETED') {
      return {
        valid: false,
        reason: 'ALREADY_USED',
        message: 'This password reset link has already been used and is no longer valid.',
      };
    }

    if (request.status === 'EXPIRED' || (request.tokenExpiresAt && request.tokenExpiresAt < new Date())) {
      if (request.status !== 'EXPIRED') {
        await prisma.passwordResetRequest.update({
          where: { id: request.id },
          data: { status: 'EXPIRED' },
        }).catch(() => {});
      }
      return {
        valid: false,
        reason: 'EXPIRED',
        message: 'This password reset link has expired. Reset links are only valid for 15 minutes.',
      };
    }

    if (request.status !== 'LINK_ISSUED') {
      return {
        valid: false,
        reason: 'INVALID',
        message: 'This password reset link is no longer valid.',
      };
    }

    if (request.user.status !== 'ACTIVE') {
      return {
        valid: false,
        reason: 'INACTIVE',
        message: 'The associated account is inactive.',
      };
    }

    return {
      valid: true,
      expiresAt: request.tokenExpiresAt?.toISOString(),
      maskedEmail: request.user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
    };
  }

  /**
   * Completes the password reset using the one-time token.
   * Atomically hashes new password, updates User, marks request COMPLETED,
   * sets passwordChangedAt to invalidate existing sessions, and cancels superseded requests.
   */
  static async resetPassword(token: string, newPassword: string) {
    if (!token || typeof token !== 'string' || !token.trim()) {
      throw new ValidationError('Password reset token is required');
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }

    // Hash the presented token
    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const request = await prisma.passwordResetRequest.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!request) {
      throw new ValidationError('Invalid or expired password reset link.');
    }

    if (request.status !== 'LINK_ISSUED') {
      if (request.status === 'COMPLETED') {
        throw new ValidationError('This password reset link has already been used.');
      }
      throw new ValidationError('This password reset link is no longer valid.');
    }

    if (!request.tokenExpiresAt || request.tokenExpiresAt < new Date()) {
      await prisma.passwordResetRequest.update({
        where: { id: request.id },
        data: { status: 'EXPIRED' },
      });
      throw new ValidationError('This password reset link has expired. Please request a new one.');
    }

    if (request.user.status !== 'ACTIVE') {
      throw new AuthenticationError('Account is inactive.');
    }

    // Hash the new password using bcrypt
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const now = new Date();

    // Atomic execution in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Update user password and set passwordChangedAt (which invalidates prior JWT sessions)
      await tx.user.update({
        where: { id: request.userId },
        data: {
          passwordHash,
          passwordChangedAt: now,
        },
      });

      // 2. Consume this reset request
      await tx.passwordResetRequest.update({
        where: { id: request.id },
        data: {
          status: 'COMPLETED',
          completedAt: now,
          tokenExpiresAt: now,
        },
      });

      // 3. Invalidate any other outstanding requests for this user
      await tx.passwordResetRequest.updateMany({
        where: {
          userId: request.userId,
          id: { not: request.id },
          status: { in: ['PENDING', 'VERIFIED', 'LINK_ISSUED'] },
        },
        data: {
          status: 'CANCELLED',
          cancellationReason: 'SUPERSEDED_BY_COMPLETED_RESET',
          cancelledAt: now,
        },
      });
    });

    // Audit log (never record token, password, or hash)
    await AuditService.log({
      action: 'PASSWORD_RESET_COMPLETED',
      entityType: 'PASSWORD_RESET_REQUEST',
      entityId: request.id,
      actorId: request.userId,
    }).catch((err) => console.warn('[PasswordReset] Audit error:', err?.message));

    return {
      success: true,
      message: 'Password has been reset successfully. Please sign in with your new password.',
      data: { message: 'Password has been reset successfully. Please sign in with your new password.' },
    };
  }
}
