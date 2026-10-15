import nodemailer, { Transporter } from 'nodemailer';
import { prisma } from '../lib/prisma';
import { Notification, NotificationDelivery, User } from '@prisma/client';
import { TemplateResolver } from './email/template.resolver';

export class EmailService {
  private static transporter: Transporter | null = null;

  /**
   * Initializes the transporter only when needed, avoiding startup crashes if vars are missing.
   */
  private static getTransporter(): Transporter {
    if (!this.transporter) {
      if (!process.env.SMTP_HOST) {
        throw new Error('SMTP_HOST is not configured');
      }

      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASSWORD,
            }
          : undefined, // Supports local dev without auth (e.g. MailHog)
      });
    }
    return this.transporter;
  }

  /**
   * Sends an email for a given delivery record securely.
   * Atomically claims the PENDING delivery, formats the content, and dispatches via SMTP.
   */
  static async processDelivery(deliveryId: string): Promise<boolean> {
    // 1. Claim ownership atomically (PENDING -> PROCESSING)
    const claimed = await prisma.notificationDelivery.updateMany({
      where: {
        id: deliveryId,
        status: 'PENDING', // Only claim if it's still pending
      },
      data: {
        status: 'PROCESSING',
        updatedAt: new Date(),
      },
    });

    if (claimed.count === 0) {
      // Another worker claimed it or it's not pending
      return false;
    }

    // 2. Fetch required related data
    const delivery = await prisma.notificationDelivery.findUnique({
      where: { id: deliveryId },
      include: {
        notification: {
          include: {
            user: { select: { email: true, name: true } },
          },
        },
      },
    });

    if (!delivery || !delivery.notification) {
      throw new Error(`Delivery ${deliveryId} or its notification is missing`);
    }

    const { notification } = delivery;

    // 3. Recipient Security Check
    if (!notification.user.email || !notification.user.email.includes('@')) {
      await this.markFailed(deliveryId, delivery.attempts, 'User has no valid email address');
      return false;
    }

    // 4. Construct Minimal Payload using TemplateResolver
    let payload;
    try {
      payload = await TemplateResolver.resolve(notification, notification.user);
    } catch (e: any) {
      // Step 12: Controlled failure if no template
      await this.markFailed(deliveryId, delivery.attempts, `Template resolution failed: ${e.message}`);
      return false;
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || '"KAI Aura Notifications" <no-reply@kaiaura.com>',
      to: notification.user.email,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    };

    try {
      const transporter = this.getTransporter();
      
      // 5. Transmit via SMTP
      await transporter.sendMail(mailOptions);

      // 6. Transition to SENT
      await prisma.notificationDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return true;
    } catch (error: any) {
      // 7. Handle failures (Transient vs Permanent)
      const maxRetries = parseInt(process.env.DELIVERY_WORKER_MAX_RETRIES || '3', 10);
      const isTransient = this.isTransientError(error);
      const safeErrorMessage = error.message || 'Unknown SMTP Error';

      if (isTransient && delivery.attempts < maxRetries) {
        // Process-controlled backoff (exponential: 1s, 2s, 4s)
        const backoffMs = Math.pow(2, delivery.attempts) * 1000;
        await new Promise(res => setTimeout(res, backoffMs));

        await prisma.notificationDelivery.update({
          where: { id: deliveryId },
          data: {
            status: 'PENDING',
            attempts: delivery.attempts + 1,
            errorDetails: safeErrorMessage.substring(0, 500),
            updatedAt: new Date(),
          },
        });
        console.warn(`Transient email failure for ${deliveryId}, reverted to PENDING for retry:`, safeErrorMessage);
      } else {
        await this.markFailed(deliveryId, delivery.attempts, safeErrorMessage);
        console.error(`Email delivery permanently failed for ${deliveryId}:`, safeErrorMessage);
      }
      return false;
    }
  }

  /**
   * Helper to mark a delivery as FAILED and increment attempts.
   */
  private static async markFailed(deliveryId: string, currentAttempts: number, errorDetails: string) {
    await prisma.notificationDelivery.update({
      where: { id: deliveryId },
      data: {
        status: 'FAILED',
        attempts: currentAttempts + 1,
        errorDetails: errorDetails.substring(0, 500), // Prevent massive error payloads
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Classifies if an error is transient (network timeout, 4xx response)
   */
  private static isTransientError(error: any): boolean {
    if (!error) return false;
    
    // SMTP 4xx codes are transient
    if (error.responseCode && error.responseCode >= 400 && error.responseCode < 500) {
      return true;
    }
    
    // Network-level temporary failures
    const transientCodes = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'EHOSTUNREACH', 'DNS'];
    if (error.code && transientCodes.includes(error.code)) {
      return true;
    }

    return false;
  }
}
